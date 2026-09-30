// src/availability.js — динамический расчёт свободного времени (п.14)
//
// Время (30.09.2026):
//   * В БД — честный UTC: 'YYYY-MM-DDTHH:MM:SS.sssZ'.
//   * Клиент и админка работают в салонской зоне Europe/Moscow (UTC+3).
//   * dateStr, которую получают эти функции, — САЛОНСКАЯ дата 'YYYY-MM-DD'.
//   * Наружу отдаём UTC с суффиксом Z.
//
// Раньше здесь время из БД «наивно» игнорировалось как MSK, а график
// строился как будто записи наивные. Из-за этого запись, созданная через
// API (new Date() применял TZ сервера = MSK, сдвигая на -3ч), не совпадала
// со своим слотом. Теперь все сравнения идут в UTC-миллисекундах.
const { all, get } = require('./db');
const { mskDateToUtcStart, dbToMskDate } = require('./time');

/** Момент салонского времени 'YYYY-MM-DD' + 'HH:MM' → UTC-миллисекунды */
function salonToMs(dateStr, hhmm) {
  return mskDateToUtcStart(dateStr).getTime() + (Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))) * 60000;
}

/** Строка из БД (UTC) → UTC-миллисекунды */
function dbToMs(dbStr) {
  const d = new Date(dbStr);
  if (isNaN(d.getTime())) {
    // Записи, созданные до перехода на UTC, лежат наивными — трактуем как MSK
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(dbStr).replace('Z', ''));
    if (!m) return NaN;
    return mskDateToUtcStart(`${m[1]}-${m[2]}-${m[3]}`).getTime() + (+m[4] * 60 + +m[5]) * 60000;
  }
  return d.getTime();
}

/** UTC-миллисекунды → салонская дата 'YYYY-MM-DD' */
function msToSalonDate(ms) {
  return dbToMskDate(new Date(ms).toISOString());
}

/**
 * Разовые исключения из графика на салонскую дату.
 * Запрос идёт по пересечению интервалов в UTC, а не по substr(...)=дата,
 * потому что в БД лежит UTC и салонская дата записи может отличаться
 * (например, 02:00 MSK = 23:00Z предыдущего дня).
 */
function loadBusyBlocks(masterId, dayStartMs, dayEndMs) {
  return all(
    `SELECT start_time, end_time FROM blocks
     WHERE master_id = ? AND start_time < ? AND end_time > ?`,
    [masterId, new Date(dayEndMs).toISOString(), new Date(dayStartMs).toISOString()]
  )
    .map(b => ({ start: dbToMs(b.start_time), end: dbToMs(b.end_time) }))
    .filter(iv => iv.end > iv.start);
}

/** Активные записи мастера, пересекающиеся с салонскими сутками */
function loadBusyBookings(masterId, dayStartMs, dayEndMs) {
  return all(
    `SELECT start_time, end_time FROM bookings
     WHERE master_id = ? AND status = 'active' AND force_overlap = 0
       AND start_time < ? AND end_time > ?`,
    [masterId, new Date(dayEndMs).toISOString(), new Date(dayStartMs).toISOString()]
  )
    .map(b => ({ start: dbToMs(b.start_time), end: dbToMs(b.end_time) }))
    .filter(iv => iv.end > iv.start);
}

/** Рабочие интервалы мастера в UTC-миллисекундах на салонскую дату */
function getWorkIntervals(masterId, dateStr) {
  const master = get('SELECT id, work_start, work_end, active FROM masters WHERE id = ?', [masterId]);
  if (!master || !master.active) return [];

  const dayStart = mskDateToUtcStart(dateStr);
  const schedRows = all(
    'SELECT work_start, work_end FROM schedule WHERE master_id = ? AND day_of_week = ?',
    [masterId, salonDow(dateStr)]
  );
  const rows = schedRows.length ? schedRows : [{ work_start: master.work_start, work_end: master.work_end }];

  return rows
    .map(s => ({ start: salonToMs(dateStr, s.work_start), end: salonToMs(dateStr, s.work_end) }))
    .filter(iv => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);
}

/** День недели салонской даты: 0=вс … 6=сб */
function salonDow(dateStr) {
  const d = mskDateToUtcStart(dateStr);
  // сдвигаем на полдень салона, чтобы UTC-дата не влияла на день недели
  const noon = new Date(d.getTime() + 12 * 3600000);
  return new Date(noon.getTime() + 180 * 60000).getUTCDay();
}

/** Границы салонских суток в UTC-миллисекундах */
function salonDayBounds(dateStr) {
  const start = mskDateToUtcStart(dateStr).getTime();
  return { start, end: start + 24 * 3600000 };
}

/** Вычитает занятые интервалы из рабочих */
function subtractBusy(intervals, busy) {
  let free = intervals.slice();
  for (const b of busy.slice().sort((x, y) => x.start - y.start)) {
    const next = [];
    for (const iv of free) {
      if (b.end <= iv.start || b.start >= iv.end) { next.push(iv); continue; }
      if (b.start <= iv.start && b.end >= iv.end) continue;
      if (b.start > iv.start) next.push({ start: iv.start, end: b.start });
      if (b.end < iv.end) next.push({ start: b.end, end: iv.end });
    }
    free = next;
  }
  return free.filter(iv => iv.end > iv.start).sort((a, b) => a.start - b.start);
}

// ============ Публичные функции ============

/** Свободные слоты (ISO UTC) для мастера на салонскую дату */
function getFreeSlots(masterId, dateStr, durationMin) {
  const intervals = getWorkIntervals(masterId, dateStr);
  if (!intervals.length) return [];
  const { start: ds, end: de } = salonDayBounds(dateStr);
  const busy = loadBusyBookings(masterId, ds, de).concat(loadBusyBlocks(masterId, ds, de));
  const free = subtractBusy(intervals, busy);

  const durMs = durationMin * 60000;
  const slots = [];
  for (const iv of free) {
    for (let t = iv.start; t + durMs <= iv.end; t += 30 * 60000) {
      slots.push(new Date(t).toISOString());
    }
  }
  return slots;
}

/** Свободные интервалы (ISO UTC) — для отрисовки в календаре */
function getFreeIntervals(masterId, dateStr) {
  const intervals = getWorkIntervals(masterId, dateStr);
  if (!intervals.length) return [];
  const { start: ds, end: de } = salonDayBounds(dateStr);
  const busy = loadBusyBookings(masterId, ds, de).concat(loadBusyBlocks(masterId, ds, de));
  return subtractBusy(intervals, busy).map(iv => ({
    start: new Date(iv.start).toISOString(),
    end: new Date(iv.end).toISOString(),
  }));
}

/**
 * 30-минутная сетка со статусами.
 * available — можно записаться;
 * busy — занято записью или исключением;
 * tooshort — вписывается в смену, но услуга не помещается до её конца.
 */
function getSlotStatuses(masterId, dateStr, durationMin) {
  const intervals = getWorkIntervals(masterId, dateStr);
  if (!intervals.length) return [];
  const { start: ds, end: de } = salonDayBounds(dateStr);
  const busy = loadBusyBookings(masterId, ds, de).concat(loadBusyBlocks(masterId, ds, de));

  const durMs = durationMin * 60000;
  const statuses = [];
  for (const iv of intervals) {
    for (let t = iv.start; t + 30 * 60000 <= iv.end; t += 30 * 60000) {
      const isBusy = busy.some(b => t < b.end && t + 30 * 60000 > b.start);
      const fits = t + durMs <= iv.end;
      // Время слота показываем в салонской зоне — клиент выбирает «10:00»,
      // а не «07:00», независимо от того, в каком часовом поясе он находится.
      const shifted = new Date(t + 180 * 60000);
      const hhmm = String(shifted.getUTCHours()).padStart(2, '0') + ':' + String(shifted.getUTCMinutes()).padStart(2, '0');
      statuses.push({ time: hhmm, status: isBusy ? 'busy' : fits ? 'available' : 'tooshort' });
    }
  }
  return statuses;
}

module.exports = { getFreeSlots, getFreeIntervals, getSlotStatuses, salonDow, salonToMs, dbToMs };
