# Исправление 404 ошибки на /api endpoints

## Проблема
Nginx неправильно проксирует запросы к API - отправляет `/auth/request-otp` вместо `/api/auth/request-otp`

## Решение

Подключитесь к серверу и выполните:

```bash
# Обновите конфигурацию nginx
sudo nano /etc/nginx/sites-available/bgalin
```

Найдите секцию `location /api/` и убедитесь, что она выглядит так:

```nginx
# Backend API
location /api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**ВАЖНО:** НЕ должно быть строки `rewrite ^/api/(.*) /$1 break;`

Затем проверьте конфигурацию и перезагрузите nginx:

```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка nginx
sudo systemctl reload nginx
```

Проверьте что API работает:

```bash
curl -X POST https://bgalin.ru/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{}'
```

Должен вернуться ответ от backend, а не 404.

## Автоматическое обновление

При следующем деплое через GitHub Actions конфигурация обновится автоматически.
Но для немедленного исправления нужно обновить вручную как описано выше.
