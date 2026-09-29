// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import LoadingState from '@/components/shared/LoadingState';
import { formatMSK } from '@/data/studio';

interface BookingView { id: number; masterId: number; clientId: number; serviceId: number; masterName?: string; clientName?: string; serviceName?: string; start: string; end: string; status: string; }
interface AdminData {
  bookings: BookingView[];
  users: { id: number; name: string; email: string; role: string }[];
  masters: { id: number; name: string; specialization: string }[];
  services: { id: number; name: string; duration_min: number; price: number; active: number }[];
  links: { master_id: number; service_id: number }[];
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminData | null>(null);

  const load = () => {
    Promise.all([api.adminBookings(), api.adminUsers(), api.adminMasters(), api.adminServices(), api.adminMasterServices()])
      .then(([bookings, users, masters, services, links]) =>
        setData({ bookings, users, masters, services, links: links as any })
      )
      .catch(() => setData(null));
  };
  useEffect(load, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold text-ink-900">Админ-панель</span>
          <span className="text-sm text-stone-500">{user?.name}</span>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-stone-500 hover:text-ink-800">← На главную</Link>
            <button onClick={() => { logout(); navigate('/'); }} className="text-stone-400 hover:text-stone-700">Выйти</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        {!data && <LoadingState />}
        {data && (
          <>
            <Section title={`Записи (${data.bookings.length})`}>
              <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
                {data.bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>
                      #{b.id} · {b.serviceName || `услуга #${b.serviceId}`} · мастер {b.masterName || `#${b.masterId}`} · клиент {b.clientName || `#${b.clientId}`}
                    </span>
                    <span className="text-stone-500">{formatMSK(b.start)} · {b.status === 'active' ? 'активна' : b.status}</span>
                  </li>
                ))}
                {data.bookings.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">нет записей</li>}
              </ul>
            </Section>

            <Section title="Услуги и мастера (связи)">
              <div className="space-y-4">
                {data.masters.map((m) => {
                  const linked = new Set(data.links.filter((l) => l.master_id === m.id).map((l) => l.service_id));
                  return (
                    <div key={m.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                      <p className="mb-2 font-medium text-ink-900">{m.name} <span className="text-sm font-normal text-stone-500">· {m.specialization}</span></p>
                      <div className="flex flex-wrap gap-2">
                        {data.services.map((s) => {
                          const on = linked.has(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={async () => {
                                if (on) await api.adminRemoveMasterService(m.id, s.id);
                                else await api.adminAddMasterService(m.id, s.id);
                                load();
                              }}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${on ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            >
                              {s.name} {on ? '✓' : '+'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Добавить мастера">
              <AddMasterForm services={data.services} onDone={load} />
            </Section>

            <Section title="Добавить услугу">
              <AddServiceForm onDone={load} />
            </Section>

            <Section title="Создать запись (от лица клиента)">
              <AddBookingForm
                users={data.users.filter((u) => u.role === 'client')}
                masters={data.masters}
                services={data.services}
                onDone={load}
              />
            </Section>

            <Section title={`Пользователи (${data.users.length})`}>
              <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
                {data.users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{u.name} · {u.email}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{u.role}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`Мастера (${data.masters.length})`}>
              <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
                {data.masters.map((m) => (
                  <li key={m.id} className="px-4 py-3 text-sm">{m.name} · {m.specialization}</li>
                ))}
              </ul>
            </Section>

            <Section title={`Услуги (${data.services.length})`}>
              <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
                {data.services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{s.name}</span>
                    <span className="text-stone-500">{s.duration_min} мин · {s.price} ₽</span>
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function AddMasterForm({ services, onDone }: { services: { id: number; name: string }[]; onDone: () => void }) {
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.adminCreateMaster({ name, specialization: spec, serviceIds: picked });
      setName(''); setSpec(''); setPicked([]);
      onDone();
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя мастера" className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required />
        <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Специализация" className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" />
      </div>
      <div className="flex flex-wrap gap-2">
        {services.map((s) => (
          <button type="button" key={s.id} onClick={() => toggle(s.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${picked.includes(s.id) ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
            {s.name}
          </button>
        ))}
      </div>
      <button type="submit" disabled={busy} className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? 'Добавляем…' : 'Добавить мастера'}
      </button>
    </form>
  );
}

function AddServiceForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [dur, setDur] = useState('60');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setBusy(true);
    try {
      await api.adminCreateService({ name, description: desc, duration_min: Number(dur), price: Number(price) });
      setName(''); setDesc(''); setPrice('');
      onDone();
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название услуги" className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required />
        <input value={dur} onChange={(e) => setDur(e.target.value)} placeholder="Длит. (мин)" className="w-28 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Цена (₽)" className="w-32 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required />
      </div>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Описание" className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" />
      <button type="submit" disabled={busy} className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? 'Добавляем…' : 'Добавить услугу'}
      </button>
    </form>
  );
}

function AddBookingForm({ users, masters, services, onDone }: {
  users: { id: number; name: string }[];
  masters: { id: number; name: string; serviceIds?: number[] }[];
  services: { id: number; name: string; duration_min: number }[];
  onDone: () => void;
}) {
  const [clientId, setClientId] = useState<number | ''>('');
  const [masterId, setMasterId] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [forceOverlap, setForceOverlap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!clientId || !masterId || !serviceId || !date || !time) {
      setErr('Заполните все поля');
      return;
    }
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    const start = `${date}T${time}:00Z`;
    const end = new Date(new Date(start).getTime() + svc.duration_min * 60000).toISOString();
    setBusy(true);
    try {
      await api.adminCreateBooking({ clientId: Number(clientId), masterId: Number(masterId), serviceId: Number(serviceId), start, end, forceOverlap });
      setDate(''); setTime(''); setForceOverlap(false);
      onDone();
    } catch (e: any) {
      setErr(e.message || 'Не удалось создать запись');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={clientId} onChange={(e) => setClientId(Number(e.target.value))} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required>
          <option value="">Клиент…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={masterId} onChange={(e) => setMasterId(Number(e.target.value))} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required>
          <option value="">Мастер…</option>
          {masters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))} className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required>
          <option value="">Услуга…</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex gap-3">
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required />
          <input value={time} onChange={(e) => setTime(e.target.value)} type="time" className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400" required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={forceOverlap} onChange={(e) => setForceOverlap(e.target.checked)} />
        Разрешить пересечение (если время занято)
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={busy} className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? 'Создаём…' : 'Создать запись'}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}
