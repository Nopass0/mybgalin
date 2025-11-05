# Troubleshooting Guide

## GitHub Actions Deployment Issues

### ❌ SSH Authentication Failed

**Ошибка:**
```
ssh: handshake failed: ssh: unable to authenticate, attempted methods [none password], no supported methods remain
```

**Причины и решения:**

#### 1. Неправильный пароль
- Проверьте что `SERVER_PASSWORD` в GitHub Secrets указан правильно
- Попробуйте подключиться вручную: `ssh user@your-server`
- Если пароль верный, но не работает - сервер может не разрешать password auth

#### 2. Password authentication отключена на сервере
Проверьте `/etc/ssh/sshd_config` на сервере:
```bash
sudo nano /etc/ssh/sshd_config
```

Убедитесь что есть:
```
PasswordAuthentication yes
PubkeyAuthentication yes
```

Перезапустите SSH:
```bash
sudo systemctl restart sshd
```

#### 3. Используйте SSH ключ вместо пароля (рекомендуется)

**На вашем компьютере:**
```bash
# Создайте SSH ключ если его нет
ssh-keygen -t rsa -b 4096 -C "github-actions"

# Скопируйте публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_rsa.pub user@your-server

# Проверьте что работает
ssh user@your-server
```

**Скопируйте приватный ключ:**
```bash
# Linux/Mac
cat ~/.ssh/id_rsa

# Windows (PowerShell)
type $env:USERPROFILE\.ssh\id_rsa
```

**Добавьте в GitHub Secrets:**
- Name: `SSH_PRIVATE_KEY`
- Value: Весь вывод команды выше (включая `-----BEGIN` и `-----END`)

**Можно удалить** `SERVER_PASSWORD` из секретов если используете ключ

#### 4. Firewall блокирует SSH
```bash
# На сервере проверьте firewall
sudo ufw status

# Разрешите SSH
sudo ufw allow 22/tcp
```

#### 5. Неправильный порт
- Проверьте что `SERVER_PORT` в секретах = порт SSH на сервере
- Обычно это `22`, но может быть другой
- Проверьте в `/etc/ssh/sshd_config`: `Port 22`

---

### ❌ Permission Denied (для sudo команд)

**Ошибка:**
```
sudo: no tty present and no askpass program specified
```

**Решение:**
Настройте sudo без пароля для нужных команд:

```bash
sudo visudo
```

Добавьте в конец (замените `youruser`):
```
youruser ALL=(ALL) NOPASSWD: /bin/systemctl restart bgalin-backend.service
youruser ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
youruser ALL=(ALL) NOPASSWD: /usr/sbin/nginx
```

---

### ❌ Git Pull Failed

**Ошибка:**
```
fatal: could not read Username for 'https://github.com'
```

**Решение:**
На сервере настройте Git credentials или используйте SSH URL:

```bash
cd /var/www/bgalin

# Смените URL на SSH (для приватных репозиториев)
git remote set-url origin git@github.com:yourusername/bgalin.git

# ИЛИ настройте GitHub token (для приватных репозиториев)
git config --global credential.helper store
git pull  # Введите username и Personal Access Token
```

Для приватных репозиториев лучше использовать SSH ключ:
```bash
# Создайте SSH ключ на сервере
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Добавьте публичный ключ в GitHub
cat ~/.ssh/id_rsa.pub
# Скопируйте и добавьте в GitHub: Settings → SSH Keys → New SSH key
```

---

### ❌ Cargo Build Failed

**Ошибка:**
```
error: linker `cc` not found
```

**Решение:**
```bash
sudo apt update
sudo apt install build-essential pkg-config libssl-dev
```

---

### ❌ Frontend Build Failed

**Ошибка:**
```
ENOENT: no such file or directory, open 'package.json'
```

**Решение:**
```bash
cd /var/www/bgalin/frontend
npm install
npm run build
```

---

### ❌ Service Failed to Start

**Ошибка:**
```
Failed to restart bgalin-backend.service: Unit not found
```

**Решение:**
Убедитесь что systemd service создан:

```bash
# Проверьте существует ли service
ls /etc/systemd/system/bgalin-backend.service

# Если нет - запустите prod.sh снова
cd /var/www/bgalin
sudo ./prod.sh
```

---

### ❌ Nginx Configuration Error

**Ошибка:**
```
nginx: [emerg] cannot load certificate
```

**Решение:**
Проверьте что SSL сертификаты на месте:

```bash
ls -la /var/www/bgalin/bgalin_ru.crt
ls -la /var/www/bgalin/private.key

# Если нет - скопируйте из проекта
cd /var/www/bgalin
sudo cp bgalin_ru.crt /var/www/bgalin/
sudo cp private.key /var/www/bgalin/
sudo chmod 600 /var/www/bgalin/private.key
```

---

### ❌ Port Already in Use

**Ошибка:**
```
Error: Address already in use (os error 48)
```

**Решение:**
```bash
# Найдите процесс на порту 8000
sudo lsof -i :8000

# Убейте процесс
sudo kill -9 <PID>

# Или перезапустите service
sudo systemctl restart bgalin-backend.service
```

---

## Полезные команды для отладки

### Проверка логов деплоя на GitHub
1. Откройте ваш репозиторий на GitHub
2. Actions → Deploy to Production
3. Кликните на последний run
4. Разверните "Deploy to server"
5. Смотрите где упало

### Проверка логов на сервере
```bash
# Backend логи
sudo journalctl -u bgalin-backend.service -f -n 100

# Frontend логи
pm2 logs bgalin-frontend --lines 100

# Nginx ошибки
sudo tail -f /var/log/nginx/bgalin_error.log -n 100

# Nginx access
sudo tail -f /var/log/nginx/bgalin_access.log -n 100
```

### Проверка статуса сервисов
```bash
# Backend
sudo systemctl status bgalin-backend.service

# Frontend
pm2 status

# Nginx
sudo systemctl status nginx

# Все порты
sudo netstat -tulpn | grep LISTEN
```

### Ручной деплой (для отладки)
```bash
cd /var/www/bgalin
git pull origin main

# Backend
cd server
cargo build --release
sudo systemctl restart bgalin-backend.service

# Frontend
cd ../frontend
npm install
npm run build
pm2 restart bgalin-frontend

# Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## Дополнительная помощь

Если проблема не решена:

1. **Проверьте все секреты** в GitHub (17 штук) - [SECRETS.md](SECRETS.md)
2. **Проверьте логи** на сервере (команды выше)
3. **Попробуйте подключиться** к серверу вручную: `ssh user@server`
4. **Проверьте .env** на сервере: `cat /var/www/bgalin/server/.env`
5. **Запустите prod.sh** заново: `cd /var/www/bgalin && sudo ./prod.sh`

Если всё ещё не работает - откройте issue с полными логами ошибки.
