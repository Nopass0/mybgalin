#!/bin/bash
set -e

echo "🚀 Starting Development Environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check for Rust/Cargo
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo not found. Please install Rust from https://rustup.rs/${NC}"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Check for Bun (optional, fallback to npm)
if command -v bun &> /dev/null; then
    PACKAGE_MANAGER="bun"
    echo -e "${GREEN}✓ Using Bun${NC}"
else
    PACKAGE_MANAGER="npm"
    echo -e "${BLUE}ℹ Using npm (install Bun for faster builds: curl -fsSL https://bun.sh/install | bash)${NC}"
fi

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd server
if [ ! -f "Cargo.lock" ]; then
    cargo build
fi

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo -e "${BLUE}📝 Creating .env file...${NC}"
    cat > .env << EOF
DATABASE_URL=sqlite:portfolio.db
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ADMIN_TELEGRAM_ID=your_telegram_id
HH_CLIENT_ID=your_hh_client_id
HH_CLIENT_SECRET=your_hh_client_secret
HH_REDIRECT_URI=http://localhost:8000/auth/hh/callback
OPENAI_API_KEY=your_openai_api_key
EOF
    echo -e "${RED}⚠️  Please edit server/.env with your actual credentials${NC}"
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd ../frontend
if [ ! -d "node_modules" ]; then
    $PACKAGE_MANAGER install
fi

# Start backend in background
echo -e "${GREEN}🔧 Starting backend server...${NC}"
cd ../server
cargo run &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}🎨 Starting frontend...${NC}"
cd ../frontend
$PACKAGE_MANAGER run dev &
FRONTEND_PID=$!

echo -e "${GREEN}✅ Development servers started!${NC}"
echo -e "${BLUE}Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}Backend: http://localhost:8000${NC}"
echo -e ""
echo -e "${BLUE}Press Ctrl+C to stop all servers${NC}"

# Trap Ctrl+C and cleanup
trap "echo -e '\\n${RED}Stopping servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for any process to exit
wait
