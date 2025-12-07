interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-900/50 bg-rose-950/70 px-4 py-5 text-rose-200">
      <p className="text-sm font-medium text-rose-100">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-card"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
