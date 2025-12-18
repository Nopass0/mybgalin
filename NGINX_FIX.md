# Исправление 404 ошибки на /api endpoints

## Проблема
Nginx неправильно проксирует запросы к API – в текущей конфигурации указано порт **3001**, тогда как Bun‑сервер слушает **порт 8000** (см. `bgalin-backend.service`).

## Решение

Подключитесь к серверу и выполните:

```bash
# Откройте конфигурацию Nginx
sudo nano /etc/nginx/sites-available/bgalin
```

Найдите секцию `location /api/` и замените её на следующую:

```nginx
# Backend API
location /api/ {
    # Проксим запросы к Bun‑серверу, который слушает 8000‑й порт
    proxy_pass http://localhost:8000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Важно:**  
- **Не** добавляйте строку `rewrite ^/api/(.*) /$1 break;` – она ломает путь.  
- Убедитесь, что порт в `proxy_pass` совпадает с тем, что указано в unit‑файле `bgalin-backend.service` (`Environment="PORT=8000"`).

После правки проверьте конфигурацию и перезапустите Nginx:

```bash
# Проверка синтаксиса
sudo nginx -t

# Перезапуск Nginx
sudo systemctl reload nginx
```

## Проверка работоспособности API

```bash
curl -X GET "https://bgalin.ru/api/jobs/activity?limit=30" \
  -H "Accept: application/json"
```

Ожидается корректный JSON‑ответ от бекенда, а не `404 Not Found`.

## Автоматическое обновление

При следующем деплое через GitHub Actions конфигурация будет обновлена автоматически,
но для мгновенного исправления необходимо выполнить указанные выше шаги вручную.