# Facebook Tracking System

Полнофункциональная трекинговая система для отслеживания трафика с Facebook через Keitaro на лендинг с последующим редиректом в Telegram бизнес-чаты.

## 🚀 Возможности

- **Трекинг кликов**: Полное отслеживание всех параметров клика (UTM, fbclid, fbp, fbc, sub_id)
- **302 редирект**: Через собственный эндпойнт `/u` для точного фиксирования кликов
- **Бизнес-ссылки**: Управление пулом Telegram бизнес-ссылок с уникальными маркерами
- **Админ-панель**: Real-time обновления через SocketIO с графиками и таблицами
- **Facebook CAPI**: Интеграция с Facebook Conversions API для отправки событий
- **Keitaro S2S**: Postback в Keitaro с макросами subid, status, revenue, currency
- **Безопасность**: Шифрование токенов, CORS защита, идемпотентность

## 🏗️ Архитектура

```
Facebook → Keitaro → Лендинг → /api/track-click → /api/track-cta-click → /u → Telegram
                                                      ↓
                                              Админ-панель ← SocketIO
                                                      ↓
                                              Facebook CAPI + Keitaro S2S
```

## 📋 Требования

- Python 3.11+
- PostgreSQL (или SQLite для разработки)
- Docker & Docker Compose (опционально)

## 🛠️ Установка

### 1. Клонирование и настройка

```bash
git clone <repository-url>
cd facebookauto
```

### 2. Создание виртуального окружения

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

### 3. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 4. Настройка переменных окружения

```bash
cp env.example .env
```

Отредактируйте `.env` файл:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/facebook_tracking

# Flask
SECRET_KEY=your-secret-key-here
FLASK_ENV=development

# Facebook CAPI
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret

# Keitaro
KEITARO_POSTBACK_URL=https://your-keitaro.com/postback?subid={subid}&status={status}&revenue={revenue}&currency={currency}

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Security
ENCRYPTION_KEY=your-32-char-encryption-key-here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,https://yourdomain.com
```

### 5. Инициализация базы данных

```bash
# Создание миграций
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Загрузка тестовых данных
python seed_data.py
```

### 6. Запуск приложения

```bash
python app.py
```

Приложение будет доступно по адресу: http://localhost:5000

## 🐳 Docker

### Запуск с Docker Compose

```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# В фоновом режиме
docker-compose up -d --build
```

### Остановка

```bash
docker-compose down
```

## 📊 Использование

### 1. Лендинг страница

Доступна по адресу: http://localhost:5000

Лендинг автоматически:
- Собирает UTM параметры из URL
- Читает Facebook cookies (_fbp, _fbc)
- Генерирует fbc если есть fbclid
- Отправляет данные на `/api/track-click`
- При клике на CTA вызывает `/api/track-cta-click`
- Перенаправляет через `/u` на Telegram

### 2. Админ-панель

Доступна по адресу: http://localhost:5000/admin

**Логин по умолчанию:**
- Email: admin@example.com
- Пароль: admin123

**Возможности:**
- Real-time дашборд с графиками
- Просмотр всех кликов с фильтрацией
- Управление бизнес-ссылками
- Настройка Facebook Pixel
- Создание лидов с отправкой в CAPI и Keitaro

### 3. API Эндпойнты

#### POST /api/track-click
Трекинг клика с лендинга

```json
{
  "full_url": "https://example.com/landing?utm_source=facebook",
  "referrer": "https://facebook.com",
  "user_agent": "Mozilla/5.0...",
  "ip": "192.168.1.1",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "summer_sale",
  "fbclid": "IwAR...",
  "fbp": "fb.1.1234567890.1234567890",
  "fbc": "fb.1.1234567890.IwAR...",
  "keitaro_sub_id": "kt_123456"
}
```

**Ответ:**
```json
{
  "server_sub_id": "uuid-here",
  "chat_link": {
    "slug": "expert_chat_1",
    "marker": "🚀"
  }
}
```

#### POST /api/track-cta-click
Трекинг клика по CTA кнопке

```json
{
  "server_sub_id": "uuid-here"
}
```

**Ответ:**
```json
{
  "redirect": "/u?ref=uuid-here"
}
```

#### GET /u?ref={server_sub_id}
Редирект на Telegram бизнес-ссылку

Возвращает 302 редирект на `https://t.me/m/{slug}`

#### POST /api/lead
Создание лида (требует авторизации)

```json
{
  "server_sub_id": "uuid-here",
  "status": "Lead",
  "revenue": 100.50,
  "currency": "USD",
  "pixel_id": "123456789012345",
  "access_token": "your-token",
  "manager": "admin@example.com"
}
```

## 🔧 Настройка

### 1. Бизнес-ссылки Telegram

1. Создайте бизнес-ссылки в Telegram
2. Добавьте их в админ-панели в разделе "Бизнес-ссылки"
3. Укажите уникальный маркер (эмодзи) для каждой ссылки
4. Настройте сообщение для менеджеров

### 2. Facebook Conversions API

1. Получите Pixel ID и Access Token в Facebook Business Manager
2. Добавьте их в админ-панели в разделе "Настройки Pixel"
3. Токены автоматически шифруются в базе данных

### 3. Keitaro S2S

1. Настройте URL постбека в Keitaro
2. Укажите URL в переменной `KEITARO_POSTBACK_URL`
3. Используйте макросы: `{subid}`, `{status}`, `{revenue}`, `{currency}`

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
python -m pytest tests/ -v

# Конкретный файл
python -m pytest tests/test_api.py -v

# С покрытием
python -m pytest tests/ --cov=app --cov-report=html
```

### Тестовые данные

```bash
# Создание тестовых данных
python seed_data.py
```

Создает:
- 2 пользователя (admin, manager)
- 5 бизнес-ссылок
- 100 кликов за последние 30 дней
- 2 настройки Pixel

## 📈 Мониторинг

### Логи

Приложение использует структурированные JSON логи:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "message": "Click tracked",
  "server_sub_id": "uuid-here",
  "ip": "192.168.1.1",
  "utm_source": "facebook"
}
```

### Метрики

- Общее количество кликов
- Конверсия CTA кликов
- Количество редиректов
- Созданные лиды
- Источники трафика

## 🔒 Безопасность

- **Шифрование токенов**: Access Token шифруются с помощью Fernet
- **CORS защита**: Настраиваемые разрешенные домены
- **Идемпотентность**: Защита от дублирования кликов
- **Валидация данных**: Проверка всех входящих параметров
- **Rate limiting**: Защита от спама (можно добавить)

## 🚀 Развертывание

### Production настройки

1. Измените `FLASK_ENV=production`
2. Используйте PostgreSQL вместо SQLite
3. Настройте Nginx для статических файлов
4. Используйте Gunicorn или uWSGI
5. Настройте SSL сертификаты

### Пример Nginx конфигурации

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static/ {
        alias /path/to/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📝 API Документация

### Полная документация API

| Метод | Эндпойнт | Описание | Авторизация |
|-------|----------|----------|-------------|
| POST | `/api/track-click` | Трекинг клика | Нет |
| POST | `/api/track-cta-click` | Трекинг CTA | Нет |
| GET | `/u` | Редирект | Нет |
| POST | `/api/lead` | Создание лида | Да |
| GET | `/api/chat-links` | Список ссылок | Нет |
| POST | `/api/chat-links` | Управление ссылками | Да |
| GET | `/api/dashboard/stats` | Статистика | Да |
| GET | `/api/clicks` | Список кликов | Да |

### Примеры запросов

#### cURL для трекинга клика

```bash
curl -X POST http://localhost:5000/api/track-click \
  -H "Content-Type: application/json" \
  -d '{
    "full_url": "https://example.com/landing?utm_source=facebook&utm_campaign=test",
    "referrer": "https://facebook.com",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "ip": "192.168.1.1",
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "test",
    "fbclid": "IwAR1234567890",
    "keitaro_sub_id": "kt_123456"
  }'
```

#### cURL для создания лида

```bash
curl -X POST http://localhost:5000/api/lead \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "server_sub_id": "uuid-here",
    "status": "Lead",
    "revenue": 100.50,
    "currency": "USD",
    "pixel_id": "123456789012345",
    "access_token": "your-token",
    "manager": "admin@example.com"
  }'
```

## 🤝 Поддержка

При возникновении проблем:

1. Проверьте логи приложения
2. Убедитесь в правильности настроек .env
3. Проверьте подключение к базе данных
4. Запустите тесты для диагностики

## 📄 Лицензия

MIT License

---

**Создано для эффективного трекинга Facebook трафика с полной интеграцией в экосистему маркетинга.**
