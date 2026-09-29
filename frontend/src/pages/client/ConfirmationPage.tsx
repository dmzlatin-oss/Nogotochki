import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Scissors as ServiceGlyph } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';
import { formatDateLabel, studio } from '@/data/studio';
import { api } from '@/api/client';
import type { Master, Service } from '@/types/booking';

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { serviceId, masterId, date, time, isComplete, reset } = useBooking();

  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const bookingId = (window as any).__lastBookingId;

  useEffect(() => {
    document.title = 'Запись подтверждена — ' + studio.name;
    api.getServices().then(setServices).catch(() => setServices([]));
    api.getMasters().then(setMasters).catch(() => setMasters([]));
    return () => { (window as any).__lastBookingId = undefined; };
  }, []);

  const service = services.find((s) => s.id === serviceId);
  const master = masters.find((m) => m.id === masterId);

  if (!isComplete || !service || !master || !date || !time) {
    return <Navigate to="/" replace />;
  }

  const handleNewBooking = () => {
    reset();
    navigate('/booking');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Запись подтверждена</h1>
          <p className="text-sm text-stone-500">
            Ждём вас в {studio.name}. Сохраните детали записи, чтобы не забыть.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <ServiceGlyph className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-ink-900">{service.name}</p>
              <p className="text-sm text-stone-500">
                {service.durationMin} мин · {service.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <img src={master.photo} alt={master.name} className="h-11 w-11 rounded-full object-cover" />
            <div>
              <p className="font-medium text-ink-900">{master.name}</p>
              <p className="text-sm text-stone-500">{master.role}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-50 p-3">
              <p className="text-xs text-stone-400">Дата</p>
              <p className="mt-0.5 text-sm font-medium text-ink-900">{formatDateLabel(date)}</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <p className="text-xs text-stone-400">Время</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-ink-900">
                <Clock className="h-3.5 w-3.5 text-stone-400" />
                {time}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-stone-400">
            <MapPin className="h-3.5 w-3.5" />
            {studio.address}
          </div>

          {bookingId != null && (
            <p className="mt-2 text-center text-xs text-stone-400">Номер записи: #{bookingId}</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="flex-1 rounded-full border border-stone-200 bg-white px-5 py-3 text-center text-sm font-semibold text-ink-800 transition hover:bg-stone-50 active:bg-stone-100"
          >
            На главную
          </Link>
          <button
            type="button"
            onClick={handleNewBooking}
            className="flex-1 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 active:bg-primary-800"
          >
            Записаться ещё раз
          </button>
        </div>
      </div>
    </div>
  );
}
