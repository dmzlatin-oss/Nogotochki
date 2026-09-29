# Booking Service — сервис записи в салон/студию красоты

Backend веб-сервиса записи клиентов к мастерам на услуги.
Стек: **Node.js 22 + Express + встроенный SQLite (`node:sqlite`) + crypto.scrypt**.

## Требования
- **Node.js >= 22** (нужен встроенный `node:sqlite`).
- npm.

## Установка
```bash
cd booking-service
npm install            # только express
cp .env.example .env  # затем отредактировать SESSION_SECRET
```

В `.env` обязательно задайте:
- `SESSION_SECRET` — случайная строка >= 32 символов.
- `PORT` — порт (по умолчанию 3000).
- `TOKEN_TTL` — срок жизни токена в секундах (по умолчанию 604800 = 7 дней).
- `SALON_TIMEZONE` — IANA TZ салона (для отображения на фронтенде).

## Создание БД и тестовых данных
```bash
node migrations/init.js   # создаёт таблицы и триггеры (файл src/db/booking.db)
node scripts/seed.js      # тестовые пользователи/услуги/мастера/запись
```
Тестовые аккаунты (после seed):
- admin@example.com / AdminPass123 (role=admin)
- clienta@example.com / ClientPass123 (role=client)
- clientb@example.com / ClientPass123 (role=client)
- master@example.com / MasterPass123 (role=master, привязан к мастеру «Ирина»)

## Запуск backend
```bash
npm start
# или
node src/server.js
```
Слушает на `http://localhost:3000`.

## API (кратко)
| Метод | Путь | Auth | Назначение |
|-------|------|------|-----------|
| POST | `/api/auth/register` | — | регистрация (role=client) |
| POST | `/api/auth/login` | — | вход → токен |
| POST | `/api/auth/logout` | token | выход |
| GET | `/api/auth/me` | token | текущий пользователь |
| GET | `/api/services` | — | список услуг |
| GET | `/api/masters` | — | список мастеров |
| GET | `/api/masters/:id/availability?date=YYYY-MM-DD&serviceId=N` | — | свободные слоты (динамически) |
| POST | `/api/bookings` | token | создание записи (общая функция) |
| GET | `/api/bookings` | token | свои записи |
| GET | `/api/bookings/:id` | token | запись (проверка владельца) |
| DELETE | `/api/bookings/:id` | token | отмена |
| GET | `/api/admin/bookings` | admin | все записи |
| GET | `/api/admin/users` | admin | пользователи |
| GET | `/api/admin/masters` | admin | мастера |
| GET | `/api/admin/services` | admin | услуги |

Токен передаётся в заголовке: `Authorization: Bearer <token>`.

## Обязательные проверки
См. `scripts/test-checks.js` (запускать при работающем сервере):
```bash
node src/server.js &        # в фоне
node scripts/test-checks.js  # регистрация, логин, свободное время, запись, конфликт, чужая, admin
```

## Структура
```
booking-service/
├── src/
│   ├── server.js        # все маршруты API
│   ├── db/index.js      # подключение, схема, триггеры
│   ├── auth.js          # scrypt, токены
│   ├── middleware.js    # authenticateToken, requireRole
│   ├── availability.js  # расчёт свободного времени
│   ├── bookings.js      # createBooking (общая), cancelBooking
│   └── ratelimit.js     # in-memory rate limit для auth
├── migrations/init.js   # создание БД
├── scripts/seed.js      # тестовые данные
├── scripts/test-checks.js
├── docs/db-schema.md
├── docs/dev-log.md
├── .env.example
└── package.json
```

## Безопасность
- Пароли: только scrypt + отдельная соль. Никогда не в открытом виде.
- Токены: хеш (SHA-256) в БД, срок действия, не попадают в логи.
- Роли: определяются сервером по БД, не из запроса.
- SQL: все запросы параметризованы.
- Валидация входных данных (типы, формат, длина, принадлежность).
- Ошибки БД не раскрываются клиенту.
- Rate limit на login/register.

## Замечания по деплою на BeGet
- Нужен Node.js 22+.
- Файл БД `src/db/booking.db` создаётся на диске при первом запуске; добавьте его в исключения хранилища (он в `.gitignore`).
- Frontend подключается отдельно (в текущей версии backend проверен независимо).
