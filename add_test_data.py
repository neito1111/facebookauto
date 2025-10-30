#!/usr/bin/env python3
"""
Добавление тестовых данных в базу
"""

from app import app, db, ChatLink, PixelSetting

def add_test_data():
    with app.app_context():
        # Добавляем тестовые ссылки
        link1 = ChatLink(
            slug='test1',
            title='Тестовая ссылка 1',
            message='Привет! Это тестовая ссылка',
            marker='🔥',
            active=True
        )
        
        link2 = ChatLink(
            slug='test2',
            title='Тестовая ссылка 2',
            message='Еще одна тестовая ссылка',
            marker='💎',
            active=True
        )
        
        # Добавляем тестовый Pixel
        pixel1 = PixelSetting(
            pixel_id='123456789',
            name='Test Pixel',
            active=True
        )
        pixel1.set_access_token('test_token_123')
        
        db.session.add(link1)
        db.session.add(link2)
        db.session.add(pixel1)
        db.session.commit()
        
        print('Тестовые данные добавлены успешно!')

if __name__ == '__main__':
    add_test_data()
