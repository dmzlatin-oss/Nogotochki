-- Схема БД «Ноготочки» (SQLite).
-- Сгенерировано из рабочей базы: sqlite3 src/db/booking.db .schema
-- Время: в start_time/end_time хранится честный UTC (суффикс Z),
-- салонское время = MSK (UTC+3), см. src/time.js.

CREATE TABLE users (
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER NOT NULL,   -- длительность услуги
  price REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_services_active ON services(active);
CREATE TABLE masters (
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
CREATE INDEX idx_masters_active ON masters(active);
CREATE TABLE schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,   -- 0=воскресенье .. 6=суббота
  work_start TEXT NOT NULL,       -- HH:MM
  work_end TEXT NOT NULL,         -- HH:MM
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
  UNIQUE (master_id, day_of_week)
);
CREATE INDEX idx_schedule_master ON schedule(master_id);
CREATE TABLE master_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE (master_id, service_id)
);
CREATE INDEX idx_master_services_master ON master_services(master_id);
CREATE INDEX idx_master_services_service ON master_services(service_id);
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  master_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,       -- UTC ISO 'YYYY-MM-DDTHH:MM:SSZ'
  end_time TEXT NOT NULL,         -- UTC ISO
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'cancelled' | 'completed'
  created_by INTEGER NOT NULL,    -- user_id, создавший запись
  force_overlap INTEGER NOT NULL DEFAULT 0, -- 1 = админ сознательно наложил (не блокирует слот, но участвует в проверках)
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX idx_bookings_master ON bookings(master_id);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_start ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE TABLE blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,       -- UTC ISO
  end_time TEXT NOT NULL,         -- UTC ISO
  reason TEXT,
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE
);
CREATE INDEX idx_blocks_master ON blocks(master_id);
CREATE TABLE tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,       -- SHA-256 от случайного токена (сам токен не храним)
  expires_at TEXT NOT NULL,       -- UTC ISO
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_tokens_hash ON tokens(token_hash);
CREATE INDEX idx_tokens_user ON tokens(user_id);
CREATE TRIGGER trg_bookings_no_overlap_insert
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
CREATE TRIGGER trg_bookings_no_overlap_update
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
