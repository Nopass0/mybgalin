# GitHub Secrets Configuration

Для автоматического деплоя необходимо настроить следующие секреты в GitHub репозитории.

## Как добавить секреты

1. Перейдите в репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Нажмите "New repository secret"
4. Добавьте каждый секрет из списка ниже

## Список необходимых секретов

### SSH подключение к серверу

**SERVER_HOST**
- Описание: IP адрес или домен вашего сервера
- Пример: `123.45.67.89` или `bgalin.ru`

**SERVER_USER**
- Описание: Имя пользователя для SSH подключения
- Пример: `root` или `bgalin`

**SERVER_PASSWORD** (опционально, если используете SSH ключ)
- Описание: Пароль для SSH подключения
- Пример: `your_secure_password`
- Примечание: Можно оставить пустым, если используете SSH_PRIVATE_KEY

**SSH_PRIVATE_KEY** (опционально, если используете пароль)
- Описание: Приватный SSH ключ для подключения
- Как получить:
  1. На вашем компьютере: `cat ~/.ssh/id_rsa` (Linux/Mac) или `type %USERPROFILE%\.ssh\id_rsa` (Windows)
  2. Скопируйте весь ключ включая `-----BEGIN` и `-----END`
- Примечание: Если у вас нет ключа, создайте: `ssh-keygen -t rsa -b 4096`
- Важно: Добавьте публичный ключ на сервер: `ssh-copy-id user@server`

**SERVER_PORT**
- Описание: Порт SSH (обычно 22)
- Значение: `22`

### Переменные окружения приложения

**DATABASE_URL**
- Описание: Путь к базе данных SQLite
- Значение: `sqlite:./data.db`

**TELEGRAM_BOT_TOKEN**
- Описание: Токен Telegram бота
- Как получить: 
  1. Найдите @BotFather в Telegram
  2. Отправьте `/newbot`
  3. Следуйте инструкциям
- Пример: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789`

**ADMIN_TELEGRAM_ID**
- Описание: Ваш Telegram ID (для авторизации и уведомлений)
- Как получить:
  1. Найдите @userinfobot в Telegram
  2. Отправьте `/start`
  3. Скопируйте ваш ID
- Пример: `123456789`

**HH_CLIENT_ID**
- Описание: Client ID приложения HeadHunter
- Как получить:
  1. Перейдите на https://dev.hh.ru/
  2. Зарегистрируйте приложение
  3. Скопируйте Client ID
- Пример: `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD`

**HH_CLIENT_SECRET**
- Описание: Client Secret приложения HeadHunter
- Как получить: При регистрации приложения на dev.hh.ru
- Пример: `1234567890abcdefghijklmnopqrstuvwxyz123456`

**HH_REDIRECT_URI** (больше не используется в workflows)
- Описание: URL для callback после авторизации на HH.ru
- Значение для production: `https://bgalin.ru/auth/hh/callback` (хардкоден в workflows)
- Значение для dev: `http://localhost:3001/auth/hh/callback`
- Примечание: В production workflows автоматически используется `https://bgalin.ru/auth/hh/callback`, секрет можно не добавлять

**STEAM_API_KEY** (опционально)
- Описание: API ключ Steam для интеграции с CS2
- Как получить: https://steamcommunity.com/dev/apikey
- Пример: `796C86F9E69040C57643509A4C796EB8`

**STEAM_ID** (опционально)
- Описание: Ваш 64-bit Steam ID
- Как получить: https://steamid.io/
- Пример: `76561197960287930`

**FACEIT_API_KEY** (опционально)
- Описание: API ключ Faceit
- Как получить: https://developers.faceit.com/
- Пример: `your_faceit_api_key_here`

**GSI_AUTH_TOKEN**
- Описание: Токен для CS2 Game State Integration
- Значение: Любая случайная строка
- Пример: `my_super_secret_token_12345`

**OPENROUTER_API_KEY**
- Описание: API ключ OpenRouter для генерации сопроводительных писем через AI
- Как получить:
  1. Перейдите на https://openrouter.ai/
  2. Зарегистрируйтесь или войдите
  3. Keys → Create Key
- Пример: `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`

**AI_MODEL**
- Описание: Модель AI для генерации текстов
- Значение: `google/gemini-2.0-flash-exp:free` (или другая модель из OpenRouter)
- Пример: `google/gemini-2.0-flash-exp:free`

**JOB_SEARCH_INTERVAL_HOURS**
- Описание: Интервал поиска вакансий в часах
- Значение: `4` (рекомендуется)
- Пример: `4`

## Проверка секретов

После добавления всех секретов, список должен выглядеть так:

### Обязательные:
```
✅ SERVER_HOST
✅ SERVER_USER
✅ SERVER_PASSWORD (или SSH_PRIVATE_KEY)
✅ SERVER_PORT
✅ DATABASE_URL
✅ TELEGRAM_BOT_TOKEN
✅ ADMIN_TELEGRAM_ID
✅ GSI_AUTH_TOKEN
✅ OPENROUTER_API_KEY
✅ AI_MODEL
✅ HH_CLIENT_ID
✅ HH_CLIENT_SECRET
✅ JOB_SEARCH_INTERVAL_HOURS
```

### Опциональные (для CS2):
```
⚪ STEAM_API_KEY
⚪ STEAM_ID
⚪ FACEIT_API_KEY
```

## Тестирование деплоя

После настройки секретов:

1. Сделайте любой коммит в ветку `main`
2. Push на GitHub: `git push origin main`
3. Перейдите в Actions вашего репозитория
4. Проверьте статус деплоя
5. При успешном деплое вы получите уведомление в Telegram

## Безопасность

⚠️ **ВАЖНО:**
- Никогда не коммитьте секреты в код
- Не делитесь скриншотами с открытыми секретами
- Регулярно обновляйте пароли и токены
- Используйте разные значения для dev и production
- При компрометации секрета немедленно измените его в GitHub Secrets

## Обновление секретов

Чтобы обновить секрет:
1. Settings → Secrets and variables → Actions
2. Найдите нужный секрет
3. Нажмите "Update"
4. Введите новое значение
5. При следующем деплое будет использовано новое значение
