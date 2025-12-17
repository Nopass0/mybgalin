# API Testing Guide

## Quick Test Commands

### 1. Health Check
```bash
curl https://bgalin.ru/api/health
# Expected: { "status": "ok" }
```

### 2. Authentication

#### Request OTP
```bash
curl -X POST https://bgalin.ru/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": "123456789"}'

# Response:
# {
#   "success": true,
#   "message": "OTP sent via Telegram"
# }
```

#### Verify OTP
```bash
curl -X POST https://bgalin.ru/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_id": "123456789",
    "otp_code": "123456"
  }'

# Response:
# {
#   "success": true,
#   "token": "your_session_token_here",
#   "expires_in": 2592000
# }
```

### 3. Protected Endpoints (Admin)

Get token first, then:

```bash
TOKEN="your_session_token_here"

# Get admin info
curl https://bgalin.ru/api/admin/info \
  -H "Authorization: Bearer $TOKEN"

# Get dashboard stats
curl https://bgalin.ru/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"

# Get admin dashboard
curl https://bgalin.ru/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Jobs Endpoints

```bash
# List vacancies (paginated)
curl "https://bgalin.ru/api/jobs/vacancies?page=1&limit=20"

# Get job statistics
curl https://bgalin.ru/api/jobs/stats

# Get job settings
curl https://bgalin.ru/api/jobs/settings

# Get activity logs
curl "https://bgalin.ru/api/jobs/logs?page=1&limit=50"

# Get specific vacancy details
curl https://bgalin.ru/api/jobs/vacancies/12345
```

### 5. HH.ru OAuth Flow

```bash
# Step 1: Redirect to HH.ru OAuth
# Browser: https://bgalin.ru/api/studio/auth/steam?return_url=/dashboard

# Step 2: User authorizes, gets callback with code
# Callback: https://bgalin.ru/api/auth/hh/callback?code=abc123&state=xyz

# Result: Redirects to /dashboard?success=hh_connected
```

### 6. Portfolio Endpoints

```bash
# List all portfolio items
curl https://bgalin.ru/api/portfolio

# Get specific portfolio item
curl https://bgalin.ru/api/portfolio/item-id

# Create portfolio item (requires auth)
curl -X POST https://bgalin.ru/api/portfolio \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Project",
    "description": "Project description",
    "url": "https://example.com",
    "tags": ["react", "typescript"]
  }'

# Update portfolio item
curl -X PUT https://bgalin.ru/api/portfolio/item-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'
```

### 7. CS2 Integration

```bash
# Get current match state
curl https://bgalin.ru/api/cs2/match

# POST GSI payload (from CS2 game)
curl -X POST https://bgalin.ru/api/cs2/gsi \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {...},
    "map": {...},
    "player": {...}
  }'

# Get player stats
curl https://bgalin.ru/api/cs2/players/76561198123456789
```

### 8. File Management

```bash
TOKEN="your_admin_token"

# List folders
curl https://bgalin.ru/api/files/folders \
  -H "Authorization: Bearer $TOKEN"

# Create folder
curl -X POST https://bgalin.ru/api/files/folders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-folder"}'

# Upload file
curl -X POST https://bgalin.ru/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.txt" \
  -F "folderId=folder-id"

# Download file
curl https://bgalin.ru/api/files/download/file-id > downloaded_file
```

### 9. Sync Endpoints

```bash
TOKEN="your_admin_token"

# List sync folders
curl https://bgalin.ru/api/sync/folders \
  -H "Authorization: Bearer $TOKEN"

# Create sync folder
curl -X POST https://bgalin.ru/api/sync/folders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-sync-folder"}'

# Get folder details with API key
API_KEY="your_api_key"
curl https://bgalin.ru/api/sync/folders/folder-id \
  -H "X-API-Key: $API_KEY"
```

### 10. English Learning

```bash
# Get categories
curl https://bgalin.ru/api/english/categories

# Get words in category
curl "https://bgalin.ru/api/english/words?category_id=1&limit=50"

# Get daily stats
curl https://bgalin.ru/api/english/stats/daily

# Mark word as learned
curl -X POST https://bgalin.ru/api/english/words/word-id/learn \
  -H "Authorization: Bearer $TOKEN"
```

### 11. Anime Tracking

```bash
# Get upcoming anime
curl https://bgalin.ru/api/anime/upcoming

# Get watched anime
curl https://bgalin.ru/api/anime/watched

# Get sync progress
curl https://bgalin.ru/api/anime/sync/progress \
  -H "Authorization: Bearer $TOKEN"

# Mark anime as watched
curl -X POST https://bgalin.ru/api/anime/anime-id/watch \
  -H "Authorization: Bearer $TOKEN"
```

### 12. Link Shortener

```bash
# Create short link
curl -X POST https://bgalin.ru/api/links \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "long_url": "https://example.com/very/long/url",
    "custom_code": "mylink"
  }'

# Get link info
curl https://bgalin.ru/api/links/mylink

# Redirect to long URL
curl -L https://bgalin.ru/l/mylink
```

### 13. Menu Settings

```bash
# Get public menu settings
curl https://bgalin.ru/api/menu-settings

# Get all menu items (admin)
curl https://bgalin.ru/api/admin/menu-items \
  -H "Authorization: Bearer $TOKEN"

# Update menu visibility
curl -X PUT https://bgalin.ru/api/admin/menu-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "portfolio": true,
      "jobs": true,
      "anime": false
    }
  }'
```

---

## Testing with Postman

1. Download Postman
2. Import from `https://bgalin.ru/swagger` (copy URL from Swagger UI)
3. Set variables:
   - `base_url`: https://bgalin.ru
   - `token`: (from auth endpoint)
   - `admin_token`: (from admin auth)
4. Run collection with tests

---

## Testing with cURL Script

Create `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="https://bgalin.ru"

echo "Testing API endpoints..."

# Health check
echo "1. Health check:"
curl -s $BASE_URL/api/health | jq .

# Vacancies
echo -e "\n2. Getting vacancies:"
curl -s "$BASE_URL/api/jobs/vacancies?limit=5" | jq '.items[0]'

# N8N test
echo -e "\n3. Testing N8N link:"
curl -I https://bgalin.ru/n8n

echo -e "\nTests completed!"
```

Run it:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Performance Testing with Apache Bench

```bash
# Test endpoint with 100 requests, 10 concurrent
ab -n 100 -c 10 https://bgalin.ru/api/health

# Expected output:
# Requests per second:    1500.00 [#/sec] (mean)
# Time per request:       6.67 [ms] (mean)
```

---

## Load Testing with hey

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Run load test
hey -n 1000 -c 50 https://bgalin.ru/api/health

# Get statistical analysis
```

---

## Debugging

### Enable verbose output
```bash
curl -v https://bgalin.ru/api/health
```

### Show response headers
```bash
curl -i https://bgalin.ru/api/health
```

### Save response to file
```bash
curl -o response.json https://bgalin.ru/api/jobs/vacancies
```

### Show request/response with jq formatting
```bash
curl -s https://bgalin.ru/api/jobs/vacancies | jq .
```

---

## Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Check input parameters |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Not admin |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Check backend logs |

---

## N8N Integration Test

To test N8N webhook:

```bash
# Check if N8N is accessible
curl https://bgalin.ru/n8n

# Get N8N version
curl https://bgalin.ru/n8n/api/v1/me
```

---

## Monitoring API Health

```bash
#!/bin/bash

while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://bgalin.ru/api/health)
  TIME=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TIME] API Status: $STATUS"
  
  if [ "$STATUS" != "200" ]; then
    echo "WARNING: API is down!"
  fi
  
  sleep 60
done
```

---

## Troubleshooting Checklist

- [ ] Backend is running: `pm2 status`
- [ ] Port 8000 is open: `lsof -i :8000`
- [ ] Nginx is forwarding: `curl http://localhost:8000/api/health`
- [ ] SSL certificate valid: `echo | openssl s_client -servername bgalin.ru -connect bgalin.ru:443`
- [ ] Database accessible: Check logs for DB connection errors
- [ ] Environment variables set: `echo $DATABASE_URL`

