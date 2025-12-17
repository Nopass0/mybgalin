# Bun Installation & Troubleshooting Guide

## Overview

Bun is a modern JavaScript/TypeScript runtime used for the BGalin backend. This guide helps troubleshoot Bun-related issues.

---

## Symptoms

### ❌ "bash: bun: command not found" in GitHub Actions
- **Cause**: Bun not in PATH or installation failed
- **Solution**: Already fixed in latest deploy.yml (v7d6d67f+)

### ❌ Backend service fails to start
- **Cause**: Bun not installed for `bgalin` user
- **Error**: `ExecStart= command not found`
- **Solution**: See "Install Bun for bgalin User" below

### ❌ "bun: Permission denied"
- **Cause**: Bun binary doesn't have execute permissions
- **Solution**: `chmod +x ~/.bun/bin/bun`

### ❌ Backend running but health check fails
- **Cause**: Bun process crashed or stuck
- **Solution**: Check logs with `sudo journalctl -u bgalin-backend.service -f`

---

## Installation & Setup

### Install Bun (Current User)

```bash
# Direct install
curl -fsSL https://bun.sh/install | bash

# Add to PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify
bun --version
```

### Install Bun for bgalin User (For Backend Service)

```bash
# Run as bgalin user
sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'

# Or run as root then fix permissions
curl -fsSL https://bun.sh/install | bash
sudo chown -R bgalin:bgalin /home/bgalin/.bun
```

### Verify Bun Installation

```bash
# Check for current user
which bun
bun --version

# Check for bgalin user
sudo -u bgalin /home/bgalin/.bun/bin/bun --version

# Or
ls -la /home/bgalin/.bun/bin/bun
```

---

## Environment Variables

### For GitHub Actions

The deploy.yml sets these automatically:

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

### For Systemd Service

The bgalin-backend.service includes:

```ini
Environment="PATH=/home/bgalin/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

### For Shell Sessions

Add to `~/.bashrc`:

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

---

## Common Issues & Solutions

### Issue 1: Bun Not Found During Deployment

**Error**:
```
bash: bun: command not found
```

**Solution**:
```bash
# The PATH variable wasn't set. Latest deploy.yml fixes this:
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
bun --version
```

### Issue 2: Backend Service Won't Start

**Error** (in `journalctl`):
```
ExecStart=/bin/bash -c "exec /home/bgalin/.bun/bin/bun run src/index.ts" failed with exit code 127
```

**Cause**: Bun not installed for bgalin user

**Solution**:
```bash
# Install Bun for bgalin
sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'

# Restart service
sudo systemctl restart bgalin-backend.service

# Check status
sudo systemctl status bgalin-backend.service
sudo journalctl -u bgalin-backend.service -f
```

### Issue 3: Permission Denied on Bun Binary

**Error**:
```
/home/bgalin/.bun/bin/bun: Permission denied
```

**Solution**:
```bash
# Fix permissions
sudo chmod +x /home/bgalin/.bun/bin/bun

# Or reinstall for bgalin user
sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'
```

### Issue 4: Multiple Bun Installations

**Problem**: Bun installed in multiple locations causing conflicts

**Solution**:
```bash
# Find all Bun installations
find ~ -name "bun" -type f 2>/dev/null
sudo find / -name "bun" -type f 2>/dev/null

# Keep only ~/.bun installation
# Remove others if they conflict
sudo rm -f /usr/local/bin/bun
sudo rm -rf /usr/local/.bun

# Update PATH to use only ~/.bun
export PATH="$HOME/.bun/bin:$PATH"
```

### Issue 5: Out of Disk Space During Bun Install

**Error**:
```
curl: (56) Failure writing output to destination
```

**Solution**:
```bash
# Check disk space
df -h

# Free up space
sudo apt-get clean
sudo apt-get autoclean

# Retry install
curl -fsSL https://bun.sh/install | bash
```

---

## Testing Bun

### Quick Tests

```bash
# Test Bun CLI
bun --version
bun --help

# Create test file
echo 'console.log("Hello from Bun!");' > test.ts

# Run with Bun
bun test.ts

# Test package management
bun install --version
```

### Test Backend with Bun

```bash
# From server directory
cd /var/www/bgalin/server

# Install dependencies
bun install

# Generate Prisma
npx prisma generate

# Run backend directly
bun run src/index.ts

# Should see: "Backend listening on port 8000"

# Test API
curl http://localhost:8000/api/health
```

---

## Monitoring Bun Processes

### List Bun Processes

```bash
# Current user
ps aux | grep bun

# All users
sudo ps aux | grep bun

# Using pgrep
pgrep -a bun
```

### Monitor Resource Usage

```bash
# Real-time monitoring
top -p $(pgrep bun | head -1)

# Memory usage
ps aux | grep bun | grep -v grep | awk '{print $6 " MB"}'

# CPU usage
ps aux | grep bun | grep -v grep | awk '{print $3 "%"}'
```

### Check Bun Port

```bash
# Check if backend is listening on port 8000
netstat -tuln | grep 8000
lsof -i :8000
```

---

## Bun Updates

### Update Bun

```bash
# Check current version
bun --version

# Update (same command as install)
curl -fsSL https://bun.sh/install | bash

# Verify new version
bun --version
```

### Update for All Users

```bash
# Current user
curl -fsSL https://bun.sh/install | bash

# bgalin user
sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'

# Verify both
bun --version
sudo -u bgalin /home/bgalin/.bun/bin/bun --version
```

---

## Debugging Tips

### Enable Debug Output

```bash
# Set debug flag
export BUN_DEBUG=1

# Run backend
bun run src/index.ts

# Or via systemd
sudo systemctl set-environment BUN_DEBUG=1
sudo systemctl restart bgalin-backend.service
```

### Check Bun Configuration

```bash
# Show Bun info
bun --info

# Show npm info
bun pm ls

# Show installed packages
cd /var/www/bgalin/server
bun pm ls
```

### Test Bun Binary

```bash
# Check binary
file /home/bgalin/.bun/bin/bun

# Verify it's executable
test -x /home/bgalin/.bun/bin/bun && echo "Executable" || echo "Not executable"

# Check dependencies
ldd /home/bgalin/.bun/bin/bun
```

---

## Recovery Procedures

### Reinstall Bun (All Users)

```bash
# Remove old installation
rm -rf ~/.bun
rm -rf /home/bgalin/.bun

# Reinstall for current user
curl -fsSL https://bun.sh/install | bash

# Reinstall for bgalin
sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'

# Verify
bun --version
sudo -u bgalin /home/bgalin/.bun/bin/bun --version
```

### Fix PATH Issues

```bash
# Check current PATH
echo $PATH

# Add Bun to PATH for current session
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify
bun --version

# Make permanent (add to ~/.bashrc)
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Test Deployment Manually

```bash
# Run deployment steps manually

# 1. Install Bun
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# 2. Navigate to backend
cd /var/www/bgalin/server

# 3. Install dependencies
bun install

# 4. Setup database
npx prisma generate
npx prisma db push

# 5. Test backend
bun run src/index.ts

# Should work now!
```

---

## Version Compatibility

### Tested Versions

- Bun: v1.0.0+ (latest recommended)
- Node.js: 18.x, 20.x (used for Prisma)
- npm: 9.x, 10.x (bundled with Node.js)

### Check Compatibility

```bash
bun --version
node --version
npm --version
```

---

## Performance Tips

### Bun Caching

```bash
# Clear Bun cache if issues occur
rm -rf ~/.bun/cache

# Reinstall dependencies
cd /var/www/bgalin/server
rm -rf node_modules
bun install
```

### Optimize Build

```bash
# Use --no-install for faster builds
bun install --no-install

# Use production mode
NODE_ENV=production bun run src/index.ts
```

---

## Support & Resources

- **Bun Official**: https://bun.sh/
- **Bun Docs**: https://bun.sh/docs
- **Bun GitHub**: https://github.com/oven-sh/bun
- **Issues**: Check server logs with `journalctl -u bgalin-backend.service -f`

---

## Quick Reference Commands

```bash
# Install
curl -fsSL https://bun.sh/install | bash

# Verify
bun --version

# Set PATH
export PATH="$HOME/.bun/bin:$PATH"

# Run backend
bun run src/index.ts

# Install dependencies
bun install

# Check running processes
pgrep -a bun

# View logs
sudo journalctl -u bgalin-backend.service -f

# Reinstall for bgalin user
sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'

# Restart service
sudo systemctl restart bgalin-backend.service
```

---

**Last Updated**: December 18, 2024  
**Status**: Actively Maintained
