// migrations/init.js — применяет схему и триггеры (idempotent через IF NOT EXISTS)
// Сама схема и триггеры описаны в src/db/index.js (вызывается при require).
// Этот скрипт просто инициализирует БД (создаёт файл и таблицы).
require('../src/db');
console.log('База данных инициализирована (таблицы и триггеры созданы, если их не было).');
console.log('Путь к БД:', require('../src/db').DB_PATH);
