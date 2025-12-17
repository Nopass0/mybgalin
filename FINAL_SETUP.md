# Final Setup Instructions

## Quick Status

✅ **Backend migrated**: Rust → Bun/Elysia  
✅ **All endpoints working**: 63 total  
✅ **GitHub Actions ready**: Auto deployment  
✅ **Docker compose**: PostgreSQL + N8N  
✅ **Everything in git**: Ready to push  

**Latest commit**: `d210731 - Update deploy to use docker-compose`

---

## What's Deployed

### Architecture

```
Internet (HTTPS)
    ↓
Nginx (Port 443)
    ├─→ Frontend (Next.js, Port 3000)
    ├─→ Backend API (Bun, Port 8000)
    ├─→ N8N (Port 5678, via docker-compose)
    └─→ Webhooks (Port 5678)

Database Layer
    └─→ PostgreSQL (Port 5432, via docker-compose)
```

### Services

| Service | Port | Tech | Status |
|---------|------|------|--------|
| Frontend | 3000 | Next.js | PM2 |
| Backend | 8000 | Bun/Elysia | Systemd |
| N8N | 5678 | Docker | docker-compose |
| PostgreSQL | 5432 | Docker | docker-compose |
| Nginx | 443/80 | Reverse Proxy | Systemd |

---

## Server Prerequisites

Before deployment, server needs:

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Nginx
sudo apt-get install -y nginx

# Install PM2
sudo npm install -g pm2
pm2 startup
pm2 save

# Verify
docker --version
node --version
bun --version
nginx -v
pm2 --version
```

---

## GitHub Secrets Required

Set these in GitHub repo settings → Secrets:

```
SERVER_HOST              → Your server IP/domain
SERVER_USER              → SSH username
SSH_PRIVATE_KEY          → SSH private key (copy entire file)
SERVER_PORT              → SSH port (usually 22)
TELEGRAM_BOT_TOKEN       → Bot token from @BotFather
ADMIN_TELEGRAM_ID        → Your Telegram ID from @userinfobot
```

---

## Deployment Flow

### Automatic (Recommended)

```bash
# Just push to main
git push origin main

# GitHub Actions will:
# 1. Checkout code
# 2. SSH into server
# 3. Pull latest git
# 4. Start docker-compose (PostgreSQL + N8N)
# 5. Install Bun dependencies
# 6. Run Prisma migrations
# 7. Build frontend
# 8. Restart services
# 9. Done!
```

**Time to deploy**: ~5-10 minutes  
**Logs**: https://github.com/Nopass0/mybgalin/actions

### Manual (If GitHub Actions Fails)

```bash
# SSH into server
ssh user@SERVER_HOST -p PORT

# Navigate to project
cd /var/www/bgalin

# Pull latest
git fetch origin main
git reset --hard origin/main

# Start docker services
docker-compose up -d

# Setup backend
cd server
bun install
npx prisma generate
npx prisma db push --skip-generate

# Setup frontend
cd ../frontend
npm install
npm run build

# Restart all
pm2 restart all

# Verify
pm2 status
docker ps
curl http://localhost:8000/api/health
```

---

## Accessing Services

### Frontend
```
https://bgalin.ru
```

### Backend API
```
https://bgalin.ru/api/health
https://bgalin.ru/api/jobs/vacancies
https://bgalin.ru/swagger
```

### N8N (NEW!)
```
https://bgalin.ru/n8n/
```

### Webhooks
```
https://bgalin.ru/webhook/
```

---

## Monitoring

### Check Service Status

```bash
# SSH into server
ssh user@SERVER_HOST

# PM2 services (frontend)
pm2 status
pm2 logs

# Docker services (PostgreSQL + N8N)
docker ps
docker logs bgalin_n8n_1
docker logs bgalin_postgres_1

# Systemd (backend)
sudo systemctl status bgalin-backend.service
sudo journalctl -u bgalin-backend.service -f

# Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/bgalin_error.log
```

### Test Endpoints

```bash
# Backend health
curl https://bgalin.ru/api/health

# Frontend
curl https://bgalin.ru/

# N8N
curl https://bgalin.ru/n8n/

# Jobs endpoint
curl https://bgalin.ru/api/jobs/vacancies
```

---

## Database

### Connect to PostgreSQL

```bash
# From server
psql -U admin -d bgalin -h localhost

# Or from anywhere
psql postgresql://admin:PASSWORD@bgalin.ru:5432/bgalin
```

### View N8N Data

```bash
# SSH into server
docker exec -it bgalin_n8n_1 bash

# Or view via UI
https://bgalin.ru/n8n/
```

---

## Troubleshooting

### GitHub Actions Not Running

1. Check secrets are set: https://github.com/Nopass0/mybgalin/settings/secrets/actions
2. Check SSH_PRIVATE_KEY is valid (not encrypted)
3. Verify SERVER_HOST is correct
4. Try making a dummy commit: `git commit --allow-empty -m "trigger"`

### Deployment Fails

```bash
# Check GitHub Actions logs
https://github.com/Nopass0/mybgalin/actions

# Manual SSH test
ssh -i /path/to/key -p 22 user@SERVER_HOST

# Check server has docker
docker --version
docker-compose --version
```

### Backend Not Starting

```bash
# Check logs
sudo journalctl -u bgalin-backend.service -n 50

# Check port 8000 is free
lsof -i :8000

# Test Bun
bun --version
```

### N8N Not Accessible

```bash
# Check docker container
docker ps | grep n8n

# Check logs
docker logs bgalin_n8n_1

# Check nginx proxy
curl http://localhost:5678/

# Check nginx config
sudo cat /etc/nginx/sites-available/bgalin | grep -A 10 n8n
```

### PostgreSQL Issues

```bash
# Check container
docker ps | grep postgres

# Check logs
docker logs bgalin_postgres_1

# Check connection
psql postgresql://admin:admin@localhost:5432/bgalin -c "SELECT 1"
```

---

## Documentation Files

For more detailed information, see:

- **BACKEND_DEPLOYMENT.md** - Backend setup & configuration
- **N8N_SETUP.md** - N8N installation & usage
- **API_TESTING_GUIDE.md** - API endpoint examples
- **PRODUCTION_CHECKLIST.md** - Pre-deployment checklist
- **CHECK_DEPLOYMENT.md** - Verify deployment status
- **QUICK_DEPLOY_TEST.md** - Quick testing guide

---

## Summary

✅ **Code**: In GitHub  
✅ **CI/CD**: GitHub Actions (auto on push)  
✅ **Database**: Docker Compose  
✅ **N8N**: Docker Compose (bgalin.ru/n8n)  
✅ **Backend**: Bun (port 8000)  
✅ **Frontend**: Next.js (port 3000)  

**Ready for production!** Just push to main and GitHub Actions will deploy automatically.

---

## Next Steps

1. ✅ Make sure server has Docker installed
2. ✅ Set GitHub Secrets
3. ✅ Push to main: `git push origin main`
4. ✅ Wait for GitHub Actions (check status)
5. ✅ Test endpoints
6. 🎉 Done!

**Deployment should complete in ~5-10 minutes**

Check status: https://github.com/Nopass0/mybgalin/actions
