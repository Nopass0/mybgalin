# SSH Connection Troubleshooting

## Error: "connection reset by peer"

This means the SSH server rejected the connection or closed it immediately.

### Possible Causes

1. **Wrong SSH Key Format**
   - Key should start with `-----BEGIN OPENSSH PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----`
   - Must include the `-----END...-----` line
   - No extra spaces or formatting

2. **Wrong SSH Port**
   - Most servers use port 22
   - Some use 2222, 2222, etc
   - GitHub Actions can't reach non-standard ports easily

3. **SSH Key Not Added to Server**
   - The public key must be in `~/.ssh/authorized_keys` on server
   - Permissions must be correct: `chmod 600 ~/.ssh/authorized_keys`

4. **Host Key Not Known**
   - GitHub Actions doesn't know the server's SSH fingerprint
   - appleboy/ssh-action should handle this automatically

5. **Server Firewall Blocking**
   - Port 22 might be blocked
   - GitHub Actions IPs might be blocked
   - Check: `sudo ufw status`

6. **SSH Service Not Running**
   - Check on server: `sudo systemctl status ssh`
   - Restart: `sudo systemctl restart ssh`

---

## Solution Steps

### Step 1: Test SSH Locally

On your computer, test the SSH connection:

```bash
# With password
ssh -v user@SERVER_HOST -p PORT

# With key
ssh -v -i /path/to/private/key user@SERVER_HOST -p PORT
```

If this works locally, GitHub Actions should also work.

### Step 2: Fix SSH Key Format

Copy your private SSH key:

```bash
# The key should look like this:
-----BEGIN OPENSSH PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...lots of characters...
...
-----END OPENSSH PRIVATE KEY-----
```

**NOT like this:**
```
-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: DES-EDE3-CBC,12345...
```

If yours is encrypted, generate a new one:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_key -N ""
cat ~/.ssh/github_key
```

### Step 3: Add Public Key to Server

```bash
# On your local machine, get the public key
cat ~/.ssh/github_key.pub

# SSH into server
ssh user@SERVER_HOST

# Add to authorized_keys
echo "ssh-ed25519 AAAA...your_public_key..." >> ~/.ssh/authorized_keys

# Fix permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Exit
exit
```

### Step 4: Update GitHub Secret

1. Go to: https://github.com/Nopass0/mybgalin/settings/secrets/actions
2. Edit `SSH_PRIVATE_KEY`
3. Paste the private key (entire file, including BEGIN/END lines)
4. Save

### Step 5: Test Again

```bash
git push origin main
```

Check GitHub Actions: https://github.com/Nopass0/mybgalin/actions

---

## GitHub Secrets Checklist

Required secrets:

```
✓ SERVER_HOST        - Your server IP or domain
✓ SERVER_USER        - SSH username (not root)
✓ SSH_PRIVATE_KEY    - Private SSH key (not public!)
✓ SERVER_PORT        - SSH port (usually 22)
✓ SERVER_PASSWORD    - SSH password (if using password auth)
```

Choose ONE authentication method:

### Option 1: SSH Key (Recommended)
```
✓ SSH_PRIVATE_KEY
```

### Option 2: Password
```
✓ SERVER_PASSWORD
```

### Option 3: Both (Safer)
```
✓ SSH_PRIVATE_KEY
✓ SERVER_PASSWORD
```

---

## Server SSH Setup

### Install SSH Server (if not installed)

```bash
sudo apt-get update
sudo apt-get install -y openssh-server openssh-client

sudo systemctl start ssh
sudo systemctl enable ssh
sudo systemctl status ssh
```

### Create Non-Root SSH User

```bash
# Create user
sudo useradd -m -s /bin/bash deployuser

# Set password
sudo passwd deployuser

# Allow sudo without password
sudo usermod -aG sudo deployuser
echo "deployuser ALL=(ALL) NOPASSWD:ALL" | sudo tee -a /etc/sudoers

# Setup SSH key
sudo mkdir -p /home/deployuser/.ssh
sudo chmod 700 /home/deployuser/.ssh
echo "ssh-ed25519 AAAA...your_key..." | sudo tee /home/deployuser/.ssh/authorized_keys
sudo chmod 600 /home/deployuser/.ssh/authorized_keys
sudo chown -R deployuser:deployuser /home/deployuser/.ssh
```

### Check SSH Config

```bash
# View SSH config
sudo cat /etc/ssh/sshd_config | grep -v "^#" | grep -v "^$"

# Key settings to check:
# Port 22                          (or your custom port)
# PermitRootLogin no              (recommended)
# PubkeyAuthentication yes        (needed for SSH keys)
# PasswordAuthentication yes      (if using password)
# AllowUsers deployuser           (restrict access)
```

### Restart SSH Service

```bash
sudo systemctl restart ssh
```

---

## Test Commands

### Test locally before GitHub Actions

```bash
# Test with key
ssh -i ~/.ssh/github_key deployuser@SERVER_HOST -p PORT "echo Connected!"

# Test with password
sshpass -p PASSWORD ssh deployuser@SERVER_HOST -p PORT "echo Connected!"

# Verbose mode for debugging
ssh -vvv -i ~/.ssh/github_key deployuser@SERVER_HOST -p PORT
```

### Debug SSH on Server Side

```bash
# Check SSH logs
sudo tail -f /var/log/auth.log | grep sshd

# In another terminal, try SSH connection
ssh ...

# Watch the logs for errors
```

---

## If All Else Fails

### Use Password Authentication Instead

1. Make sure `PasswordAuthentication yes` in `/etc/ssh/sshd_config`
2. Set `SERVER_PASSWORD` GitHub Secret
3. Remove or don't use `SSH_PRIVATE_KEY` secret
4. Update workflow to use password

```yaml
with:
  host: ${{ secrets.SERVER_HOST }}
  username: ${{ secrets.SERVER_USER }}
  password: ${{ secrets.SERVER_PASSWORD }}
  port: ${{ secrets.SERVER_PORT }}
```

### Test Workflow

Latest workflow version is designed to:
1. First show what secrets are configured
2. Try to connect with both key and password
3. Show verbose SSH output
4. Execute basic commands
5. Show results

Check the "SSH Connection Test" step output in GitHub Actions for clues.

---

## Security Notes

- 🔒 Never commit private keys to git
- 🔒 GitHub Secrets are encrypted
- 🔒 Use non-root SSH users
- 🔒 Use SSH keys when possible (more secure than passwords)
- 🔒 Restrict SSH access with firewall
- 🔒 Disable root login

```bash
# Secure SSH config
Port 22
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no  # Disable if using keys only
AllowUsers deployuser
```

---

## Quick Fixes

### Fix 1: Check Port
```bash
# On server
sudo netstat -tlnp | grep ssh
# Should show: tcp 0 0 0.0.0.0:22 0.0.0.0:* LISTEN
```

### Fix 2: Check Firewall
```bash
# On server
sudo ufw status
# Should show port 22 ALLOW
```

### Fix 3: Check SSH Service
```bash
# On server
sudo systemctl status ssh
# Should show: active (running)
```

### Fix 4: Test with Public IP
```bash
# Make sure SERVER_HOST is publicly accessible
ping SERVER_HOST
nslookup SERVER_HOST  # If using domain
```

---

## Next Steps

1. Run through the checklist above
2. Test SSH locally
3. Update GitHub Secrets
4. Push to main
5. Check GitHub Actions logs
6. If still failing, check /var/log/auth.log on server

**The "connection reset by peer" error usually means the SSH key/password is invalid or the server is blocking the connection.**

Most common fixes:
- ✅ Update SSH private key format
- ✅ Add public key to ~/.ssh/authorized_keys on server
- ✅ Check SERVER_PORT is correct
- ✅ Check firewall allows port 22
