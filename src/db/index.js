// src/db/index.js — слой доступа к SQLite (встроенный node:sqlite)
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'booking.db');

// Открываем в режиме read-write-create. WAL для конкурентности чтения.
const db = new DatabaseSync(DB_PATH, { readOnly: false });
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// --- Схема (idempotent) ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_params TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',  -- 'client' | 'master' | 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER NOT NULL,   -- длительность услуги
  price REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

CREATE TABLE IF NOT EXISTS masters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                -- если мастер привязан к учётке
  name TEXT NOT NULL,
  specialization TEXT,
  description TEXT,
  photo_url TEXT,
  work_start TEXT NOT NULL DEFAULT '09:00',  -- локальное время салона HH:MM
  work_end   TEXT NOT NULL DEFAULT '18:00',
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_masters_active ON masters(active);

CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,   -- 0=воскресенье .. 6=суббота
  work_start TEXT NOT NULL,       -- HH:MM
  work_end TEXT NOT NULL,         -- HH:MM
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
  UNIQUE (master_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_schedule_master ON schedule(master_id);

CREATE TABLE IF NOT EXISTS master_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE (master_id, service_id)
);
CREATE INDEX IF NOT EXISTS idx_master_services_master ON master_services(master_id);
CREATE INDEX IF NOT EXISTS idx_master_services_service ON master_services(service_id);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  master_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,       -- UTC ISO 'YYYY-MM-DDTHH:MM:SSZ'
  end_time TEXT NOT NULL,         -- UTC ISO
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'cancelled' | 'completed'
  created_by INTEGER NOT NULL,    -- user_id, создавший запись
  force_overlap INTEGER NOT NULL DEFAULT 0, -- 1 = админ сознательно наложил (не блокирует слот, но участвует в проверках)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_bookings_master ON bookings(master_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,       -- UTC ISO
  end_time TEXT NOT NULL,         -- UTC ISO
  reason TEXT,
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_blocks_master ON blocks(master_id);

CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,       -- SHA-256 от случайного токена (сам токен не храним)
  expires_at TEXT NOT NULL,       -- UTC ISO
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
`);

// --- Триггеры защиты от двойной записи (п.17) ---
// Запрещают пересечение АКТИВНЫХ записей одного мастера.
// Условие пересечения: start1 < end2 AND end1 > start2
// Вплотную стоящие (15:00-16:00 и 16:00-17:00) не считаются пересечением.
// Отменённые (status='cancelled') не блокируют.
db.exec(`
CREATE TRIGGER IF NOT EXISTS trg_bookings_no_overlap_insert
BEFORE INSERT ON bookings
WHEN NEW.status = 'active' AND NEW.force_overlap = 0
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.master_id = NEW.master_id
        AND b.status = 'active'
        AND b.force_overlap = 0
        AND NEW.start_time < b.end_time
        AND NEW.end_time > b.start_time
    )
    THEN RAISE(ABORT, 'SLOT_CONFLICT: время уже занято другой активной записью')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_no_overlap_update
BEFORE UPDATE ON bookings
WHEN NEW.status = 'active' AND NEW.force_overlap = 0
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.master_id = NEW.master_id
        AND b.status = 'active'
        AND b.force_overlap = 0
        AND b.id <> NEW.id
        AND NEW.start_time < b.end_time
        AND NEW.end_time > b.start_time
    )
    THEN RAISE(ABORT, 'SLOT_CONFLICT: время уже занято другой активной записью')
  END;
END;
`);

// Добавляем updated_at, если колонки ещё нет (обратная совместимость со старыми БД)
try {
  const cols = db.prepare("PRAGMA table_info(bookings)").all().map((c) => c.name);
  if (!cols.includes('updated_at')) {
    db.exec("ALTER TABLE bookings ADD COLUMN updated_at TEXT");
  }
} catch (e) {
  // игнорируем, если таблицы нет на момент первичной инициализации
}

// --- Хелперы ---
function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

module.exports = { db, all, get, run, DB_PATH };
