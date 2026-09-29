// src/pages/client/ClientDashboard.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import { formatMSK, formatMSKTime } from '@/data/studio';

interface BookingView {
  id: number;
  masterId: number;
  serviceId: number;
  masterName?: string;
  serviceName?: string;
  start: string;
  end: string;
  status: string;
}

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setBookings(null);
    setError(null);
    api
      .getMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async (id: number) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setCancelling(true);
    try {
      await api.cancelBooking(id);
      setConfirmId(null);
      load();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold text-ink-900">Мои записи</span>
          <span className="text-sm text-stone-500">{user?.name}</span>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-stone-500 hover:text-ink-800">На главную</Link>
            <Link to="/booking" className="rounded-full bg-primary-600 px-3 py-1.5 font-medium text-white hover:bg-primary-700">
              Записаться
            </Link>
            <button onClick={() => { logout(); navigate('/'); }} className="text-stone-400 hover:text-stone-700">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {bookings === null && <LoadingState />}
        {error && <ErrorState title="Ошибка загрузки" message={error} />}
        {bookings && bookings.length === 0 && (
          <p className="text-stone-500">У вас пока нет записей. <Link to="/booking" className="text-primary-600 underline">Записаться</Link></p>
        )}
        <div className="space-y-3">
          {bookings?.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
              <div>
                <p className="font-medium text-ink-900">Запись #{b.id}</p>
                <p className="text-sm text-stone-500">
                  {b.serviceName ? `${b.serviceName} · ` : ''}{b.masterName ? `мастер ${b.masterName}` : `мастер #${b.masterId}`}
                </p>
                <p className="text-sm text-stone-500">
                  {formatMSK(b.start)} — {formatMSKTime(b.end)}
                </p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${b.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                  {b.status === 'active' ? 'Активна' : b.status === 'cancelled' ? 'Отменена' : b.status}
                </span>
              </div>
              {b.status === 'active' && (
                <button
                  onClick={() => handleCancel(b.id)}
                  disabled={cancelling}
                  className={`text-sm ${confirmId === b.id ? 'font-semibold text-red-700' : 'text-red-600 hover:underline'}`}
                >
                  {confirmId === b.id ? (cancelling ? 'Отменяем…' : 'Точно отменить?') : 'Отменить'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
