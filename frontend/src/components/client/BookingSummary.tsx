import { Loader2, MapPin } from 'lucide-react';
import type { Master, Service } from '@/types/booking';
import { formatDateLabel } from '@/data/studio';

interface BookingSummaryProps {
  service: Service | undefined;
  master: Master | undefined;
  date: string | null;
  time: string | null;
  isComplete: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export default function BookingSummary({
  service,
  master,
  date,
  time,
  isComplete,
  isSubmitting,
  onConfirm,
}: BookingSummaryProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <p className="font-display text-lg font-semibold text-ink-900">Ваша запись</p>

      <dl className="mt-4 space-y-3 text-sm">
        <SummaryRow label="Услуга" value={service ? service.name : 'Не выбрана'} muted={!service} />
        <SummaryRow label="Мастер" value={master ? master.name : 'Не выбран'} muted={!master} />
        <SummaryRow label="Дата" value={date ? formatDateLabel(date) : 'Не выбрана'} muted={!date} />
        <SummaryRow label="Время" value={time ?? 'Не выбрано'} muted={!time} />
      </dl>

      {service && (
        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
          <span className="text-sm text-stone-500">Итого</span>
          <span className="font-display text-xl font-semibold text-ink-900">
            {service.price.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={!isComplete || isSubmitting}
        onClick={onConfirm}
        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition ${
          !isComplete || isSubmitting
            ? 'cursor-not-allowed bg-stone-100 text-stone-400'
            : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
        }`}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Подтверждаем…' : 'Подтвердить запись'}
      </button>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
        <MapPin className="h-3.5 w-3.5" />
        <span>ул. Тверская, 12 · время московское (МСК)</span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className={`text-right font-medium ${muted ? 'text-stone-400' : 'text-ink-900'}`}>{value}</dd>
    </div>
  );
}
