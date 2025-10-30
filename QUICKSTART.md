# 🚀 Быстрый старт - Facebook Tracking System

## ⚡ Запуск за 5 минут

### 1. Автоматический запуск (рекомендуется)

```bash
# Запустите скрипт быстрого старта
python run.py
```

Скрипт автоматически:
- ✅ Проверит требования
- ✅ Создаст виртуальное окружение
- ✅ Установит зависимости
- ✅ Настроит базу данных
- ✅ Загрузит тестовые данные
- ✅ Запустит приложение

### 2. Ручной запуск

```bash
# 1. Создайте виртуальное окружение
python -m venv venv

# 2. Активируйте его
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. Установите зависимости
pip install -r requirements.txt

# 4. Настройте переменные окружения
cp env.example .env
# Отредактируйте .env при необходимости

# 5. Инициализируйте базу данных
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# 6. Загрузите тестовые данные
python seed_data.py

# 7. Запустите приложение
python app.py
```

### 3. Docker запуск

```bash
# Запустите все сервисы
docker-compose up --build

# В фоновом режиме
docker-compose up -d --build
```

## 🌐 Доступ к приложению

После запуска приложение будет доступно по адресам:

- **Лендинг**: http://localhost:5000
- **Админ-панель**: http://localhost:5000/admin

## 🔑 Логин в админ-панель

- **Email**: admin@example.com
- **Пароль**: admin123

## 🧪 Тестирование

### 1. Тест лендинга

Откройте в браузере:
```
http://localhost:5000?utm_source=facebook&utm_campaign=test&fbclid=IwAR1234567890
```

### 2. Тест API

```bash
# Трекинг клика
curl -X POST http://localhost:5000/api/track-click \
  -H "Content-Type: application/json" \
  -d '{
    "full_url": "https://example.com/landing?utm_source=facebook",
    "referrer": "https://facebook.com",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "ip": "192.168.1.1",
    "utm_source": "facebook",
    "utm_campaign": "test",
    "fbclid": "IwAR1234567890"
  }'
```

## 📊 Что включено в тестовых данных

- **2 пользователя**: admin@example.com, manager@example.com
- **5 бизнес-ссылок** с уникальными маркерами
- **100 кликов** за последние 30 дней
- **2 настройки Pixel** для тестирования

## 🔧 Настройка для продакшена

1. **Измените пароли** в админ-панели
2. **Настройте реальные Pixel ID** и Access Token
3. **Добавьте ваши бизнес-ссылки** Telegram
4. **Настройте Keitaro URL** в .env
5. **Используйте PostgreSQL** вместо SQLite

## 📚 Дополнительная документация

- **README.md** - Полная документация
- **examples.md** - Примеры использования
- **tests/** - Тесты системы

## 🆘 Помощь

Если что-то не работает:

1. Проверьте логи в консоли
2. Убедитесь, что порт 5000 свободен
3. Проверьте настройки .env
4. Запустите тесты: `python -m pytest tests/ -v`

---

**🎉 Готово! Ваша трекинговая система запущена и готова к использованию!**
