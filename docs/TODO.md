# Дневник проекта «Ноготочки» — текущее состояние

## Дата: 2026-09-27

## Что сделано:
- [x] Копия старого проекта создана в ~/projects/nogotochki-booking/
- [x] Backend: Node.js + Express + SQLite (используется существующий код)
- [x] БД создана: ~/projects/nogotochki-booking/src/db/booking.db
- [x] Таблицы: users, services, masters, bookings, schedule, blocks, master_services, tokens
- [x] Данные БД заполнены: 6 услуг, 3 мастера, 7 пользователей (admin + 3 тестовых клиента + 3 мастера), 1 демо-запись
- [x] Сервер запущен на порту 3001 (PID 47960)
- [x] API эндпоинты работают: /api/services, /api/masters (отдают данные «Ноготочки»)

## Что нужно сделать:
- [ ] Добавить эндпоинты /api/blocks, /api/schedule, /api/bookings (сейчас 404)
- [ ] Собрать фронтенд: cd frontend && npm run build (сейчас dist/ отсутствует)
- [ ] Настроить сервер на отдачу статики из frontend/dist/
- [ ] Запустить фронтенд (dev-сервер или собранную версию)
- [ ] Проверить, что сайт работает полноценно (backend + frontend)
- [ ] Создать документы: отчёт о тестировании, дневник сборки, отчёт, описание проекта, паспорт продукта
- [ ] Создать скринкаст (4-6 минут)
- [ ] Создать CLAUDE.md (паспорт продукта)

## Структура проекта:
- ~/projects/nogotochki-booking/ — корень нового проекта
  - frontend/ — фронтенд (Vite + React + TypeScript)
    - src/ — исходный код (App.tsx, страницы, компоненты, API-клиент, контекст)
    - dist/ — СБОРАННАЯ версия (пока отсутствует, нужно собрать)
    - package.json, vite.config.ts, tailwind.config.js, tsconfig.json
  - src/ — БЭКЕНД (server.js, db/, auth.js, middleware.js, availability.js, bookings.js, ratelimit.js)
    - db/ — booking.db, booking.db-wal, booking.db-shm
  - docs/ — документы проекта (создать)
  - migrations/ — init.js (схема БД)
  - node_modules/ — зависимости
  - package.json (если есть в корне — проверить)

## Базы данных:
- Старая БД (Aurelia Studio): /home/openclaw/.hermes/workspace/project_docs/booking-frontend/booking-service/src/db/booking.db
- Новая БД (Ноготочки): /home/openclaw/projects/nogotochki-booking/src/db/booking.db

## Серверы:
- Старый сервер (Aurelia Studio): порт 3000, ~/projects/.../booking-frontend/booking-service/src/server.js
- Новый сервер (Ноготочки): порт 3001, ~/projects/nogotochki-booking/src/server.js (если есть)

