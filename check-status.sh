#!/bin/bash

echo "🔍 Checking BGalin Server Status..."
echo ""

# Check backend service
echo "=== Backend Service ==="
sudo systemctl status bgalin-backend.service --no-pager | head -20
echo ""

# Check if backend is listening on port 3001
echo "=== Backend Port 3001 ==="
sudo lsof -i :3001 || echo "❌ Nothing listening on port 3001"
echo ""

# Check frontend PM2
echo "=== Frontend PM2 ==="
pm2 list
echo ""

# Check if frontend is listening on port 3000
echo "=== Frontend Port 3000 ==="
sudo lsof -i :3000 || echo "❌ Nothing listening on port 3000"
echo ""

# Check nginx
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager | head -10
echo ""

# Check nginx config
echo "=== Nginx Config Test ==="
sudo nginx -t
echo ""

# Check all listening ports
echo "=== All Listening Ports ==="
sudo netstat -tulpn | grep LISTEN
echo ""

# Check backend logs
echo "=== Backend Logs (last 20 lines) ==="
sudo journalctl -u bgalin-backend.service -n 20 --no-pager
echo ""

# Check frontend logs
echo "=== Frontend Logs ==="
pm2 logs bgalin-frontend --lines 20 --nostream
echo ""

# Check nginx error logs
echo "=== Nginx Error Logs (last 20 lines) ==="
sudo tail -20 /var/log/nginx/bgalin_error.log 2>/dev/null || echo "No error log found"
echo ""

# Test backend directly
echo "=== Test Backend Directly ==="
curl -s http://localhost:3001/health || echo "❌ Backend not responding on localhost:3001"
echo ""

# Test frontend directly
echo "=== Test Frontend Directly ==="
curl -s http://localhost:3000 | head -5 || echo "❌ Frontend not responding on localhost:3000"
echo ""

echo "✅ Status check complete!"
