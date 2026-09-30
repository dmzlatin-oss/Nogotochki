// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import LoadingState from '@/components/shared/LoadingState';
import { formatMSK, formatMSKTime } from '@/data/studio';

interface BookingView { id: number; masterId: number; clientId: number; serviceId: number; masterName?: string; clientName?: string; serviceName?: string; start: string; end: string; status: string; }
interface ScheduleRow { id: number; master_id: number; master_name?: string; day_of_week: number; work_start: string; work_end: string; }
interface BlockView { id: number; master_id: number; master_name?: string; start_time: string; end_time: string; reason: string | null; }
interface AdminData {
  bookings: BookingView[];
  users: { id: number; name: string; email: string; role: string }[];
  masters: { id: number; name: string; specialization: string }[];
  services: { id: number; name: string; duration_min: number; price: number; active: number }[];
  links: { master_id: number; service_id: number }[];
  schedule: ScheduleRow[];
  blocks: BlockView[];
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

type Tab = 'bookings' | 'schedule' | 'catalog';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>('bookings');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = () => {
    Promise.all([
      api.adminBookings(), api.adminUsers(), api.adminMasters(),
      api.adminServices(), api.adminMasterServices(),
      api.adminSchedule(), api.blocks(),
    ])
      .then(([bookings, users, masters, services, links, schedule, blocks]) =>
        setData({ bookings, users, masters, services, links: links as any, schedule, blocks })
      )
      .catch(() => setData(null));
  };
  useEffect(load, []);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const run = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true);
    try {
      await fn();
      load();
      flash('ok', okText);
    } catch (e: any) {
      flash('err', e?.message || 'Не удалось выполнить');
    } finally {
      setBusy(false);
    }
  };

  const cancelBooking = (b: BookingView) => {
    if (!confirm(`Отменить запись #${b.id}?\n${b.clientName} · ${b.serviceName}\n${formatMSK(b.start)}`)) return;
    run(() => api.cancelBooking(b.id), `Запись #${b.id} отменена`);
  };

  const deleteSchedule = (s: ScheduleRow) => {
    if (!confirm(`Убрать ${DAY_NAMES[s.day_of_week]} у ${s.master_name}?\n${s.work_start}–${s.work_end}`)) return;
    run(() => api.adminDeleteSchedule(s.id), 'День убран из графика');
  };

  const deleteBlock = (bl: BlockView) => {
    if (!confirm(`Удалить исключение?\n${bl.master_name} · ${formatMSK(bl.start_time)} – ${formatMSK(bl.end_time)}\n${bl.reason || 'без причины'}`)) return;
    run(() => api.deleteBlock(bl.id), 'Исключение удалено');
  };

  const toggleCatalog = (m: { id: number; name: string }, s: { id: number; name: string }, on: boolean) => {
    run(
      () => (on
        ? request_link(m.id, s.id, 'POST')
        : request_link(m.id, s.id, 'DELETE')),
      on ? `${m.name} → ${s.name}` : `${m.name} ✕ ${s.name}`
    );
  };

  async function request_link(masterId: number, serviceId: number, method: string) {
    const res = await fetch(`/nogotochki/api/admin/master-services`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('booking_token') || ''}` },
      body: JSON.stringify({ master_id: masterId, service_id: serviceId }),
    });
    if (!res.ok && res.status !== 204) throw new Error('Ошибка сервера');
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold text-ink-900">Админ-панель</span>
          <span className="text-sm text-stone-500">{user?.name}</span>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-stone-500 hover:text-ink-800">← На главная</Link>
            <button onClick={() => { logout(); navigate('/'); }} className="text-stone-400 hover:text-ink-700">Выйти</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {/* Вкладки */}
        <nav className="flex flex-wrap gap-2">
          {([
            ['bookings', `Записи${data ? ` (${data.bookings.filter(b => b.status === 'active').length})` : ''}`],
            ['schedule', 'Расписание'],
            ['catalog', 'Услуги и мастера'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === key ? 'bg-primary-600 text-white shadow-card' : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
            {msg.text}
          </div>
        )}

        {!data && <LoadingState />}
        {data && busy && <div className="text-sm text-stone-500">Выполняется…</div>}

        {/* ЗАПИСИ */}
        {data && tab === 'bookings' && (
          <section className="space-y-3">
            <p className="text-sm text-stone-500">
              Клиент отменяет свою запись в разделе «Мои записи». Здесь администратор может отменить любую.
            </p>
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              {data.bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <b>#{b.id}</b> · {b.serviceName || `услуга #${b.serviceId}`} · {b.masterName || `#${b.masterId}`}
                    <br />
                    <span className="text-stone-500">
                      {b.clientName} · {formatMSK(b.start).replace(' МСК','')} – {formatMSKTime(b.end)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={b.status === 'active' ? 'text-emerald-700' : 'text-stone-400 line-through'}>
                      {b.status === 'active' ? 'активна' : b.status === 'cancelled' ? 'отменена' : b.status}
                    </span>
                    {b.status === 'active' && (
                      <button
                        onClick={() => cancelBooking(b)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-rose-700 hover:bg-rose-50"
                      >
                        Отменить
                      </button>
                    )}
                  </span>
                </li>
              ))}
              {data.bookings.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">нет записей</li>}
            </ul>
          </section>
        )}

        {/* РАСПИСАНИЕ */}
        {data && tab === 'schedule' && (
          <section className="space-y-4">
            <p className="text-sm text-stone-500">
              Рабочие дни мастеров. Если день не указан — мастер не работает. Слоты на клиентской форме строятся по этим данным.
            </p>
            {data.masters.map((m) => {
              const rows = data.schedule.filter((s) => s.master_id === m.id);
              return (
                <div key={m.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="mb-3 font-medium text-ink-900">{m.name}</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_SHORT.map((d, i) => {
                      const row = rows.find((r) => r.day_of_week === i);
                      return (
                        <div key={i} className={`rounded-xl border px-2 py-2 text-center text-xs ${
                          row ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-stone-100 bg-stone-50 text-stone-300'
                        }`}>
                          <div className="font-semibold uppercase">{d}</div>
                          {row ? (
                            <>
                              <div className="mt-0.5">{row.work_start}</div>
                              <div className="mt-0.5">{row.work_end}</div>
                              <button
                                onClick={() => deleteSchedule(row)}
                                className="mt-1 text-[10px] text-rose-500 hover:underline"
                              >
                                убрать
                              </button>
                            </>
                          ) : (
                            <div className="mt-1">—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <AddScheduleForm
                      masters={data.masters}
                      onSubmit={(mid, dow, ws, we) =>
                        run(() => api.adminSetSchedule(mid, dow, ws, we), `График сохранён: ${DAY_NAMES[dow]}`)
                      }
                    />
                  </div>
                </div>
              );
            })}

            {/* Разовые исключения из графика: конкретная дата, конкретные часы */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <h2 className="mb-1 text-sm font-medium text-ink-900">Исключения</h2>
              <p className="mb-3 text-xs text-stone-500">
                Разовая незанятость в конкретную дату: обед, отпуск, «в этот день не работает».
                Повторяющийся график выше не меняется — исключение действует только на указанную дату.
                Клиент такие слоты видит как «занято», и записаться в них нельзя.
              </p>
              <ul className="mb-3 divide-y divide-stone-100 rounded-xl border border-stone-200 text-sm">
                {data.blocks.map((bl) => (
                  <li key={bl.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span>
                      <b>{bl.master_name || `мастер #${bl.master_id}`}</b>{' '}
                      <span className="text-stone-500">
                        {formatMSK(bl.start_time)} – {formatMSKTime(bl.end_time)}
                        {bl.reason ? ` · ${bl.reason}` : ''}
                      </span>
                    </span>
                    <button
                      onClick={() => deleteBlock(bl)}
                      className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      удалить
                    </button>
                  </li>
                ))}
                {data.blocks.length === 0 && (
                  <li className="px-3 py-2 text-stone-500">исключений нет</li>
                )}
              </ul>
              <AddBlockForm
                masters={data.masters}
                onSubmit={(p) => run(() => api.createBlock(p), 'Исключение добавлено')}
              />
            </div>
          </section>
        )}

        {/* КАТАЛОГ */}
        {data && tab === 'catalog' && (
          <section className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-medium text-ink-900">Связи мастеров и услуг</h2>
              <div className="space-y-4">
                {data.masters.map((m) => {
                  const linked = new Set(data.links.filter((l) => l.master_id === m.id).map((l) => l.service_id));
                  return (
                    <div key={m.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                      <p className="mb-2 font-medium text-ink-900">{m.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {data.services.map((s) => {
                          const on = linked.has(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleCatalog(m, s, !on)}
                              className={`rounded-full px-3 py-1.5 text-xs ${
                                on ? 'bg-primary-600 text-white' : 'border border-stone-200 text-stone-500 hover:border-stone-300'
                              }`}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="mb-2 text-sm font-medium text-ink-900">Мастера ({data.masters.length})</h2>
                <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white text-sm">
                  {data.masters.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                      <span>{m.name} <span className="text-stone-400">— {m.specialization}</span></span>
                      <button
                        onClick={() => {
                          if (!confirm(`Включить/выключить ${m.name}?\nВыключенный мастер не будет доступен для записи.`)) return;
                          run(() => api.setMasterActive(m.id, !(m as any).active), `${m.name}: статус изменён`);
                        }}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          (m as any).active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {(m as any).active ? 'активен' : 'выключен'}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="mb-3 text-sm font-medium text-ink-900">Новый мастер</p>
                  <AddMasterForm
                    onSubmit={(p) => run(() => api.createMaster(p), `Мастер ${p.name} создан`)}
                  />
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-sm font-medium text-ink-900">Услуги ({data.services.length})</h2>
                <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white text-sm">
                  {data.services.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                      <span>{s.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-stone-400">{s.duration_min} мин · {s.price} ₽</span>
                        <button
                          onClick={() => run(() => api.setServiceActive(s.id, !s.active), `${s.name}: статус изменён`)}
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {s.active ? 'вкл' : 'выкл'}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="mb-3 text-sm font-medium text-ink-900">Новая услуга</p>
                  <AddServiceForm
                    onSubmit={(p) => run(() => api.createService(p), `Услуга ${p.name} создана`)}
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AddScheduleForm({ masters, onSubmit }: {
  masters: { id: number; name: string }[];
  onSubmit: (m: number, d: number, s: string, e: string) => void;
}) {
  const [mid, setMid] = useState(masters[0]?.id ?? 1);
  const [dow, setDow] = useState(2);
  const [ws, setWs] = useState('10:00');
  const [we, setWe] = useState('18:00');
  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">Мастер</span>
        <select value={mid} onChange={(e) => setMid(Number(e.target.value))} className="rounded-lg border border-stone-200 px-2 py-1.5">
          {masters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">День</span>
        <select value={dow} onChange={(e) => setDow(Number(e.target.value))} className="rounded-lg border border-stone-200 px-2 py-1.5">
          {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">С</span>
        <input type="time" value={ws} onChange={(e) => setWs(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">До</span>
        <input type="time" value={we} onChange={(e) => setWe(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <button
        onClick={() => onSubmit(mid, dow, ws, we)}
        className="rounded-lg bg-primary-600 px-3 py-2 text-white hover:bg-primary-700"
      >
        Сохранить день
      </button>
    </div>
  );
}

function AddMasterForm({ onSubmit }: {
  onSubmit: (p: { name: string; specialization: string; work_start: string; work_end: string }) => void;
}) {
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [ws, setWs] = useState('10:00');
  const [we, setWe] = useState('19:00');
  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <label className="flex min-w-32 flex-1 flex-col gap-1">
        <span className="text-stone-400">Имя и фамилия</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иванова Мария" className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex min-w-32 flex-1 flex-col gap-1">
        <span className="text-stone-400">Специализация</span>
        <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Маникюр, педикюр" className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">С</span>
        <input type="time" value={ws} onChange={(e) => setWs(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">До</span>
        <input type="time" value={we} onChange={(e) => setWe(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <button
        onClick={() => {
          if (!confirm(`Создать мастера «${name.trim()}»?\nЧасы работы по умолчанию ${ws}–${we} заполнятся во все дни недели.\nДни можно убрать во вкладке «Расписание».`)) return;
          onSubmit({ name: name.trim(), specialization: spec.trim(), work_start: ws, work_end: we });
          setName(''); setSpec('');
        }}
        disabled={!name.trim()}
        className="rounded-lg bg-primary-600 px-3 py-2 text-white hover:bg-primary-700 disabled:opacity-40"
      >
        Создать мастера
      </button>
    </div>
  );
}

function AddServiceForm({ onSubmit }: {
  onSubmit: (p: { name: string; description: string; duration_min: number; price: number }) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [dur, setDur] = useState(60);
  const [price, setPrice] = useState(1800);
  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <label className="flex min-w-32 flex-1 flex-col gap-1">
        <span className="text-stone-400">Название</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Массаж лица" className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex min-w-32 flex-1 flex-col gap-1">
        <span className="text-stone-400">Описание</span>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Длительность: 1 час" className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex w-20 flex-col gap-1">
        <span className="text-stone-400">Минут</span>
        <input type="number" min={5} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex w-24 flex-col gap-1">
        <span className="text-stone-400">Цена ₽</span>
        <input type="number" min={0} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <button
        onClick={() => {
          if (!confirm(`Создать услугу «${name.trim()}»?\n${dur} мин · ${price} ₽\nПосле создания её нужно связать с мастерами в блоке «Связи мастеров и услуг» выше.`)) return;
          onSubmit({ name: name.trim(), description: desc.trim(), duration_min: dur, price });
          setName(''); setDesc('');
        }}
        disabled={!name.trim()}
        className="rounded-lg bg-primary-600 px-3 py-2 text-white hover:bg-primary-700 disabled:opacity-40"
      >
        Создать услугу
      </button>
    </div>
  );
}

function AddBlockForm({ masters, onSubmit }: {
  masters: { id: number; name: string }[];
  onSubmit: (p: { master_id: number; start_time: string; end_time: string; reason: string }) => void;
}) {
  const [mid, setMid] = useState(masters[0]?.id ?? 1);
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState('12:00');
  const [to, setTo] = useState('14:00');
  const [reason, setReason] = useState('');

  const label = allDay ? 'не работает весь день' : `${from}–${to}`;

  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">Мастер</span>
        <select value={mid} onChange={(e) => setMid(Number(e.target.value))} className="rounded-lg border border-stone-200 px-2 py-1.5">
          {masters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-stone-400">Дата</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <label className="flex items-center gap-1.5 pb-1.5">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-primary-600" />
        <span className="text-stone-500">весь день</span>
      </label>
      {!allDay && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-stone-400">С</span>
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-stone-400">До</span>
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5" />
          </label>
        </>
      )}
      <label className="flex min-w-32 flex-1 flex-col gap-1">
        <span className="text-stone-400">Причина</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="обед / отпуск" className="rounded-lg border border-stone-200 px-2 py-1.5" />
      </label>
      <button
        onClick={() => {
          if (!date) return;
          if (!allDay && to <= from) { alert('Время «до» должно быть позже времени «с»'); return; }
          if (!confirm(`Добавить исключение?\nМастер не работает ${date}, ${label}${reason ? `\nПричина: ${reason}` : ''}`)) return;
          onSubmit({
            master_id: mid,
            start_time: `${date}T${allDay ? '00:00' : from}:00`,
            end_time: `${date}T${allDay ? '23:59' : to}:00`,
            reason,
          });
          setReason(''); setDate('');
        }}
        disabled={!date}
        className="rounded-lg bg-primary-600 px-3 py-2 text-white hover:bg-primary-700 disabled:opacity-40"
      >
        Добавить
      </button>
    </div>
  );
}
