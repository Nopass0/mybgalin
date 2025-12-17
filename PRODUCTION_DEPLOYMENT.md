# BGalin Production Deployment Guide

## Overview

This document describes the complete production deployment setup for BGalin, including:
- **Frontend**: Next.js (React) on port 3000 (PM2)
- **Backend**: Bun/Elysia on port 8000 (systemd)
- **Database**: PostgreSQL on port 5432 (Docker)
- **Automation**: N8N on port 5678 (Docker)
- **Reverse Proxy**: Nginx on ports 80/443

**Deployment Method**: GitHub Actions (automatic on push to main)

---

## Architecture

```
                        Internet (HTTPS)
                              ↓
                    ┌─────────────────────┐
                    │    Nginx (443/80)   │
                    │  (Reverse Proxy)    │
                    └─────────┬───────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
    ┌────────┐         ┌──────────┐          ┌─────────┐
    │Frontend│         │ Backend  │          │  N8N    │
    │ 3000   │         │  8000    │          │  5678   │
    │(PM2)   │         │(systemd) │          │(Docker) │
    └───┬────┘         └──────┬───┘          └────┬────┘
        │                     │                   │
        └─────────────────────┼───────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │   PostgreSQL 5432   │
                    │     (Docker)        │
                    └─────────────────────┘
```

---

## Prerequisites for Server

Before deploying, ensure the server has:

### System Requirements
- Ubuntu 20.04 LTS or newer
- SSH access with password authentication
- Sudo privileges for deployment user
- At least 2GB RAM and 20GB disk space

### Required Software (auto-installed by deploy.yml)
- Docker + docker-compose
- Node.js 20.x
- Bun runtime
- PM2 process manager
- Nginx web server
- Git (for pulling code)

---

## GitHub Secrets Configuration

Set these secrets in GitHub: https://github.com/Nopass0/mybgalin/settings/secrets/actions

| Secret | Value | Example |
|--------|-------|---------|
| `SERVER_HOST` | Server IP or domain | `bgalin.ru` or `123.45.67.89` |
| `SERVER_USER` | SSH username | `ubuntu` or `root` |
| `SERVER_PASSWORD` | SSH password | (your server password) |

Optional secrets:
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `ADMIN_TELEGRAM_ID` - Your Telegram ID from @userinfobot

---

## Deployment Process

### Automatic Deployment (Recommended)

Simply push to main branch:

```bash
# Make changes
git add .
git commit -m "Description of changes"
git push origin main
```

GitHub Actions will automatically:
1. ✅ Checkout code
2. ✅ SSH into server
3. ✅ Install/verify all prerequisites
4. ✅ Pull latest code
5. ✅ Start Docker services (PostgreSQL + N8N)
6. ✅ Build backend (Bun)
7. ✅ Build frontend (Next.js)
8. ✅ Setup systemd service for backend
9. ✅ Start services with PM2 (frontend) and systemd (backend)
10. ✅ Configure Nginx reverse proxy
11. ✅ Test all endpoints

**Deployment time**: ~5-10 minutes

**Check status**: https://github.com/Nopass0/mybgalin/actions

### Manual Deployment (If GitHub Actions Fails)

```bash
# 1. SSH into server
ssh user@SERVER_HOST

# 2. Navigate to project
cd /var/www/bgalin

# 3. Pull latest code
git fetch origin main
git reset --hard origin/main

# 4. Start Docker services
docker-compose up -d

# 5. Setup backend
cd server
bun install
npx prisma generate
npx prisma db push --skip-generate
cd ..

# 6. Setup frontend
cd frontend
npm install
npm run build
cd ..

# 7. Setup systemd service
sudo cp bgalin-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bgalin-backend.service
sudo systemctl start bgalin-backend.service

# 8. Setup PM2 for frontend
export PATH="/home/$USER/.bun/bin:/home/$USER/.npm-global/bin:$PATH"
pm2 delete bgalin-frontend || true
pm2 start ecosystem.config.js
pm2 save

# 9. Setup Nginx
sudo cp nginx-bgalin.conf /etc/nginx/sites-available/bgalin
sudo ln -s /etc/nginx/sites-available/bgalin /etc/nginx/sites-enabled/bgalin || true
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 10. Verify deployment
bash verify-deployment.sh
```

---

## Service Management

### Frontend (PM2)

```bash
# Check status
pm2 status

# View logs
pm2 logs bgalin-frontend

# Restart
pm2 restart bgalin-frontend

# Stop
pm2 stop bgalin-frontend

# Start
pm2 start ecosystem.config.js
```

### Backend (systemd)

```bash
# Check status
sudo systemctl status bgalin-backend.service

# View logs
sudo journalctl -u bgalin-backend.service -f

# Restart
sudo systemctl restart bgalin-backend.service

# Stop
sudo systemctl stop bgalin-backend.service

# Start
sudo systemctl start bgalin-backend.service

# Enable on boot
sudo systemctl enable bgalin-backend.service
```

### Docker Services (PostgreSQL + N8N)

```bash
# Check containers
docker ps

# View logs
docker logs bgalin_postgres_1
docker logs bgalin_n8n_1

# Restart specific service
docker-compose restart postgres
docker-compose restart n8n

# Restart all
docker-compose restart

# Stop all
docker-compose down

# Start all
docker-compose up -d
```

### Nginx (Reverse Proxy)

```bash
# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/bgalin_error.log
sudo tail -f /var/log/nginx/bgalin_access.log

# Restart
sudo systemctl restart nginx

# Test configuration
sudo nginx -t

# Reload (without restart)
sudo systemctl reload nginx
```

---

## Accessing Services

### Frontend
```
https://bgalin.ru/
```

### Backend API
```
https://bgalin.ru/api/health               # Health check
https://bgalin.ru/api/jobs/vacancies       # Example endpoint
https://bgalin.ru/swagger                  # API documentation
```

### N8N Automation
```
https://bgalin.ru/n8n/
```

### Webhooks
```
https://bgalin.ru/webhook/
```

---

## Monitoring & Verification

### Run Full Verification
```bash
bash /var/www/bgalin/verify-deployment.sh

# With HTTPS domain check
DOMAIN=bgalin.ru bash /var/www/bgalin/verify-deployment.sh
```

### Quick Health Checks
```bash
# Frontend
curl https://bgalin.ru/

# Backend
curl https://bgalin.ru/api/health

# N8N
curl https://bgalin.ru/n8n/

# Database (from server)
psql -U admin -d bgalin -h localhost -c "SELECT 1"
```

### Monitor Logs
```bash
# All services
pm2 logs                           # Frontend logs
sudo journalctl -u bgalin-backend.service -f  # Backend logs
docker-compose logs -f             # Docker services
sudo tail -f /var/log/nginx/bgalin_error.log  # Nginx errors
```

### Check Resource Usage
```bash
# CPU and Memory
top

# Disk usage
df -h

# Memory details
free -h

# Port usage
netstat -tuln | grep LISTEN
```

---

## Database Management

### Connect to PostgreSQL
```bash
# From server
psql -U admin -d bgalin -h localhost

# From anywhere (requires network access)
psql postgresql://admin:PASSWORD@bgalin.ru:5432/bgalin
```

### Common Database Tasks
```bash
# List databases
\l

# List tables
\dt

# View schema
\d+ table_name

# Run query
SELECT * FROM users LIMIT 5;

# Exit
\q
```

### Database Backups
```bash
# Backup database
docker exec bgalin_postgres_1 pg_dump -U admin bgalin > /var/www/bgalin/backups/bgalin_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker exec -i bgalin_postgres_1 psql -U admin bgalin < /path/to/backup.sql
```

---

## Troubleshooting

### Deployment Fails in GitHub Actions

1. **Check GitHub Actions logs**:
   - Go to https://github.com/Nopass0/mybgalin/actions
   - Click the failed workflow run
   - See what step failed

2. **Verify GitHub Secrets**:
   - Check all required secrets are set
   - Verify credentials are correct
   - Test SSH manually:
     ```bash
     ssh -u SERVER_USER -p 22 SERVER_HOST "whoami"
     ```

3. **Check server logs**:
   ```bash
   ssh user@SERVER_HOST
   tail -f /var/log/syslog
   ```

### Frontend Not Responding

```bash
# Check PM2 status
pm2 status

# View frontend logs
pm2 logs bgalin-frontend

# Restart frontend
pm2 restart bgalin-frontend

# Check port 3000
netstat -tuln | grep 3000

# Verify Node.js
node --version
npm --version
```

### Backend Not Responding

```bash
# Check systemd service
sudo systemctl status bgalin-backend.service

# View backend logs
sudo journalctl -u bgalin-backend.service -n 50 -f

# Restart backend
sudo systemctl restart bgalin-backend.service

# Check port 8000
netstat -tuln | grep 8000

# Verify Bun
bun --version
```

### Docker Services Not Running

```bash
# Check containers
docker ps -a

# View Docker logs
docker-compose logs

# Restart services
docker-compose restart

# Start from scratch
docker-compose down
docker-compose up -d

# Check PostgreSQL connection
docker exec bgalin_postgres_1 psql -U admin -c "SELECT 1"
```

### Nginx Not Forwarding Requests

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/bgalin_error.log

# Test backends directly
curl http://localhost:3000      # Frontend
curl http://localhost:8000      # Backend
curl http://localhost:5678      # N8N

# Test via Nginx
curl http://localhost           # Via Nginx (no HTTPS)
```

### Certificate/SSL Issues

```bash
# Check certificate
openssl x509 -in /var/www/bgalin/bgalin_ru.crt -text -noout

# Verify certificate and key match
openssl x509 -noout -modulus -in /var/www/bgalin/bgalin_ru.crt | openssl md5
openssl rsa -noout -modulus -in /var/www/bgalin/private.key | openssl md5

# Test SSL connection
openssl s_client -connect bgalin.ru:443
```

### Database Connection Issues

```bash
# Test from server
psql -U admin -d bgalin -h localhost -c "SELECT 1"

# Check PostgreSQL logs
docker logs bgalin_postgres_1

# Verify connection string in backend
grep DATABASE_URL /var/www/bgalin/.env

# Test connection
psql postgresql://admin:admin@localhost:5432/bgalin -c "SELECT 1"
```

---

## Environment Variables

The `.env` file controls deployment configuration:

```bash
# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=bgalin

# N8N
N8N_HOST=bgalin.ru
N8N_PORT=5678
GENERIC_TIMEZONE=Europe/Moscow

# Backend
PORT=8000
NODE_ENV=production

# Optional
TELEGRAM_BOT_TOKEN=...
ADMIN_TELEGRAM_ID=...
```

**Note**: The `.env` file is created automatically during deployment if it doesn't exist.

---

## Performance Tuning

### Nginx
```nginx
# In nginx-bgalin.conf, adjust:
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Adjust for high traffic
worker_processes auto;
worker_connections 2048;
```

### Backend (Bun)
```bash
# In bgalin-backend.service, adjust:
Environment="NODE_ENV=production"
# Increase file descriptors
LimitNOFILE=65536
```

### Frontend (Next.js)
```bash
# In ecosystem.config.js, adjust:
instances: 'max',           # Use all CPU cores
exec_mode: 'cluster',       # Enable clustering
max_memory_restart: '1G',   # Restart if > 1GB
```

### Docker
```yaml
# In docker-compose.yml, adjust:
postgres:
  environment:
    POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c max_connections=200"
```

---

## Security Best Practices

### 1. SSH Security
- [ ] Disable root login
- [ ] Use key-based authentication (optional)
- [ ] Fail2Ban for brute-force protection

### 2. Firewall Rules
```bash
# UFW (Ubuntu Firewall)
sudo ufw allow 22/tcp         # SSH
sudo ufw allow 80/tcp         # HTTP
sudo ufw allow 443/tcp        # HTTPS
sudo ufw enable
```

### 3. SSL/TLS
- [ ] Use strong ciphers in Nginx
- [ ] Keep certificates current
- [ ] Enable HSTS header

### 4. Database Security
- [ ] Change default PostgreSQL password
- [ ] Limit database connections
- [ ] Enable PostgreSQL audit logging

### 5. Application Security
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting in Nginx
- [ ] Regular security audits

---

## Backup & Recovery

### Create Backups
```bash
# Backup database
docker exec bgalin_postgres_1 pg_dump -U admin bgalin > ~/bgalin_db_$(date +%Y%m%d).sql

# Backup entire /var/www/bgalin
tar -czf ~/bgalin_backup_$(date +%Y%m%d).tar.gz /var/www/bgalin
```

### Restore from Backup
```bash
# Restore database
docker exec -i bgalin_postgres_1 psql -U admin bgalin < ~/bgalin_db_backup.sql

# Restore files
cd /
sudo tar -xzf ~/bgalin_backup.tar.gz
```

---

## Deployment Checklist

Before each production deployment:

- [ ] All tests pass locally: `npm test`
- [ ] Code reviewed and approved
- [ ] Commit message is clear and descriptive
- [ ] No secrets committed to git
- [ ] Environment variables are set in GitHub Secrets
- [ ] Backup of database created
- [ ] Notification channels ready (Telegram, Slack)
- [ ] Ready to restart services if needed

---

## Support & Debugging

### View Complete Deployment Logs
```bash
# GitHub Actions
https://github.com/Nopass0/mybgalin/actions

# Server logs
ssh user@SERVER_HOST
tail -f /var/log/syslog
```

### Contact Information
- Repository: https://github.com/Nopass0/mybgalin
- Issues: https://github.com/Nopass0/mybgalin/issues

---

## References

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Bun Runtime Documentation](https://bun.sh)
- [Elysia Framework Documentation](https://elysiajs.com)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 18, 2024 | Initial production deployment guide |

---

**Last Updated**: December 18, 2024  
**Status**: Production Ready ✅
