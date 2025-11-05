#!/bin/bash
set -e

echo "🚀 Starting Production Environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root for nginx
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (for nginx setup): sudo ./prod.sh${NC}"
    exit 1
fi

# Check for Rust/Cargo
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo not found. Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first${NC}"
    exit 1
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo -e "${BLUE}📦 Installing nginx...${NC}"
    apt-get update
    apt-get install -y nginx
fi

# Check for Bun (optional, fallback to npm)
if command -v bun &> /dev/null; then
    PACKAGE_MANAGER="bun"
else
    PACKAGE_MANAGER="npm"
fi

# Build backend
echo -e "${BLUE}🔨 Building backend...${NC}"
cd server

# Check or create .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${RED}⚠️  Please edit server/.env with your actual credentials before continuing!${NC}"
        echo -e "${BLUE}Press Enter to continue after editing .env, or Ctrl+C to cancel...${NC}"
        read
    else
        echo -e "${RED}❌ Missing .env.example file. Cannot create .env${NC}"
        exit 1
    fi
fi

cargo build --release

# Run migrations (if exists)
if [ -d "migrations" ]; then
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    cargo run --release -- migrate || true
fi

# Build frontend
echo -e "${BLUE}🎨 Building frontend...${NC}"
cd ../frontend
$PACKAGE_MANAGER install
$PACKAGE_MANAGER run build

# Stop existing services
echo -e "${BLUE}🛑 Stopping existing services...${NC}"
systemctl stop bgalin-backend.service 2>/dev/null || true
pkill -f "target/release/server" || true

# Create systemd service for backend
echo -e "${BLUE}⚙️  Creating systemd service...${NC}"
cat > /etc/systemd/system/bgalin-backend.service << EOF
[Unit]
Description=BGalin Backend Service
After=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$(pwd)/../server
ExecStart=$(pwd)/../server/target/release/server
Restart=always
RestartSec=10
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
EOF

# Configure nginx
echo -e "${BLUE}🌐 Configuring nginx...${NC}"
cat > /etc/nginx/sites-available/bgalin << 'EOF'
server {
    listen 80;
    server_name bgalin.ru www.bgalin.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bgalin.ru www.bgalin.ru;

    ssl_certificate /var/www/bgalin/bgalin_ru.crt;
    ssl_certificate_key /var/www/bgalin/private.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/bgalin_access.log;
    error_log /var/log/nginx/bgalin_error.log;
}
EOF

# Copy SSL certificates
echo -e "${BLUE}🔒 Setting up SSL certificates...${NC}"
mkdir -p /var/www/bgalin
cp bgalin_ru.crt /var/www/bgalin/
cp private.key /var/www/bgalin/
chmod 600 /var/www/bgalin/private.key

# Enable site
ln -sf /etc/nginx/sites-available/bgalin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Create PM2 config for frontend
echo -e "${BLUE}📦 Installing PM2...${NC}"
npm install -g pm2

cat > ../frontend/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'bgalin-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '$(pwd)/../frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Reload systemd and start services
echo -e "${GREEN}🚀 Starting services...${NC}"
systemctl daemon-reload
systemctl enable bgalin-backend.service
systemctl start bgalin-backend.service

# Start frontend with PM2
cd ../frontend
pm2 delete bgalin-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Restart nginx
systemctl restart nginx

echo -e "${GREEN}✅ Production environment started!${NC}"
echo -e "${BLUE}Website: https://bgalin.ru${NC}"
echo -e ""
echo -e "${YELLOW}Service status:${NC}"
systemctl status bgalin-backend.service --no-pager
echo -e ""
pm2 status

echo -e ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View backend logs: journalctl -u bgalin-backend.service -f"
echo -e "  View frontend logs: pm2 logs bgalin-frontend"
echo -e "  View nginx logs: tail -f /var/log/nginx/bgalin_error.log"
echo -e "  Restart backend: systemctl restart bgalin-backend.service"
echo -e "  Restart frontend: pm2 restart bgalin-frontend"
