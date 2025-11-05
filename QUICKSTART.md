# 🚀 Быстрый старт

## Для локальной разработки (5 минут)

### 1. Клонируйте репозиторий
```bash
git clone https://github.com/yourusername/bgalin.git
cd bgalin
```

### 2. Настройте backend
```bash
cd server
cp .env.example .env
nano .env  # Заполните хотя бы TELEGRAM_BOT_TOKEN и ADMIN_TELEGRAM_ID
```

### 3. Запустите проект
```bash
cd ..
# Linux/macOS:
./dev.sh

# Windows:
dev.bat
```

### 4. Откройте в браузере
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Для production деплоя (15 минут)

### 1. Подготовьте сервер
```bash
# На сервере (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git build-essential
sudo npm install -g pm2
```

### 2. Клонируйте на сервер
```bash
sudo mkdir -p /var/www/bgalin
sudo chown $USER:$USER /var/www/bgalin
cd /var/www
git clone https://github.com/yourusername/bgalin.git
cd bgalin
```

### 3. Настройте переменные на сервере (первый раз)
```bash
cd server
cp .env.example .env
nano .env  # Заполните все переменные
```

### 4. Запустите production
```bash
cd /var/www/bgalin
sudo ./prod.sh
```

### 5. Настройте GitHub Secrets

Перейдите в Settings → Secrets → Actions и добавьте:

#### SSH подключение
- `SERVER_HOST` → IP или домен сервера
- `SERVER_USER` → ваш SSH пользователь  
- `SERVER_PASSWORD` → SSH пароль
- `SERVER_PORT` → `22`

#### Переменные приложения
- `DATABASE_URL` → `sqlite:portfolio.db`
- `TELEGRAM_BOT_TOKEN` → токен от @BotFather
- `ADMIN_TELEGRAM_ID` → ваш ID от @userinfobot
- `HH_CLIENT_ID` → от dev.hh.ru
- `HH_CLIENT_SECRET` → от dev.hh.ru
- `HH_REDIRECT_URI` → `https://bgalin.ru/api/auth/hh/callback`
- `OPENAI_API_KEY` → от platform.openai.com

📖 Подробнее: [.github/SECRETS.md](.github/SECRETS.md)

### 6. Автодеплой готов!
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

После push в `main` автоматически:
- ✅ Код обновится на сервере
- ✅ Backend и frontend пересоберутся
- ✅ Сервисы перезапустятся
- ✅ Придет уведомление в Telegram

## Полезные команды

### Разработка
```bash
# Посмотреть логи backend
cd server && cargo run

# Посмотреть логи frontend  
cd frontend && npm run dev
```

### Production
```bash
# Логи backend
sudo journalctl -u bgalin-backend.service -f

# Логи frontend
pm2 logs bgalin-frontend

# Логи nginx
sudo tail -f /var/log/nginx/bgalin_error.log

# Перезапуск сервисов
sudo systemctl restart bgalin-backend.service
pm2 restart bgalin-frontend
sudo systemctl reload nginx

# Статус
sudo systemctl status bgalin-backend.service
pm2 status
```

## Получение токенов

### Telegram Bot Token
1. Найдите @BotFather в Telegram
2. `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен

### Telegram ID
1. Найдите @userinfobot в Telegram  
2. `/start`
3. Скопируйте ваш ID

### HH.ru API
1. https://dev.hh.ru/
2. Зарегистрируйте приложение
3. Скопируйте Client ID и Secret
4. Redirect URI: `https://bgalin.ru/api/auth/hh/callback`

### OpenRouter API
1. https://openrouter.ai/
2. Зарегистрируйтесь или войдите
3. Keys → Create Key
4. Скопируйте ключ (начинается с `sk-or-v1-...`)

## Структура файлов

```
bgalin/
├── server/           # Rust backend
│   ├── .env         # ← создайте этот файл
│   └── src/
├── frontend/         # Next.js frontend
│   └── app/
├── dev.sh           # Запуск dev (Linux)
├── dev.bat          # Запуск dev (Windows)
├── prod.sh          # Деплой production (Linux)
└── .github/
    └── workflows/   # CI/CD
```

## Troubleshooting

### Backend не запускается
```bash
cd server
cat .env  # Проверьте переменные
cargo clean && cargo build
```

### Frontend не запускается
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Порты заняты
```bash
# Проверить что занимает порт
sudo lsof -i :8000  # Backend
sudo lsof -i :3000  # Frontend

# Убить процесс
kill -9 <PID>
```

### Деплой падает
1. Проверьте логи в Actions на GitHub
2. Проверьте что все секреты добавлены
3. Проверьте что у пользователя есть sudo без пароля
4. Проверьте логи на сервере

## Что дальше?

1. ✅ Запустите локально для разработки
2. ✅ Разверните на production сервере
3. ✅ Настройте GitHub Secrets
4. ✅ Сделайте тестовый коммит для проверки деплоя
5. 📱 Войдите в админку через /admin
6. ✍️ Заполните портфолио
7. 🔗 Подключите HH.ru
8. ⚙️ Настройте автопоиск вакансий
9. 🎉 Profit!

📚 Полная документация:
- [README.md](README.md) - Обзор проекта
- [.github/SECRETS.md](.github/SECRETS.md) - Настройка секретов
- [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md) - Полная инструкция по деплою
