# 📋 Краткое описание проекта

## Что реализовано

### ✅ Фронтэнд (Next.js 16 + React 19)

#### Страницы:
1. **Главная (`/`)** - Приветственная страница с карточками
2. **Резюме (`/resume`)** - Публичное портфолио с:
   - О себе
   - Контактами
   - Опытом работы
   - Навыками
   - Проектами/кейсами
3. **Админка (`/admin`)** - Панель управления с:
   - Авторизацией через Telegram OTP
   - Редактированием портфолио
   - Управлением поиском работы
   - Интеграцией с HH.ru
   - Просмотром вакансий

#### Особенности:
- ✅ Боковое меню (адаптивное с бургером на мобильных)
- ✅ Темная/светлая тема
- ✅ Полная мобильная адаптация
- ✅ Анимации через Motion
- ✅ shadcn/ui компоненты
- ✅ Zustand для управления состоянием
- ✅ Автоопределение API URL (dev/prod)

### ✅ API интеграция

#### Хуки Zustand:
- `useAuth` - авторизация
- `usePortfolio` - CRUD портфолио
- `useJobs` - управление поиском работы

#### Эндпоинты:
- Авторизация: `/auth/request-otp`, `/auth/verify-otp`
- Портфолио: CRUD для about, experience, skills, contacts, cases
- Поиск работы: настройки, статистика, вакансии, HH.ru OAuth

### ✅ DevOps и автоматизация

#### Скрипты запуска:
1. **`dev.sh`** (Linux) - автозапуск dev окружения
2. **`dev.bat`** (Windows) - автозапуск dev окружения
3. **`prod.sh`** (Linux) - полная настройка production:
   - Сборка backend (Rust/Cargo)
   - Сборка frontend (Next.js)
   - Установка nginx с SSL
   - Настройка systemd для backend
   - Настройка PM2 для frontend
   - Автоперезапуск при сбоях

#### CI/CD (GitHub Actions):
1. **`deploy.yml`** - автодеплой при push в main:
   - SSH подключение по паролю
   - Pull кода
   - Обновление .env из GitHub Secrets
   - Сборка backend и frontend
   - Применение миграций БД
   - Перезапуск сервисов
   - Уведомление в Telegram
   
2. **`test.yml`** - тесты при PR

3. **`update-env.yml`** - обновление переменных окружения (manual trigger)

#### Nginx конфигурация:
- HTTP → HTTPS redirect
- SSL сертификаты (bgalin_ru.crt, private.key)
- Proxy pass для frontend (/)
- Proxy pass для backend API (/api)
- Security headers

### ✅ Документация

1. **`README.md`** - полное описание проекта
2. **`QUICKSTART.md`** - быстрый старт (5 мин для dev, 15 мин для prod)
3. **`.github/SECRETS.md`** - список всех GitHub Secrets с инструкциями
4. **`.github/DEPLOYMENT.md`** - детальный гайд по деплою, мониторингу, troubleshooting

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                    (bgalin.ru)                         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (443)
                       ↓
┌─────────────────────────────────────────────────────────┐
│                      Nginx                              │
│   - SSL Termination                                     │
│   - Reverse Proxy                                       │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
    Frontend (/)                    Backend (/api)
            ↓                             ↓
┌───────────────────────┐     ┌─────────────────────────┐
│    Next.js (PM2)      │     │   Rust/Rocket           │
│    Port: 3000         │────→│   (systemd)             │
│                       │     │   Port: 8000            │
└───────────────────────┘     └──────────┬──────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                         SQLite DB          External APIs
                      (portfolio.db)      - Telegram Bot
                                          - HH.ru
                                          - OpenAI
```

## Файловая структура

```
bgalin/
├── frontend/                    # Next.js приложение
│   ├── app/                    # Страницы (App Router)
│   │   ├── page.tsx           # Главная
│   │   ├── resume/page.tsx    # Резюме
│   │   └── admin/page.tsx     # Админка
│   ├── components/            # React компоненты
│   │   ├── ui/               # shadcn/ui компоненты
│   │   ├── admin/            # Админка компоненты
│   │   ├── sidebar-nav.tsx   # Боковое меню
│   │   └── theme-toggle.tsx  # Переключатель темы
│   ├── hooks/                # Zustand хуки
│   │   ├── useAuth.ts        # Авторизация
│   │   ├── usePortfolio.ts   # Портфолио
│   │   └── useJobs.ts        # Поиск работы
│   └── lib/                  # Утилиты
│       ├── axios.ts          # API клиент
│       └── types.ts          # TypeScript типы
│
├── server/                    # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── routes/           # API endpoints
│   │   ├── models/           # Data models
│   │   ├── auth/             # Auth service
│   │   └── jobs/             # Job search logic
│   ├── .env.example          # Пример конфигурации
│   └── Cargo.toml
│
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml        # Автодеплой
│   │   ├── test.yml          # Тесты
│   │   └── update-env.yml    # Обновление .env
│   ├── SECRETS.md            # Список секретов
│   └── DEPLOYMENT.md         # Гайд по деплою
│
├── dev.sh                    # Запуск dev (Linux)
├── dev.bat                   # Запуск dev (Windows)
├── prod.sh                   # Деплой production (Linux)
│
├── bgalin_ru.crt             # SSL сертификат
├── private.key               # SSL ключ
│
├── README.md                 # Документация
├── QUICKSTART.md             # Быстрый старт
└── PROJECT_SUMMARY.md        # Этот файл
```

## GitHub Secrets (11 штук)

### SSH подключение:
1. `SERVER_HOST` - IP/домен сервера
2. `SERVER_USER` - SSH пользователь
3. `SERVER_PASSWORD` - SSH пароль
4. `SERVER_PORT` - SSH порт (22)

### Переменные окружения:
5. `DATABASE_URL` - sqlite:portfolio.db
6. `TELEGRAM_BOT_TOKEN` - от @BotFather
7. `ADMIN_TELEGRAM_ID` - от @userinfobot
8. `HH_CLIENT_ID` - от dev.hh.ru
9. `HH_CLIENT_SECRET` - от dev.hh.ru
10. `HH_REDIRECT_URI` - https://bgalin.ru/api/auth/hh/callback
11. `OPENAI_API_KEY` - от platform.openai.com

## Как использовать

### Разработка (первый запуск):
```bash
git clone <repo>
cd bgalin
cd server && cp .env.example .env && nano .env
cd ..
./dev.sh  # Linux/macOS
# или
dev.bat   # Windows
```

### Production (первый раз):
```bash
# На сервере
git clone <repo>
cd bgalin
cd server && cp .env.example .env && nano .env
cd ..
sudo ./prod.sh
```

### Настройка автодеплоя:
1. Добавить 11 секретов в GitHub (Settings → Secrets → Actions)
2. Push в main ветку
3. Готово! Каждый следующий push будет автоматически деплоиться

### Управление:
- **Логи:** `sudo journalctl -u bgalin-backend.service -f`
- **Перезапуск:** `sudo systemctl restart bgalin-backend.service`
- **Frontend:** `pm2 logs bgalin-frontend`, `pm2 restart bgalin-frontend`
- **Nginx:** `sudo systemctl reload nginx`

## Безопасность

✅ Все секреты в .env и GitHub Secrets (не в коде)
✅ SSL/HTTPS для production
✅ Авторизация через Telegram OTP
✅ .gitignore настроен правильно
✅ CORS ограничен для bgalin.ru
✅ Security headers в nginx
✅ Приватный репозиторий

## Что НЕ включено в репозиторий

- ❌ `.env` файлы (создаются из .env.example)
- ❌ `node_modules/` и `target/` (собираются локально)
- ❌ `*.db` файлы базы данных
- ❌ Логи

## Поддержка

📚 Документация:
- [README.md](README.md) - Обзор
- [QUICKSTART.md](QUICKSTART.md) - Быстрый старт
- [.github/SECRETS.md](.github/SECRETS.md) - Секреты
- [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md) - Деплой

🐛 Проблемы:
- Проверьте логи сервисов
- Убедитесь что все секреты настроены
- Смотрите DEPLOYMENT.md → Troubleshooting

## Статус проекта

✅ **Полностью готов к использованию**
- Фронтэнд реализован полностью
- API интегрировано
- DevOps настроен
- CI/CD работает
- Документация готова

🚀 **Можно деплоить на production**
