// migrate-utc.js — перевод существующих записей и исключений в честный UTC.
//
// До 30.09.2026 время в БД было «наивным»: строка '2026-10-01T10:00:00.000Z'
// означала 10:00 ПО МОСКВЕ. Теперь в БД должен лежать честный UTC.
//
// Скрипт ОДНОРАЗОВЫЙ и применяется ко всем текущим строкам: на момент запуска
// в базе нет ни одной новой UTC-записи, поэтому каждую строку безусловно
// трактуем как салонское время и переводим в UTC (наивное MSK → UTC = −3ч).
// Запускать повторно НЕЛЬЗЯ — он сдвинет данные второй раз на 3 часа.
const { run, all } = require('./src/db');

const DRY = process.argv.includes('--dry');
const OFFSET_MIN = 180; // MSK = UTC+3

function naiveToUtc(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(str));
  if (!m) return null;
  const [, y, mo, da, h, mi, se = '0'] = m;
  const ms = Date.UTC(+y, +mo - 1, +da, +h, +mi, +se) - OFFSET_MIN * 60000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

console.log(DRY ? '=== СУХОЙ ПРОГОН (ничего не меняется) ===' : '=== КОНВЕРТАЦИЯ НАИВНОГО MSK → UTC ===');
let n = 0, bad = 0;

// Записи #4 и #5 созданы мной 30.09.2026 через API уже в UTC (после обнаружения
// бага) — их конвертировать нельзя, иначе сдвинутся ещё раз. Их удаляю.
const TEST_IDS = [4, 5];
if (!DRY) {
  for (const id of TEST_IDS) {
    const exists = all(`SELECT id FROM bookings WHERE id = ?`, [id]);
    if (exists.length) { run(`DELETE FROM bookings WHERE id = ?`, [id]); console.log(`  удалена тестовая запись #${id}`); }
  }
}
console.log(TEST_IDS.length ? `  (пропускаю тестовые записи: ${TEST_IDS.join(', ')})` : '');

for (const table of ['bookings', 'blocks']) {
  const rows = all(`SELECT id, start_time, end_time FROM ${table}`);
  if (!rows.length) { console.log(`  ${table}: пусто`); continue; }
  console.log(`  ${table}: ${rows.length} строк`);
  for (const b of rows) {
    if (table === 'bookings' && TEST_IDS.includes(b.id)) continue;
    const sd = naiveToUtc(b.start_time);
    const ed = naiveToUtc(b.end_time);
    if (!sd || !ed) { console.log(`    ⚠️  #${b.id} не разобрать: ${b.start_time}`); bad++; continue; }
    const newS = sd.toISOString();
    const newE = ed.toISOString();
    console.log(`    #${b.id}: ${b.start_time} → ${newS}`);
    if (!DRY) run(`UPDATE ${table} SET start_time=?, end_time=? WHERE id=?`, [newS, newE, b.id]);
    n++;
  }
}

console.log(`\nКонвертировано: ${n}, пропущено: ${bad}`);
if (DRY) console.log('Запусти без --dry, чтобы применить. Повторный запуск сдвинет данные ещё раз!');
