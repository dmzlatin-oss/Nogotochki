// src/pages/master/MasterDashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import LoadingState from '@/components/shared/LoadingState';
import { formatMSK, formatMSKTime } from '@/data/studio';

interface BookingView {
  id: number;
  clientId: number;
  serviceId: number;
  clientName?: string;
  serviceName?: string;
  start: string;
  end: string;
  status: string;
}

export default function MasterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingView[] | null>(null);

  useEffect(() => {
    setBookings(null);
    api.getMasterBookings().then(setBookings).catch(() => setBookings([]));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold text-ink-900">Расписание мастера</span>
          <span className="ml-2 text-sm text-stone-500">{user?.name}</span>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-stone-500 hover:text-ink-800">На главную</Link>
            <button onClick={() => { logout(); navigate('/'); }} className="text-stone-400 hover:text-stone-700">Выйти</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {bookings === null && <LoadingState />}
        <div className="space-y-3">
          {bookings?.map((b) => (
            <div key={b.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
              <p className="font-medium text-ink-900">Запись #{b.id}</p>
              <p className="text-sm text-stone-500">
                {b.clientName ? `клиент ${b.clientName}` : `клиент #${b.clientId}`}{b.serviceName ? ` · ${b.serviceName}` : ''}
              </p>
              <p className="text-sm text-stone-500">
                {formatMSK(b.start)} — {formatMSKTime(b.end)}
              </p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${b.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                {b.status === 'active' ? 'Активна' : b.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
