import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface PageLayoutProps {
  title: string;
  subtitle?: ReactNode;
  backTo?: number | string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, backTo, rightSlot, children }: PageLayoutProps) {
  const navigate = useNavigate();
  const showBack = backTo !== undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-ink-900">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="mx-auto flex items-center gap-3 px-4 py-3 max-w-3xl">
          {showBack ? (
            <button
              type="button"
              onClick={() => {
                if (typeof backTo === 'number') {
                  navigate(backTo);
                } else if (typeof backTo === 'string') {
                  navigate(backTo);
                } else {
                  navigate(-1);
                }
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-ink-700 text-lg font-semibold"
              aria-label="Go back"
            >
              ←
            </button>
          ) : null}
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-5">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {rightSlot}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-32">{children}</main>
    </div>
  );
}
