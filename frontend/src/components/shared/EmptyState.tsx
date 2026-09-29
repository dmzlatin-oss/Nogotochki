import { CalendarX } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        {icon ?? <CalendarX className="h-7 w-7" />}
      </div>
      <div>
        <p className="font-medium text-ink-900">{title}</p>
        <p className="mt-1 text-sm text-stone-500">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 active:bg-primary-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
