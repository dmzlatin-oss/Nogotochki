// src/api/client.ts — тонкий слой к backend (Express/SQLite на :3000).
// Адаптеры: backend хранит numeric id, фронт использует string id (совместимость).
import type { Master, Service, TimeSlot } from '@/types/booking';

const TOKEN_KEY = 'booking_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

// Базовый fetch с токеном и обработкой ошибок
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Фронт раздаётся по /nogotochki/, поэтому API-вызовы идут через /nogotochki/api (nginx проксирует на :3001)
  const res = await fetch(`/nogotochki/api${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && data.message) || `HTTP ${res.status}`) as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

// ---- Адаптеры backend -> фронт ----
// backend Service {id:number, name, description, duration_min, price} -> фронт Service
function adaptService(s: any): Service {
  return {
    id: String(s.id),
    name: s.name,
    description: s.description ?? '',
    durationMin: s.duration_min,
    price: s.price,
  };
}
// backend Master {id, name, specialization, photo_url, work_start, work_end, serviceIds:[id]}
// serviceIds теперь приходит с backend (master_services), а не из презентационной подсказки.
function adaptMaster(m: any): Master {
  return {
    id: String(m.id),
    name: m.name,
    role: m.specialization ?? '',
    photo: m.photo_url ?? '',
    serviceIds: (m.serviceIds || []).map((x: any) => String(x)),
  };
}

export const api = {
  // --- Auth ---
  async register(body: { name: string; email: string; password: string }) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  },
  async login(body: { email: string; password: string }) {
    const r = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setToken(r.token);
    return r.user;
  },
  async logout() {
    try { await request('/auth/logout', { method: 'POST' }); } catch {}
    setToken(null);
  },
  async me() {
    return request<{ user: any }>('/auth/me');
  },

  // --- Справочники ---
  async getServices(): Promise<Service[]> {
    const r = await request<{ services: any[] }>('/services');
    return r.services.map(adaptService);
  },
  async getMasters(): Promise<Master[]> {
    const r = await request<{ masters: any[] }>('/masters');
    return r.masters.map(adaptMaster);
  },

  // --- Свободное время ---
  // Возвращает TimeSlot[] в формате фронта {time, status}.
  async getAvailability(masterId: string, date: string, serviceId: string): Promise<{ slots: TimeSlot[]; workStart: string; workEnd: string }> {
    const r = await request<{
      slots: string[];
      slotStatuses?: TimeSlot[];
      durationMin?: number;
      workStart?: string | null;
      workEnd?: string | null;
    }>(`/masters/${masterId}/availability?date=${date}&serviceId=${serviceId}`);
    const ws = r.workStart || '10:00';
    const we = r.workEnd || '19:00';
    // Бэкенд (п.14) отдаёт готовую 30-мин сетку slotStatuses с тремя статусами:
    // 'available' | 'busy' (реальный конфликт с бронью) | 'tooshort' (свободно, но услуга
    // не вмещается до конца смены). Фронт лишь рисует. Фолбэк — старые бэкенды.
    if (r.slotStatuses && r.slotStatuses.length) {
      return { slots: r.slotStatuses, workStart: ws, workEnd: we };
    }
    const dur = r.durationMin || 60;
    const [wsH, wsM] = ws.split(':').map(Number);
    const [weH, weM] = we.split(':').map(Number);
    const startMin = wsH * 60 + wsM;
    const endMin = weH * 60 + weM;
    const slots: TimeSlot[] = [];
    for (let c = startMin; c + 30 <= endMin; c += 30) {
      const fits = c + dur <= endMin && r.slots.some((iso) => iso.slice(11, 16) === `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`);
      const h = Math.floor(c / 60);
      const m = c % 60;
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({ time, status: fits ? 'available' : 'busy' });
    }
    return { slots, workStart: ws, workEnd: we };
  },

  // --- Запись ---
  // Фронт шлёт date (YYYY-MM-DD), time (HH:MM), masterId/serviceId (string).
  // Время интерпретируется как часовой пояс салона Europe/Moscow (UTC+3).
  async createBooking(input: {
    masterId: string;
    serviceId: string;
    date: string;
    time: string;
    durationMin: number;
    clientId?: string;
  }) {
    const startISO = `${input.date}T${input.time}:00Z`;
    const endDate = new Date(
      new Date(startISO).getTime() + input.durationMin * 60000
    ).toISOString();
    const body: any = {
      masterId: Number(input.masterId),
      serviceId: Number(input.serviceId),
      start: startISO,
      end: endDate,
    };
    if (input.clientId) body.clientId = Number(input.clientId);
    return request<{ booking: any }>('/bookings', { method: 'POST', body: JSON.stringify(body) });
  },

  // --- Кабинеты ---
  async getMyBookings() {
    const r = await request<{ bookings: any[] }>('/bookings');
    return r.bookings;
  },
  async getMasterBookings() {
    const r = await request<{ bookings: any[] }>('/bookings');
    return r.bookings;
  },
  async cancelBooking(id: number) {
    return request(`/bookings/${id}`, { method: 'DELETE' });
  },
  // Перенос записи (админ может менять время любой записи)
  async rescheduleBooking(id: number, start: string, end: string) {
    return request(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ start, end }),
    });
  },

  // --- Admin ---
  async adminBookings() {
    const r = await request<{ bookings: any[] }>('/admin/bookings');
    return r.bookings;
  },
  async adminSchedule() {
    const r = await request<{ schedule: any[] }>('/admin/schedule');
    return r.schedule;
  },
  async adminSetSchedule(masterId: number, dayOfWeek: number, workStart: string, workEnd: string) {
    return request('/admin/schedule', {
      method: 'POST',
      body: JSON.stringify({
        master_id: masterId,
        day_of_week: dayOfWeek,
        work_start: workStart,
        work_end: workEnd,
      }),
    });
  },
  async adminDeleteSchedule(id: number) {
    return request(`/admin/schedule/${id}`, { method: 'DELETE' });
  },
  async blocks() {
    const r = await request<{ blocks: any[] }>('/blocks');
    return r.blocks;
  },
  async createBlock(input: { master_id: number; start_time: string; end_time: string; reason: string }) {
    return request('/admin/blocks', { method: 'POST', body: JSON.stringify(input) });
  },
  async deleteBlock(id: number) {
    return request(`/admin/blocks/${id}`, { method: 'DELETE' });
  },
  async adminUsers() {
    const r = await request<{ users: any[] }>('/admin/users');
    return r.users;
  },
  async adminMasters() {
    const r = await request<{ masters: any[] }>('/admin/masters');
    return r.masters;
  },
  async adminServices() {
    const r = await request<{ services: any[] }>('/admin/services');
    return r.services;
  },
  async adminMasterServices() {
    const r = await request<{ links: { master_id: number; service_id: number }[] }>('/admin/master-services');
    return r.links;
  },
  async adminAddMasterService(masterId: number, serviceId: number) {
    return request('/admin/master-services', { method: 'POST', body: JSON.stringify({ masterId, serviceId }) });
  },
  async adminRemoveMasterService(masterId: number, serviceId: number) {
    return request('/admin/master-services', { method: 'DELETE', body: JSON.stringify({ masterId, serviceId }) });
  },
  async adminCreateMaster(body: { name: string; specialization?: string; photo_url?: string; work_start?: string; work_end?: string; serviceIds?: number[] }) {
    return request('/admin/masters', { method: 'POST', body: JSON.stringify(body) });
  },
  async adminCreateService(body: { name: string; description?: string; duration_min: number; price: number }) {
    return request('/admin/services', { method: 'POST', body: JSON.stringify(body) });
  },
  async adminCreateBooking(body: { clientId: number; masterId: number; serviceId: number; start: string; end: string; forceOverlap?: boolean }) {
    return request('/bookings', { method: 'POST', body: JSON.stringify(body) });
  },
};

