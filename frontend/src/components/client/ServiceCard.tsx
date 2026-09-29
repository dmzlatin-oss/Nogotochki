import { Check } from 'lucide-react';
import type { Service } from '@/types/booking';

interface ServiceCardProps {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}

export default function ServiceCard({ service, selected, onSelect }: ServiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition ${
        selected
          ? 'border-primary-500 bg-primary-50 shadow-card'
          : 'border-stone-200 bg-white hover:border-primary-300 hover:bg-primary-50/40 active:bg-primary-50/70'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-ink-900">{service.name}</p>
        <div
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition ${
            selected ? 'border-primary-600 bg-primary-600' : 'border-stone-300 bg-white'
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
      </div>
      <p className="text-sm text-stone-500">{service.description}</p>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-stone-500">{service.durationMin} мин</span>
        <span className="h-1 w-1 rounded-full bg-stone-300" />
        <span className="font-semibold text-ink-900">{service.price.toLocaleString('ru-RU')} ₽</span>
      </div>
    </button>
  );
}
