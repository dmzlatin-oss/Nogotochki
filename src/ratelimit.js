// src/ratelimit.js — минимальный in-memory rate limiter (п.24)
// Ключ — IP. Окно скользящее.
module.exports = function rateLimit({ max = 20, windowMs = 900000 } = {}) {
  const hits = new Map(); // key -> [timestamps]
  // периодическая очистка
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits) {
      const filtered = arr.filter(t => now - t < windowMs);
      if (filtered.length) hits.set(k, filtered); else hits.delete(k);
    }
  }, windowMs);
  if (timer.unref) timer.unref();

  return function limiter(req, res, next) {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) {
      return res.status(429).json({ error: 'RATE_LIMIT', message: 'Слишком много запросов, попробуйте позже' });
    }
    arr.push(now);
    hits.set(key, arr);
    next();
  };
};
