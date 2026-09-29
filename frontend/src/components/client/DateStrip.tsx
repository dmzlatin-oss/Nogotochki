import type { DemoDate } from '@/data/studio';

interface DateStripProps {
  dates: DemoDate[];
  selectedDate: string | null;
  onSelect: (iso: string) => void;
}

export default function DateStrip({ dates, selectedDate, onSelect }: DateStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:gap-2 sm:overflow-visible">
      {dates.map((d) => {
        const selected = d.iso === selectedDate;
        return (
          <button
            key={d.iso}
            type="button"
            onClick={() => onSelect(d.iso)}
            aria-pressed={selected}
            className={`flex flex-shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3.5 py-2.5 transition sm:flex-shrink ${
              selected
                ? 'border-primary-500 bg-primary-600 text-white shadow-card'
                : 'border-stone-200 bg-white text-ink-800 hover:border-primary-300 hover:bg-primary-50/40 active:bg-primary-50/70'
            }`}
          >
            <span className={`text-xs uppercase ${selected ? 'text-primary-100' : 'text-stone-400'}`}>
              {d.weekday}
            </span>
            <span className="text-base font-semibold">{d.day}</span>
            <span className={`text-xs ${selected ? 'text-primary-100' : 'text-stone-400'}`}>{d.month}</span>
          </button>
        );
      })}
    </div>
  );
}
