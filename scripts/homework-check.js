// Сквозная проверка трёх функций бэкенда для домашки.
// Идёт напрямую на бэкенд :3000. Создаёт тестовых клиентов, проверяет
// регистрацию/вход, расчёт свободного времени, создание записи, конфликт
// слотов и права доступа. В конце отменяет тестовую запись (не мусорим в БД).
const http = require('http');
const BASE = 'http://localhost:3000';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(BASE + path);
    const r = http.request({
      host: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let json = null; try { json = JSON.parse(buf); } catch {}
        resolve({ status: res.statusCode, json, raw: buf });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const ts = () => Date.now();
const uniq = () => 'hw' + ts() + Math.floor(Math.random() * 1000);

(async () => {
  const out = {};
  const c1 = uniq() + '@example.com';
  const c2 = uniq() + '@example.com';
  const pw = 'TestPass123';

  // 1. Регистрация client1
  let r = await req('POST', '/api/auth/register', { name: 'HW Client1', email: c1, password: pw });
  out.register_c1 = { status: r.status, userId: r.json && r.json.userId };
  // 1b. Регистрация client2
  r = await req('POST', '/api/auth/register', { name: 'HW Client2', email: c2, password: pw });
  out.register_c2 = { status: r.status };

  // Вход client1 (верный пароль)
  r = await req('POST', '/api/auth/login', { email: c1, password: pw });
  out.login_ok = { status: r.status, hasToken: !!(r.json && r.json.token) };
  const t1 = r.json && r.json.token;
  // Вход client2
  r = await req('POST', '/api/auth/login', { email: c2, password: pw });
  const t2 = r.json && r.json.token;

  // Неверный пароль
  r = await req('POST', '/api/auth/login', { email: c1, password: 'WrongPass99' });
  out.login_wrong = { status: r.status, error: r.json && r.json.error };

  // 2. Расчёт свободного времени (Анна, masterId=1, 2026-08-27, услуга 1 = 60 мин)
  // Показываем на ДАТЕ С ЗАПИСЯМИ: busy 14:30-16:00 и 16:30-18:00, tooshort 18:30.
  r = await req('GET', '/api/masters/1/availability?date=2026-08-27&serviceId=1');
  out.availability_27 = { status: r.status, statuses: (r.json && r.json.slotStatuses) || null };

  // 3. Создание записи (client1, Анна, 2026-08-28 13:00–14:00 UTC) — гарантированно будущее
  const start = '2026-08-28T13:00:00Z';
  const end = '2026-08-28T14:00:00Z';
  r = await req('POST', '/api/bookings', { masterId: 1, serviceId: 1, start, end }, t1);
  out.booking_create = { status: r.status, bookingId: r.json && r.json.booking && r.json.booking.id, err: r.json && r.json.error };
  const createdId = r.json && r.json.booking && r.json.booking.id;

  // 4. Конфликт: два ОДНОВРЕМЕННЫХ запроса на свободный слот 15:00–16:00 28.08
  const cStart = '2026-08-28T15:00:00Z';
  const cEnd = '2026-08-28T16:00:00Z';
  const reqs = [
    req('POST', '/api/bookings', { masterId: 1, serviceId: 1, start: cStart, end: cEnd }, t1),
    req('POST', '/api/bookings', { masterId: 1, serviceId: 1, start: cStart, end: cEnd }, t1),
  ];
  const [a, b] = await Promise.all(reqs);
  out.conflict = {
    first: { status: a.status, error: a.json && a.json.error },
    second: { status: b.status, error: b.json && b.json.error },
  };
  const conflictCreatedId = (a.json && a.json.booking && a.json.booking.id) || (b.json && b.json.booking && b.json.booking.id);

  // Считаем: слот 15:00 на 28.08 должен стать busy после первой успешной записи.
  r = await req('GET', '/api/masters/1/availability?date=2026-08-28&serviceId=1');
  const ss = (r.json && r.json.slotStatuses) || [];
  const slot15 = ss.find((s) => s.time === '15:00');
  out.after_conflict_15 = slot15;

  // 5. Права доступа: client2 пытается открыть запись client1
  if (createdId) {
    r = await req('GET', '/api/bookings/' + createdId, null, t2);
    out.access_other = { status: r.status, error: r.json && r.json.error };
  }

  // Отменяем тестовые записи (не мусорим в БД)
  if (createdId) {
    r = await req('DELETE', '/api/bookings/' + createdId, null, t1);
    out.cleanup_main = { status: r.status, deleted: createdId };
  }
  if (conflictCreatedId) {
    r = await req('DELETE', '/api/bookings/' + conflictCreatedId, null, t1);
    out.cleanup_conflict = { status: r.status, deleted: conflictCreatedId };
  }

  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
