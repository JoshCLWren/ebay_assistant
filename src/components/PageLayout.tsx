import type { ReactNode } from 'react';
import { useNavigate, Link, type To } from 'react-router-dom';

interface PageLayoutProps {
  title: string;
  titleClassName?: string;
  subtitle?: ReactNode;
  backTo?: number | string | To;
  backState?: unknown;
  homeTo?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function PageLayout({
  title,
  titleClassName,
  subtitle,
  backTo,
  backState,
  homeTo,
  rightSlot,
  children,
}: PageLayoutProps) {
  const navigate = useNavigate();
  const showBack = backTo !== undefined;
  const showHome = Boolean(homeTo);
  const composedTitleClass = ['text-2xl font-display font-bold leading-tight tracking-tight text-white drop-shadow-md', titleClassName].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen text-ink-100">
      <header className="sticky top-0 z-20 border-b border-ink-800/40 bg-ink-900/60 backdrop-blur-xl supports-[backdrop-filter]:bg-ink-900/40">
        <div className="mx-auto flex items-center gap-4 px-4 py-4 pt-safe max-w-lg">
          {showBack ? (
            typeof backTo === 'number' ? (
              <button
                type="button"
                onClick={() => navigate(backTo)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-xl font-bold text-white transition-all active:scale-95 hover:bg-white/10"
                aria-label="Go back"
              >
                ←
              </button>
            ) : (

              <Link
                to={backTo}
                state={backState}
                replace
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-xl font-bold text-white transition-all active:scale-95 hover:bg-white/10"
                aria-label="Go back"
              >
                ←
              </Link>
            )
          ) : null}
          {showHome ? (
            <button
              type="button"
              onClick={() => {
                if (homeTo) {
                  navigate(homeTo, { replace: true });
                }
              }}
              className="group flex h-12 items-center justify-center rounded-2xl bg-white/5 px-5 text-sm font-semibold text-white transition-all active:scale-95 hover:bg-white/10"
              aria-label="Go home"
            >
              <span className="text-primary-300 transition-colors group-hover:text-primary-200">Home</span>
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <h1 className={composedTitleClass}>{title}</h1>
            {subtitle ? <p className="text-sm font-medium text-ink-300 truncate">{subtitle}</p> : null}
          </div>
          {rightSlot}
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 py-6 pb-32 animate-fade-in">{children}</main>
    </div>
  );
}
