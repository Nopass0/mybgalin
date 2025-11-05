# First Deployment Guide

Этот гайд проведет вас через первичную настройку сервера и первый деплой.

## ⚡ Quick Start (5 минут)

### Шаг 1: Подготовьте сервер

На вашем сервере выполните:

```bash
# Загрузите скрипт инициализации
wget https://raw.githubusercontent.com/yourusername/bgalin/main/server-init.sh

# Или скопируйте с локальной машины
scp server-init.sh root@your-server:~/

# Запустите скрипт
sudo bash server-init.sh
```

Скрипт спросит:
1. **URL репозитория** - введите полный URL вашего GitHub репозитория
2. **Username для деплоя** - имя пользователя на сервере (обычно `root` или `ubuntu`)
3. **Запустить prod.sh?** - ответьте `y` для автоматической настройки

### Шаг 2: Загрузите SSL сертификаты

Скопируйте ваши SSL сертификаты на сервер:

```bash
scp bgalin_ru.crt root@your-server:/var/www/bgalin/
scp private.key root@your-server:/var/www/bgalin/
```

Или используйте Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bgalin.ru -d www.bgalin.ru
```

### Шаг 3: Настройте GitHub Secrets

1. Откройте ваш репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Добавьте **13 обязательных секретов** (см. `.github/SECRETS.md`):

#### Минимальный набор для запуска:

```
SERVER_HOST=your-server-ip
SERVER_USER=root
SERVER_PASSWORD=your-password
SERVER_PORT=22
DATABASE_URL=sqlite:./data.db
TELEGRAM_BOT_TOKEN=your-bot-token
ADMIN_TELEGRAM_ID=your-telegram-id
GSI_AUTH_TOKEN=any-random-string
OPENROUTER_API_KEY=your-openrouter-key
AI_MODEL=google/gemini-2.0-flash-exp:free
HH_CLIENT_ID=your-hh-client-id
HH_CLIENT_SECRET=your-hh-client-secret
JOB_SEARCH_INTERVAL_HOURS=4
```

### Шаг 4: Первый деплой

```bash
# На вашей локальной машине
git add .
git commit -m "Initial deployment"
git push origin main
```

GitHub Actions автоматически:
- ✅ Подключится к серверу
- ✅ Обновит код
- ✅ Создаст .env из секретов
- ✅ Соберет backend и frontend
- ✅ Перезапустит сервисы
- ✅ Отправит уведомление в Telegram

### Шаг 5: Проверка

Откройте в браузере:
- https://bgalin.ru - главная страница
- https://bgalin.ru/resume - портфолио
- https://bgalin.ru/admin - админка

---

## 🔍 Проверка статуса

### На сервере:

```bash
# Backend
sudo systemctl status bgalin-backend.service
sudo journalctl -u bgalin-backend.service -f

# Frontend
pm2 status
pm2 logs bgalin-frontend

# Nginx
sudo nginx -t
sudo systemctl status nginx

# Все порты
sudo netstat -tulpn | grep LISTEN
```

Должны быть открыты:
- `3001` - Backend (Rust/Rocket)
- `3000` - Frontend (Next.js)
- `443` - Nginx (HTTPS)

### В браузере:

Проверьте консоль разработчика (F12):
- Должны быть запросы к `/api/...`
- CORS ошибок быть не должно
- WebSocket соединения должны работать

---

## ❌ Проблемы?

### 1. Ошибка: "No such file or directory: /var/www/bgalin"

```bash
ssh root@your-server
sudo bash server-init.sh
```

### 2. Ошибка SSH: "Permission denied"

Проверьте GitHub Secrets:
- `SERVER_HOST` - правильный IP?
- `SERVER_USER` - правильный username?
- `SERVER_PASSWORD` - правильный пароль?

Или используйте SSH ключ (см. `.github/SECRETS.md`)

### 3. Ошибка: "cargo: command not found"

```bash
ssh root@your-server
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 4. Ошибка: "Port 3001 already in use"

```bash
sudo lsof -i :3001
sudo kill -9 <PID>
sudo systemctl restart bgalin-backend.service
```

### 5. Frontend не загружается

```bash
cd /var/www/bgalin/frontend
npm install
npm run build
pm2 restart bgalin-frontend
```

### 6. 502 Bad Gateway

```bash
# Проверьте что сервисы запущены
sudo systemctl status bgalin-backend.service
pm2 status

# Проверьте nginx конфигурацию
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📚 Дополнительная документация

- **Full deployment guide**: `.github/DEPLOYMENT.md`
- **GitHub Secrets setup**: `.github/SECRETS.md`
- **Troubleshooting**: `.github/TROUBLESHOOTING.md`
- **Project structure**: `PROJECT_SUMMARY.md`

---

## 🎉 Готово!

После успешного деплоя вы получите:
- ✅ Работающий сайт на https://bgalin.ru
- ✅ Автоматический деплой при push в main
- ✅ Telegram уведомления о деплоях
- ✅ Админ панель для управления контентом
- ✅ Автоматический поиск вакансий на HH.ru

**Следующие шаги:**
1. Заполните портфолио через `/admin`
2. Подключите HH.ru OAuth
3. Настройте параметры поиска вакансий
4. Запустите автоматический поиск

---

**Вопросы?** Проверьте [TROUBLESHOOTING.md](.github/TROUBLESHOOTING.md)
