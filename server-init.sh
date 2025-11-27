#!/bin/bash
set -e

# This script must be run ONCE on the server before first deployment
# It prepares the server for automatic deployments via GitHub Actions

echo "🚀 Initializing server for bgalin.ru deployment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root: sudo bash server-init.sh${NC}"
    exit 1
fi

# Get repository URL
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/bgalin.git): " REPO_URL
if [ -z "$REPO_URL" ]; then
    echo -e "${RED}❌ Repository URL is required${NC}"
    exit 1
fi

# Create project directory
echo -e "${BLUE}📁 Creating project directory...${NC}"
mkdir -p /var/www/bgalin
cd /var/www/bgalin

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${BLUE}📦 Installing git...${NC}"
    apt-get update
    apt-get install -y git
fi

# Clone repository
if [ ! -d ".git" ]; then
    echo -e "${BLUE}📥 Cloning repository...${NC}"
    git clone "$REPO_URL" .
else
    echo -e "${YELLOW}⚠️  Repository already cloned${NC}"
fi

# Set correct ownership
echo -e "${BLUE}👤 Setting ownership...${NC}"
read -p "Enter the username for deployment (e.g., root, ubuntu, bgalin): " DEPLOY_USER
if [ -z "$DEPLOY_USER" ]; then
    DEPLOY_USER="root"
fi

if id "$DEPLOY_USER" &>/dev/null; then
    chown -R "$DEPLOY_USER":"$DEPLOY_USER" /var/www/bgalin
    echo -e "${GREEN}✅ Owner set to: $DEPLOY_USER${NC}"
else
    echo -e "${RED}❌ User $DEPLOY_USER does not exist${NC}"
    exit 1
fi

# Install system dependencies
echo -e "${BLUE}📦 Installing system dependencies...${NC}"
apt-get update
apt-get install -y build-essential pkg-config libssl-dev curl

# Install Rust (if not installed)
if ! command -v cargo &> /dev/null; then
    echo -e "${BLUE}🦀 Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo -e "${GREEN}✅ Rust already installed${NC}"
fi

# Install Node.js (if not installed)
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}📦 Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo -e "${GREEN}✅ Node.js already installed${NC}"
fi

# Install nginx (if not installed)
if ! command -v nginx &> /dev/null; then
    echo -e "${BLUE}🌐 Installing nginx...${NC}"
    apt-get install -y nginx
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo -e "${BLUE}📦 Installing PM2...${NC}"
    npm install -g pm2
else
    echo -e "${GREEN}✅ PM2 already installed${NC}"
fi

# Create initial .env file placeholder
echo -e "${BLUE}📝 Creating .env placeholder...${NC}"
if [ ! -f "server/.env" ]; then
    cat > server/.env << 'EOF'
# This file will be automatically populated by GitHub Actions
# Do not edit manually - use GitHub Secrets instead
DATABASE_URL=sqlite:./data.db
ROCKET_PORT=3001
ROCKET_ADDRESS=0.0.0.0
EOF
    chown "$DEPLOY_USER":"$DEPLOY_USER" server/.env
    echo -e "${GREEN}✅ Created server/.env placeholder${NC}"
else
    echo -e "${YELLOW}⚠️  server/.env already exists${NC}"
fi

# Configure sudo for deployment user
echo -e "${BLUE}🔐 Configuring sudo for deployment...${NC}"
cat > /etc/sudoers.d/bgalin-deploy << EOF
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart bgalin-backend.service
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl is-active bgalin-backend.service
$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/sbin/nginx
EOF
chmod 0440 /etc/sudoers.d/bgalin-deploy
echo -e "${GREEN}✅ Sudo configured${NC}"

# Run prod.sh to set up services
echo -e "${BLUE}🚀 Running initial production setup...${NC}"
echo -e "${YELLOW}⚠️  You will need to provide environment variables${NC}"
read -p "Do you want to run prod.sh now? (y/n): " RUN_PROD
if [ "$RUN_PROD" = "y" ] || [ "$RUN_PROD" = "Y" ]; then
    chmod +x prod.sh
    ./prod.sh
else
    echo -e "${YELLOW}⚠️  Skipped prod.sh. Run it manually later: sudo ./prod.sh${NC}"
fi

echo ""
echo -e "${GREEN}✅ Server initialization complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Configure GitHub Secrets (see .github/SECRETS.md)"
echo -e "2. Push to main branch to trigger automatic deployment"
echo -e "3. Check deployment status in GitHub Actions"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  Check backend: sudo systemctl status bgalin-backend.service"
echo -e "  Check frontend: pm2 status"
echo -e "  View logs: sudo journalctl -u bgalin-backend.service -f"
echo -e "  View nginx logs: tail -f /var/log/nginx/bgalin_error.log"
