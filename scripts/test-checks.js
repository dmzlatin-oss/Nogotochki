// scripts/test-checks.js — фактические проверки (п.32)
const BASE = 'http://127.0.0.1:3000';
const api = (method, path, body, token) => new Promise((resolve) => {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  fetch(BASE + path, opts).then(async r => {
    let data; try { data = await r.json(); } catch { data = null; }
    resolve({ status: r.status, data });
  }).catch(e => resolve({ status: 0, error: e.message }));
});

(async () => {
  console.log('=== [5] Создание записи ===');
  await api('POST', '/api/auth/register', { name: 'КлиентТест', email: 'ctest@example.com', password: 'TestPass123' });
  const login = await api('POST', '/api/auth/login', { email: 'ctest@example.com', password: 'TestPass123' });
  const tok = login.data.token;
  const create = await api('POST', '/api/bookings', { masterId: 1, serviceId: 1, start: '2026-09-01T14:00:00Z', end: '2026-09-01T15:00:00Z' }, tok);
  console.log('Создание записи:', create.status, JSON.stringify(create.data));

  console.log('\n=== [6] Воспроизведение конфликта (два параллельных запроса на 15:00-16:00) ===');
  await api('POST', '/api/auth/register', { name: 'КлиентТест2', email: 'ctest2@example.com', password: 'TestPass123' });
  const loginA = await api('POST', '/api/auth/login', { email: 'ctest@example.com', password: 'TestPass123' });
  const loginB = await api('POST', '/api/auth/login', { email: 'ctest2@example.com', password: 'TestPass123' });
  const tokA = loginA.data.token, tokB = loginB.data.token;
  const pA = api('POST', '/api/bookings', { masterId: 1, serviceId: 1, start: '2026-09-01T15:00:00Z', end: '2026-09-01T16:00:00Z' }, tokA);
  const pB = api('POST', '/api/bookings', { masterId: 1, serviceId: 1, start: '2026-09-01T15:00:00Z', end: '2026-09-01T16:00:00Z' }, tokB);
  const [rA, rB] = await Promise.all([pA, pB]);
  console.log('Первый (A):', rA.status, JSON.stringify(rA.data));
  console.log('Второй (B):', rB.status, JSON.stringify(rB.data));

  console.log('\n=== Активные записи в БД на 15:00-16:00 ===');
  const { execSync } = require('child_process');
  const cnt = execSync("cd /home/openclaw/.hermes/workspace/project_docs/booking-service && node -e \"const {all}=require('./src/db'); const r=all(\\\"SELECT id,status FROM bookings WHERE master_id=1 AND start_time='2026-09-01T15:00:00Z' AND status='active'\\\"); console.log('active count:', r.length)\"").toString();
  console.log(cnt.trim());

  console.log('\n=== [7] Доступ к чужой записи ===');
  const myBookings = await api('GET', '/api/bookings', null, tok);
  const bid = myBookings.data.bookings[0]?.id;
  console.log('id записи клиента A:', bid);
  const asB = await api('GET', '/api/bookings/' + bid, null, tokB);
  console.log('Клиент B -> чужая запись:', asB.status, JSON.stringify(asB.data));

  console.log('\n=== [8] Admin endpoint от обычного клиента ===');
  const asClient = await api('GET', '/api/admin/bookings', null, tok);
  console.log('Client -> /api/admin/bookings:', asClient.status, JSON.stringify(asClient.data));

  const adminLogin = await api('POST', '/api/auth/login', { email: 'admin@example.com', password: 'AdminPass123' });
  const adminTok = adminLogin.data.token;
  const asAdmin = await api('GET', '/api/admin/bookings', null, adminTok);
  console.log('Admin -> /api/admin/bookings:', asAdmin.status, '| bookings:', asAdmin.data.bookings?.length);
})();
