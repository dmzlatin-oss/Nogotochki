import type { TimeSlot } from '@/types/booking';

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
}

const LABELS: Record<TimeSlot['status'], string | undefined> = {
  available: undefined,
  busy: 'Уже занято',
  tooshort: 'Не хватает времени до конца смены',
};

export default function TimeSlotGrid({ slots, selectedTime, onSelect }: TimeSlotGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = slot.time === selectedTime;
        const isBusy = slot.status === 'busy';
        const isTooShort = slot.status === 'tooshort';
        const disabled = isBusy || isTooShort;
        return (
          <button
            key={slot.time}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot.time)}
            aria-pressed={isSelected}
            aria-disabled={disabled}
            title={LABELS[slot.status]}
            className={`h-11 rounded-xl border text-sm font-medium transition ${
              isSelected
                ? 'border-primary-600 bg-primary-600 text-white shadow-card'
                : isBusy
                ? 'cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300 line-through'
                : isTooShort
                ? 'cursor-not-allowed border-amber-100 bg-amber-50 text-amber-400'
                : 'border-stone-200 bg-white text-ink-800 hover:border-primary-300 hover:bg-primary-50/50 active:bg-primary-50/80'
            }`}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}
