// Сброс паролей всех пользователей Nogotochki на «otmetka».
// Использует родной hashPassword из src/auth.js — гарантированно тот же алгоритм.
const path = require('path');
const { execSync } = require('child_process');
const { hashPassword } = require(path.join(__dirname, '..', 'src', 'auth.js'));

const DB = path.join(__dirname, '..', 'src', 'db', 'booking.db');
const PASSWORD = process.argv[2] || 'otmetka';

const sqlEscape = s => "'" + s.replace(/'/g, "''") + "'";

const users = execSync(
  `sqlite3 ${sqlEscape(DB)} "SELECT id, email FROM users ORDER BY id;"`,
  { encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

console.log(`Найдено пользователей: ${users.length}`);

let ok = 0;
for (const line of users) {
  const [id, email] = line.split('|');
  const { hash, salt, params } = hashPassword(PASSWORD);
  try {
    execSync(
      `sqlite3 ${sqlEscape(DB)} "UPDATE users SET password_hash=${sqlEscape(hash)}, ` +
      `password_salt=${sqlEscape(salt)}, password_params=${sqlEscape(params)} WHERE id=${id};"`
    );
    ok++;
    console.log(`  ✅ #${id} ${email}`);
  } catch (e) {
    console.log(`  ❌ #${id} ${email}: ${e.message.split('\n')[0]}`);
  }
}
console.log(`\nГотово: ${ok}/${users.length}. Пароль: «${PASSWORD}»`);
