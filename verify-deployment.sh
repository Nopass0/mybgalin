#!/bin/bash

# BGalin Deployment Verification Script
# Run this after deployment to verify all services are working

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     BGalin Deployment Verification Script              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNING=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNING++))
}

# ============================================
# 1. CHECK SYSTEM PREREQUISITES
# ============================================
echo -e "${BLUE}=== 1. System Prerequisites ===${NC}"

if command -v docker &> /dev/null; then
    VERSION=$(docker --version)
    check_pass "Docker installed: $VERSION"
else
    check_fail "Docker not installed"
fi

if command -v docker-compose &> /dev/null; then
    VERSION=$(docker-compose --version)
    check_pass "docker-compose installed: $VERSION"
else
    check_fail "docker-compose not installed"
fi

if command -v bun &> /dev/null; then
    VERSION=$(bun --version)
    check_pass "Bun installed (current user): $VERSION"
else
    check_warn "Bun not in PATH (current user)"
fi

# Check if Bun is installed for bgalin user
if [ -d /home/bgalin/.bun ]; then
    check_pass "Bun installed for bgalin user"
else
    check_warn "Bun may not be installed for bgalin user"
fi

if command -v node &> /dev/null; then
    VERSION=$(node --version)
    check_pass "Node.js installed: $VERSION"
else
    check_fail "Node.js not installed"
fi

if command -v pm2 &> /dev/null; then
    VERSION=$(pm2 --version)
    check_pass "PM2 installed: $VERSION"
else
    check_fail "PM2 not installed"
fi

if command -v nginx &> /dev/null; then
    VERSION=$(nginx -v 2>&1)
    check_pass "Nginx installed: $VERSION"
else
    check_fail "Nginx not installed"
fi

# ============================================
# 2. CHECK DOCKER SERVICES
# ============================================
echo ""
echo -e "${BLUE}=== 2. Docker Services ===${NC}"

if docker ps | grep -q bgalin_postgres_1; then
    check_pass "PostgreSQL container running"
else
    check_fail "PostgreSQL container not running"
fi

if docker ps | grep -q bgalin_n8n_1; then
    check_pass "N8N container running"
else
    check_fail "N8N container not running"
fi

# ============================================
# 3. CHECK PORTS
# ============================================
echo ""
echo -e "${BLUE}=== 3. Port Availability ===${NC}"

check_port() {
    if netstat -tuln 2>/dev/null | grep -q ":$1 "; then
        check_pass "Port $1 is listening"
        return 0
    else
        check_warn "Port $1 is not listening"
        return 1
    fi
}

check_port 3000 || check_warn "Frontend port 3000 not listening yet"
check_port 8000 || check_warn "Backend port 8000 not listening yet"
check_port 5678 || check_fail "N8N port 5678 not listening"
check_port 5432 || check_fail "PostgreSQL port 5432 not listening"
check_port 443  || check_fail "Nginx HTTPS port 443 not listening"
check_port 80   || check_fail "Nginx HTTP port 80 not listening"

# ============================================
# 4. CHECK SERVICE STATUS
# ============================================
echo ""
echo -e "${BLUE}=== 4. Service Status ===${NC}"

# Check PM2 frontend
if pm2 list 2>/dev/null | grep -q "bgalin-frontend"; then
    check_pass "PM2 frontend process exists"
    pm2 status bgalin-frontend 2>/dev/null | grep -q "online" && check_pass "PM2 frontend is online" || check_warn "PM2 frontend is not online"
else
    check_fail "PM2 frontend process not found"
fi

# Check systemd backend
if sudo systemctl is-active --quiet bgalin-backend.service 2>/dev/null; then
    check_pass "Backend systemd service is active"
else
    check_warn "Backend systemd service is not active (might be starting)"
fi

# Check nginx
if sudo systemctl is-active --quiet nginx 2>/dev/null; then
    check_pass "Nginx is running"
else
    check_fail "Nginx is not running"
fi

# ============================================
# 5. HTTP CONNECTIVITY
# ============================================
echo ""
echo -e "${BLUE}=== 5. HTTP Connectivity ===${NC}"

test_endpoint() {
    local endpoint=$1
    local description=$2
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f -m 5 "$endpoint" > /dev/null 2>&1; then
            check_pass "$description responds"
            return 0
        fi
        attempt=$((attempt + 1))
        if [ $attempt -le $max_attempts ]; then
            sleep 2
        fi
    done
    
    check_warn "$description not responding (timeout or error)"
    return 1
}

test_endpoint "http://localhost:3000" "Frontend (localhost:3000)"
test_endpoint "http://localhost:8000/api/health" "Backend health (localhost:8000/api/health)"
test_endpoint "http://localhost:5678" "N8N (localhost:5678)"
test_endpoint "http://localhost:5432" "PostgreSQL (localhost:5432)" 2>/dev/null || true

# ============================================
# 6. HTTPS/DOMAIN CONNECTIVITY
# ============================================
echo ""
echo -e "${BLUE}=== 6. Domain Connectivity (HTTPS) ===${NC}"

if [ -n "$DOMAIN" ]; then
    test_endpoint "https://$DOMAIN" "HTTPS Domain"
    test_endpoint "https://$DOMAIN/api/health" "HTTPS API Health"
    test_endpoint "https://$DOMAIN/n8n" "HTTPS N8N"
else
    check_warn "DOMAIN not set, skipping HTTPS tests. Usage: DOMAIN=bgalin.ru $0"
fi

# ============================================
# 7. CHECK LOG FILES
# ============================================
echo ""
echo -e "${BLUE}=== 7. Recent Errors ===${NC}"

check_logs() {
    local logfile=$1
    local description=$2
    
    if [ -f "$logfile" ]; then
        if grep -q -i "error" "$logfile" 2>/dev/null; then
            check_warn "$description has errors (see logs)"
            tail -n 3 "$logfile" | sed 's/^/    /'
        else
            check_pass "$description has no recent errors"
        fi
    fi
}

check_logs "/var/log/nginx/bgalin_error.log" "Nginx error log"
check_logs "/var/log/pm2/bgalin-frontend-error.log" "PM2 frontend error log" 2>/dev/null || true

# ============================================
# 8. DATABASE CONNECTIVITY
# ============================================
echo ""
echo -e "${BLUE}=== 8. Database Connectivity ===${NC}"

if command -v psql &> /dev/null; then
    if PGPASSWORD=admin psql -U admin -d bgalin -h localhost -c "SELECT 1" > /dev/null 2>&1; then
        check_pass "PostgreSQL database connection successful"
    else
        check_warn "PostgreSQL database connection failed"
    fi
else
    check_warn "psql not installed, cannot test database connection"
fi

# ============================================
# 9. DOCKER VOLUMES
# ============================================
echo ""
echo -e "${BLUE}=== 9. Docker Volumes ===${NC}"

if docker volume ls | grep -q bgalin_postgres_data; then
    check_pass "PostgreSQL volume exists"
else
    check_fail "PostgreSQL volume not found"
fi

if docker volume ls | grep -q bgalin_n8n_data; then
    check_pass "N8N volume exists"
else
    check_fail "N8N volume not found"
fi

# ============================================
# 10. DISK SPACE
# ============================================
echo ""
echo -e "${BLUE}=== 10. Disk Space ===${NC}"

DISK_USAGE=$(df -h /var/www/bgalin 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
if [ -z "$DISK_USAGE" ]; then
    check_warn "Could not determine disk usage"
else
    if [ "$DISK_USAGE" -lt 80 ]; then
        check_pass "Disk usage is ${DISK_USAGE}% (healthy)"
    elif [ "$DISK_USAGE" -lt 95 ]; then
        check_warn "Disk usage is ${DISK_USAGE}% (getting full)"
    else
        check_fail "Disk usage is ${DISK_USAGE}% (CRITICAL)"
    fi
fi

# ============================================
# FINAL REPORT
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║           Verification Report                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNING"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNING -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! Deployment is healthy.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Deployment is working but has some warnings.${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ Deployment has $FAILED critical issues that need attention.${NC}"
    exit 1
fi
