// src/availability.js — динамический расчёт свободного времени (п.14)
// Время салона = Europe/Moscow, но хранится и передаётся как «наивное» (без реального TZ-сдвига):
// строка 'YYYY-MM-DDTHH:MM:SS' означает время салона. Суффикс 'Z' в БД игнорируем
// (трактуем как наивное MSK-время), чтобы не было рассинхрона между слотами и записями.
const { all, get } = require('./db');

function naiveTime(iso) {
  // убираем суффикс TZ (Z или +03:00) и миллисекунды, оставляем 'YYYY-MM-DDTHH:MM:SS'
  return iso.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '').replace('.000', '');
}
function toNaive(dateStr, hhmm) {
  return `${dateStr}T${hhmm}:00`;
}
// Парсим наивное время как UTC (чтобы не зависеть от TZ сервера)
function parseNaive(iso) {
  return new Date(iso + 'Z');
}

// Возвращает список свободных слотов (наивные ISO 'YYYY-MM-DDTHH:MM:00') для мастера на дату.
function getFreeSlots(masterId, dateStr, durationMin) {
  const master = get('SELECT id, work_start, work_end, active FROM masters WHERE id = ?', [masterId]);
  if (!master || !master.active) return [];

  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay(); // 0=вс..6=сб (по дате, без TZ)
  const schedRows = all('SELECT work_start, work_end FROM schedule WHERE master_id = ? AND day_of_week = ?', [masterId, dow]);
  const intervals = (schedRows.length ? schedRows : [{ work_start: master.work_start, work_end: master.work_end }])
    .map(s => ({
      start: parseNaive(toNaive(dateStr, s.work_start)).getTime(),
      end: parseNaive(toNaive(dateStr, s.work_end)).getTime(),
    }))
    .filter(iv => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);

  if (!intervals.length) return [];

  // Занятые: активные записи + блокировки (наивное время, сравниваем по дате как строке)
  const busy = [];
  const bookings = all(
    `SELECT start_time, end_time FROM bookings
     WHERE master_id = ? AND status = 'active'
       AND substr(start_time,1,10) = ?
       AND force_overlap = 0`,
    [masterId, dateStr]
  );
  for (const b of bookings) {
    busy.push({ start: parseNaive(naiveTime(b.start_time)).getTime(), end: parseNaive(naiveTime(b.end_time)).getTime() });
  }
  const blocks = all(
    `SELECT start_time, end_time FROM blocks WHERE master_id = ? AND substr(start_time,1,10) = ?`,
    [masterId, dateStr]
  );
  for (const b of blocks) {
    busy.push({ start: parseNaive(naiveTime(b.start_time)).getTime(), end: parseNaive(naiveTime(b.end_time)).getTime() });
  }
  busy.sort((a, b) => a.start - b.start);

  // Вычитаем занятые из рабочих интервалов
  let free = intervals;
  for (const b of busy) {
    const next = [];
    for (const iv of free) {
      if (b.end <= iv.start || b.start >= iv.end) { next.push(iv); continue; }
      if (b.start <= iv.start && b.end >= iv.end) continue;
      if (b.start > iv.start) next.push({ start: iv.start, end: Math.min(iv.end, b.start) });
      if (b.end < iv.end) next.push({ start: Math.max(iv.start, b.end), end: iv.end });
    }
    free = next;
  }
  free = free.filter(iv => iv.end > iv.start);

  // Нарезаем на слоты по durationMin
  const durMs = durationMin * 60000;
  const slots = [];
  for (const iv of free) {
    let t = iv.start;
    while (t + durMs <= iv.end) {
      slots.push(new Date(t).toISOString().slice(0, 19)); // 'YYYY-MM-DDTHH:MM:SS' (наивное)
      t += durMs;
    }
  }
  return slots;
}

function getFreeIntervals(masterId, dateStr) {
  const master = get('SELECT id, work_start, work_end, active FROM masters WHERE id = ?', [masterId]);
  if (!master || !master.active) return [];
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  const schedRows = all('SELECT work_start, work_end FROM schedule WHERE master_id = ? AND day_of_week = ?', [masterId, dow]);
  const intervals = (schedRows.length ? schedRows : [{ work_start: master.work_start, work_end: master.work_end }])
    .map(s => ({ start: parseNaive(toNaive(dateStr, s.work_start)).getTime(), end: parseNaive(toNaive(dateStr, s.work_end)).getTime() }))
    .filter(iv => iv.end > iv.start).sort((a, b) => a.start - b.start);
  if (!intervals.length) return [];
  const busy = [];
  const bookings = all(`SELECT start_time, end_time FROM bookings WHERE master_id = ? AND status='active' AND substr(start_time,1,10)=? AND force_overlap=0`, [masterId, dateStr]);
  for (const b of bookings) busy.push({ start: parseNaive(naiveTime(b.start_time)).getTime(), end: parseNaive(naiveTime(b.end_time)).getTime() });
  const blocks = all(`SELECT start_time, end_time FROM blocks WHERE master_id = ? AND substr(start_time,1,10)=?`, [masterId, dateStr]);
  for (const b of blocks) busy.push({ start: parseNaive(naiveTime(b.start_time)).getTime(), end: parseNaive(naiveTime(b.end_time)).getTime() });
  busy.sort((a, b) => a.start - b.start);
  let free = intervals;
  for (const b of busy) {
    const next = [];
    for (const iv of free) {
      if (b.end <= iv.start || b.start >= iv.end) { next.push(iv); continue; }
      if (b.start <= iv.start && b.end >= iv.end) continue;
      if (b.start > iv.start) next.push({ start: iv.start, end: Math.min(iv.end, b.start) });
      if (b.end < iv.end) next.push({ start: Math.max(iv.start, b.end), end: iv.end });
    }
    free = next;
  }
  return free.filter(iv => iv.end > iv.start).map(iv => ({ start: new Date(iv.start).toISOString().slice(0, 19), end: new Date(iv.end).toISOString().slice(0, 19) }));
}

// Готовая 30-мин сетка слотов со статусами (п.14). Single Source of Truth:
// занятость считается на бэкенде, фронт лишь рисует. Три статуса:
//   'available' — ячейка свободна от записей И услуга длительностью durationMin целиком
//                 вмещается до конца рабочего интервала (не выходит за work_end).
//   'busy'      — ячейка реально пересекает активную запись или блокировку (есть бронь).
//   'tooshort'  — ячейка свободна от записей, но услуга durationMin не вмещается до конца
//                 смены (закончилась бы после work_end). Не ложное «занято» — просто не хватает времени.
function getSlotStatuses(masterId, dateStr, durationMin) {
  const master = get('SELECT id, work_start, work_end, active FROM masters WHERE id = ?', [masterId]);
  if (!master || !master.active) return [];
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  const schedRows = all('SELECT work_start, work_end FROM schedule WHERE master_id = ? AND day_of_week = ?', [masterId, dow]);
  const intervals = (schedRows.length ? schedRows : [{ work_start: master.work_start, work_end: master.work_end }])
    .map(s => ({ start: parseNaive(toNaive(dateStr, s.work_start)).getTime(), end: parseNaive(toNaive(dateStr, s.work_end)).getTime() }))
    .filter(iv => iv.end > iv.start).sort((a, b) => a.start - b.start);
  if (!intervals.length) return [];
  const busy = [];
  const bookings = all(
    `SELECT start_time, end_time FROM bookings
     WHERE master_id = ? AND status = 'active' AND substr(start_time,1,10) = ? AND force_overlap = 0`,
    [masterId, dateStr]
  );
  for (const b of bookings) busy.push({ start: parseNaive(naiveTime(b.start_time)).getTime(), end: parseNaive(naiveTime(b.end_time)).getTime() });
  const blocks = all(
    `SELECT start_time, end_time FROM blocks WHERE master_id = ? AND substr(start_time,1,10) = ?`,
    [masterId, dateStr]
  );
  for (const b of blocks) busy.push({ start: parseNaive(naiveTime(b.start_time)).getTime(), end: parseNaive(naiveTime(b.end_time)).getTime() });
  busy.sort((a, b) => a.start - b.start);

  const durMs = durationMin * 60000;
  const statuses = [];
  for (const iv of intervals) {
    // шаг 30 минут, в рамках рабочего интервала
    for (let t = iv.start; t + 30 * 60000 <= iv.end; t += 30 * 60000) {
      const slotEnd = t + durMs;
      const conflicts = busy.some(b => t < b.end && slotEnd > b.start); // реальный конфликт с бронью
      let status;
      if (conflicts) status = 'busy';
      else if (slotEnd > iv.end) status = 'tooshort'; // свободно, но услуга не влезает до конца смены
      else status = 'available';
      const hh = String(Math.floor(t / 3600000) % 24).padStart(2, '0');
      const mm = String(Math.floor((t % 3600000) / 60000)).padStart(2, '0');
      statuses.push({ time: `${hh}:${mm}`, status });
    }
  }
  return statuses;
}

module.exports = { getFreeSlots, getFreeIntervals, getSlotStatuses };
