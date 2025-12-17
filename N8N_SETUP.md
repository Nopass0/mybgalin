# N8N Setup & Configuration

## Overview

N8N workflow automation platform is configured to run on **port 5678** and accessible via **https://bgalin.ru/n8n/**

### Architecture

```
Client (bgalin.ru/n8n) 
    ↓ HTTPS
Nginx (port 443)
    ↓ proxy_pass http://localhost:5678/
N8N Server (port 5678)
```

---

## Installation & Startup

### Prerequisites
- Node.js 20.x
- npm

### Install N8N

```bash
# Global installation
sudo npm install -g n8n

# Or local installation
npm install n8n
```

### Start N8N

#### Option 1: Direct Command
```bash
n8n start \
  --port 5678 \
  --listening_address 0.0.0.0 \
  --webhook_url https://bgalin.ru/webhook/ \
  --protocol https \
  --path /n8n/ \
  --editor_base_url https://bgalin.ru/n8n/ \
  --proxy_hops 1
```

#### Option 2: PM2 (Recommended for Production)
```bash
pm2 start n8n -- \
  --start \
  --port 5678 \
  --listening_address 0.0.0.0 \
  --webhook_url https://bgalin.ru/webhook/ \
  --protocol https \
  --path /n8n/ \
  --editor_base_url https://bgalin.ru/n8n/ \
  --proxy_hops 1

pm2 save
pm2 startup
```

#### Option 3: Environment Variables
Create `.env` file:
```env
N8N_PORT=5678
N8N_LISTEN_ADDRESS=0.0.0.0
N8N_WEBHOOK_URL=https://bgalin.ru/webhook/
N8N_PROTOCOL=https
N8N_PATH=/n8n/
N8N_EDITOR_BASE_URL=https://bgalin.ru/n8n/
N8N_PROXY_HOPS=1
NODE_ENV=production
```

Then run:
```bash
n8n start
```

---

## Nginx Configuration

The deployment script automatically configures nginx. Verify it's correct:

```bash
sudo cat /etc/nginx/sites-available/bgalin | grep -A 20 "location /n8n/"
```

Should look like:
```nginx
location /n8n/ {
    proxy_pass http://localhost:5678/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    chunked_transfer_encoding off;
    proxy_cache off;
}

location /webhook/ {
    proxy_pass http://localhost:5678/webhook/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    chunked_transfer_encoding off;
    proxy_cache off;
}
```

---

## Accessing N8N

### Web Interface
- **URL**: https://bgalin.ru/n8n/
- **Localhost**: http://localhost:5678

### First Login

1. Open https://bgalin.ru/n8n/
2. Create admin account (first user becomes admin)
3. Set password
4. Configure credentials

---

## Configuration Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `--port` | 5678 | Internal port N8N runs on |
| `--listening_address` | 0.0.0.0 | Listen on all interfaces |
| `--webhook_url` | https://bgalin.ru/webhook/ | Webhook base URL |
| `--protocol` | https | Use HTTPS |
| `--path` | /n8n/ | URL path prefix |
| `--editor_base_url` | https://bgalin.ru/n8n/ | Editor interface URL |
| `--proxy_hops` | 1 | Number of proxy hops (for IP detection) |

---

## Database

### Default (SQLite - for testing)
```bash
n8n start
# Creates: ~/.n8n/n8n.sqlite
```

### PostgreSQL (Recommended for Production)
```bash
# Set environment variable
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=localhost
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_USER=n8n_user
export DB_POSTGRESDB_PASSWORD=your_secure_password

n8n start
```

Or in `.env`:
```env
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n_user
DB_POSTGRESDB_PASSWORD=your_secure_password
```

---

## Testing N8N Accessibility

### Check if N8N is running locally
```bash
curl http://localhost:5678
```

### Check if N8N is accessible through nginx
```bash
curl http://localhost:8000/n8n   # Through nginx on localhost
curl https://bgalin.ru/n8n/      # Public (requires DNS + SSL)
```

### Check webhook endpoint
```bash
curl https://bgalin.ru/webhook/test
```

### Check service status (if using PM2)
```bash
pm2 list | grep n8n
pm2 logs n8n
pm2 monit
```

### Check if port 5678 is listening
```bash
sudo lsof -i :5678
netstat -tuln | grep 5678
```

---

## Troubleshooting

### N8N not accessible at bgalin.ru/n8n

**Check 1: Is N8N running?**
```bash
pm2 status
# or
ps aux | grep n8n
# or
sudo systemctl status bgalin-n8n  # if using systemd
```

**Check 2: Is port 5678 open?**
```bash
sudo lsof -i :5678
netstat -tuln | grep 5678
```

**Check 3: Is nginx proxying correctly?**
```bash
sudo nginx -t
sudo systemctl reload nginx
curl -v http://localhost:5678/
```

**Check 4: Check nginx logs**
```bash
sudo tail -f /var/log/nginx/bgalin_error.log
sudo tail -f /var/log/nginx/bgalin_access.log
```

**Check 5: Check N8N logs**
```bash
pm2 logs n8n
# or
journalctl -u bgalin-n8n -f
```

### N8N crashes on startup

**Error: Port already in use**
```bash
# Find what's using port 5678
sudo lsof -i :5678
sudo kill -9 <PID>

# Try different port
n8n start --port 5679
```

**Error: Database locked**
```bash
# Clear SQLite DB
rm ~/.n8n/n8n.sqlite
pm2 restart n8n
```

**Error: Memory issues**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
pm2 restart n8n
```

### Webhook not receiving requests

**Check webhook URL configuration**
```bash
# Should match: https://bgalin.ru/webhook/
# Not: http://localhost:5678/webhook/
```

**Test webhook manually**
```bash
curl -X POST https://bgalin.ru/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

**Check firewall**
```bash
sudo ufw status
sudo ufw allow 5678
```

---

## Monitoring

### Real-time monitoring with PM2
```bash
pm2 monit
```

### View N8N resource usage
```bash
pm2 show n8n
```

### CPU and Memory alerts
```bash
pm2 start n8n --max-memory-restart 1G
```

### Log rotation (prevents disk issues)
```bash
pm2 install pm2-logrotate
pm2 restart pm2-logrotate
```

---

## Production Checklist

- [ ] N8N running on port 5678
- [ ] Accessible at https://bgalin.ru/n8n/
- [ ] Webhook URL correct: https://bgalin.ru/webhook/
- [ ] Using PostgreSQL (not SQLite)
- [ ] Running via PM2 or systemd
- [ ] Logs being monitored
- [ ] Memory limits set
- [ ] Backups configured

---

## Integration with BGalin Backend

N8N can trigger workflows from the BGalin backend:

### BGalin API → N8N Webhook

```bash
# From backend
curl -X POST https://bgalin.ru/webhook/job-search \
  -H "Content-Type: application/json" \
  -d '{
    "event": "vacancy_found",
    "vacancy_id": 123,
    "url": "https://hh.ru/vacancy/123"
  }'
```

### Environment Variables for Backend
```env
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key
```

---

## Performance Optimization

### Increase Worker Threads
```bash
export N8N_WORKER_TYPE=push
n8n start
```

### Use Queue (for high-volume)
```bash
# Terminal 1: Main process
export N8N_QUEUE_MODE_ACTIVE=true
n8n start

# Terminal 2: Worker
n8n worker
```

### Database Connection Pool
```env
DB_CONNECTION_TIMEOUT=5000
DB_POOL_SIZE=10
```

---

## Backup & Recovery

### Export workflows
```bash
n8n export:workflow --backup
```

### Export all data
```bash
n8n export:all > backup.json
```

### Import workflows
```bash
n8n import:workflow --file backup.json
```

---

## Security

### Enable authentication
```env
N8N_AUTHENTICATION_DISABLED=false
```

### Use HTTPS only (already configured)
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

### Restrict webhook access
```nginx
location /webhook/ {
    allow 127.0.0.1;
    allow 192.168.0.0/16;  # Internal network
    deny all;
}
```

---

## Documentation Links

- [N8N Official Docs](https://docs.n8n.io/)
- [N8N Installation Guide](https://docs.n8n.io/hosting/installation/)
- [N8N Docker Setup](https://docs.n8n.io/hosting/docker/)
- [N8N Deployment](https://docs.n8n.io/hosting/deployment/)

---

## Support

For N8N issues:
1. Check logs: `pm2 logs n8n`
2. Check docs: https://docs.n8n.io/
3. Check GitHub: https://github.com/n8n-io/n8n
4. Check community: https://community.n8n.io/

**Status**: ✅ N8N configured and ready at https://bgalin.ru/n8n/
