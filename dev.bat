@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Development Environment...
echo.

:: Check for Rust/Cargo
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Cargo not found. Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Bun or npm
where bun >nul 2>nul
if %errorlevel% equ 0 (
    set PACKAGE_MANAGER=bun
    echo ✓ Using Bun
) else (
    set PACKAGE_MANAGER=npm
    echo ℹ Using npm
)

:: Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd server
if not exist "Cargo.lock" (
    cargo build
)

:: Create .env if not exists
if not exist ".env" (
    echo 📝 Creating .env file...
    (
        echo DATABASE_URL=sqlite:portfolio.db
        echo TELEGRAM_BOT_TOKEN=your_telegram_bot_token
        echo ADMIN_TELEGRAM_ID=your_telegram_id
        echo HH_CLIENT_ID=your_hh_client_id
        echo HH_CLIENT_SECRET=your_hh_client_secret
        echo HH_REDIRECT_URI=http://localhost:3001/auth/hh/callback
        echo OPENROUTER_API_KEY=your_openrouter_api_key
        echo ROCKET_PORT=3001
    ) > .env
    echo ⚠️ Please edit server/.env with your actual credentials
)

:: Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd ..\frontend
if not exist "node_modules" (
    %PACKAGE_MANAGER% install
)

:: Start backend in new window
echo.
echo 🔧 Starting backend server...
cd ..\server
start "BGalin Backend" cmd /k "cargo run"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo.
echo 🎨 Starting frontend...
cd ..\frontend
start "BGalin Frontend" cmd /k "%PACKAGE_MANAGER% run dev"

echo.
echo ✅ Development servers started!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:3001
echo.
echo Press any key to stop all servers...
pause >nul

:: Kill processes
taskkill /FI "WindowTitle eq BGalin Backend*" /F >nul 2>nul
taskkill /FI "WindowTitle eq BGalin Frontend*" /F >nul 2>nul
echo Servers stopped.
