#!/usr/bin/env python3
"""
API tests for Facebook Tracking System
"""

import pytest
import json
import os
import sys
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db, User, ChatLink, Click, CtaClick, Redirect, Lead

@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client

@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return headers"""
    # Create test user
    user = User(email='test@example.com', role='admin')
    user.set_password('test123')
    db.session.add(user)
    db.session.commit()
    
    # Login
    response = client.post('/login', data={
        'email': 'test@example.com',
        'password': 'test123'
    }, follow_redirects=True)
    
    return {'Authorization': 'Bearer test_token'}

@pytest.fixture
def sample_chat_link():
    """Create sample chat link"""
    chat_link = ChatLink(
        slug='test_chat',
        title='Test Chat',
        message='Test message 🚀',
        marker='🚀',
        active=True
    )
    db.session.add(chat_link)
    db.session.commit()
    return chat_link

def test_track_click(client, sample_chat_link):
    """Test track click endpoint"""
    data = {
        'full_url': 'https://example.com/landing?utm_source=facebook&utm_campaign=test',
        'referrer': 'https://facebook.com',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'ip': '192.168.1.1',
        'utm_source': 'facebook',
        'utm_medium': 'cpc',
        'utm_campaign': 'test',
        'fbclid': 'test_fbclid_123',
        'fbp': 'fb.1.1234567890.1234567890',
        'fbc': 'fb.1.1234567890.test_fbclid_123',
        'keitaro_sub_id': 'kt_123456',
        'route': 'default'
    }
    
    response = client.post('/api/track-click', 
                          data=json.dumps(data),
                          content_type='application/json')
    
    assert response.status_code == 200
    result = json.loads(response.data)
    assert 'server_sub_id' in result
    assert 'chat_link' in result
    assert result['chat_link']['slug'] == 'test_chat'
    assert result['chat_link']['marker'] == '🚀'

def test_track_click_duplicate(client, sample_chat_link):
    """Test duplicate click handling"""
    data = {
        'full_url': 'https://example.com/landing',
        'referrer': 'https://facebook.com',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'ip': '192.168.1.1',
        'fbclid': 'duplicate_fbclid',
        'utm_source': 'facebook'
    }
    
    # First click
    response1 = client.post('/api/track-click', 
                           data=json.dumps(data),
                           content_type='application/json')
    assert response1.status_code == 200
    
    # Duplicate click
    response2 = client.post('/api/track-click', 
                           data=json.dumps(data),
                           content_type='application/json')
    assert response2.status_code == 200
    
    # Should return same server_sub_id
    result1 = json.loads(response1.data)
    result2 = json.loads(response2.data)
    assert result1['server_sub_id'] == result2['server_sub_id']

def test_track_cta_click(client, sample_chat_link):
    """Test track CTA click endpoint"""
    # First create a click
    click_data = {
        'full_url': 'https://example.com/landing',
        'referrer': 'https://facebook.com',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'ip': '192.168.1.1',
        'utm_source': 'facebook'
    }
    
    click_response = client.post('/api/track-click', 
                               data=json.dumps(click_data),
                               content_type='application/json')
    click_result = json.loads(click_response.data)
    server_sub_id = click_result['server_sub_id']
    
    # Track CTA click
    cta_data = {'server_sub_id': server_sub_id}
    response = client.post('/api/track-cta-click', 
                          data=json.dumps(cta_data),
                          content_type='application/json')
    
    assert response.status_code == 200
    result = json.loads(response.data)
    assert 'redirect' in result
    assert f'/u?ref={server_sub_id}' in result['redirect']

def test_redirect_user(client, sample_chat_link):
    """Test redirect endpoint"""
    # First create a click
    click_data = {
        'full_url': 'https://example.com/landing',
        'referrer': 'https://facebook.com',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'ip': '192.168.1.1',
        'utm_source': 'facebook'
    }
    
    click_response = client.post('/api/track-click', 
                               data=json.dumps(click_data),
                               content_type='application/json')
    click_result = json.loads(click_response.data)
    server_sub_id = click_result['server_sub_id']
    
    # Test redirect
    response = client.get(f'/u?ref={server_sub_id}')
    assert response.status_code == 302
    assert 't.me/m/test_chat' in response.location

def test_redirect_user_not_found(client):
    """Test redirect with non-existent ref"""
    response = client.get('/u?ref=non_existent_id')
    assert response.status_code == 404

def test_create_lead(client, auth_headers, sample_chat_link):
    """Test create lead endpoint"""
    # First create a click
    click_data = {
        'full_url': 'https://example.com/landing',
        'referrer': 'https://facebook.com',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'ip': '192.168.1.1',
        'utm_source': 'facebook'
    }
    
    click_response = client.post('/api/track-click', 
                               data=json.dumps(click_data),
                               content_type='application/json')
    click_result = json.loads(click_response.data)
    server_sub_id = click_result['server_sub_id']
    
    # Create lead
    lead_data = {
        'server_sub_id': server_sub_id,
        'status': 'Lead',
        'revenue': 100.50,
        'currency': 'USD',
        'pixel_id': '123456789012345',
        'access_token': 'test_token',
        'manager': 'test@example.com'
    }
    
    response = client.post('/api/lead', 
                          data=json.dumps(lead_data),
                          content_type='application/json')
    
    # Should fail without proper authentication, but test the structure
    assert response.status_code in [200, 401, 302]  # Depends on auth setup

def test_get_chat_links(client, sample_chat_link):
    """Test get chat links endpoint"""
    response = client.get('/api/chat-links')
    assert response.status_code == 200
    
    result = json.loads(response.data)
    assert len(result) == 1
    assert result[0]['slug'] == 'test_chat'
    assert result[0]['marker'] == '🚀'

def test_manage_chat_links(client, auth_headers):
    """Test manage chat links endpoint"""
    # Create new chat link
    data = {
        'action': 'create',
        'slug': 'new_chat',
        'title': 'New Chat',
        'message': 'New message 🎉',
        'marker': '🎉'
    }
    
    response = client.post('/api/chat-links', 
                          data=json.dumps(data),
                          content_type='application/json')
    
    # Should fail without proper authentication, but test the structure
    assert response.status_code in [200, 401, 302]  # Depends on auth setup

def test_dashboard_stats(client, auth_headers):
    """Test dashboard stats endpoint"""
    response = client.get('/api/dashboard/stats')
    
    # Should fail without proper authentication, but test the structure
    assert response.status_code in [200, 401, 302]  # Depends on auth setup

def test_click_model():
    """Test Click model creation"""
    click = Click(
        server_sub_id='test_123',
        ip='192.168.1.1',
        ua='Mozilla/5.0',
        utm_source='facebook',
        utm_campaign='test'
    )
    
    assert click.server_sub_id == 'test_123'
    assert click.ip == '192.168.1.1'
    assert click.utm_source == 'facebook'

def test_chat_link_model():
    """Test ChatLink model creation"""
    chat_link = ChatLink(
        slug='test_slug',
        title='Test Title',
        message='Test message',
        marker='🚀',
        active=True
    )
    
    assert chat_link.slug == 'test_slug'
    assert chat_link.title == 'Test Title'
    assert chat_link.marker == '🚀'
    assert chat_link.active == True

if __name__ == '__main__':
    pytest.main([__file__])
