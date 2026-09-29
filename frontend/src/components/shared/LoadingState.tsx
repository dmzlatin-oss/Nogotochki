export default function LoadingState({ label = 'Загружаем свободное время…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-xl bg-stone-200"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
