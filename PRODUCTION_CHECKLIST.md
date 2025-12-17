# Production Deployment Checklist

## Pre-Deployment (Development)

- [x] Backend migrated to Bun/Elysia
- [x] All 14 controllers working
- [x] All 12 services implemented
- [x] HH.ru OAuth callback added
- [x] Swagger documentation configured
- [x] Environment variables documented
- [x] Deployment script updated for Bun
- [x] N8N configuration documented
- [x] All code committed to git

---

## Server Preparation

### System Updates
- [ ] SSH into production server
- [ ] Run: `sudo apt update && sudo apt upgrade -y`
- [ ] Check available disk space: `df -h`
- [ ] Check available memory: `free -h`

### Dependencies Installation

#### Node.js 20.x (Required for Bun and Prisma)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Verify v20.19+
```

#### Bun Runtime
```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun --version  # Verify 1.3.4+
```

#### PostgreSQL (Database)
```bash
sudo apt-get install -y postgresql postgresql-contrib postgresql-client
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 startup
pm2 save
```

#### N8N (Workflow Automation)
```bash
sudo npm install -g n8n
```

- [ ] Node.js 20.x installed
- [ ] Bun installed
- [ ] PostgreSQL installed and running
- [ ] Nginx installed and running
- [ ] PM2 installed globally
- [ ] N8N installed globally

---

## Database Setup

### PostgreSQL Configuration
```bash
# Create n8n database
sudo -u postgres createdb n8n
sudo -u postgres createuser -P n8n_user

# Create BGalin database (if needed)
sudo -u postgres createdb bgalin_prod
sudo -u postgres createuser -P bgalin_user

# Grant privileges
sudo -u postgres psql <<EOF
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;
GRANT ALL PRIVILEGES ON DATABASE bgalin_prod TO bgalin_user;
ALTER USER n8n_user CREATEDB;
ALTER USER bgalin_user CREATEDB;
EOF
```

- [ ] N8N PostgreSQL database created
- [ ] BGalin PostgreSQL database created
- [ ] Database users created with passwords
- [ ] Privileges granted

---

## Deployment via GitHub Actions

### GitHub Secrets Setup
Verify all secrets are set in: Settings → Secrets and variables → Actions

Required secrets:
- [ ] `SERVER_HOST` - Server IP or domain
- [ ] `SERVER_USER` - SSH username
- [ ] `SERVER_PASSWORD` - SSH password (or use SSH key)
- [ ] `SSH_PRIVATE_KEY` - SSH private key
- [ ] `SERVER_PORT` - SSH port (default 22)
- [ ] `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@localhost:5432/dbname`
- [ ] `TELEGRAM_BOT_TOKEN` - Telegram bot token
- [ ] `ADMIN_TELEGRAM_ID` - Your Telegram ID
- [ ] `ADMIN_STEAM_ID` - Your Steam ID
- [ ] `STEAM_API_KEY` - Steam API key
- [ ] `HH_CLIENT_ID` - HH.ru OAuth client ID
- [ ] `HH_CLIENT_SECRET` - HH.ru OAuth client secret
- [ ] `OPENROUTER_API_KEY` - AI API key
- [ ] `N8N_API_KEY` - N8N API key
- [ ] `FACEIT_API_KEY` - Faceit API key (optional)

- [ ] All GitHub secrets configured

### Trigger Deployment
```bash
git push origin main
# GitHub Actions will automatically:
# 1. Pull latest code
# 2. Install dependencies
# 3. Build frontend
# 4. Setup Bun backend
# 5. Initialize database
# 6. Start services
# 7. Reload nginx
# 8. Send Telegram notification
```

- [ ] Push to main branch
- [ ] Monitor GitHub Actions: https://github.com/Nopass0/mybgalin/actions
- [ ] Wait for deployment to complete (~5-10 minutes)
- [ ] Receive Telegram notification

---

## Post-Deployment Verification

### Service Status
```bash
# Check backend
sudo systemctl status bgalin-backend.service
pm2 status

# Check frontend
pm2 list | grep bgalin-frontend

# Check N8N
pm2 list | grep n8n

# Check nginx
sudo systemctl status nginx
```

- [ ] Backend service is active
- [ ] Frontend is running (PM2)
- [ ] N8N is running (PM2)
- [ ] Nginx is running and reloaded

### Endpoint Testing

#### Backend Health Check
```bash
curl -s http://localhost:8000/api/health
# Expected: {"status":"ok"} or similar
```

#### Frontend
```bash
curl -s http://localhost:3000
# Should return HTML
```

#### N8N
```bash
curl -s http://localhost:5678
# Should return N8N interface HTML
```

#### Public URLs
```bash
curl -s https://bgalin.ru/api/health
curl -s https://bgalin.ru/
curl -s https://bgalin.ru/n8n/
```

- [ ] Backend health check passes
- [ ] Frontend accessible
- [ ] N8N accessible at localhost:5678
- [ ] Public URLs working (https://bgalin.ru)

### API Endpoints
```bash
# Get vacancies
curl https://bgalin.ru/api/jobs/vacancies

# Test job stats
curl https://bgalin.ru/api/jobs/stats

# Get menu settings
curl https://bgalin.ru/api/menu-settings

# Swagger UI
# Visit: https://bgalin.ru/swagger
```

- [ ] Job endpoints responding
- [ ] Portfolio endpoints responding
- [ ] Swagger UI accessible
- [ ] All core endpoints working

### Logs Check
```bash
# Backend logs
sudo journalctl -u bgalin-backend.service -n 50

# Frontend logs
pm2 logs bgalin-frontend

# N8N logs
pm2 logs n8n

# Nginx error log
sudo tail -f /var/log/nginx/bgalin_error.log
```

- [ ] No errors in backend logs
- [ ] No errors in frontend logs
- [ ] No errors in N8N logs
- [ ] No errors in nginx logs

---

## Configuration Verification

### Environment Variables
```bash
# Check backend environment
cat /var/www/bgalin/server/.env | head -5

# Check that DATABASE_URL is correct
echo $DATABASE_URL
```

- [ ] DATABASE_URL pointing to correct PostgreSQL
- [ ] All secrets loaded correctly
- [ ] NODE_ENV=production

### Nginx Configuration
```bash
sudo nginx -t
sudo cat /etc/nginx/sites-available/bgalin | grep -A 5 "proxy_pass"
```

- [ ] Nginx config valid
- [ ] Backend proxying to port 8000
- [ ] Frontend proxying to port 3000
- [ ] N8N proxying to port 5678

### SSL/TLS Certificates
```bash
sudo ls -la /var/www/bgalin/bgalin_ru.crt
sudo ls -la /var/www/bgalin/private.key

# Check expiration
sudo openssl x509 -in /var/www/bgalin/bgalin_ru.crt -noout -dates
```

- [ ] SSL certificates present
- [ ] Certificates not expired
- [ ] Private key readable

---

## Database Verification

### PostgreSQL Connection
```bash
psql postgresql://bgalin_user:password@localhost:5432/bgalin_prod

# List tables
\dt

# Check schema
\d
```

- [ ] Can connect to BGalin database
- [ ] Tables created (Prisma migration ran)
- [ ] N8N database accessible

### Prisma Status
```bash
cd /var/www/bgalin/server
npx prisma studio
# Should open studio on http://localhost:5555
```

- [ ] Prisma client generated
- [ ] Database migrations applied
- [ ] Can view data in Prisma Studio

---

## Service Restart Verification

### Systemd Service
```bash
# Restart service
sudo systemctl restart bgalin-backend.service

# Wait for it to start
sleep 5

# Check status
sudo systemctl status bgalin-backend.service

# View logs
sudo journalctl -u bgalin-backend.service -n 20
```

- [ ] Backend restarts cleanly
- [ ] No startup errors
- [ ] Service reaches "active (running)" state

### PM2 Services
```bash
# Restart all
pm2 restart all

# Wait for restart
sleep 5

# Check status
pm2 status

# View logs
pm2 logs --err
```

- [ ] Frontend restarts successfully
- [ ] N8N restarts successfully
- [ ] All services show "online" status

---

## Performance Monitoring

### Memory Usage
```bash
# Check memory
free -h

# Check process memory
ps aux | grep -E "bun|node|n8n" | grep -v grep
```

- [ ] Backend memory < 500MB
- [ ] Frontend memory < 300MB
- [ ] N8N memory < 500MB
- [ ] Total memory usage acceptable

### Disk Space
```bash
df -h /var/www/bgalin
du -sh /var/www/bgalin/*
```

- [ ] Sufficient disk space (> 1GB free)
- [ ] Database size monitored
- [ ] Logs size monitored

### Response Times
```bash
# Benchmark API
ab -n 100 -c 10 https://bgalin.ru/api/health

# Check slow endpoints
curl -w "Response time: %{time_total}s\n" https://bgalin.ru/api/jobs/vacancies
```

- [ ] API response time < 200ms
- [ ] Frontend load time < 3s
- [ ] No significant slowdowns

---

## Monitoring Setup

### PM2 Monitoring
```bash
# Enable log rotation
pm2 install pm2-logrotate

# Set up auto-restart on memory limit
pm2 start bgalin-backend --max-memory-restart 500M

# Monitor in real-time
pm2 monit
```

- [ ] PM2 log rotation enabled
- [ ] Memory limits configured
- [ ] Monitoring dashboard accessible

### Alerting
```bash
# Setup Telegram alerts (already configured)
# Check that notifications are received

# Monitor with journalctl
sudo journalctl -u bgalin-backend.service -f
```

- [ ] Telegram notifications working
- [ ] Error alerts configured
- [ ] Deployment notifications received

---

## Backup Configuration

### Database Backup
```bash
# Test backup
pg_dump postgresql://bgalin_user:password@localhost:5432/bgalin_prod > /tmp/backup.sql

# Schedule daily backup
(crontab -l 2>/dev/null; echo "0 2 * * * pg_dump postgresql://bgalin_user:password@localhost:5432/bgalin_prod > /backups/bgalin_$(date +\%Y\%m\%d).sql") | crontab -
```

- [ ] Database backup script created
- [ ] Backup tested
- [ ] Cron job scheduled

### Application Backup
```bash
# Backup git repository
cd /var/www/bgalin
git bundle create /backups/bgalin.bundle --all
```

- [ ] Application code backed up
- [ ] Backup verification passed

---

## Security Hardening

### Firewall
```bash
sudo ufw status
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

- [ ] Firewall enabled
- [ ] Only necessary ports open
- [ ] SSH access secured

### File Permissions
```bash
ls -la /var/www/bgalin/
ls -la /var/www/bgalin/.env
```

- [ ] .env file not world-readable (600)
- [ ] Database files protected
- [ ] SSL key not world-readable

### Updates
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

- [ ] Automatic security updates enabled
- [ ] System keeps up-to-date

---

## Final Checklist

### Deployment Complete
- [ ] All services running
- [ ] All endpoints accessible
- [ ] All tests passing
- [ ] No error logs
- [ ] Performance acceptable
- [ ] Backups configured
- [ ] Monitoring active
- [ ] Security hardened
- [ ] Documentation updated

### Go-Live Ready
- [ ] bgalin.ru accessible
- [ ] bgalin.ru/n8n accessible
- [ ] bgalin.ru/api/* endpoints working
- [ ] Swagger UI working
- [ ] Admin can login
- [ ] Users can access site
- [ ] N8N workflows operational

### Post-Deployment
- [ ] Inform team of deployment
- [ ] Monitor for 24 hours
- [ ] Collect user feedback
- [ ] Fix any issues discovered
- [ ] Document lessons learned

---

## Rollback Plan

If deployment fails:

### Quick Rollback
```bash
# Revert to previous commit
cd /var/www/bgalin
git revert HEAD
git push origin main
# GitHub Actions will redeploy

# Or manual rollback
sudo systemctl stop bgalin-backend.service
git checkout <previous_commit>
npm install
pm2 restart bgalin-backend
```

### Database Rollback
```bash
# If database was corrupted
psql -U bgalin_user -d bgalin_prod < /backups/bgalin_previous.sql
```

- [ ] Previous commit known and accessible
- [ ] Database backup available
- [ ] Rollback procedure tested

---

## Success Criteria

✅ **Deployment is successful when:**

1. All services are running (`pm2 status` shows all online)
2. All endpoints respond correctly
3. No critical errors in logs
4. Performance metrics are normal
5. Users can access the site
6. Telegram notifications work
7. N8N workflows operational
8. Database is connected
9. Backups are configured
10. Monitoring is active

---

## Support Contacts

- **Emergency Issues**: Check logs first
  - Backend: `sudo journalctl -u bgalin-backend.service -f`
  - Frontend: `pm2 logs bgalin-frontend`
  - N8N: `pm2 logs n8n`

- **Common Commands**:
  ```bash
  pm2 restart all          # Restart all services
  pm2 stop all             # Stop all services
  sudo systemctl reload nginx  # Reload nginx
  ```

- **Documentation**:
  - BACKEND_DEPLOYMENT.md - Backend setup
  - N8N_SETUP.md - N8N configuration
  - API_TESTING_GUIDE.md - API testing
  - MIGRATION_SUMMARY.md - Migration info

---

## Status: ✅ READY FOR PRODUCTION

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Notes**: _______________________________

All checks completed and production environment ready for live traffic!
