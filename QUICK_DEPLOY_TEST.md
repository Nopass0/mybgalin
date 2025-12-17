# GitHub Actions Deployment Test

## Check Deployment Status

GitHub Actions workflow should now trigger automatically on every push to `main` branch.

### View Deployment Status
1. Open GitHub Repository: https://github.com/Nopass0/mybgalin
2. Click "Actions" tab
3. Look for "Deploy to Production" workflow
4. Should show:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed
   - ⏳ Yellow circle = In progress

### Recent Push
Latest commit: `48b3f58 - Simplify deploy.yml for better GitHub Actions compatibility`

The workflow should trigger within 1-2 minutes of this push.

---

## What GitHub Actions Will Do

1. **Checkout code** - Pull latest from main
2. **SSH to server** - Connect using GitHub Secrets
3. **Install dependencies**
   - Node.js 20.x
   - Bun
   - PostgreSQL client
4. **Setup backend**
   - Install dependencies with Bun
   - Generate Prisma client
   - Run database migrations
5. **Setup frontend**
   - Install dependencies
   - Build Next.js
6. **Configure services**
   - Systemd service for Bun backend (port 8000)
   - PM2 for frontend (port 3000)
   - PM2 for N8N (port 5678)
7. **Setup nginx**
   - HTTPS proxy rules
   - Redirect HTTP to HTTPS
8. **Verify services** - Health checks
9. **Send notification** - Telegram message to admin

---

## Expected Output

### Success (Green ✅)
```
✅ Deployment complete!
Backend: port 8000
Frontend: port 3000
N8N: /n8n/
```

Telegram notification will arrive showing deployment is complete.

### Failure (Red ❌)
Check the logs for error messages. Common issues:
- SSH connection failed (check secrets)
- Bun installation failed
- Port already in use
- Insufficient disk space
- Database migration failed

---

## Troubleshooting

### GitHub Actions not triggering
- Check that push is to `main` branch (not other branch)
- Verify file was actually committed: `git log --oneline | head -3`
- Wait 1-2 minutes for GitHub to process

### Deployment fails at SSH step
- Verify `SERVER_HOST` secret is correct
- Verify `SERVER_USER` secret is correct
- Verify `SSH_PRIVATE_KEY` secret is valid
- Check server is accessible: `ssh -i key user@host`

### Deployment fails during Bun setup
- Server might already have Bun installed (that's OK)
- Check available disk space on server: `df -h`
- Check Node.js version: `node --version` (should be 20.x)

### Deployment fails during build
- Check frontend can build: `npm run build` locally
- Check backend dependencies: `bun install` in server dir
- Verify all environment variables are set

---

## Manual Alternative (If GitHub Actions Fails)

If GitHub Actions doesn't work, you can deploy manually:

```bash
# SSH into server
ssh user@bgalin.ru

# Navigate to project
cd /var/www/bgalin

# Pull latest code
git pull origin main

# Update backend
cd server
bun install
npx prisma generate
npx prisma db push --skip-generate

# Restart services
pm2 restart all
sudo systemctl restart bgalin-backend.service
sudo systemctl reload nginx

# Verify
pm2 status
curl http://localhost:8000/api/health
```

---

## Test After Successful Deployment

Once deployment completes (green checkmark):

### Test Backend
```bash
curl https://bgalin.ru/api/health
# Should return: {"status":"ok"} or similar
```

### Test Frontend
```bash
curl https://bgalin.ru/
# Should return HTML
```

### Test N8N
```bash
curl https://bgalin.ru/n8n/
# Should return N8N UI HTML
```

### Test Specific Endpoints
```bash
# Get vacancies
curl https://bgalin.ru/api/jobs/vacancies

# Get menu settings
curl https://bgalin.ru/api/menu-settings

# Get Swagger docs
curl https://bgalin.ru/swagger
```

---

## Next Steps

1. ✅ Push commit with updated deploy.yml
2. ⏳ Wait for GitHub Actions to trigger (1-2 min)
3. 🔍 Monitor deployment status in Actions tab
4. ✅ Once green, test endpoints above
5. 📱 Check Telegram for notification
6. 🎉 Deployment complete!

---

## Status

- ✅ deploy.yml simplified and fixed
- ✅ Pushed to main branch
- ⏳ GitHub Actions should trigger now
- ⏳ Awaiting deployment confirmation

**Expected time to complete**: 5-10 minutes

---

For more info:
- GitHub Actions: https://github.com/Nopass0/mybgalin/actions
- Deployment logs: In GitHub Actions UI
- Documentation: See BACKEND_DEPLOYMENT.md
