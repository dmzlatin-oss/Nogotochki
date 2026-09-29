import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function ErrorState({ title, message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 animate-fade-up"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-800">{title}</p>
        <p className="mt-0.5 text-sm text-rose-700">{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-2 text-sm font-medium text-rose-800 underline underline-offset-2 hover:text-rose-900"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
