import type { Service, Master, TimeSlot } from '@/types/booking';

// Информация о студии (статичная, не из БД)
export const studio = {
  name: 'Ноготочки',
  tagline: 'Маникюр, наращивание, дизайн ногтя и забота о бровях',
  description:
    'Студия маникюра и бровей «Ноготочки». Профессиональный маникюр с гель-лаком, наращивание и дизайн ногтя, коррекция и окрашивание бровей, ламинирование — всё для ухода за вашей красотой.',
  address: 'ул. Тверская, 12, Москва',
  hours: 'Вторник–суббота, 10:00–20:00',
};

export const heroImage =
  'https://images.pexels.com/photos/13068377/pexels-photo-13068377.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

// Услуги и мастера теперь приходят с backend.
export const services: Service[] = [];
export const masters: Master[] = [];

export function getService(id: string | null): Service | undefined {
  return undefined;
}
export function getMaster(id: string | null): Master | undefined {
  return undefined;
};

// Форматирование даты для отображения в интерфейсе
export function formatDateLabel(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Демо-даты для отладки (используются в BookingPage)
export function getDemoDates(): { date: string; time: string }[] {
  return [
    { date: '2026-10-05', time: '10:00' },
    { date: '2026-10-05', time: '11:30' },
    { date: '2026-10-06', time: '10:00' },
    { date: '2026-10-06', time: '14:00' },
    { date: '2026-10-07', time: '11:00' },
  ];
}

// Форматирование времени в московском часовом поясе (UTC+3)
export function formatMSK(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  // UTC+3 = UTC+3 часа
  const utc = d.getTime() + (3 * 60 * 60 * 1000);
  const msk = new Date(utc);
  const day = String(msk.getUTCDate()).padStart(2, '0');
  const month = String(msk.getUTCMonth() + 1).padStart(2, '0');
  const year = msk.getUTCFullYear();
  const hours = String(msk.getUTCHours()).padStart(2, '0');
  const minutes = String(msk.getUTCMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Только время (часы:минуты) в московском часовом поясе
export function formatMSKTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const utc = d.getTime() + (3 * 60 * 60 * 1000);
  const msk = new Date(utc);
  const hours = String(msk.getUTCHours()).padStart(2, '0');
  const minutes = String(msk.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

