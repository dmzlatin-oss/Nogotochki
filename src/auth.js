// src/auth.js — хеширование паролей (scrypt) и токены сессий
const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N (CPU/memory cost)
const SCRYPT_BLOCKSIZE = 8; // r
const SCRYPT_PARALLEL = 1;  // p

// --- Пароли (п.9, п.24) ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(
    password, salt, SCRYPT_KEYLEN,
    { N: SCRYPT_COST, r: SCRYPT_BLOCKSIZE, p: SCRYPT_PARALLEL }
  ).toString('hex');
  const params = JSON.stringify({ N: SCRYPT_COST, r: SCRYPT_BLOCKSIZE, p: SCRYPT_PARALLEL, keylen: SCRYPT_KEYLEN });
  return { hash: derived, salt, params };
}

// Возвращает true/false без утечки тайминга (используем постоянную маску сравнения)
function verifyPassword(password, salt, expectedHash, paramsJson) {
  let p = { N: SCRYPT_COST, r: SCRYPT_BLOCKSIZE, p: SCRYPT_PARALLEL, keylen: SCRYPT_KEYLEN };
  try { if (paramsJson) p = JSON.parse(paramsJson); } catch {}
  const derived = crypto.scryptSync(
    password, salt, p.keylen || SCRYPT_KEYLEN,
    { N: p.N, r: p.r, p: p.p }
  ).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// --- Токены (п.10) ---
// Сам токен = случайная строка, отдаём клиенту. В БД храним SHA-256 хеш.
const TOKEN_TTL_MS = (parseInt(process.env.TOKEN_TTL, 10) || 604800) * 1000;

function createToken() {
  return crypto.randomBytes(32).toString('base64url');
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function tokenExpiryISO() {
  return new Date(Date.now() + TOKEN_TTL_MS).toISOString();
}

module.exports = {
  hashPassword, verifyPassword,
  createToken, hashToken, tokenExpiryISO, TOKEN_TTL_MS,
  SCRYPT_KEYLEN, SCRYPT_COST, SCRYPT_BLOCKSIZE, SCRYPT_PARALLEL,
};
