# Настройка HH.ru OAuth для локальной разработки и продакшена

## 1. Регистрация приложения на HH.ru

1. Перейдите на https://dev.hh.ru/
2. Войдите в свой аккаунт HH.ru
3. Создайте новое приложение или откройте существующее
4. В настройках приложения найдите поле **"Redirect URI"**

## 2. Добавление двух Redirect URI

**ВАЖНО:** Нужно зарегистрировать ОБА адреса редиректа:

### Для локальной разработки:
```
http://localhost:3001/auth/hh/callback
```

### Для продакшена:
```
https://bgalin.ru/auth/hh/callback
```

> **Примечание:** HH.ru позволяет указать несколько Redirect URI через запятую или добавить их в список (в зависимости от интерфейса)

## 3. Настройка локального окружения

Создайте файл `server/.env` на основе `server/.env.example`:

```bash
cd server
cp .env.example .env
```

Отредактируйте `.env` и укажите ваши реальные данные:

```env
HH_CLIENT_ID=ваш_client_id_с_hh_ru
HH_CLIENT_SECRET=ваш_client_secret_с_hh_ru
HH_REDIRECT_URI=http://localhost:3001/auth/hh/callback
```

## 4. Настройка продакшена (GitHub Secrets)

На сервере URL автоматически меняется на `https://bgalin.ru/auth/hh/callback`.

Убедитесь что в GitHub Secrets установлены:
- `HH_CLIENT_ID` - Client ID с HH.ru
- `HH_CLIENT_SECRET` - Client Secret с HH.ru

## 5. Тестирование локально

1. Запустите backend:
```bash
cd server
cargo run
```

2. Запустите frontend:
```bash
cd frontend
npm run dev
```

3. Откройте http://localhost:3000/admin
4. Введите OTP код из Telegram
5. В разделе "Job Search" нажмите на кнопку авторизации HH.ru
6. Вас перенаправит на HH.ru для авторизации
7. После авторизации вернет на `http://localhost:3001/auth/hh/callback`
8. Token сохранится в базу данных

## 6. Как это работает

**Локально:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- HH OAuth redirect: `http://localhost:3001/auth/hh/callback`

**На продакшене:**
- Frontend: `https://bgalin.ru`
- Backend: `https://bgalin.ru/api` (nginx proxy -> `localhost:3001`)
- HH OAuth redirect: `https://bgalin.ru/auth/hh/callback` (nginx proxy -> `localhost:3001`)

## Troubleshooting

### Ошибка "Invalid redirect_uri"
- Проверьте что оба URI зарегистрированы в настройках приложения на dev.hh.ru
- Убедитесь что в `.env` указан правильный `HH_REDIRECT_URI`

### Ошибка "Invalid client_id or client_secret"
- Проверьте что `HH_CLIENT_ID` и `HH_CLIENT_SECRET` скопированы правильно
- Убедитесь что в файле `.env` нет лишних пробелов

### Авторизация прошла, но токен не сохранился
- Проверьте логи backend: `journalctl -u bgalin-backend.service -f`
- Проверьте что база данных доступна
- Проверьте миграции: `sqlite3 server/data.db "SELECT * FROM hh_tokens;"`
