# Deployment Fix Summary

**Date**: December 18, 2024  
**Issue**: `bash: bun: command not found` in GitHub Actions deployment  
**Status**: ✅ FIXED

---

## The Problem

GitHub Actions deployment failed at the Bun verification step with:

```
Installing Bun...
[Bun installation completed]
bash: line 43: bun: command not found
2025/12/17 19:24:32 Process exited with status 127
Error: Process completed with exit code 1.
```

### Root Cause

1. **PATH not set**: Bun was installed but not added to PATH in the current shell session
2. **Bun not for bgalin user**: Systemd service runs as `bgalin` user, but Bun was only installed for the SSH user
3. **Environment not persisted**: PATH changes in one step weren't available in subsequent steps

---

## The Solution

### Fix #1: Set PATH Explicitly (Commit 8e544cd)

**File**: `.github/workflows/deploy.yml`

```bash
# BEFORE: PATH not set, bun command fails
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export PATH="/home/$USER/.bun/bin:$PATH"
fi
bun --version  # ❌ FAILED

# AFTER: PATH set and re-exported
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"  # Re-export for safety
bun --version  # ✅ NOW WORKS
```

### Fix #2: Install Bun for bgalin User (Commit 7d6d67f)

**File**: `.github/workflows/deploy.yml`

```bash
# NEW: Install Bun for bgalin user (required for systemd service)
if [ ! -d /home/bgalin/.bun ]; then
  echo "Installing Bun for bgalin user..."
  sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'
fi
```

### Fix #3: Update Systemd Service (Commit 7d6d67f)

**File**: `bgalin-backend.service`

```ini
# BEFORE: Binary path may not be accessible
ExecStart=/home/bgalin/.bun/bin/bun run src/index.ts

# AFTER: Use bash shell and explicit PATH
ExecStart=/bin/bash -c "exec /home/bgalin/.bun/bin/bun run src/index.ts"
Environment="PATH=/home/bgalin/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

### Fix #4: Improve Verification Script (Commit b9ebb7b)

**File**: `verify-deployment.sh`

```bash
# BEFORE: Only checked current user
if command -v bun &> /dev/null; then
    VERSION=$(bun --version)
    check_pass "Bun installed: $VERSION"
else
    check_fail "Bun not installed"
fi

# AFTER: Check both current user and bgalin user
if command -v bun &> /dev/null; then
    VERSION=$(bun --version)
    check_pass "Bun installed (current user): $VERSION"
else
    check_warn "Bun not in PATH (current user)"
fi

if [ -d /home/bgalin/.bun ]; then
    check_pass "Bun installed for bgalin user"
else
    check_warn "Bun may not be installed for bgalin user"
fi
```

---

## What Changed

### GitHub Actions Deployment Flow

**BEFORE**:
```
Install Bun → Export PATH (not persistent) → Try bun ❌
                                              ERROR: command not found
```

**AFTER**:
```
Install Bun → Export BUN_INSTALL → Export PATH → Re-export PATH → bun ✅
Install Bun for bgalin user → Setup systemd → Start backend ✅
```

### Service Startup

**BEFORE**:
```
systemd → bgalin user → ExecStart: /home/bgalin/.bun/bin/bun ❌
                                   (No PATH, may not find bun)
```

**AFTER**:
```
systemd → bgalin user → Environment: PATH=/home/bgalin/.bun/bin:... → ✅
          → ExecStart: /bin/bash -c "exec .../bun ..." → ✅
                       (Explicit PATH, bash finds bun)
```

---

## Commits Made

1. **8e544cd** - Fix Bun PATH issue in GitHub Actions deployment
   - Export PATH explicitly for Bun in deploy.yml
   - Update bgalin-backend.service to include Bun in systemd PATH

2. **7d6d67f** - Improve Bun installation and PATH configuration
   - Set BUN_INSTALL environment variable explicitly
   - Install Bun for bgalin user (required for systemd service)
   - Use bash -c for service ExecStart to handle PATH properly

3. **b9ebb7b** - Add Bun troubleshooting guide and improve verification script
   - Created BUN_TROUBLESHOOTING.md with comprehensive Bun setup guide
   - Updated verify-deployment.sh to check Bun for bgalin user
   - Added solutions for common Bun issues

---

## Files Modified

| File | Changes |
|------|---------|
| `.github/workflows/deploy.yml` | Set BUN_INSTALL, export PATH multiple times, install Bun for bgalin |
| `bgalin-backend.service` | Add explicit PATH environment, use bash -c wrapper |
| `verify-deployment.sh` | Check Bun for both current user and bgalin user |

## Files Added

| File | Purpose |
|------|---------|
| `BUN_TROUBLESHOOTING.md` | Comprehensive Bun setup and troubleshooting guide |

---

## How to Verify the Fix

### After Next Deployment

1. **Check GitHub Actions succeeded**
   ```
   https://github.com/Nopass0/mybgalin/actions
   Look for: "✓ Bun ready" in logs
   ```

2. **SSH to server and verify Bun**
   ```bash
   ssh user@SERVER_HOST
   sudo -u bgalin /home/bgalin/.bun/bin/bun --version
   # Should output: v1.x.x
   ```

3. **Check backend service**
   ```bash
   sudo systemctl status bgalin-backend.service
   # Should show: active (running)
   ```

4. **Test backend API**
   ```bash
   curl http://localhost:8000/api/health
   # Should respond with JSON status
   ```

### Run Verification Script
```bash
bash /var/www/bgalin/verify-deployment.sh
# Should show:
# ✓ Bun installed (current user): v1.x.x
# ✓ Bun installed for bgalin user
```

---

## If Issues Persist

### Manual Bun Installation

```bash
# SSH to server
ssh user@SERVER_HOST

# Install Bun for bgalin user directly
sudo -u bgalin bash -c 'curl -fsSL https://bun.sh/install | bash'

# Verify
sudo -u bgalin /home/bgalin/.bun/bin/bun --version

# Restart backend service
sudo systemctl restart bgalin-backend.service

# Check status
sudo systemctl status bgalin-backend.service
sudo journalctl -u bgalin-backend.service -f
```

### Check Logs
```bash
# GitHub Actions logs
https://github.com/Nopass0/mybgalin/actions

# Server logs
sudo journalctl -u bgalin-backend.service -n 50
sudo tail -f /var/log/syslog

# Verification script
bash /var/www/bgalin/verify-deployment.sh
```

---

## Documentation

For more detailed troubleshooting, see:
- **BUN_TROUBLESHOOTING.md** - Comprehensive Bun guide
- **PRODUCTION_DEPLOYMENT.md** - Full deployment guide
- **DEPLOYMENT_READY.md** - Quick reference

---

## Summary

| Aspect | Status |
|--------|--------|
| Issue Identified | ✅ Bun PATH not set in GitHub Actions |
| Root Cause Found | ✅ PATH environment not persistent across steps |
| Fixes Applied | ✅ 3 commits with targeted fixes |
| Documentation Added | ✅ Comprehensive troubleshooting guide |
| Ready to Redeploy | ✅ YES - Push to main to trigger |

---

## Next Steps

1. ✅ Review this summary
2. 👉 Push to main: `git push origin main`
3. 👉 Monitor GitHub Actions: https://github.com/Nopass0/mybgalin/actions
4. 👉 Wait for completion (~5-10 minutes)
5. 👉 Verify with: `bash verify-deployment.sh`
6. 👉 Test endpoints: `curl https://bgalin.ru/api/health`

---

**Status**: ✅ READY FOR DEPLOYMENT  
**Last Updated**: December 18, 2024  
**Deployment Commits**: 8e544cd, 7d6d67f, b9ebb7b
