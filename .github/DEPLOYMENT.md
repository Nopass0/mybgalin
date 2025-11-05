# Deployment Guide

## 🚀 Quick Initial Server Setup (Recommended)

### Automated Setup with server-init.sh

**The easiest way to set up your server:**

```bash
# 1. Upload server-init.sh to your server
scp server-init.sh user@your-server:~/

# 2. Run the initialization script
ssh user@your-server
sudo bash server-init.sh
```

The script will:
- ✅ Create `/var/www/bgalin` directory
- ✅ Clone your repository
- ✅ Install all dependencies (Rust, Node.js, nginx, PM2)
- ✅ Configure sudo permissions for GitHub Actions
- ✅ Set up services and SSL
- ✅ Prepare for automatic deployments

After this, skip to **"Configure GitHub Secrets"** section below.

---

## 📋 Manual Initial Server Setup

If you prefer manual setup or the automated script fails:

### 1. Prepare the server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y build-essential pkg-config libssl-dev git nginx

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 2. Clone repository

```bash
sudo mkdir -p /var/www/bgalin
sudo chown $USER:$USER /var/www/bgalin
cd /var/www
git clone https://github.com/yourusername/bgalin.git bgalin
cd bgalin
```

### 3. Configure environment

```bash
# Create .env file in server directory
cd server
cp .env.example .env
nano .env
```

Fill in all required environment variables:
- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_ID`
- `HH_CLIENT_ID`
- `HH_CLIENT_SECRET`
- `HH_REDIRECT_URI`
- `OPENAI_API_KEY`

### 4. Run production script

```bash
cd /var/www/bgalin
sudo ./prod.sh
```

This script will:
- Build backend and frontend
- Configure nginx with SSL
- Create systemd service for backend
- Setup PM2 for frontend
- Start all services

## GitHub Actions Setup

### Required Secrets

Полный список секретов см. в [SECRETS.md](SECRETS.md)

Основные секреты для деплоя:

**SSH Подключение:**
1. `SERVER_HOST` - IP адрес или домен сервера
2. `SERVER_USER` - SSH пользователь
3. `SERVER_PASSWORD` - SSH пароль
4. `SERVER_PORT` - SSH порт (обычно 22)

**Переменные окружения:**
5. `DATABASE_URL` - Путь к БД
6. `TELEGRAM_BOT_TOKEN` - Токен бота
7. `ADMIN_TELEGRAM_ID` - Ваш Telegram ID
8. `HH_CLIENT_ID` - HH.ru Client ID
9. `HH_CLIENT_SECRET` - HH.ru Client Secret
10. `HH_REDIRECT_URI` - HH.ru Redirect URI
11. `OPENAI_API_KEY` - OpenAI API ключ

### Server Permissions

On your server, allow the deployment user to run specific sudo commands without password:

```bash
sudo visudo
```

Add this line (replace `youruser` with your username):

```
youruser ALL=(ALL) NOPASSWD: /bin/systemctl restart bgalin-backend.service, /bin/systemctl reload nginx, /usr/sbin/nginx
```

## Manual Deployment

If you need to deploy manually:

```bash
cd /var/www/bgalin
git pull origin main
cd server
cargo build --release
cd ../frontend
bun install
bun run build
sudo systemctl restart bgalin-backend.service
pm2 restart bgalin-frontend
sudo systemctl reload nginx
```

## Monitoring

### View logs

```bash
# Backend logs
sudo journalctl -u bgalin-backend.service -f

# Frontend logs
pm2 logs bgalin-frontend

# Nginx logs
sudo tail -f /var/log/nginx/bgalin_error.log
sudo tail -f /var/log/nginx/bgalin_access.log
```

### Check service status

```bash
# Backend
sudo systemctl status bgalin-backend.service

# Frontend
pm2 status

# Nginx
sudo systemctl status nginx
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u bgalin-backend.service -n 50

# Check if port 8000 is already in use
sudo lsof -i :8000

# Verify .env file
cd /var/www/bgalin/server
cat .env
```

### Frontend won't start

```bash
# Check PM2 logs
pm2 logs bgalin-frontend --lines 50

# Restart PM2
pm2 restart bgalin-frontend

# Check if port 3000 is already in use
sudo lsof -i :3000
```

### Nginx issues

```bash
# Test configuration
sudo nginx -t

# Check if ports 80/443 are available
sudo lsof -i :80
sudo lsof -i :443

# Verify SSL certificates
sudo ls -la /var/www/bgalin/*.crt
sudo ls -la /var/www/bgalin/*.key
```

### Database issues

```bash
cd /var/www/bgalin/server

# Check if database file exists
ls -la portfolio.db

# Backup database
cp portfolio.db portfolio.db.backup

# If database is corrupted, restore from backup
# cp portfolio.db.backup portfolio.db
```

## Rollback

If deployment fails, rollback to previous version:

```bash
cd /var/www/bgalin
git log --oneline -n 5  # Find previous commit hash
git reset --hard <previous-commit-hash>
sudo systemctl restart bgalin-backend.service
pm2 restart bgalin-frontend
```

## SSL Certificate Renewal

Certificates are located in the project root. To update:

```bash
cd /var/www/bgalin
# Replace certificate files
sudo cp new_bgalin_ru.crt bgalin_ru.crt
sudo cp new_private.key private.key
sudo chmod 600 private.key

# Update nginx certificates
sudo cp bgalin_ru.crt /var/www/bgalin/
sudo cp private.key /var/www/bgalin/
sudo chmod 600 /var/www/bgalin/private.key

# Reload nginx
sudo systemctl reload nginx
```
