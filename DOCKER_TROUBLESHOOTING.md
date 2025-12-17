# Docker Troubleshooting Guide

## Overview

This guide helps troubleshoot Docker and docker-compose issues during deployment.

---

## Common Docker Errors

### Error 1: "Connection refused" (Docker daemon not responding)

**Error Message**:
```
requests.exceptions.ConnectionError: ('Connection aborted.', ConnectionRefusedError(111, 'Connection refused'))
docker.errors.DockerException: Error while fetching server API version
```

**Cause**: Docker daemon (`dockerd`) not running or not ready

**Solution**:

```bash
# Check Docker daemon status
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# Wait for it to be ready
sudo docker info

# Enable on boot
sudo systemctl enable docker
```

### Error 2: "Cannot connect to Docker daemon socket"

**Error Message**:
```
Cannot connect to Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

**Cause**: Docker socket doesn't exist or permissions issue

**Solution**:

```bash
# Check if socket exists
ls -la /var/run/docker.sock

# Check Docker daemon
sudo systemctl restart docker

# Wait for socket
sleep 5
ls -la /var/run/docker.sock

# Test connection
sudo docker ps
```

### Error 3: "docker: permission denied"

**Error Message**:
```
Got permission denied while trying to connect to the Docker daemon socket
```

**Cause**: Current user not in `docker` group

**Solution**:

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Or logout and login

# Test
docker ps
```

### Error 4: "docker-compose command not found"

**Error Message**:
```
docker-compose: command not found
```

**Cause**: docker-compose not installed or not in PATH

**Solution**:

```bash
# Install docker-compose
sudo apt-get install docker-compose

# Or use docker compose (newer syntax)
docker compose version

# Verify
docker-compose --version
```

### Error 5: "Cannot find image 'postgres:16-alpine'"

**Error Message**:
```
ERROR: pull access denied for postgres:16-alpine, repository does not exist or may require 'docker login'
```

**Cause**: Docker can't pull image (network issue or image not found)

**Solution**:

```bash
# Check network connectivity
ping hub.docker.com

# Test Docker image pull
sudo docker pull postgres:16-alpine

# If still failing, check Docker daemon logs
sudo journalctl -u docker -n 50 -f

# Restart Docker
sudo systemctl restart docker
sudo docker pull postgres:16-alpine
```

### Error 6: "port is already allocated"

**Error Message**:
```
Error response from daemon: driver failed programming external connectivity on endpoint ...: 
Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Cause**: Port already in use by another service

**Solution**:

```bash
# Find what's using the port
sudo lsof -i :5432

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
# Change: "5432:5432" to "5433:5432"

# Then restart
sudo docker-compose restart
```

### Error 7: "Insufficient disk space"

**Error Message**:
```
No space left on device
```

**Cause**: Docker partition full

**Solution**:

```bash
# Check disk usage
df -h

# Clean up Docker
sudo docker system prune -a

# Remove unused volumes
sudo docker volume prune

# Remove unused networks
sudo docker network prune

# Check space again
df -h
```

### Error 8: "Container exits immediately"

**Error Message**:
```
Container exited with code 1
```

**Cause**: Application crash inside container

**Solution**:

```bash
# Check container logs
sudo docker logs bgalin_postgres_1
sudo docker logs bgalin_n8n_1

# Check last 50 lines
sudo docker logs --tail 50 bgalin_postgres_1

# Follow logs in real-time
sudo docker logs -f bgalin_postgres_1

# Check exit code
sudo docker inspect bgalin_postgres_1 | grep ExitCode

# Restart container
sudo docker-compose restart postgres
```

---

## Docker Daemon Issues

### Docker Daemon Won't Start

```bash
# Check systemd status
sudo systemctl status docker

# Check logs
sudo journalctl -u docker -n 100 -f

# Try starting manually
sudo dockerd

# Check for issues
sudo docker info
```

### Docker Daemon Using Too Much Memory

```bash
# Check resource usage
docker stats

# Limit containers
# In docker-compose.yml:
# services:
#   postgres:
#     deploy:
#       resources:
#         limits:
#           memory: 512M
```

### Docker Socket Permission Issues

```bash
# Check socket permissions
ls -la /var/run/docker.sock

# Fix permissions
sudo chmod 666 /var/run/docker.sock

# Or add user to docker group
sudo usermod -aG docker $USER
```

---

## docker-compose Issues

### docker-compose Can't Find docker Daemon

```bash
# Use sudo
sudo docker-compose up -d

# Or fix permissions
sudo usermod -aG docker $USER
docker-compose up -d
```

### docker-compose Can't Connect to Network

```bash
# Check Docker networks
sudo docker network ls

# Inspect network
sudo docker network inspect bgalin_default

# Recreate networks
sudo docker-compose down
sudo docker-compose up -d
```

### Services Can't Communicate

```bash
# Check container networking
sudo docker exec bgalin_postgres_1 ping bgalin_n8n_1

# Check DNS resolution
sudo docker exec bgalin_n8n_1 nslookup postgres

# Check Docker network
sudo docker network inspect bgalin_default
```

---

## Container Issues

### Container Health Checks

```bash
# Check container status
sudo docker ps --all

# Get detailed info
sudo docker inspect bgalin_postgres_1

# Check health status
sudo docker inspect bgalin_postgres_1 | grep -A 5 Health

# Manual health check
sudo docker exec bgalin_postgres_1 pg_isready -U admin
```

### Container Restart Issues

```bash
# Check restart policy
sudo docker inspect bgalin_postgres_1 | grep -A 5 RestartPolicy

# Manually restart
sudo docker restart bgalin_postgres_1

# Stop and remove
sudo docker stop bgalin_postgres_1
sudo docker rm bgalin_postgres_1

# Restart all
sudo docker-compose restart
```

### Container Resource Limits

```bash
# Monitor resource usage
sudo docker stats --no-stream

# Set limits in docker-compose.yml
# services:
#   postgres:
#     deploy:
#       resources:
#         limits:
#           cpus: '1'
#           memory: 1G
#         reservations:
#           cpus: '0.5'
#           memory: 512M
```

---

## Volume Issues

### Volume Permission Issues

```bash
# Check volume ownership
sudo ls -la /var/lib/docker/volumes/bgalin_postgres_data/_data

# Fix permissions
sudo chown -R 999:999 /var/lib/docker/volumes/bgalin_postgres_data/_data

# Remove and recreate volume
sudo docker volume rm bgalin_postgres_data
sudo docker-compose up -d
```

### Volume Not Persisting Data

```bash
# Check volume is mounted
sudo docker inspect bgalin_postgres_1 | grep -A 20 Mounts

# Check volume exists
sudo docker volume ls | grep bgalin

# Backup volume data
sudo docker run --rm -v bgalin_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# List volume contents
sudo docker run --rm -v bgalin_postgres_data:/data alpine ls -la /data
```

### Lost Volume Data

```bash
# Check available volumes
sudo docker volume ls

# Inspect volume
sudo docker volume inspect bgalin_postgres_data

# Restore from backup
sudo docker run --rm -v bgalin_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_backup.tar.gz -C /data

# Restart container
sudo docker-compose restart postgres
```

---

## Network Issues

### Container Can't Reach External Network

```bash
# Test connectivity from container
sudo docker exec bgalin_postgres_1 ping 8.8.8.8

# Check DNS
sudo docker exec bgalin_postgres_1 cat /etc/resolv.conf

# Check Docker network settings
sudo docker inspect bgalin_default

# Restart network
sudo systemctl restart docker
```

### Port Mapping Issues

```bash
# Check port mappings
sudo docker ps --format "table {{.Names}}\t{{.Ports}}"

# Check if port is listening
sudo netstat -tulpn | grep 5432

# Use sudo to bind to privileged ports
sudo docker-compose up -d

# Change to non-privileged port
# In docker-compose.yml:
# ports:
#   - "5433:5432"  # Instead of 5432
```

---

## Debugging Commands

### View Docker System Information

```bash
# System info
sudo docker info

# Docker version
sudo docker version

# Docker images
sudo docker images

# Running containers
sudo docker ps

# All containers
sudo docker ps -a

# Container details
sudo docker inspect <CONTAINER_NAME>
```

### Monitor Docker

```bash
# Real-time stats
sudo docker stats

# Without streaming
sudo docker stats --no-stream

# Specific container
sudo docker stats bgalin_postgres_1

# With process list inside container
sudo docker top bgalin_postgres_1
```

### View Logs

```bash
# Container logs
sudo docker logs <CONTAINER_NAME>

# Last 50 lines
sudo docker logs --tail 50 <CONTAINER_NAME>

# Follow in real-time
sudo docker logs -f <CONTAINER_NAME>

# Timestamps
sudo docker logs --timestamps <CONTAINER_NAME>

# Since specific time
sudo docker logs --since 2025-12-17 <CONTAINER_NAME>
```

### Clean Up Docker

```bash
# Remove unused containers
sudo docker container prune

# Remove unused images
sudo docker image prune

# Remove unused volumes
sudo docker volume prune

# Remove unused networks
sudo docker network prune

# Full cleanup (use with caution!)
sudo docker system prune -a --volumes
```

---

## Performance Optimization

### Reduce Memory Usage

```bash
# Check current usage
sudo docker stats --no-stream

# Set memory limits in docker-compose.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 512M

# Restart with limits
sudo docker-compose restart
```

### Optimize Image Size

```bash
# Use Alpine Linux (smaller base image)
# FROM postgres:16-alpine  # Instead of postgres:16

# Reduce layers
RUN apt-get update && \
    apt-get install -y package && \
    apt-get clean

# Remove intermediate images
sudo docker image prune -a

# See image sizes
sudo docker images --format "table {{.Repository}}\t{{.Size}}"
```

---

## Recovery Procedures

### Reset Docker to Clean State

```bash
# Stop all containers
sudo docker-compose down

# Remove all containers, images, volumes
sudo docker system prune -a --volumes

# Restart Docker
sudo systemctl restart docker

# Redeploy
sudo docker-compose up -d
```

### Restore from Backup

```bash
# Stop services
sudo docker-compose stop

# Restore volume
sudo docker run --rm -v bgalin_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_backup.tar.gz -C /data

# Restart services
sudo docker-compose up -d

# Verify
sudo docker-compose ps
```

### Emergency Container Access

```bash
# Get shell in running container
sudo docker exec -it bgalin_postgres_1 /bin/bash

# Run command in container
sudo docker exec bgalin_postgres_1 psql -U admin -c "SELECT 1"

# Copy files from container
sudo docker cp bgalin_postgres_1:/var/lib/postgresql/data ./backup

# Copy files to container
sudo docker cp ./config.conf bgalin_postgres_1:/etc/config.conf
```

---

## GitHub Actions Specific Issues

### Docker Daemon Not Ready in Actions

```bash
# Add wait loop to deploy.yml
for i in {1..30}; do
  if sudo docker info > /dev/null 2>&1; then
    echo "Docker ready"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 1
done
```

### docker-compose Fails in Actions

```bash
# Add retry logic
for attempt in {1..3}; do
  if sudo docker-compose up -d; then
    break
  fi
  sleep 5
done
```

### Permissions in Actions

```bash
# Actions runs as specific user
# Always use sudo for Docker commands
sudo docker ps
sudo docker-compose up -d
```

---

## Testing Docker Setup

### Basic Docker Test

```bash
# Pull and run test image
sudo docker run --rm hello-world

# Should output: Hello from Docker!
```

### docker-compose Test

```bash
# Create test compose file
cat > test-docker-compose.yml << 'EOF'
version: '3'
services:
  test:
    image: alpine:latest
    command: echo "Docker Compose works!"
EOF

# Run test
sudo docker-compose -f test-docker-compose.yml up

# Clean up
sudo docker-compose -f test-docker-compose.yml down
```

### Network Test

```bash
# Create test network
sudo docker network create test-net

# Run containers on network
sudo docker run --rm --name test1 --network test-net alpine sleep 100 &
sudo docker run --rm --name test2 --network test-net alpine ping test1

# Clean up
sudo docker network rm test-net
```

---

## Quick Reference

```bash
# Start Docker
sudo systemctl start docker

# Wait for daemon
for i in {1..30}; do sudo docker info > /dev/null 2>&1 && break; sleep 1; done

# Start services
sudo docker-compose up -d

# Check status
sudo docker-compose ps

# View logs
sudo docker-compose logs -f

# Restart service
sudo docker-compose restart postgres

# Stop all
sudo docker-compose down

# Clean up
sudo docker system prune -a --volumes
```

---

## Support & Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Troubleshooting](https://docs.docker.com/config/containers/troubleshoot/)
- [docker-compose Documentation](https://docs.docker.com/compose/)
- [Docker Community Forums](https://forums.docker.com/)

---

**Last Updated**: December 18, 2024  
**Status**: Actively Maintained
