interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink-800 border-t-white" />
      <span className="text-sm font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}
