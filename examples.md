# Примеры использования Facebook Tracking System

## 🚀 Быстрый старт

### 1. Запуск в Docker

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd facebookauto

# Настройте переменные окружения
cp env.example .env
# Отредактируйте .env файл

# Запустите все сервисы
docker-compose up --build

# Приложение будет доступно на http://localhost
```

### 2. Локальная разработка

```bash
# Создайте виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установите зависимости
pip install -r requirements.txt

# Настройте базу данных
cp env.example .env
# Отредактируйте .env для использования SQLite

# Инициализируйте базу данных
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Загрузите тестовые данные
python seed_data.py

# Запустите приложение
python app.py
```

## 📊 Тестирование трекинга

### 1. Тест лендинга

Откройте в браузере:
```
http://localhost:5000?utm_source=facebook&utm_campaign=test&fbclid=IwAR1234567890
```

Лендинг автоматически:
- Соберет UTM параметры
- Создаст запись в базе данных
- Покажет кнопку "Перейти в чат"

### 2. Тест API напрямую

```bash
# Трекинг клика
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

# Ответ:
# {
#   "server_sub_id": "uuid-here",
#   "chat_link": {
#     "slug": "expert_chat_1",
#     "marker": "🚀"
#   }
# }
```

### 3. Тест CTA клика

```bash
# Используйте server_sub_id из предыдущего ответа
curl -X POST http://localhost:5000/api/track-cta-click \
  -H "Content-Type: application/json" \
  -d '{
    "server_sub_id": "uuid-here"
  }'

# Ответ:
# {
#   "redirect": "/u?ref=uuid-here"
# }
```

### 4. Тест редиректа

```bash
# Перейдите по ссылке из предыдущего ответа
curl -I "http://localhost:5000/u?ref=uuid-here"

# Должен вернуть 302 редирект на https://t.me/m/expert_chat_1
```

## 🔧 Настройка админ-панели

### 1. Вход в админ-панель

1. Откройте http://localhost:5000/admin
2. Войдите с данными:
   - Email: admin@example.com
   - Пароль: admin123

### 2. Настройка бизнес-ссылок

1. Перейдите в раздел "Бизнес-ссылки"
2. Нажмите "Добавить ссылку"
3. Заполните:
   - Slug: `my_chat_link`
   - Title: `Мой чат`
   - Message: `Добро пожаловать! 🎉`
   - Marker: `🎉`
4. Сохраните

### 3. Настройка Facebook Pixel

1. Перейдите в раздел "Настройки Pixel"
2. Нажмите "Добавить Pixel"
3. Заполните:
   - Pixel ID: `123456789012345`
   - Имя: `Main Pixel`
   - Access Token: `your-access-token`
4. Сохраните

### 4. Создание лида

1. Перейдите в раздел "Клики"
2. Найдите нужный клик
3. Нажмите на иконку глаза для просмотра деталей
4. В модальном окне нажмите "Lead"
5. Введите сумму и выберите Pixel
6. Нажмите "Отправить"

## 📈 Мониторинг и аналитика

### 1. Дашборд

Админ-панель показывает:
- Общее количество кликов
- CTA клики
- Редиректы
- Лиды
- Графики по дням
- Источники трафика

### 2. Фильтрация данных

В разделе "Клики" можно фильтровать по:
- Поисковому запросу (IP, fbclid, server_sub_id)
- Дате (от/до)
- Источнику трафика

### 3. Экспорт данных

- Нажмите "Экспорт CSV" для скачивания данных
- Данные экспортируются в формате CSV

## 🔗 Интеграция с внешними системами

### 1. Keitaro

Настройте URL постбека в Keitaro:
```
https://your-domain.com/keitaro-postback?subid={subid}&status={status}&revenue={revenue}&currency={currency}
```

### 2. Facebook Conversions API

Система автоматически отправляет события в Facebook CAPI при создании лида:
- Event Name: Lead
- Event Time: Unix timestamp
- Event ID: server_sub_id
- User Data: IP, User Agent, fbp, fbc, fbclid
- Custom Data: revenue, currency

### 3. Telegram

Создайте бизнес-ссылки в Telegram:
1. Откройте Telegram Business
2. Создайте ссылку вида `t.me/m/your_slug`
3. Добавьте в систему через админ-панель

## 🧪 Тестирование

### 1. Запуск тестов

```bash
# Все тесты
python -m pytest tests/ -v

# Конкретный тест
python -m pytest tests/test_api.py::test_track_click -v

# С покрытием
python -m pytest tests/ --cov=app --cov-report=html
```

### 2. Тестовые данные

```bash
# Создание тестовых данных
python seed_data.py

# Создает:
# - 2 пользователя (admin, manager)
# - 5 бизнес-ссылок
# - 100 кликов за последние 30 дней
# - 2 настройки Pixel
```

## 🚨 Устранение неполадок

### 1. Проблемы с базой данных

```bash
# Пересоздание базы данных
rm app.db  # для SQLite
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
python seed_data.py
```

### 2. Проблемы с Docker

```bash
# Пересборка контейнеров
docker-compose down
docker-compose up --build

# Просмотр логов
docker-compose logs -f web
```

### 3. Проблемы с CORS

Убедитесь, что в `.env` правильно настроены разрешенные домены:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,https://yourdomain.com
```

### 4. Проблемы с Facebook CAPI

1. Проверьте правильность Pixel ID и Access Token
2. Убедитесь, что токен имеет права на отправку событий
3. Проверьте логи в админ-панели

## 📱 Мобильная версия

Лендинг адаптивен и корректно работает на мобильных устройствах:
- Автоматическое определение мобильного User Agent
- Адаптивная верстка
- Touch-friendly интерфейс

## 🔐 Безопасность

### 1. Шифрование токенов

Все Access Token автоматически шифруются в базе данных с помощью Fernet.

### 2. CORS защита

Настраиваемые разрешенные домены предотвращают нежелательные запросы.

### 3. Валидация данных

Все входящие данные проверяются и валидируются.

## 📊 Производительность

### 1. Оптимизация запросов

- Индексы на часто используемые поля
- Пагинация для больших таблиц
- Кэширование статических файлов

### 2. Масштабирование

- Горизонтальное масштабирование через Docker
- Возможность использования Redis для кэширования
- Настройка Nginx для балансировки нагрузки

## 🎯 Лучшие практики

### 1. Мониторинг

- Регулярно проверяйте логи
- Настройте алерты на критические ошибки
- Мониторьте производительность базы данных

### 2. Резервное копирование

- Регулярно создавайте бэкапы базы данных
- Сохраняйте конфигурационные файлы
- Тестируйте восстановление из бэкапа

### 3. Обновления

- Регулярно обновляйте зависимости
- Тестируйте изменения в dev окружении
- Используйте версионирование для развертывания

---

**Система готова к использованию! Начните с загрузки тестовых данных и настройки ваших бизнес-ссылок.**
