// src/middleware.js — авторизация и проверка ролей
const { all, get } = require('./db');
const { hashToken } = require('./auth');

// Извлечь токен из заголовка Authorization: Bearer xxx
function extractToken(req) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// Проверяет токен: существует хеш в БД, не истёк. Возвращает user или null.
function authenticateToken(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Требуется авторизация' });
  const tokenHash = hashToken(token);
  const row = get('SELECT t.user_id, t.expires_at, u.role FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ?', [tokenHash]);
  if (!row) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Недействительный токен' });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    // просрочен — удаляем
    require('./db').run('DELETE FROM tokens WHERE token_hash = ?', [tokenHash]);
    return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Срок действия сессии истёк' });
  }
  req.user = { id: row.user_id, role: row.role };
  next();
}

// Требовать конкретную роль (или одну из перечисленных)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Требуется авторизация' });
    // Роль определяется ТОЛЬКО по БД (req.user.role), никогда из body/query.
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Недостаточно прав' });
    }
    next();
  };
}

// Хелпер: пользователь — владелец объекта? (используется в бизнес-логике)
function isOwner(user, ownerId) {
  return Number(user.id) === Number(ownerId);
}

module.exports = { authenticateToken, requireRole, isOwner, extractToken };
