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

// Дата для DateStrip. Раньше здесь была заглушка getDemoDates() с 5
// «демо»-записями вида {date, time}, а компонент DateStrip ожидал
// {iso, weekday, day, month}. Все поля были undefined → 5 пустых кнопок
// без дат, и выбрать время было невозможно.
export interface DemoDate {
  iso: string;
  weekday: string;
  day: string;
  month: string;
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// Ближайшие рабочие дни: студия работает вторник–суббота (вс=0, пн=1 — выходные).
export function getDemoDates(count = 7): DemoDate[] {
  const out: DemoDate[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Не предлагаем сегодняшний день, если он уже почти закончился
  if (d.getHours() >= 18) d.setDate(d.getDate() + 1);

  let guard = 0;
  while (out.length < count && guard < 60) {
    guard++;
    const wd = d.getDay();
    if (wd !== 0 && wd !== 1) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({
        iso,
        weekday: WEEKDAYS[wd],
        day: String(d.getDate()),
        month: MONTHS[d.getMonth()],
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Форматирование даты/времени салона.
//
// Бэкенд хранит и отдаёт время как «наивное» салонское с суффиксом Z
// (например "2026-10-01T13:00:00Z" = 13:00 по Москве). Раньше здесь
// дополнительно прибавлялись 3 часа, из-за чего админ-панель показывала
// блокировку «13:00–14:00» как «16:00–17:00», а слоты на клиентской форме
// (которые считает бэкенд из тех же строк) не совпадали с админкой.
//
// Слоты и график считаются бэкендом из наивного времени, поэтому и здесь
// нужно просто отбросить суффикс Z, без конвертации таймзон.
export function formatMSK(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const m = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) return `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]}`;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Только время (часы:минуты) салона — тот же наивный формат, см. formatMSK
export function formatMSKTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const m = String(isoDate).match(/[T ](\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

