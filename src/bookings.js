// src/bookings.js — бизнес-логика записей. ОДНА общая функция создания (п.16).
const { db, get, all, run } = require('./db');
const { getFreeSlots, dbToMs } = require('./availability');
const { dbToMskDate } = require('./time');

// Общая функция создания записи. Права/валидация проверяются ДО вызова вызывающим.
// Возвращает { ok, bookingId, error, code, availableSlots }.
// startISO/endISO — честный UTC (startD.toISOString() из server.js).
// Транзакция BEGIN IMMEDIATE (п.18): берёт блокировку записи ДО проверки/вставки,
// уменьшает риск гонки при одновременном создании двух записей на один слот.
function createBooking({ clientId, masterId, serviceId, startISO, endISO, createdBy, forceOverlap = 0 }) {
  // Открываем транзакцию с немедленной блокировкой записи
  db.exec('BEGIN IMMEDIATE');
  try {
    // Салонская дата для подсказки свободных слотов: startISO — UTC,
    // а слоты и расписание живут в московской зоне.
    const salonDate = dbToMskDate(startISO);
    const sMs = dbToMs(startISO), eMs = dbToMs(endISO);

    // Повторная проверка конфликта на уровне приложения (защита в коде + триггер БД).
    // Сравниваем в миллисекундах: в БД смесь старых наивных записей и новых UTC,
    // строковое сравнение давало бы неверный результат на границах суток.
    const activeBookings = all(
      `SELECT id, start_time, end_time FROM bookings
       WHERE master_id = ? AND status='active' AND force_overlap=0`,
      [masterId]
    );
    const conflictId = activeBookings
      .find(r => sMs < dbToMs(r.end_time) && eMs > dbToMs(r.start_time))?.id || null;
    if (conflictId && !(forceOverlap && createdBy)) {
      db.exec('ROLLBACK');
      const near = getFreeSlots(masterId, salonDate, 60).slice(0, 5);
      return { ok: false, code: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже занято', availableSlots: near };
    }

    // Разовые исключения из графика («Исключения» во вкладке «Расписание»):
    // в это время мастер не работает, запись нельзя создать даже если
    // в форме слот почему-то отобразился свободным.
    const blockRows = all(
      `SELECT id, start_time, end_time FROM blocks WHERE master_id = ?`,
      [masterId]
    );
    const excludedId = blockRows
      .find(r => sMs < dbToMs(r.end_time) && eMs > dbToMs(r.start_time))?.id || null;
    if (excludedId && !(forceOverlap && createdBy)) {
      db.exec('ROLLBACK');
      const near = getFreeSlots(masterId, salonDate, 60).slice(0, 5);
      return { ok: false, code: 'SLOT_UNAVAILABLE', message: 'Мастер не работает в это время', availableSlots: near };
    }

    const res = run(
      `INSERT INTO bookings (client_id, master_id, service_id, start_time, end_time, status, created_by, force_overlap)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [clientId, masterId, serviceId, startISO, endISO, createdBy, forceOverlap ? 1 : 0]
    );
    const bookingId = res.lastInsertRowid;
    db.exec('COMMIT');
    return { ok: true, bookingId: Number(bookingId) };
  } catch (e) {
    db.exec('ROLLBACK');
    // Триггер SQLite отклоняет вставку/апдейт -> текст RAISE(ABORT, 'SLOT_CONFLICT: ...')
    if (e && typeof e.message === 'string' && e.message.includes('SLOT_CONFLICT')) {
      const near = getFreeSlots(masterId, startISO.slice(0, 10), 60).slice(0, 5);
      return { ok: false, code: 'SLOT_UNAVAILABLE', message: 'Выбранное время уже занято', availableSlots: near };
    }
    // Любая другая ошибка БД — не раскрываем детали
    return { ok: false, code: 'DB_ERROR', message: 'Не удалось сохранить запись' };
  }
}

// Отмена записи (п.13): только владелец / admin / мастер (если запись к нему)
function cancelBooking(bookingId, actor) {
  const b = get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  if (!b) return { ok: false, code: 'NOT_FOUND', status: 404, message: 'Запись не найдена' };
  const isClientOwner = actor.role === 'client' && Number(actor.id) === Number(b.client_id);
  const isMasterOf = actor.role === 'master' && Number(actor.id) === Number(b.master_id);
  const isAdmin = actor.role === 'admin';
  if (!isClientOwner && !isMasterOf && !isAdmin) {
    return { ok: false, code: 'FORBIDDEN', status: 403, message: 'Нет прав на отмену этой записи' };
  }
  run("UPDATE bookings SET status='cancelled', updated_at=datetime('now') WHERE id = ?", [bookingId]);
  return { ok: true };
}

module.exports = { createBooking, cancelBooking };
