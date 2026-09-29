import { Check } from 'lucide-react';
import type { Master } from '@/types/booking';

interface MasterCardProps {
  master: Master;
  selected: boolean;
  onSelect: () => void;
}

export default function MasterCard({ master, selected, onSelect }: MasterCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
        selected
          ? 'border-primary-500 bg-primary-50 shadow-card'
          : 'border-stone-200 bg-white hover:border-primary-300 hover:bg-primary-50/40 active:bg-primary-50/70'
      }`}
    >
      <div className="relative">
        <img
          src={master.photo}
          alt={master.name}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-white"
        />
        {selected && (
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 ring-2 ring-white">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-ink-900">{master.name}</p>
        <p className="text-xs text-stone-500">{master.role}</p>
      </div>
    </button>
  );
}
