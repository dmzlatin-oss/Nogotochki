import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';
import { getDemoDates, studio } from '@/data/studio';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import ServiceCard from '@/components/client/ServiceCard';
import MasterCard from '@/components/client/MasterCard';
import DateStrip from '@/components/client/DateStrip';
import TimeSlotGrid from '@/components/client/TimeSlotGrid';
import BookingSummary from '@/components/client/BookingSummary';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import type { TimeSlot } from '@/types/booking';
import type { Service, Master } from '@/types/booking';

const SLOT_LOAD_DELAY_MS = 400;
const CONFIRM_DELAY_MS = 600;

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId, masterId, date, time, setServiceId, setMasterId, setDate, setTime, isComplete } =
    useBooking();
  const { user } = useAuth();

  // Предвыбор услуги/мастера при переходе с главной (через Link state)
  useEffect(() => {
    const st = (location.state || {}) as { preselectService?: string; preselectMaster?: string };
    if (st.preselectService && !serviceId) setServiceId(st.preselectService);
    if (st.preselectMaster && !masterId) setMasterId(st.preselectMaster);
    // очищаем state, чтобы при обновлении страницы не сбрасывалось
    if (st.preselectService || st.preselectMaster) navigate('/booking', { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [workHours, setWorkHours] = useState<{ start?: string | null; end?: string | null }>({});
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getServices().then(setServices).catch(() => setServices([]));
    api.getMasters().then(setMasters).catch(() => setMasters([]));
  }, []);

  const demoDates = useMemo(() => getDemoDates(7), []);
  const availableMasters = useMemo(
    () => masters.filter((m) => !serviceId || m.serviceIds.includes(serviceId)),
    [serviceId, masters]
  );

  useEffect(() => {
    if (!masterId || !date) {
      setSlots(null);
      return;
    }
    setSlots(null);
    setConflictError(null);
    const timer = setTimeout(() => {
      api
        .getAvailability(masterId, date, serviceId || '')
        .then((r) => { setSlots(r.slots); setWorkHours({ start: r.workStart, end: r.workEnd }); })
        .catch(() => setSlots([]));
    }, SLOT_LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [masterId, date, serviceId]);

  const handleSelectService = (id: string) => {
    const next = id === serviceId ? null : id;
    setServiceId(next);
    if (next && masterId) {
      const master = masters.find((m) => m.id === masterId);
      if (master && !master.serviceIds.includes(next)) {
        setMasterId(null);
        setDate(null);
        setTime(null);
      }
    } else if (!next) {
      setMasterId(null);
      setDate(null);
      setTime(null);
    }
  };

  const handleSelectMaster = (id: string) => {
    const next = id === masterId ? null : id;
    setMasterId(next);
    setDate(null);
    setTime(null);
  };

  const handleSelectDate = (iso: string) => {
    setDate(iso);
    setTime(null);
  };

  const handleSelectTime = (value: string) => {
    setTime(value);
    setConflictError(null);
  };

  const handleRefreshAvailability = () => {
    if (!masterId || !date) return;
    setSlots(null);
    setConflictError(null);
    setTimeout(() => {
      api.getAvailability(masterId, date, serviceId || '').then((r) => { setSlots(r.slots); setWorkHours({ start: r.workStart, end: r.workEnd }); }).catch(() => {});
    }, SLOT_LOAD_DELAY_MS);
  };

  const handleConfirm = async () => {
    if (!isComplete || !serviceId || !masterId || !date || !time) return;
    const service = services.find((s) => s.id === serviceId);
    setIsSubmitting(true);
    setConflictError(null);
    try {
      const res = await api.createBooking({
        masterId,
        serviceId,
        date,
        time,
        durationMin: service ? service.durationMin : 60,
        clientId: user ? String(user.id) : undefined,
      });
      // сохраняем id созданной записи для страницы подтверждения
      (window as any).__lastBookingId = res.booking?.id;
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/confirmation');
      }, CONFIRM_DELAY_MS);
    } catch (err: any) {
      setIsSubmitting(false);
      // реальный конфликт (HTTP 409) или другая ошибка
      if (err.status === 409) {
        setConflictError('Это время уже занято. Пожалуйста, выберите другое время.');
        // обновим слоты, чтобы занятое время отобразилось
        api.getAvailability(masterId, date, serviceId || '').then((r) => { setSlots(r.slots); setWorkHours({ start: r.workStart, end: r.workEnd }); }).catch(() => {});
      } else {
        setConflictError(err.message || 'Не удалось подтвердить запись');
      }
    }
  };

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedMaster = masters.find((m) => m.id === masterId);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-ink-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </Link>
          <span className="mx-auto font-display text-lg font-semibold text-ink-900 sm:mx-0">
            Новая запись
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-3 lg:items-start lg:gap-10">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <SectionTitle step={1} title="Выберите услугу" />
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={service.id === serviceId}
                  onSelect={() => handleSelectService(service.id)}
                />
              ))}
            </div>
          </section>

          {serviceId && (
            <section className="animate-fade-up">
              <SectionTitle step={2} title="Выберите мастера" />
              <div className="grid gap-3 sm:grid-cols-3">
                {availableMasters.map((master) => (
                  <MasterCard
                    key={master.id}
                    master={master}
                    selected={master.id === masterId}
                    onSelect={() => handleSelectMaster(master.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {masterId && (
            <section className="animate-fade-up">
              <SectionTitle step={3} title="Выберите дату и время" />
              <DateStrip dates={demoDates} selectedDate={date} onSelect={handleSelectDate} />

              {date && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-stone-500">
                      Время указано по местному времени
                      {workHours.start && workHours.end && (
                        <span className="ml-1 font-medium text-stone-600">
                          · мастер принимает с {workHours.start} до {workHours.end}
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={handleRefreshAvailability}
                      className="flex items-center gap-1.5 text-xs font-medium text-stone-400 transition hover:text-primary-600"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Обновить
                    </button>
                  </div>

                  {slots === null ? (
                    <LoadingState />
                  ) : (
                    <>
                      <TimeSlotGrid slots={slots} selectedTime={time} onSelect={handleSelectTime} />
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-400">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full border border-stone-300 bg-white" />
                          Свободно
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                          Занято (есть запись)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
                          Не хватает времени до конца смены
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />
                          Выбрано
                        </span>
                      </div>
                    </>
                  )}

                  {conflictError && (
                    <div className="mt-4">
                      <ErrorState
                        title="Не удалось подтвердить запись"
                        message={conflictError}
                        actionLabel="Выбрать другое время"
                        onAction={() => setConflictError(null)}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          <BookingSummary
            service={selectedService}
            master={selectedMaster}
            date={date}
            time={time}
            isComplete={isComplete}
            isSubmitting={isSubmitting}
            onConfirm={handleConfirm}
          />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
        {step}
      </span>
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
    </div>
  );
}
