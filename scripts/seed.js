// scripts/seed.js — тестовые/демо-данные для студии «Ноготочки»
// Запуск: node scripts/seed.js
// ВСЕ данные по ТЗ: 6 услуг, 3 мастера, расписание, блокировки.
const { run, get, all } = require('../src/db');
const auth = require('../src/auth');

function upsertUser({ name, email, password, role }) {
  const ex = get('SELECT id FROM users WHERE email = ?', [email]);
  if (ex) return ex.id;
  const { hash, salt, params } = auth.hashPassword(password);
  const r = run('INSERT INTO users (name, email, password_hash, password_salt, password_params, role) VALUES (?,?,?,?,?,?)',
    [name, email, hash, salt, params, role]);
  return Number(r.lastInsertRowid);
}

function upsertService({ name, description, duration_min, price }) {
  const ex = get('SELECT id FROM services WHERE name = ?', [name]);
  if (ex) return ex.id;
  const r = run('INSERT INTO services (name, description, duration_min, price, active) VALUES (?,?,?,?,1)',
    [name, description, duration_min, price]);
  return Number(r.lastInsertRowid);
}

function upsertMaster({ user_id, name, specialization, photo_url, work_start, work_end }) {
  const ex = get('SELECT id FROM masters WHERE name = ?', [name]);
  if (ex) return ex.id;
  const r = run('INSERT INTO masters (user_id, name, specialization, photo_url, work_start, work_end, active) VALUES (?,?,?,?,?,?,1)',
    [user_id, name, specialization, photo_url, work_start, work_end]);
  return Number(r.lastInsertRowid);
}

function upsertMasterService(masterId, serviceId) {
  const ex = get('SELECT id FROM master_services WHERE master_id = ? AND service_id = ?', [masterId, serviceId]);
  if (ex) return;
  run('INSERT INTO master_services (master_id, service_id) VALUES (?, ?)', [masterId, serviceId]);
}

function upsertSchedule(masterId, dayOfWeek, workStart, workEnd) {
  const ex = get('SELECT id FROM schedule WHERE master_id = ? AND day_of_week = ?', [masterId, dayOfWeek]);
  if (ex) {
    run('UPDATE schedule SET work_start = ?, work_end = ? WHERE id = ?', [workStart, workEnd, ex.id]);
    return;
  }
  run('INSERT INTO schedule (master_id, day_of_week, work_start, work_end) VALUES (?,?,?,?)',
    [masterId, dayOfWeek, workStart, workEnd]);
}

// Блокировки хранятся как start_time/end_time в UTC ISO (а не day_of_week)
// Используем конкретные даты, соответствующие нужным дням недели из ТЗ:
// - Анна: четверг 13:00-14:00 → 2026-10-01 (четверг)
// - Марина: пятница 15:00-17:00 → 2026-10-02 (пятница)
// - Елена: суббота весь день → 2026-10-03 (суббота)
function upsertBlock(masterId, startTime, endTime, reason) {
  const ex = get('SELECT id FROM blocks WHERE master_id = ? AND start_time = ? AND end_time = ?',
    [masterId, startTime, endTime]);
  if (!ex) {
    run('INSERT INTO blocks (master_id, start_time, end_time, reason) VALUES (?,?,?,?)',
      [masterId, startTime, endTime, reason || null]);
  }
}

const OLD_EMAILS = ['admin@example.com', 'clienta@example.com', 'clientb@example.com', 'anna@example.com', 'elena@example.com'];

console.log('=== Seed for Ноготочки ===');

// Очистка старых данных
for (const email of OLD_EMAILS) {
  run('DELETE FROM users WHERE email = ?', [email]);
}
run('DELETE FROM bookings');
run('DELETE FROM blocks');
run('DELETE FROM master_services');
run('DELETE FROM schedule');
run('DELETE FROM masters');
run('DELETE FROM services');

// ---- Пользователи ----
const adminId = upsertUser({ name: 'Администратор', email: 'admin@nogotochki.local', password: 'TestPass123', role: 'admin' });
const testClient1 = upsertUser({ name: 'Ирина Петрова', email: 'irina@test.local', password: 'TestPass123', role: 'client' });
const testClient2 = upsertUser({ name: 'Ольга Соколова', email: 'olga@test.local', password: 'TestPass123', role: 'client' });
const testClient3 = upsertUser({ name: 'Дарья Волкова', email: 'darya@test.local', password: 'TestPass123', role: 'client' });
const masterUserAnna = upsertUser({ name: 'Анна Ковалева', email: 'anna@nogotochki.local', password: 'MasterPass123', role: 'master' });
const masterUserMarina = upsertUser({ name: 'Марина Орлова', email: 'marina@nogotochki.local', password: 'MasterPass123', role: 'master' });
const masterUserElena = upsertUser({ name: 'Елена Смирнова', email: 'elena@nogotochki.local', password: 'MasterPass123', role: 'master' });
console.log('Users:', { adminId, testClient1, testClient2, testClient3, masterUserAnna, masterUserMarina, masterUserElena });

// ---- Услуги (6 штук по ТЗ) ----
const s1 = upsertService({ name: 'Маникюр с покрытием гель-лаком', description: 'Маникюр с покрытием гель-лаком. Длительность: 1,5 часа', duration_min: 90, price: 1800 });
const s2 = upsertService({ name: 'Маникюр и педикюр', description: 'Маникюр и педикюр. Длительность: 2,5 часа', duration_min: 150, price: 3200 });
const s3 = upsertService({ name: 'Наращивание ногтя', description: 'Наращивание ногтя. Длительность: 2,5 часа', duration_min: 150, price: 2800 });
const s4 = upsertService({ name: 'Дизайн ногтя', description: 'Дизайн ногтя (2 ногтя). Дополнительное время: +15-30 минут. Цена: 300 рублей за 2 ногтя', duration_min: 30, price: 300 });
const s5 = upsertService({ name: 'Коррекция и окрашивание бровей', description: 'Коррекция и окрашивание бровей. Длительность: 40 минут', duration_min: 40, price: 1200 });
const s6 = upsertService({ name: 'Ламинирование бровей', description: 'Ламинирование бровей. Длительность: 1 час', duration_min: 60, price: 1800 });
console.log('Services:', { s1, s2, s3, s4, s5, s6 });

// ---- Мастера (3 человека по ТЗ) ----
const mAnna = upsertMaster({
  user_id: masterUserAnna,
  name: 'Анна Ковалева',
  specialization: 'Маникюр, маникюр+педикюр, наращивание, дизайн ногтя',
  photo_url: 'https://images.pexels.com/photos/16160897/pexels-photo-16160897.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  work_start: '10:00',
  work_end: '18:00'
});
const mMarina = upsertMaster({
  user_id: masterUserMarina,
  name: 'Марина Орлова',
  specialization: 'Коррекция и окрашивание бровей, ламинирование бровей',
  photo_url: 'https://images.pexels.com/photos/29995629/pexels-photo-29995629.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  work_start: '11:00',
  work_end: '20:00'
});
const mElena = upsertMaster({
  user_id: masterUserElena,
  name: 'Елена Смирнова',
  specialization: 'Маникюр с покрытием гель-лаком, наращивание ногтя, коррекция и окрашивание бровей, ламинирование бровей',
  photo_url: 'https://images.pexels.com/photos/19279541/pexels-photo-19279541.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  work_start: '10:00',
  work_end: '19:00'
});
console.log('Masters:', { mAnna, mMarina, mElena });

// ---- Мастер-услуги (по ТЗ) ----
upsertMasterService(mAnna, s1);
upsertMasterService(mAnna, s2);
upsertMasterService(mAnna, s3);
upsertMasterService(mAnna, s4);
upsertMasterService(mMarina, s5);
upsertMasterService(mMarina, s6);
upsertMasterService(mElena, s1);
upsertMasterService(mElena, s3);
upsertMasterService(mElena, s5);
upsertMasterService(mElena, s6);
console.log('Master-services linked.');

// ---- Расписание (по ТЗ) ----
// Анна: вторник-четверг, пятница 10:00-18:00 (дни: 2,3,4,5)
for (const dow of [2, 3, 4, 5]) upsertSchedule(mAnna, dow, '10:00', '18:00');
// Марина: среда-суббота 11:00-20:00 (дни: 3,4,5,6)
for (const dow of [3, 4, 5, 6]) upsertSchedule(mMarina, dow, '11:00', '20:00');
// Елена: вторник, четверг, суббота 10:00-19:00 (дни: 2,4,6)
for (const dow of [2, 4, 6]) upsertSchedule(mElena, dow, '10:00', '19:00');
console.log('Schedule seeded.');

// ---- Блокировки (по ТЗ) ----
// Используем UTC даты: часовой пояс салона предполагаем UTC для простоты
// Анна: четверг 13:00-14:00 (2026-10-01 — четверг)
upsertBlock(mAnna, '2026-10-01T13:00:00Z', '2026-10-01T14:00:00Z', 'Блокировка по ТЗ: четверг 13:00-14:00');
// Марина: пятница 15:00-17:00 (2026-10-02 — пятница)
upsertBlock(mMarina, '2026-10-02T15:00:00Z', '2026-10-02T17:00:00Z', 'Блокировка по ТЗ: пятница 15:00-17:00');
// Елена: суббота весь день (2026-10-03 — суббота)
upsertBlock(mElena, '2026-10-03T10:00:00Z', '2026-10-03T19:00:00Z', 'Блокировка по ТЗ: суббота весь день');
console.log('Blocks seeded.');

// ---- Демо-запись (через 2 дня, чтобы не мешала тестированию) ----
const demoDate = new Date();
demoDate.setDate(demoDate.getDate() + 2);
const dateStr = demoDate.toISOString().slice(0, 10);
const existing = get('SELECT id FROM bookings WHERE master_id = ? AND date(start_time) = date(?)', [mAnna, dateStr + 'T00:00:00Z']);
if (!existing) {
  run('INSERT INTO bookings (client_id, master_id, service_id, start_time, end_time, status, created_by) VALUES (?,?,?,?,?,?,?)',
    [testClient1, mAnna, s1, dateStr + 'T11:00:00Z', dateStr + 'T12:30:00Z', 'active', testClient1]);
  console.log(`Seeded demo booking: ${dateStr} 11:00-12:30 (Анна Ковалева, маникюр с покрытием)`);
} else {
  console.log('Demo booking already exists for', dateStr);
}

console.log('=== Seed done ===');


