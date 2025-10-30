#!/usr/bin/env python3
"""
Seed data script for Facebook Tracking System
Creates sample data for testing and development
"""

import os
import sys
from datetime import datetime, timedelta
import random

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db, User, ChatLink, Click, CtaClick, Redirect, Lead, PixelSetting
from werkzeug.security import generate_password_hash

def create_sample_data():
    """Create sample data for testing"""
    
    with app.app_context():
        # Create tables
        db.create_all()
        
        print("Creating sample data...")
        
        # Create admin user
        admin_user = User.query.filter_by(email='admin@example.com').first()
        if not admin_user:
            admin_user = User(
                email='admin@example.com',
                role='admin'
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            print("OK: Created admin user")
        
        # Create manager user
        manager_user = User.query.filter_by(email='manager@example.com').first()
        if not manager_user:
            manager_user = User(
                email='manager@example.com',
                role='manager'
            )
            manager_user.set_password('manager123')
            db.session.add(manager_user)
            print("OK: Created manager user")
        
        # Create sample chat links
        chat_links_data = [
            {
                'slug': 'expert_chat_1',
                'title': 'Экспертный чат #1',
                'message': 'Добро пожаловать в наш закрытый чат! 🚀 Здесь вы получите эксклюзивные советы от профессионалов.',
                'marker': '🚀',
                'active': True
            },
            {
                'slug': 'premium_support',
                'title': 'Премиум поддержка',
                'message': 'Привет! 👋 Добро пожаловать в премиум чат поддержки. Наши эксперты готовы помочь вам!',
                'marker': '👋',
                'active': True
            },
            {
                'slug': 'vip_community',
                'title': 'VIP сообщество',
                'message': '🎉 Поздравляем! Вы присоединились к нашему VIP сообществу. Здесь только лучшие!',
                'marker': '🎉',
                'active': True
            },
            {
                'slug': 'business_mentors',
                'title': 'Бизнес-менторы',
                'message': '💼 Добро пожаловать в чат с бизнес-менторами! Готовы делиться опытом и помогать расти.',
                'marker': '💼',
                'active': True
            },
            {
                'slug': 'crypto_experts',
                'title': 'Крипто-эксперты',
                'message': '₿ Привет! Добро пожаловать в чат крипто-экспертов. Будем делиться инсайдами!',
                'marker': '₿',
                'active': False  # Inactive for testing
            }
        ]
        
        for link_data in chat_links_data:
            existing_link = ChatLink.query.filter_by(slug=link_data['slug']).first()
            if not existing_link:
                chat_link = ChatLink(**link_data)
                db.session.add(chat_link)
                print(f"OK: Created chat link: {link_data['slug']}")
        
        # Create sample pixel settings
        pixel_settings_data = [
            {
                'pixel_id': '123456789012345',
                'name': 'Main Pixel',
                'access_token': 'sample_access_token_1',
                'active': True
            },
            {
                'pixel_id': '987654321098765',
                'name': 'Test Pixel',
                'access_token': 'sample_access_token_2',
                'active': True
            }
        ]
        
        for pixel_data in pixel_settings_data:
            existing_pixel = PixelSetting.query.filter_by(pixel_id=pixel_data['pixel_id']).first()
            if not existing_pixel:
                pixel_setting = PixelSetting(
                    pixel_id=pixel_data['pixel_id'],
                    name=pixel_data['name'],
                    active=pixel_data['active']
                )
                pixel_setting.set_access_token(pixel_data['access_token'])
                db.session.add(pixel_setting)
                print(f"OK: Created pixel setting: {pixel_data['name']}")
        
        # Create sample clicks with various UTM parameters
        utm_sources = ['facebook', 'google', 'instagram', 'youtube', 'direct']
        utm_mediums = ['cpc', 'social', 'organic', 'email', 'referral']
        utm_campaigns = ['summer_sale', 'black_friday', 'new_year', 'spring_promo', 'winter_campaign']
        
        # Get active chat links
        active_chat_links = ChatLink.query.filter_by(active=True).all()
        
        # Create sample clicks for the last 30 days
        for i in range(100):
            # Random date within last 30 days
            days_ago = random.randint(0, 30)
            click_time = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            # Random UTM parameters
            utm_source = random.choice(utm_sources)
            utm_medium = random.choice(utm_mediums)
            utm_campaign = random.choice(utm_campaigns)
            
            # Generate fake fbclid
            fbclid = f"IwAR{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', k=22))}"
            
            # Generate fake IP
            ip = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            
            # Random user agent
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'
            ]
            
            # Create click
            click = Click(
                server_sub_id=f"click_{i}_{random.randint(1000, 9999)}",
                ts=click_time,
                ip=ip,
                ua=random.choice(user_agents),
                referrer=f"https://{utm_source}.com/campaign/{utm_campaign}",
                landing_url=f"https://example.com/landing?utm_source={utm_source}&utm_medium={utm_medium}&utm_campaign={utm_campaign}&fbclid={fbclid}",
                params={
                    'utm_source': utm_source,
                    'utm_medium': utm_medium,
                    'utm_campaign': utm_campaign,
                    'fbclid': fbclid
                },
                utm_source=utm_source,
                utm_medium=utm_medium,
                utm_campaign=utm_campaign,
                utm_content=f"ad_{random.randint(1, 10)}",
                utm_term=f"keyword_{random.randint(1, 5)}",
                fbclid=fbclid,
                fbp=f"fb.1.{int(click_time.timestamp())}.{random.randint(1000000000, 9999999999)}",
                fbc=f"fb.1.{int(click_time.timestamp())}.{fbclid}",
                keitaro_sub_id=f"kt_{random.randint(100000, 999999)}",
                route='default',
                chat_link_id=random.choice(active_chat_links).id if active_chat_links else None
            )
            
            db.session.add(click)
            
            # Randomly create CTA clicks (70% chance)
            if random.random() < 0.7:
                cta_click = CtaClick(
                    server_sub_id=click.server_sub_id,
                    ts=click_time + timedelta(seconds=random.randint(10, 300))
                )
                db.session.add(cta_click)
            
            # Randomly create redirects (60% of CTA clicks)
            if random.random() < 0.6:
                redirect = Redirect(
                    server_sub_id=click.server_sub_id,
                    ts=click_time + timedelta(seconds=random.randint(30, 600)),
                    target_url=f"https://t.me/m/{click.chat_link.slug}" if click.chat_link else "https://t.me/m/default"
                )
                db.session.add(redirect)
            
            # Randomly create leads (20% of redirects)
            if random.random() < 0.2:
                lead_statuses = ['Lead', 'Subscribe', 'Reject']
                lead = Lead(
                    server_sub_id=click.server_sub_id,
                    ts=click_time + timedelta(minutes=random.randint(5, 60)),
                    status=random.choice(lead_statuses),
                    revenue=random.uniform(10, 500),
                    currency='USD',
                    pixel_id='123456789012345',
                    pixel_resp={'success': True, 'status_code': 200},
                    keitaro_resp={'success': True, 'status_code': 200},
                    manager=random.choice(['admin@example.com', 'manager@example.com'])
                )
                db.session.add(lead)
        
        # Commit all changes
        db.session.commit()
        
        print("\nSUCCESS: Sample data created successfully!")
        print(f"   - Users: {User.query.count()}")
        print(f"   - Chat Links: {ChatLink.query.count()}")
        print(f"   - Clicks: {Click.query.count()}")
        print(f"   - CTA Clicks: {CtaClick.query.count()}")
        print(f"   - Redirects: {Redirect.query.count()}")
        print(f"   - Leads: {Lead.query.count()}")
        print(f"   - Pixel Settings: {PixelSetting.query.count()}")
        
        print("\nLOGIN CREDENTIALS:")
        print("   Admin: admin@example.com / admin123")
        print("   Manager: manager@example.com / manager123")

if __name__ == '__main__':
    create_sample_data()
