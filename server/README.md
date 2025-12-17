# BGalin Backend - Bun + Elysia

Fast, lightweight REST API for BGalin portfolio platform built with Bun and Elysia.

## Quick Start

### Prerequisites
- Bun 1.3.4+ ([install](https://bun.sh))
- Node.js 20.19+ (for Prisma)

### Development

```bash
# Install dependencies
bun install

# Generate Prisma client
npx prisma generate

# Start development server (with hot reload)
bun run --watch src/index.ts
```

Server runs on `http://localhost:8000`
API docs available at `http://localhost:8000/swagger`

### Production

See [BACKEND_DEPLOYMENT.md](../BACKEND_DEPLOYMENT.md) for full production setup guide.

```bash
# Start server
bun run src/index.ts

# Or with PM2
pm2 start "bun run src/index.ts" --name bgalin-backend
```

## Architecture

### 14 Controllers
- **auth** - Telegram OTP authentication
- **public** - Health checks, server info
- **admin** - Dashboard, statistics
- **jobs** - HH.ru job search + OAuth callback
- **portfolio** - Project management
- **cs2** - Counter-Strike 2 integration
- **studio** - Steam auth + projects
- **publish** - Video-to-GIF conversion
- **files** - File management
- **sync** - Client sync
- **links** - URL shortener
- **anime** - Anime tracking
- **english** - SRS learning system
- **menu** - Sidebar settings

### 12 Services
Core business logic including:
- AI integration (OpenRouter/ChatGPT)
- HH.ru API client
- Scheduled job search automation
- Steam/Telegram authentication
- File synchronization
- Database interactions

## Configuration

Create `.env` file:

```env
DATABASE_URL=sqlite:portfolio.db
PORT=8000
TELEGRAM_BOT_TOKEN=your_token
HH_CLIENT_ID=your_id
HH_CLIENT_SECRET=your_secret
# ... see BACKEND_DEPLOYMENT.md for full list
```

## API Testing

Quick test commands:

```bash
# Health check
curl http://localhost:8000/api/health

# List vacancies
curl http://localhost:8000/api/jobs/vacancies

# See API_TESTING_GUIDE.md for more examples
```

## Performance

Benchmarks vs Rust version:
- **Startup**: 200ms vs 2s
- **Memory**: 30-50MB vs 150-200MB
- **Throughput**: ~15k req/s vs ~5k req/s

## Monitoring

```bash
# Development
bun run --watch src/index.ts

# Production (PM2)
pm2 logs bgalin-backend
pm2 monit

# Production (Systemd)
sudo journalctl -u bgalin-backend -f
```

## Troubleshooting

See [BACKEND_DEPLOYMENT.md](../BACKEND_DEPLOYMENT.md#troubleshooting) for common issues and solutions.

## Documentation

- [Deployment Guide](../BACKEND_DEPLOYMENT.md)
- [API Testing Guide](../API_TESTING_GUIDE.md)
- [Swagger UI](http://localhost:8000/swagger) (when running)

## Migration from Rust

Original Rust implementation preserved in `../server_rust_backup/` for reference.

All endpoints, logic, and schemas remain identical - only language/framework changed.

---

Built with [Bun](https://bun.sh) • [Elysia](https://elysiajs.com) • [Prisma](https://prisma.io)
