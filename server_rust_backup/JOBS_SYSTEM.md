# Система автоматического поиска работы с AI

## Архитектура

Это сложная система, требующая нескольких компонентов:

### 1. База данных

```sql
-- Таблица вакансий
CREATE TABLE job_vacancies (
    id INTEGER PRIMARY KEY,
    hh_vacancy_id TEXT UNIQUE,
    title TEXT,
    company TEXT,
    salary_from INTEGER,
    salary_to INTEGER,
    description TEXT,
    url TEXT,
    status TEXT, -- 'found', 'applied', 'viewed', 'invited', 'rejected', 'ignored'
    found_at TIMESTAMP,
    applied_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Таблица откликов
CREATE TABLE job_responses (
    id INTEGER PRIMARY KEY,
    vacancy_id INTEGER,
    cover_letter TEXT,
    status TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (vacancy_id) REFERENCES job_vacancies(id)
);

-- Таблица чатов
CREATE TABLE job_chats (
    id INTEGER PRIMARY KEY,
    vacancy_id INTEGER,
    hh_chat_id TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP,
    has_bot BOOLEAN,
    FOREIGN KEY (vacancy_id) REFERENCES job_vacancies(id)
);

-- OAuth токены HH
CREATE TABLE hh_tokens (
    id INTEGER PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP
);

-- Настройки поиска
CREATE TABLE job_search_settings (
    id INTEGER PRIMARY KEY,
    is_active BOOLEAN,
    search_text TEXT,
    area_ids TEXT, -- JSON array
    experience TEXT,
    schedule TEXT,
    employment TEXT,
    salary_from INTEGER,
    only_with_salary BOOLEAN
);
```

### 2. Модули

#### `src/jobs/hh_api.rs`
- OAuth авторизация HH.ru
- Поиск вакансий
- Отклик на вакансию
- Получение чатов
- Отправка сообщений в чат

#### `src/jobs/ai.rs`
- OpenRouter API интеграция
- Генерация сопроводительных писем
- Генерация ответов на вопросы в чате

#### `src/jobs/scheduler.rs`
- Фоновый процесс с Tokio
- Поиск новых вакансий каждые N часов
- Мониторинг чатов каждые 10 минут
- Автоматические отклики

#### `src/jobs/models.rs`
- Модели данных

### 3. API Эндпоинты

#### OAuth и авторизация
```
GET  /api/jobs/auth/hh         - Начать OAuth flow HH.ru
GET  /auth/hh/callback         - Callback после авторизации
GET  /api/jobs/auth/status     - Проверить статус авторизации
```

#### Управление поиском
```
POST /api/jobs/search/start    - Запустить автопоиск (защищенный)
POST /api/jobs/search/stop     - Остановить автопоиск (защищенный)
GET  /api/jobs/search/status   - Статус автопоиска (защищенный)
PUT  /api/jobs/search/settings - Настройки поиска (защищенный)
```

#### Просмотр вакансий и откликов
```
GET  /api/jobs/vacancies                 - Все вакансии с фильтрами
GET  /api/jobs/vacancies/:id             - Детали вакансии
GET  /api/jobs/vacancies/status/:status  - Вакансии по статусу
GET  /api/jobs/stats                     - Статистика откликов
```

#### Управление откликами
```
POST /api/jobs/vacancies/:id/ignore      - Игнорировать вакансию
POST /api/jobs/vacancies/:id/apply       - Ручной отклик
```

### 4. Логика работы

#### Автоматический поиск (каждые N часов)

1. Проверить `job_search_settings.is_active`
2. Если неактивно - пропустить
3. Получить настройки поиска
4. Запрос к HH.ru API поиска вакансий
5. Для каждой новой вакансии:
   - Сохранить в БД со статусом 'found'
   - Получить портфолио из БД
   - Сгенерировать сопроводительное письмо через AI
   - Отправить отклик на HH.ru
   - Обновить статус на 'applied'
   - Сохранить сопроводительное письмо

#### Мониторинг чатов (каждые 10 минут)

1. Получить все вакансии со статусом 'applied'
2. Для каждой вакансии:
   - Проверить чаты на HH.ru
   - Если есть новые сообщения:
     - Определить, бот это или человек (по паттернам)
     - Если бот с вопросами:
       - Использовать AI для ответа
       - Отправить ответ в чат
     - Сохранить в БД

#### Обновление статусов (каждые 10 минут)

1. Получить все отклики
2. Для каждого отклика:
   - Проверить статус через HH API
   - Если изменился:
     - Обновить в БД
     - 'invited' - приглашение на собеседование
     - 'rejected' - отказ
     - 'viewed' - просмотрено работодателем

### 5. Генерация сопроводительного письма

```
Системный промпт:
"Ты HR-ассистент. Напиши профессиональное сопроводительное письмо на русском языке для отклика на вакансию. 
Используй информацию о кандидате и вакансии. Письмо должно быть кратким (3-4 абзаца), профессиональным."

Контекст:
- Резюме кандидата (about, experience, skills)
- Описание вакансии
- Требования вакансии

В конце добавить:
"Контакты для связи:
- Telegram: https://t.me/username
- Email: user@example.com
- Портфолио: https://bgalin.ru/resume"
```

### 6. Пример работы

```bash
# 1. Авторизоваться на HH.ru
curl http://localhost:8000/api/jobs/auth/hh
# Откроется браузер для авторизации

# 2. Настроить поиск
curl -X PUT http://localhost:8000/api/jobs/search/settings \
  -H "Authorization: Bearer токен" \
  -d '{
    "search_text": "rust backend developer",
    "area_ids": ["1", "2"], 
    "salary_from": 200000,
    "experience": "between3And6"
  }'

# 3. Запустить автопоиск
curl -X POST http://localhost:8000/api/jobs/search/start \
  -H "Authorization: Bearer токен"

# 4. Проверить статистику
curl http://localhost:8000/api/jobs/stats \
  -H "Authorization: Bearer токен"

# 5. Посмотреть отклики со статусом "invited"
curl http://localhost:8000/api/jobs/vacancies/status/invited \
  -H "Authorization: Bearer токен"
```

## Зависимости

Добавить в `Cargo.toml`:
```toml
tokio-cron-scheduler = "0.9"
```

## Следующие шаги

1. Создать database schema
2. Реализовать HH.ru OAuth
3. Реализовать OpenRouter AI клиент
4. Создать scheduler
5. Реализовать API endpoints
6. Тестирование

**Примечание:** Это масштабная задача на несколько дней разработки. Базовую структуру можно увидеть выше.
