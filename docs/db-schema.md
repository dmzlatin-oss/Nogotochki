# docs/db-schema.md — Схема базы данных

Движок: **SQLite** (встроенный `node:sqlite`, Node.js 22). Файл БД: `src/db/booking.db` (в `.gitignore`, не коммитится).

## Общие правила
- Время хранится в **UTC** в формате ISO-8601 (`YYYY-MM-DDTHH:MM:SS.sssZ`).
- Свободные слоты **не хранятся** в БД — рассчитываются динамически (см. ниже).
- Все запросы параметризованы (`?`-плейсхолдеры).

## Таблицы (8)

### users
| Поле | Тип | Назначение |
|------|-----|-----------|
| id | INTEGER PK | |
| name | TEXT | |
| email | TEXT UNIQUE | логин (нижний регистр) |
| password_hash | TEXT | scrypt-хеш |
| password_salt | TEXT | случайная соль на пароль |
| password_params | TEXT | JSON: {N, r, p, keylen} |
| role | TEXT DEFAULT 'client' | 'client' \| 'master' \| 'admin' |
| created_at / updated_at | TEXT | |

Индексы: `idx_users_email`, `idx_users_role`.

### services
| Поле | Тип | |
|------|-----|---|
| id | INTEGER PK | |
| name | TEXT | |
| description | TEXT | |
| duration_min | INTEGER | длительность услуги (мин) |
| price | REAL | |
| active | INTEGER DEFAULT 1 | |

### masters
| Поле | Тип | |
|------|-----|---|
| id | INTEGER PK | |
| user_id | INTEGER → users(id) | привязка к учётке (для роли master) |
| name | TEXT | |
| specialization | TEXT | |
| description | TEXT | |
| photo_url | TEXT | |
| work_start / work_end | TEXT | дефолтный график HH:MM |
| active | INTEGER DEFAULT 1 | |

### schedule
Рабочий график по дням недели (переопределяет дефолт masters).
| Поле | Тип | |
|------|-----|---|
| id | INTEGER PK | |
| master_id | INTEGER → masters(id) ON DELETE CASCADE | |
| day_of_week | INTEGER | 0=вс..6=сб |
| work_start / work_end | TEXT | HH:MM |
UNIQUE(master_id, day_of_week).

### bookings
| Поле | Тип | |
|------|-----|---|
| id | INTEGER PK | |
| client_id | INTEGER → users(id) | |
| master_id | INTEGER → masters(id) | |
| service_id | INTEGER → services(id) | |
| start_time / end_time | TEXT | UTC ISO |
| status | TEXT DEFAULT 'active' | 'active' \| 'cancelled' \| 'completed' |
| created_by | INTEGER → users(id) | кто создал |
| force_overlap | INTEGER DEFAULT 0 | 1 = админ сознательно наложил |
Индексы: по master_id, client_id, start_time, status.

### blocks
Блокировки времени мастера (отпуск, больничный).
| Поле | Тип | |
|------|-----|---|
| id | INTEGER PK | |
| master_id | INTEGER → masters(id) | |
| start_time / end_time | TEXT | UTC ISO |
| reason | TEXT | |

### tokens
| Поле | Тип | |
|------|-----|---|
| id | INTEGER PK | |
| user_id | INTEGER → users(id) | |
| token_hash | TEXT | **SHA-256 от токена** (сам токен не хранится) |
| expires_at | TEXT | UTC ISO |
Индексы: `idx_tokens_hash`, `idx_tokens_user`.

## Связи
- `bookings.master_id → masters.id` — запись к мастеру.
- `bookings.client_id → users.id` — клиент-владелец.
- `bookings.service_id → services.id` — услуга (длительность берётся отсюда).
- `masters.user_id → users.id` — мастер привязан к учётке (для роли master).
- `schedule.master_id → masters.id` — график мастера.

Пример: запись `bookings #4` имеет `master_id=1`, `client_id=2`, `service_id=1`. Мастер #1 связан с пользователем #4 (роль master). Услуга #1 («Маникюр», 60 мин) определяет длительность.

## Вычисляемое значение (не хранится)
**Свободные слоты** рассчитываются динамически функцией `getFreeSlots(masterId, date, durationMin)`:
1. Берём рабочие интервалы мастера на `date` (из `schedule` или дефолт `masters`).
2. Вычитаем занятые интервалы: активные `bookings` (status='active', force_overlap=0) + `blocks` на эту дату.
3. Получаем свободные интервалы.
4. Нарезаем на слоты длиной `durationMin`.

## Защита от пересечений (триггеры)
Два триггера `BEFORE INSERT` / `BEFORE UPDATE` на `bookings` запрещают пересечение активных записей одного мастера:
```
NEW.start_time < b.end_time AND NEW.end_time > b.start_time
```
- Вплотную стоящие (15:00–16:00 и 16:00–17:00) НЕ считаются пересечением.
- Отменённые (`status='cancelled'`) не блокируют.
- При нарушении: `RAISE(ABORT, 'SLOT_CONFLICT: ...')`.

## Транзакция создания записи
`BEGIN IMMEDIATE` — блокировка записи ДО проверки/вставки (уменьшает риск гонки). Подробнее в `docs/dev-log.md`.
