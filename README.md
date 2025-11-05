# BGalin Portfolio & Job Search System

Полнофункциональная система управления портфолио с интегрированным ботом для автоматического поиска работы на HeadHunter.

## Возможности

- 📝 Управление портфолио (опыт работы, навыки, контакты, проекты)
- 🤖 Автоматический поиск вакансий на HH.ru
- 💌 AI-генерация персонализированных сопроводительных писем
- 📱 Telegram уведомления о новых приглашениях
- 🔐 Безопасная авторизация через Telegram OTP
- 🎨 Адаптивный дизайн с темной темой
- 🚀 Автоматический деплой на production

## Технологический стек

### Backend
- **Rust** с фреймворком Rocket
- **SQLite** база данных
- **OpenAI API** для генерации сопроводительных писем
- **HH.ru API** для поиска вакансий
- **Telegram Bot API** для уведомлений

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **shadcn/ui** компоненты
- **Tailwind CSS** для стилизации
- **Zustand** для управления состоянием
- **Axios** для API запросов
- **Motion** для анимаций

## Быстрый старт

**🚀 Новичкам:** См. [QUICKSTART.md](QUICKSTART.md) для пошаговой инструкции

### Разработка

#### Linux/macOS:
```bash
./dev.sh
```

#### Windows:
```bash
dev.bat
```

Это запустит:
- Backend на `http://localhost:8000`
- Frontend на `http://localhost:3000`

### Production (только Linux)

```bash
sudo ./prod.sh
```

Это настроит и запустит:
- Backend как systemd service
- Frontend через PM2
- Nginx с SSL
- Автоматический перезапуск при сбоях

## Конфигурация

### Backend (.env в папке server/)

Для разработки создайте файл `server/.env` на основе `server/.env.example`:

```env
DATABASE_URL=sqlite:./data.db
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ADMIN_TELEGRAM_ID=your_telegram_id
STEAM_API_KEY=your_steam_api_key  # опционально
STEAM_ID=your_steam_id  # опционально
FACEIT_API_KEY=your_faceit_api_key  # опционально
GSI_AUTH_TOKEN=my_super_secret_token_12345
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=google/gemini-2.0-flash-exp:free
HH_CLIENT_ID=your_hh_client_id
HH_CLIENT_SECRET=your_hh_client_secret
HH_REDIRECT_URI=http://localhost:8000/auth/hh/callback
JOB_SEARCH_INTERVAL_HOURS=4
```

### GitHub Secrets для автодеплоя

Полный список секретов и инструкции по настройке см. в [.github/SECRETS.md](.github/SECRETS.md)

### Frontend

Frontend автоматически определяет API URL:
- Development: `http://localhost:8000`
- Production на bgalin.ru: `https://bgalin.ru/api`
- Можно переопределить через `NEXT_PUBLIC_API_URL`

## Структура проекта

```
bgalin/
├── server/              # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── routes/      # API endpoints
│   │   ├── models/      # Data models
│   │   ├── auth/        # Authentication
│   │   └── jobs/        # Job search logic
│   └── Cargo.toml
├── frontend/            # Next.js frontend
│   ├── app/             # Pages
│   ├── components/      # React components
│   ├── hooks/           # Zustand stores
│   └── lib/             # Utilities
├── dev.sh              # Development startup (Linux)
├── prod.sh             # Production deployment (Linux)
├── dev.bat             # Development startup (Windows)
└── .github/
    └── workflows/       # CI/CD pipelines
```

## API Endpoints

### Публичные
- `GET /portfolio` - Получить полное портфолио

### Авторизация
- `POST /auth/request-otp` - Запросить OTP код
- `POST /auth/verify-otp` - Проверить OTP код

### Портфолио (требуется авторизация)
- `POST /portfolio/about` - Создать/обновить описание
- `POST /portfolio/experience` - Добавить опыт работы
- `POST /portfolio/skills` - Добавить навык
- `POST /portfolio/contacts` - Добавить контакт
- `POST /portfolio/cases` - Добавить кейс

### Поиск работы (требуется авторизация)
- `GET /jobs/search/status` - Статус поиска
- `POST /jobs/search/start` - Запустить поиск
- `POST /jobs/search/stop` - Остановить поиск
- `PUT /jobs/search/settings` - Обновить настройки
- `GET /jobs/vacancies` - Список найденных вакансий
- `GET /jobs/stats` - Статистика
- `GET /jobs/auth/hh` - Получить URL для авторизации HH.ru

## Deployment

См. [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md) для подробной инструкции по деплою.

### Автоматический деплой

При пуше в ветку `main` автоматически запускается GitHub Actions, который:
1. Подключается к серверу по SSH
2. Обновляет код
3. Собирает backend и frontend
4. Применяет миграции БД
5. Перезапускает сервисы
6. Отправляет уведомление в Telegram

## Мониторинг

### Логи

```bash
# Backend
sudo journalctl -u bgalin-backend.service -f

# Frontend
pm2 logs bgalin-frontend

# Nginx
sudo tail -f /var/log/nginx/bgalin_error.log
```

### Статус сервисов

```bash
# Backend
sudo systemctl status bgalin-backend.service

# Frontend
pm2 status

# Nginx
sudo systemctl status nginx
```

## Безопасность

- Все пароли и токены хранятся в `.env` файлах
- SSL сертификаты для HTTPS
- Авторизация через Telegram OTP
- CORS настроен только для bgalin.ru
- Все данные в защищенной SQLite БД

## Лицензия

MIT

## Автор

[Your Name]

## Поддержка

При возникновении проблем:
1. Проверьте логи сервисов
2. Убедитесь, что все переменные окружения настроены
3. Проверьте статус сервисов
4. Смотрите [DEPLOYMENT.md](.github/DEPLOYMENT.md) для troubleshooting
