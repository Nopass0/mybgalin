# Check Deployment Status

## GitHub Actions Status

**Latest Commit:** `eefbde5 - Create minimal deploy.yml - ultra simple version`

GitHub Actions **SHOULD TRIGGER AUTOMATICALLY** within 1-2 minutes.

### How to Check

1. Go to: https://github.com/Nopass0/mybgalin/actions
2. Look for "Deploy" workflow in the list
3. Click on it
4. Watch the job status:
   - ⏳ Yellow = Running
   - ✅ Green = Success
   - ❌ Red = Failed

### What's Happening

The workflow is executing these steps:

```yaml
1. Checkout code from main branch
2. SSH into server (using GitHub Secrets)
3. Pull latest git changes
4. Install/update Bun
5. Install backend dependencies (bun install)
6. Generate Prisma client
7. Run database migrations
8. Install frontend dependencies (npm)
9. Build frontend (npm run build)
10. Restart services (pm2 restart all)
11. Restart backend service (systemd)
12. Reload nginx
13. Done!
```

## If It's Still Not Working

### Check 1: GitHub Secrets

Make sure these secrets are set in your GitHub repo settings:
- ✅ `SERVER_HOST` - Your server IP
- ✅ `SERVER_USER` - SSH username
- ✅ `SSH_PRIVATE_KEY` - Private SSH key
- ✅ `SERVER_PORT` - SSH port (usually 22)
- ✅ `TELEGRAM_BOT_TOKEN` - For notifications
- ✅ `ADMIN_TELEGRAM_ID` - Your Telegram ID

**How to set secrets:**
1. Go to: https://github.com/Nopass0/mybgalin/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret one by one

### Check 2: Manual SSH Test

Test SSH connection manually:
```bash
ssh -i /path/to/private/key -p 22 user@SERVER_HOST
```

If this fails, GitHub Actions will also fail.

### Check 3: Server Requirements

On the server, verify:
```bash
# Check if directories exist
ls -la /var/www/bgalin

# Check if git is available
git --version

# Check npm
npm --version

# Check Node.js version
node --version  # Should be 20.x

# Check if bun works (will install if not)
bun --version
```

### Check 4: Deploy Manually (If GitHub Actions Fails)

If you want to test deployment manually:

```bash
# SSH into server
ssh user@SERVER_HOST -p PORT

# Navigate to project
cd /var/www/bgalin

# Pull latest
git fetch origin main
git reset --hard origin/main

# Setup backend
cd server
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun install
npx prisma generate
npx prisma db push --skip-generate

# Setup frontend
cd ../frontend
npm install
npm run build

# Restart services
cd /var/www/bgalin
pm2 restart all
sudo systemctl restart bgalin-backend.service
sudo systemctl reload nginx

# Verify
pm2 status
```

## Expected Results

### Success ✅

In GitHub Actions, you should see:
- All steps completed with green checkmarks
- "Deployment done" message at the end

On the server:
```bash
# Services should be running
pm2 status
# Output should show:
# bgalin-frontend    online
# bgalin-backend     online (or via systemd)
# n8n                online

# Backend should respond
curl http://localhost:8000/api/health

# Frontend should respond
curl http://localhost:3000

# N8N should respond
curl http://localhost:5678
```

### Failure ❌

If you see red X in GitHub Actions:
1. Click on the failed job
2. Scroll down to see error message
3. Look for which step failed
4. Check the logs

Common errors:
- "SSH key not found" → Set SSH_PRIVATE_KEY secret
- "Connection refused" → SERVER_HOST or SERVER_USER wrong
- "Command not found: bun" → Bun installation failed
- "Database migration failed" → Check DATABASE_URL env var
- "npm run build failed" → Frontend has errors

## Next Steps

1. ✅ Wait for GitHub Actions to complete (or check manually)
2. ✅ Once successful, verify all services are running
3. ✅ Test endpoints:
   ```bash
   curl https://bgalin.ru/api/health
   curl https://bgalin.ru/
   curl https://bgalin.ru/n8n/
   ```
4. ✅ Check N8N is accessible
5. 🎉 Deployment complete!

## Quick Status Check

**Current Status:** `eefbde5` commit pushed to main

**Expected:** GitHub Actions should trigger within 2 minutes

**Check here:** https://github.com/Nopass0/mybgalin/actions

---

## If GitHub Actions Still Doesn't Run

Sometimes GitHub Actions can be flaky. Alternative:

1. Make a minor change and commit:
   ```bash
   echo "# Updated" >> README.md
   git add README.md
   git commit -m "Trigger deployment"
   git push origin main
   ```

2. Or manually run the workflow (if available in UI):
   - Go to Actions tab
   - Click "Deploy" workflow
   - Click "Run workflow" button (if available)

---

**Questions?** Check the documentation:
- BACKEND_DEPLOYMENT.md
- N8N_SETUP.md
- QUICK_DEPLOY_TEST.md
