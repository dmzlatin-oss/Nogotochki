// src/time.js — единая работа со временем салона.
//
// Правило (30.09.2026):
//   * В БД хранится честный UTC: 'YYYY-MM-DDTHH:MM:SS.sssZ'.
//   * Клиент присылает салонское время: 'YYYY-MM-DDTHH:MM' или
//     'YYYY-MM-DDTHH:MM:SS' БЕЗ суффикса — это всегда Europe/Moscow.
//   * Наружу (slots, bookings) отдаём UTC с суффиксом Z.
//   * Интерфейс показывает московское время с явной подписью «МСК»
//     и предупреждением, что это время салона, а не местное время клиента.
//
// Почему нельзя полагаться на new Date('2026-10-08T12:00:00'):
//   без суффикса JS трактует строку как локальное время сервера.
//   На VPS TZ=Europe/Moscow, поэтому 12:00 превращалось в 09:00Z — запись
//   сохранялась на 3 часа раньше и не блокировала свой слот.
//   Здесь строка разбирается вручную, без зависимости от TZ сервера.

// Смещение салона от UTC в минутах. Россия живёт на UTC+3 круглый год
// (перехода на летнее время нет с 2014 года), поэтому фиксированное
// смещение корректно и не требует библиотеки часовых поясов.
const SALON_OFFSET_MIN = 180; // UTC+3

const MSK = 'MSK';

function pad(n, w = 2) {
  return String(n).padStart(w, '0');
}

/** 'YYYY-MM-DD' из UTC-Date → московская дата */
function toMskDate(utcDate) {
  const d = new Date(utcDate.getTime() + SALON_OFFSET_MIN * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 'YYYY-MM-DD HH:MM' из UTC-Date → московское время */
function toMskDateTime(utcDate) {
  const d = new Date(utcDate.getTime() + SALON_OFFSET_MIN * 60000);
  return `${toMskDateStr(utcDate)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 'YYYY-MM-DDTHH:MM:SS' из UTC-Date → московское время без суффикса */
function toMskNaive(utcDate) {
  const d = new Date(utcDate.getTime() + SALON_OFFSET_MIN * 60000);
  return `${toMskDate(utcDate)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** московский день недели: 0=вс … 6=сб */
function toMskDow(utcDate) {
  const d = new Date(utcDate.getTime() + SALON_OFFSET_MIN * 60000);
  return d.getUTCDay();
}

/** Строка 'YYYY-MM-DD' (салонская дата) → UTC-Date начала суток */
function mskDateToUtcStart(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 0, 0, 0) - SALON_OFFSET_MIN * 60000);
}

/**
 * Разбор времени салона из запроса в UTC-Date.
 * Принимает:
 *   'YYYY-MM-DDTHH:MM'        — салонское время, без суффикса
 *   'YYYY-MM-DDTHH:MM:SS'     — салонское время, без суффикса
 *   'YYYY-MM-DDTHH:MM:SSZ'    — уже UTC (например, из БД или с суффиксом)
 *   'YYYY-MM-DDTHH:MM:SS+03:00' / '-04:00' — явный UTC-сдвиг, уважаем как есть
 * Возвращает UTC-Date или null.
 */
function parseSalonTime(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();

  // Явный суффикс UTC или смещение — не пересчитываем, это уже абсолютное время
  if (/[Zz]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Наивное время = салонское (Europe/Moscow, UTC+3)
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  const [, y, mo, da, h, mi, se = '0'] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +da, +h, +mi, +se) - SALON_OFFSET_MIN * 60000;
  const d = new Date(utcMs);
  return isNaN(d.getTime()) ? null : d;
}

/** UTC-Date → строка для БД: 'YYYY-MM-DDTHH:MM:SS.sssZ' */
function toDbUtc(date) {
  return new Date(date.getTime()).toISOString();
}

/** UTC-Date → 'YYYY-MM-DDTHH:MM:SS' (без Z) — для SQL-сравнений substr(...,1,10) */
function toUtcNaive(date) {
  return new Date(date.getTime()).toISOString().slice(0, 19);
}

/** Строка БД → салонская дата 'YYYY-MM-DD' */
function dbToMskDate(dbStr) {
  if (!dbStr) return null;
  const d = new Date(dbStr);
  if (isNaN(d.getTime())) return String(dbStr).slice(0, 10);
  return toMskDate(d);
}

/** Строка БД → салонское время 'HH:MM' */
function dbToMskTime(dbStr) {
  if (!dbStr) return null;
  const d = new Date(dbStr);
  if (isNaN(d.getTime())) return String(dbStr).slice(11, 16);
  const shifted = new Date(d.getTime() + SALON_OFFSET_MIN * 60000);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/**
 * Строка БД → UTC-миллисекунды, с запасным разбором наивных строк.
 * После миграции в БД лежит честный UTC, но наивные строки встречаются
 * в старых бэкапах — трактуем их как салонское время.
 */
function dbToMsSafe(dbStr) {
  if (!dbStr) return NaN;
  const d = new Date(dbStr);
  if (!isNaN(d.getTime())) return d.getTime();
  return parseSalonTime(dbStr) ? parseSalonTime(dbStr).getTime() : NaN;
}

function toMskDateStr(utcDate) {
  return toMskDate(utcDate);
}

module.exports = {
  SALON_OFFSET_MIN,
  MSK,
  toMskDate,
  toMskDateTime,
  toMskNaive,
  toMskDow,
  mskDateToUtcStart,
  parseSalonTime,
  toDbUtc,
  toUtcNaive,
  dbToMskDate,
  dbToMskTime,
  dbToMsSafe,
  pad,
};
