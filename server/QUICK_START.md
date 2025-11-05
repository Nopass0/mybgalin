# 🚀 Быстрый старт системы автопоиска работы

## Шаг 1: Настройка .env файла

Скопируйте `.env.example` в `.env` и заполните:

```env
# База данных
DATABASE_URL=sqlite:./data.db

# Telegram бот (для аутентификации админки)
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
ADMIN_TELEGRAM_ID=ваш_telegram_id

# OpenRouter API (для AI генерации)
OPENROUTER_API_KEY=ваш_ключ_openrouter
AI_MODEL=google/gemini-2.5-flash-lite

# HH.ru OAuth приложение
HH_CLIENT_ID=ваш_client_id_от_hh
HH_CLIENT_SECRET=ваш_client_secret_от_hh
HH_REDIRECT_URI=https://bgalin.ru/auth/hh/callback

# Интервал поиска (в часах)
JOB_SEARCH_INTERVAL_HOURS=4

# Сервер
ROCKET_ADDRESS=127.0.0.1
ROCKET_PORT=8000
```

### Получение ключей:

1. **Telegram Bot Token**: 
   - Найдите @BotFather в Telegram
   - Отправьте `/newbot`
   - Получите токен

2. **Telegram ID**: 
   - Напишите @userinfobot
   - Получите свой ID

3. **OpenRouter API Key**:
   - Зарегистрируйтесь на https://openrouter.ai
   - Создайте API ключ в настройках

4. **HH.ru OAuth**:
   - Зарегистрируйте приложение на https://dev.hh.ru
   - Получите Client ID и Client Secret
   - Укажите Redirect URI

## Шаг 2: Запуск сервера

```bash
cd server
cargo run --release
```

Сервер запустится на `http://localhost:8000`

## Шаг 3: Авторизация в админке

```bash
# 1. Запросить OTP код (придет в Telegram)
curl -X POST http://localhost:8000/api/auth/request-otp

# 2. Проверить код и получить токен
curl -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
  
# Сохраните полученный token
```

## Шаг 4: Заполнение портфолио/резюме

```bash
# Токен из предыдущего шага
TOKEN="ваш_токен"

# 1. Добавить информацию "Обо мне"
curl -X POST http://localhost:8000/api/portfolio/about \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Опытный Backend разработчик с 5+ годами опыта в Rust, Python и веб-разработке. Специализируюсь на высоконагруженных системах и микросервисной архитектуре."
  }'

# 2. Добавить опыт работы
curl -X POST http://localhost:8000/api/portfolio/experience \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Backend Developer",
    "company": "Tech Company",
    "date_from": "2020-01-01",
    "date_to": null,
    "description": "Разработка высоконагруженных API на Rust, проектирование архитектуры микросервисов"
  }'

# 3. Добавить навыки
curl -X POST http://localhost:8000/api/portfolio/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rust",
    "category": "Programming Languages"
  }'

curl -X POST http://localhost:8000/api/portfolio/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PostgreSQL",
    "category": "Databases"
  }'

# 4. Добавить контакты (ОБЯЗАТЕЛЬНО!)
curl -X POST http://localhost:8000/api/portfolio/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "telegram",
    "value": "https://t.me/your_username",
    "label": "Telegram"
  }'

curl -X POST http://localhost:8000/api/portfolio/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "value": "your@email.com",
    "label": "Email"
  }'
```

## Шаг 5: Авторизация через HH.ru

```bash
# Получить URL для авторизации
curl http://localhost:8000/api/jobs/auth/hh \
  -H "Authorization: Bearer $TOKEN"

# Откройте полученный URL в браузере
# Авторизуйтесь на HH.ru
# После авторизации вы будете перенаправлены обратно
```

## Шаг 6: Настройка параметров поиска

```bash
curl -X PUT http://localhost:8000/api/jobs/search/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "search_text": "rust backend developer",
    "area_ids": ["1", "2"],
    "salary_from": 200000,
    "experience": "between3And6",
    "schedule": "remote"
  }'
```

### Параметры поиска:

- **search_text**: Ключевые слова для поиска
- **area_ids**: Коды городов (1=Москва, 2=СПб, 113=Вся Россия)
- **salary_from**: Минимальная зарплата
- **experience**: 
  - `noExperience` - без опыта
  - `between1And3` - 1-3 года
  - `between3And6` - 3-6 лет
  - `moreThan6` - более 6 лет
- **schedule**: 
  - `fullDay` - полный день
  - `shift` - сменный график
  - `flexible` - гибкий график
  - `remote` - удаленная работа
- **employment**:
  - `full` - полная занятость
  - `part` - частичная
  - `project` - проектная
- **only_with_salary**: true/false - только с указанной зарплатой

## Шаг 7: Запуск автопоиска! 🎉

```bash
# Запустить
curl -X POST http://localhost:8000/api/jobs/search/start \
  -H "Authorization: Bearer $TOKEN"
```

Система начнет:
- ✅ Искать вакансии каждые 4 часа (или как настроено)
- ✅ Автоматически генерировать сопроводительные письма
- ✅ Откликаться на подходящие вакансии
- ✅ Мониторить статусы откликов каждые 10 минут
- ✅ Отвечать на вопросы ботов в чатах
- ✅ Обновлять статусы (приглашения, отказы)

## Шаг 8: Мониторинг результатов

```bash
# Проверить статус системы
curl http://localhost:8000/api/jobs/search/status \
  -H "Authorization: Bearer $TOKEN"

# Посмотреть статистику
curl http://localhost:8000/api/jobs/stats \
  -H "Authorization: Bearer $TOKEN"

# Получить приглашения на собеседование
curl http://localhost:8000/api/jobs/vacancies/status/invited \
  -H "Authorization: Bearer $TOKEN"

# Получить все вакансии
curl http://localhost:8000/api/jobs/vacancies \
  -H "Authorization: Bearer $TOKEN"

# Остановить автопоиск
curl -X POST http://localhost:8000/api/jobs/search/stop \
  -H "Authorization: Bearer $TOKEN"
```

## Логи в консоли

Следите за логами сервера:

```
🔄 Job scheduler background task started
🔍 Running initial job search...
📋 Found 25 vacancies
✅ Applied to: Senior Rust Developer
✅ Applied to: Backend Developer (Rust)
✅ Job search completed. Applied to 3 new vacancies
💬 New message in chat for: Senior Rust Developer
🤖 Detected bot message, generating response...
✅ Sent auto-response to bot
```

## Важные замечания

⚠️ **Перед запуском автопоиска обязательно:**
1. Заполните информацию "Обо мне"
2. Добавьте хотя бы один опыт работы
3. Добавьте навыки
4. Добавьте контакты (telegram и email)
5. Авторизуйтесь через HH.ru

⚠️ **Ограничения HH.ru:**
- Не более 200 откликов в день
- Не более 50 запросов в минуту
- Система автоматически соблюдает rate limiting (5 сек между откликами)

✅ **Система работает в фоне:**
- После запуска `/api/jobs/search/start` вы можете закрыть терминал
- Сервер продолжит работать и искать вакансии
- Чтобы остановить - используйте `/api/jobs/search/stop`

## Что дальше?

Читайте полную документацию в [JOB_SEARCH_API.md](./JOB_SEARCH_API.md) для:
- Детального описания всех API эндпоинтов
- Понимания как работает система
- Продвинутых сценариев использования
- Параметров поиска и фильтров
