import os
import uuid
import json
import hashlib
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.fernet import Fernet
import requests
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler
import pathlib

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app, origins=os.getenv('ALLOWED_ORIGINS', '*').split(','))

# Initialize encryption
encryption_key = os.getenv('ENCRYPTION_KEY', Fernet.generate_key().decode())
try:
    cipher_suite = Fernet(encryption_key.encode())
except ValueError:
    # If the key is invalid, generate a new one
    print("WARNING: Invalid encryption key, generating a new one...")
    encryption_key = Fernet.generate_key().decode()
    cipher_suite = Fernet(encryption_key.encode())
    print(f"New encryption key: {encryption_key}")
    print("Please update your .env file with this key for production use.")

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.Text)
    role = db.Column(db.String(20), default='manager')
    slug = db.Column(db.String(64), unique=True)  # short identifier for links

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class ChatLink(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    title = db.Column(db.String(200))
    message = db.Column(db.Text)
    marker = db.Column(db.String(10))  # Emoji marker
    active = db.Column(db.Boolean, default=True)
    views = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    owner = db.relationship('User')

class Click(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    server_sub_id = db.Column(db.String(36), unique=True, nullable=False)
    ts = db.Column(db.DateTime, default=datetime.utcnow)
    ip = db.Column(db.String(45))
    ua = db.Column(db.Text)
    referrer = db.Column(db.Text)
    landing_url = db.Column(db.Text)
    params = db.Column(db.JSON)
    utm_source = db.Column(db.String(100))
    utm_medium = db.Column(db.String(100))
    utm_campaign = db.Column(db.String(100))
    utm_content = db.Column(db.String(100))
    utm_term = db.Column(db.String(100))
    fbclid = db.Column(db.String(100))
    fbp = db.Column(db.String(100))
    fbc = db.Column(db.String(100))
    keitaro_sub_id = db.Column(db.String(100))
    route = db.Column(db.String(100))
    chat_link_id = db.Column(db.Integer, db.ForeignKey('chat_link.id'))

    chat_link = db.relationship('ChatLink', backref='clicks')

class CtaClick(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    server_sub_id = db.Column(db.String(36), db.ForeignKey('click.server_sub_id'))
    ts = db.Column(db.DateTime, default=datetime.utcnow)
    # Link back to Click by server_sub_id
    click = db.relationship('Click', primaryjoin="CtaClick.server_sub_id==Click.server_sub_id", backref='cta_clicks')

class Redirect(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    server_sub_id = db.Column(db.String(36), db.ForeignKey('click.server_sub_id'))
    ts = db.Column(db.DateTime, default=datetime.utcnow)
    target_url = db.Column(db.Text)
    # Link back to Click by server_sub_id
    click = db.relationship('Click', primaryjoin="Redirect.server_sub_id==Click.server_sub_id", backref='redirects')

class Lead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    server_sub_id = db.Column(db.String(36), db.ForeignKey('click.server_sub_id'))
    ts = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20))
    revenue = db.Column(db.Numeric(12, 2))
    currency = db.Column(db.String(3), default='USD')
    pixel_id = db.Column(db.String(100))
    pixel_resp = db.Column(db.JSON)
    keitaro_resp = db.Column(db.JSON)
    manager = db.Column(db.String(100))
    retry_count = db.Column(db.Integer, default=0)
    next_retry_at = db.Column(db.DateTime)
    # Link back to Click by server_sub_id
    click = db.relationship('Click', primaryjoin="Lead.server_sub_id==Click.server_sub_id", backref='leads')

class PixelSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pixel_id = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200))
    access_token_encrypted = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)
    allowed_domain = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_access_token(self, token):
        self.access_token_encrypted = cipher_suite.encrypt(token.encode()).decode()

    def get_access_token(self):
        if self.access_token_encrypted:
            return cipher_suite.decrypt(self.access_token_encrypted.encode()).decode()
        return None

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Utility functions
def generate_server_sub_id():
    return str(uuid.uuid4())

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

def is_duplicate_click(keitaro_sub_id, fbclid, full_url, ip, ua):
    """Check for duplicate clicks within 24 hours without JSON operators (Postgres-safe)"""
    # 1) сначала по явным идентификаторам
    if keitaro_sub_id:
        existing = Click.query.filter_by(keitaro_sub_id=keitaro_sub_id).first()
        if existing:
            return existing
    if fbclid:
        existing = Click.query.filter_by(fbclid=fbclid).first()
        if existing:
            return existing

    # 2) затем эвристика: та же связка URL + IP + UA за последние 24 часа
    yesterday = datetime.utcnow() - timedelta(days=1)
    existing = (Click.query
                .filter(Click.landing_url == full_url,
                        Click.ip == ip,
                        Click.ua == ua,
                        Click.ts > yesterday)
                .first())
    return existing

def select_chat_link(route=None, manager_slug=None):
    """Select active chat link based on route or round-robin"""
    query = ChatLink.query.filter_by(active=True)
    if manager_slug:
        manager = User.query.filter_by(slug=manager_slug).first()
        if manager:
            query = query.filter_by(owner_id=manager.id)
    active_links = query.all()
    if not active_links:
        return None
    
    if route:
        # Try to find link by route (could be extended with route mapping)
        link = query.filter_by(slug=route).first()
        if link:
            return link
    
    # Round-robin selection based on views
    min_views = min(link.views for link in active_links)
    selected_link = next((link for link in active_links if link.views == min_views), active_links[0])
    return selected_link

# API Routes
@app.route('/api/track-click', methods=['POST'])
def track_click():
    data = request.get_json()
    
    # Extract parameters
    full_url = data.get('full_url', '')
    referrer = data.get('referrer', '')
    user_agent = data.get('user_agent', '')
    ip = data.get('ip', get_client_ip())
    utm_source = data.get('utm_source', '')
    utm_medium = data.get('utm_medium', '')
    utm_campaign = data.get('utm_campaign', '')
    utm_content = data.get('utm_content', '')
    utm_term = data.get('utm_term', '')
    fbclid = data.get('fbclid', '')
    fbp = data.get('fbp', '')
    fbc = data.get('fbc', '')
    keitaro_sub_id = data.get('keitaro_sub_id', '')
    route = data.get('route', '')
    manager_slug = data.get('manager', '') or data.get('manager_slug', '')
    
    # Check for duplicates
    existing_click = is_duplicate_click(keitaro_sub_id, fbclid, full_url, ip, user_agent)
    if existing_click:
        return jsonify({
            'server_sub_id': existing_click.server_sub_id,
            'chat_link': {
                'slug': existing_click.chat_link.slug if existing_click.chat_link else None,
                'marker': existing_click.chat_link.marker if existing_click.chat_link else None
            }
        })
    
    # Generate server_sub_id
    server_sub_id = generate_server_sub_id()
    
    # Select chat link
    chat_link = select_chat_link(route, manager_slug)
    
    # Create click record
    click = Click(
        server_sub_id=server_sub_id,
        ip=ip,
        ua=user_agent,
        referrer=referrer,
        landing_url=full_url,
        params=data,
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        utm_content=utm_content,
        utm_term=utm_term,
        fbclid=fbclid,
        fbp=fbp,
        fbc=fbc,
        keitaro_sub_id=keitaro_sub_id,
        route=route,
        chat_link_id=chat_link.id if chat_link else None
    )
    
    db.session.add(click)
    
    # Update chat link views
    if chat_link:
        chat_link.views += 1
    
    db.session.commit()
    
    return jsonify({
        'server_sub_id': server_sub_id,
        'chat_link': {
            'slug': chat_link.slug if chat_link else None,
            'marker': chat_link.marker if chat_link else None
        }
    })

@app.route('/api/track-cta-click', methods=['POST'])
def track_cta_click():
    data = request.get_json()
    server_sub_id = data.get('server_sub_id')
    
    if not server_sub_id:
        return jsonify({'error': 'server_sub_id required'}), 400
    
    # Verify click exists
    click = Click.query.filter_by(server_sub_id=server_sub_id).first()
    if not click:
        return jsonify({'error': 'Click not found'}), 404
    
    # Create CTA click record
    cta_click = CtaClick(server_sub_id=server_sub_id)
    db.session.add(cta_click)
    db.session.commit()
    
    return jsonify({
        'redirect': f"/u?ref={server_sub_id}"
    })

@app.route('/u')
def redirect_user():
    ref = request.args.get('ref')
    if not ref:
        return jsonify({'error': 'Missing ref parameter'}), 400
    
    # Find click
    click = Click.query.filter_by(server_sub_id=ref).first()
    if not click or not click.chat_link:
        return jsonify({'error': 'Click or chat link not found'}), 404
    
    # Create redirect record
    redirect_record = Redirect(
        server_sub_id=ref,
        target_url=f"https://t.me/m/{click.chat_link.slug}"
    )
    db.session.add(redirect_record)
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('redirect', {
        'server_sub_id': ref,
        'target_url': redirect_record.target_url,
        'timestamp': redirect_record.ts.isoformat()
    })
    
    # Return 302 redirect
    return redirect(redirect_record.target_url, code=302)

@app.route('/api/lead', methods=['POST'])
@login_required
def create_lead():
    data = request.get_json()
    server_sub_id = data.get('server_sub_id')
    status = data.get('status')
    # Revenue/value removed from UI and processing
    revenue = None
    currency = 'USD'
    # New: select pixel by stored setting id
    pixel_setting_id = data.get('pixel_setting_id')
    pixel_id = None
    access_token = None
    allowed_domain = None
    manager = data.get('manager', current_user.email)
    
    if not all([server_sub_id, status]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Resolve pixel from stored settings if provided
    if pixel_setting_id:
        setting = PixelSetting.query.get(pixel_setting_id)
        if not setting:
            return jsonify({'error': 'Pixel setting not found'}), 404
        pixel_id = setting.pixel_id
        access_token = setting.get_access_token()
        allowed_domain = (setting.allowed_domain or '').strip().lower()
    
    if not all([pixel_id, access_token]):
        return jsonify({'error': 'Pixel credentials not provided'}), 400
    
    # Require CTA click exists for this server_sub_id
    click = Click.query.filter_by(server_sub_id=server_sub_id).first()
    # Enforce allowed domain for pixel if configured
    if allowed_domain:
        try:
            from urllib.parse import urlparse
            landing_host = (urlparse(click.landing_url).hostname or '').lower()
            if landing_host != allowed_domain and not landing_host.endswith('.' + allowed_domain):
                return jsonify({'error': f'Domain not allowed for this pixel (allowed: {allowed_domain})'}), 403
        except Exception as e:
            return jsonify({'error': f'Domain validation error: {str(e)}'}), 400
    if not click:
        return jsonify({'error': 'Click not found'}), 404
    if not CtaClick.query.filter_by(server_sub_id=server_sub_id).first():
        return jsonify({'error': 'CTA click not found for this server_sub_id'}), 400
    
    # Check if lead already exists
    existing_lead = Lead.query.filter_by(server_sub_id=server_sub_id).first()
    if existing_lead and existing_lead.status in ['sent', 'success']:
        return jsonify({'error': 'Lead already processed'}), 400
    
    # Create or update lead
    if existing_lead:
        lead = existing_lead
        lead.status = status
        lead.revenue = revenue
        lead.currency = currency
        lead.pixel_id = pixel_id
        lead.manager = manager
    else:
        lead = Lead(
            server_sub_id=server_sub_id,
            status=status,
            revenue=revenue,
            currency=currency,
            pixel_id=pixel_id,
            manager=manager
        )
        db.session.add(lead)
    
    db.session.commit()
    
    # Send to Facebook CAPI
    pixel_resp = send_facebook_capi(click, lead, access_token)
    lead.pixel_resp = pixel_resp
    
    # Send to Keitaro
    keitaro_resp = send_keitaro_postback(click, lead)
    lead.keitaro_resp = keitaro_resp
    
    # Update lead status based on responses
    if pixel_resp.get('success') and keitaro_resp.get('success'):
        lead.status = 'success'
    else:
        lead.status = 'error'
        lead.retry_count += 1
        lead.next_retry_at = datetime.utcnow() + timedelta(minutes=5 * (2 ** lead.retry_count))
    
    db.session.commit()
    
    # Emit real-time update
    socketio.emit('lead_created', {
        'server_sub_id': server_sub_id,
        'status': lead.status,
        'revenue': 0,
        'currency': currency,
        'manager': manager,
        'timestamp': lead.ts.isoformat()
    })
    
    return jsonify({
        'success': True,
        'lead_id': lead.id,
        'status': lead.status,
        'pixel_response': pixel_resp,
        'keitaro_response': keitaro_resp
    })

# Setup conversion logging
logs_dir = pathlib.Path(app.instance_path) / 'logs'
logs_dir.mkdir(parents=True, exist_ok=True)
conversion_log_path = logs_dir / 'capi.log'

conversion_logger = logging.getLogger('conversion_logger')
if not conversion_logger.handlers:
    handler = RotatingFileHandler(conversion_log_path, maxBytes=2000000, backupCount=5, encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
    handler.setFormatter(formatter)
    conversion_logger.setLevel(logging.INFO)
    conversion_logger.addHandler(handler)
    # Also log to project-level logs directory as fallback
    project_logs = pathlib.Path(__file__).resolve().parent / 'logs'
    project_logs.mkdir(parents=True, exist_ok=True)
    fallback_handler = RotatingFileHandler(project_logs / 'capi.log', maxBytes=2000000, backupCount=5, encoding='utf-8')
    fallback_handler.setFormatter(formatter)
    conversion_logger.addHandler(fallback_handler)

def send_facebook_capi(click, lead, access_token):
    """Send event to Facebook Conversions API"""
    try:
        url = f"https://graph.facebook.com/v18.0/{lead.pixel_id}/events"
        
        event = {
            "data": [{
                "event_name": "Lead",
                "event_time": int(lead.ts.timestamp()),
                "event_id": click.server_sub_id,
                "action_source": "website",
                "user_data": {
                    "client_ip_address": click.ip,
                    "client_user_agent": click.ua,
                    "fbp": click.fbp,
                    "fbc": click.fbc,
                    "fbclid": click.fbclid
                }
            }],
            "access_token": access_token
        }
        # Do not include value if revenue is not provided
        if lead.revenue is not None:
            event["data"][0]["custom_data"] = {
                "value": float(lead.revenue),
                "currency": lead.currency
            }
        event_data = event
        
        owner_id = click.chat_link.owner_id if click.chat_link else None
        manager_slug = click.chat_link.owner.slug if (click.chat_link and click.chat_link.owner and hasattr(click.chat_link.owner, 'slug')) else None
        conversion_logger.info(json.dumps({
            'type': 'facebook_request',
            'pixel_id': lead.pixel_id,
            'server_sub_id': click.server_sub_id,
            'url': url,
            'payload': event_data,
            'owner_id': owner_id,
            'manager_slug': manager_slug
        }, ensure_ascii=False))

        response = requests.post(url, json=event_data, timeout=30)
        
        result = {
            'success': response.status_code == 200,
            'status_code': response.status_code,
            'response': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
        conversion_logger.info(json.dumps({
            'type': 'facebook_response',
            'pixel_id': lead.pixel_id,
            'server_sub_id': click.server_sub_id,
            'status_code': result['status_code'],
            'response': result['response'],
            'owner_id': owner_id,
            'manager_slug': manager_slug
        }, ensure_ascii=False))
        return result
    except Exception as e:
        conversion_logger.error(json.dumps({
            'type': 'facebook_error',
            'pixel_id': lead.pixel_id,
            'server_sub_id': click.server_sub_id,
            'error': str(e),
            'owner_id': owner_id,
            'manager_slug': manager_slug
        }, ensure_ascii=False))
        return {
            'success': False,
            'error': str(e)
        }

def send_keitaro_postback(click, lead):
    """Send S2S postback to Keitaro"""
    try:
        keitaro_url = os.getenv('KEITARO_POSTBACK_URL')
        if not keitaro_url:
            return {'success': False, 'error': 'Keitaro URL not configured'}
        
        # Replace placeholders
        url = keitaro_url.format(
            subid=click.keitaro_sub_id or click.server_sub_id,
            status=lead.status,
            revenue=float(lead.revenue or 0),
            currency=lead.currency
        )
        
        owner_id = click.chat_link.owner_id if click.chat_link else None
        manager_slug = click.chat_link.owner.slug if (click.chat_link and click.chat_link.owner and hasattr(click.chat_link.owner, 'slug')) else None
        conversion_logger.info(json.dumps({
            'type': 'keitaro_request',
            'server_sub_id': click.server_sub_id,
            'url': url,
            'owner_id': owner_id,
            'manager_slug': manager_slug
        }, ensure_ascii=False))

        response = requests.get(url, timeout=30)
        
        result = {
            'success': response.status_code == 200,
            'status_code': response.status_code,
            'response': response.text
        }
        conversion_logger.info(json.dumps({
            'type': 'keitaro_response',
            'server_sub_id': click.server_sub_id,
            'status_code': result['status_code'],
            'response': result['response'],
            'owner_id': owner_id,
            'manager_slug': manager_slug
        }, ensure_ascii=False))
        return result
    except Exception as e:
        conversion_logger.error(json.dumps({
            'type': 'keitaro_error',
            'server_sub_id': click.server_sub_id,
            'error': str(e),
            'owner_id': owner_id,
            'manager_slug': manager_slug
        }, ensure_ascii=False))
        return {
            'success': False,
            'error': str(e)
        }

# Admin routes
@app.route('/admin')
@login_required
def admin_panel():
    return render_template('admin.html')

@app.route('/api/chat-links')
def get_chat_links():
    links = ChatLink.query.all()
    return jsonify([{
        'id': link.id,
        'slug': link.slug,
        'title': link.title,
        'message': link.message,
        'marker': link.marker,
        'views': link.views,
        'active': bool(link.active),
        'created_at': link.created_at.isoformat()
    } for link in links])

@app.route('/api/chat-links', methods=['POST'])
@login_required
def manage_chat_links():
    data = request.get_json()
    action = data.get('action')
    
    if action == 'create':
        link = ChatLink(
            slug=data['slug'],
            title=data['title'],
            message=data['message'],
            marker=data['marker'],
            active=data.get('active', True),
            owner_id=(current_user.id if current_user.role == 'manager' else data.get('owner_id'))
        )
        db.session.add(link)
    elif action == 'update':
        link = ChatLink.query.get(data['id'])
        if link:
            link.title = data.get('title', link.title)
            link.message = data.get('message', link.message)
            link.marker = data.get('marker', link.marker)
            link.active = data.get('active', link.active)
            if current_user.role != 'manager':
                if 'owner_id' in data:
                    link.owner_id = data.get('owner_id')
    elif action == 'delete':
        link = ChatLink.query.get(data['id'])
        if link:
            db.session.delete(link)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/pixel-settings', methods=['GET', 'POST'])
@login_required
def pixel_settings():
    if request.method == 'GET':
        settings = PixelSetting.query.all()
        return jsonify([{
            'id': s.id,
            'pixel_id': s.pixel_id,
            'name': s.name,
            'active': s.active,
            'allowed_domain': s.allowed_domain,
            'created_at': s.created_at.isoformat()
        } for s in settings])
    
    data = request.get_json()
    action = data.get('action')
    
    if action == 'create':
        setting = PixelSetting(
            pixel_id=data['pixel_id'],
            name=data.get('name', ''),
            active=True,
            allowed_domain=data.get('allowed_domain')
        )
        setting.set_access_token(data['access_token'])
        db.session.add(setting)
    elif action == 'update':
        setting = PixelSetting.query.get(data['id'])
        if setting:
            setting.pixel_id = data.get('pixel_id', setting.pixel_id)
            setting.name = data.get('name', setting.name)
            setting.active = data.get('active', setting.active)
            if 'allowed_domain' in data:
                setting.allowed_domain = data.get('allowed_domain')
            if 'access_token' in data:
                setting.set_access_token(data['access_token'])
    elif action == 'delete':
        setting = PixelSetting.query.get(data['id'])
        if setting:
            db.session.delete(setting)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/logs/capi')
@login_required
def get_capi_logs():
    lines = int(request.args.get('lines', 200))
    try:
        candidates = [conversion_log_path, pathlib.Path(__file__).resolve().parent / 'logs' / 'capi.log']
        for p in candidates:
            if p.exists():
                with open(p, 'r', encoding='utf-8') as f:
                    content = f.readlines()[-lines:]
                break
        else:
            content = []
        # Filter by manager if not admin
        if current_user.is_authenticated and current_user.role == 'manager':
            owner_tag = f'"owner_id": {current_user.id}'
            content = [ln for ln in content if owner_tag in ln]
        # Admin optional filters
        owner_id = request.args.get('owner_id')
        manager_slug = request.args.get('manager_slug')
        if owner_id:
            content = [ln for ln in content if f'"owner_id": {owner_id}' in ln]
        if manager_slug:
            content = [ln for ln in content if f'"manager_slug": "{manager_slug}"' in ln]
        return jsonify({'lines': [line.rstrip('\n') for line in content]})
    except FileNotFoundError:
        return jsonify({'lines': []})

@app.route('/api/logs/capi/clear', methods=['POST'])
@login_required
def clear_capi_logs():
    data = request.get_json(silent=True) or {}
    scope = data.get('scope', 'mine')  # 'mine' or 'all'
    candidates = [conversion_log_path, pathlib.Path(__file__).resolve().parent / 'logs' / 'capi.log']
    cleared = False
    for p in candidates:
        try:
            if not p.exists():
                continue
            if scope == 'all' and current_user.role == 'admin':
                p.write_text('', encoding='utf-8')
                cleared = True
            else:
                # Keep lines not belonging to this manager
                with open(p, 'r', encoding='utf-8') as f:
                    lines_all = f.readlines()
                keep = []
                tag = f'"owner_id": {current_user.id}'
                for ln in lines_all:
                    if tag in ln:
                        continue
                    keep.append(ln)
                with open(p, 'w', encoding='utf-8') as f:
                    f.writelines(keep)
                cleared = True
        except Exception:
            pass
    return jsonify({'success': cleared})

@app.route('/api/clear-database', methods=['POST'])
@login_required
def clear_database():
    data = request.get_json()
    password = data.get('password')
    
    if password != '7788':
        return jsonify({'error': 'Неверный пароль'}), 400
    
    try:
        # Delete all data from all tables
        db.session.query(CtaClick).delete()
        db.session.query(Redirect).delete()
        db.session.query(Lead).delete()
        db.session.query(Click).delete()
        db.session.query(ChatLink).delete()
        db.session.query(PixelSetting).delete()
        
        # Keep admin user
        # db.session.query(User).delete()
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'База данных очищена успешно'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Ошибка очистки базы данных: {str(e)}'}), 500

# Landing page
@app.route('/')
def landing():
    return render_template('landing.html')

# Login routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('admin_panel'))
        else:
            return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Additional API endpoints for admin panel
@app.route('/api/dashboard/stats')
@login_required
def dashboard_stats():
    # If manager, filter by owned chat links
    if current_user.role == 'manager':
        user_id = current_user.id
        total_clicks = db.session.query(Click).join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == user_id).count()
        total_cta = db.session.query(CtaClick).join(Click, CtaClick.server_sub_id == Click.server_sub_id).join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == user_id).count()
        total_redirects = db.session.query(Redirect).join(Click, Redirect.server_sub_id == Click.server_sub_id).join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == user_id).count()
        total_leads = db.session.query(Lead).join(Click, Lead.server_sub_id == Click.server_sub_id).join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == user_id).count()
    else:
        total_clicks = Click.query.count()
        total_cta = CtaClick.query.count()
        total_redirects = Redirect.query.count()
        total_leads = Lead.query.count()
    
    return jsonify({
        'total_clicks': total_clicks,
        'total_cta': total_cta,
        'total_redirects': total_redirects,
        'total_leads': total_leads
    })

@app.route('/api/dashboard/charts')
@login_required
def dashboard_charts():
    # Clicks by day (last 7 days)
    from datetime import datetime, timedelta
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    clicks_query = db.session.query(
        db.func.date(Click.ts).label('date'),
        db.func.count(Click.id).label('count')
    ).filter(Click.ts >= start_date)
    if current_user.role == 'manager':
        clicks_query = clicks_query.join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == current_user.id)
    clicks_by_day = clicks_query.group_by(db.func.date(Click.ts)).all()
    
    # Sources distribution
    sources_query = db.session.query(
        Click.utm_source,
        db.func.count(Click.id).label('count')
    ).filter(Click.utm_source.isnot(None), Click.utm_source != '')
    if current_user.role == 'manager':
        sources_query = sources_query.join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == current_user.id)
    sources = sources_query.group_by(Click.utm_source).all()
    
    # Format data for charts
    dates = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    clicks_data = [0] * 7
    
    for click in clicks_by_day:
        # db.func.date may return str (SQLite) or date (Postgres). Normalize to 'YYYY-MM-DD'.
        date_str = click.date.strftime('%Y-%m-%d') if hasattr(click.date, 'strftime') else str(click.date)
        if date_str in dates:
            idx = dates.index(date_str)
            clicks_data[idx] = click.count
    
    sources_labels = [s.utm_source for s in sources]
    sources_data = [s.count for s in sources]
    
    return jsonify({
        'clicks_by_day': {
            'labels': dates,
            'data': clicks_data
        },
        'sources': {
            'labels': sources_labels,
            'data': sources_data
        }
    })

@app.route('/api/clicks')
@login_required
def get_clicks():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    source = request.args.get('source')
    
    query = Click.query
    if current_user.role == 'manager':
        query = query.join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == current_user.id)
    
    if search:
        query = query.filter(
            db.or_(
                Click.ip.contains(search),
                Click.fbclid.contains(search),
                Click.server_sub_id.contains(search)
            )
        )
    
    if date_from:
        query = query.filter(Click.ts >= datetime.fromisoformat(date_from))
    
    if date_to:
        query = query.filter(Click.ts <= datetime.fromisoformat(date_to))
    
    if source:
        query = query.filter(Click.utm_source == source)
    
    clicks = query.order_by(Click.ts.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify([{
        'id': click.id,
        'server_sub_id': click.server_sub_id,
        'ts': click.ts.isoformat(),
        'ip': click.ip,
        'ua': click.ua,
        'utm_source': click.utm_source,
        'utm_campaign': click.utm_campaign,
        'fbclid': click.fbclid,
        'chat_link': {
            'slug': click.chat_link.slug if click.chat_link else None,
            'marker': click.chat_link.marker if click.chat_link else None
        } if click.chat_link else None
    } for click in clicks.items])

@app.route('/api/clicks/<server_sub_id>')
@login_required
def get_click_details(server_sub_id):
    click = Click.query.filter_by(server_sub_id=server_sub_id).first()
    if not click:
        return jsonify({'error': 'Click not found'}), 404
    
    return jsonify({
        'id': click.id,
        'server_sub_id': click.server_sub_id,
        'ts': click.ts.isoformat(),
        'ip': click.ip,
        'ua': click.ua,
        'referrer': click.referrer,
        'landing_url': click.landing_url,
        'utm_source': click.utm_source,
        'utm_medium': click.utm_medium,
        'utm_campaign': click.utm_campaign,
        'utm_content': click.utm_content,
        'utm_term': click.utm_term,
        'fbclid': click.fbclid,
        'fbp': click.fbp,
        'fbc': click.fbc,
        'keitaro_sub_id': click.keitaro_sub_id,
        'route': click.route,
        'chat_link': {
            'id': click.chat_link.id,
            'slug': click.chat_link.slug,
            'title': click.chat_link.title,
            'message': click.chat_link.message,
            'marker': click.chat_link.marker
        } if click.chat_link else None
    })

@app.route('/api/cta-clicks')
@login_required
def get_cta_clicks():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    query = CtaClick.query.join(Click)
    if current_user.role == 'manager':
        query = query.join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == current_user.id)
    
    if search:
        query = query.filter(CtaClick.server_sub_id.contains(search))
    
    if date_from:
        query = query.filter(CtaClick.ts >= datetime.fromisoformat(date_from))
    
    if date_to:
        query = query.filter(CtaClick.ts <= datetime.fromisoformat(date_to))
    
    cta_clicks = query.order_by(CtaClick.ts.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify([{
        'id': cta.id,
        'server_sub_id': cta.server_sub_id,
        'ts': cta.ts.isoformat(),
        'click': {
            'ip': cta.click.ip,
            'utm_source': cta.click.utm_source,
            'utm_campaign': cta.click.utm_campaign,
            'fbclid': cta.click.fbclid,
            'chat_link': {
                'slug': cta.click.chat_link.slug if cta.click and cta.click.chat_link else None,
                'marker': cta.click.chat_link.marker if cta.click and cta.click.chat_link else None
            }
        }
    } for cta in cta_clicks.items])

@app.route('/api/redirects')
@login_required
def get_redirects():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    query = Redirect.query.join(Click)
    if current_user.role == 'manager':
        query = query.join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == current_user.id)
    
    if search:
        query = query.filter(Redirect.server_sub_id.contains(search))
    
    if date_from:
        query = query.filter(Redirect.ts >= datetime.fromisoformat(date_from))
    
    if date_to:
        query = query.filter(Redirect.ts <= datetime.fromisoformat(date_to))
    
    redirects = query.order_by(Redirect.ts.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify([{
        'id': redirect.id,
        'server_sub_id': redirect.server_sub_id,
        'ts': redirect.ts.isoformat(),
        'target_url': redirect.target_url,
        'click': {
            'ip': redirect.click.ip,
            'utm_source': redirect.click.utm_source,
            'utm_campaign': redirect.click.utm_campaign,
            'fbclid': redirect.click.fbclid
        }
    } for redirect in redirects.items])

@app.route('/api/leads')
@login_required
def get_leads():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    manager = request.args.get('manager', '')
    
    query = Lead.query.join(Click)
    if current_user.role == 'manager':
        query = query.join(ChatLink, Click.chat_link_id == ChatLink.id).filter(ChatLink.owner_id == current_user.id)
    
    if search:
        query = query.filter(Lead.server_sub_id.contains(search))
    
    if status:
        query = query.filter(Lead.status == status)
    
    if date_from:
        query = query.filter(Lead.ts >= datetime.fromisoformat(date_from))
    
    if date_to:
        query = query.filter(Lead.ts <= datetime.fromisoformat(date_to))
    
    if manager:
        query = query.filter(Lead.manager.contains(manager))
    
    leads = query.order_by(Lead.ts.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify([{
        'id': lead.id,
        'server_sub_id': lead.server_sub_id,
        'ts': lead.ts.isoformat(),
        'status': lead.status,
        'revenue': float(lead.revenue) if lead.revenue else 0,
        'currency': lead.currency,
        'pixel_id': lead.pixel_id,
        'manager': lead.manager,
        'click': {
            'ip': lead.click.ip,
            'utm_source': lead.click.utm_source,
            'utm_campaign': lead.click.utm_campaign,
            'fbclid': lead.click.fbclid
        }
    } for lead in leads.items])

# SocketIO events
@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        emit('connected', {'message': 'Connected to admin panel'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Create admin user if not exists
        if not User.query.filter_by(email=os.getenv('ADMIN_EMAIL', 'admin@example.com')).first():
            admin = User(
                email=os.getenv('ADMIN_EMAIL', 'admin@example.com'),
                role='admin'
            )
            admin.set_password(os.getenv('ADMIN_PASSWORD', 'admin123'))
            db.session.add(admin)
            db.session.commit()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
