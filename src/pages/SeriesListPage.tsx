import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, listSeries, type Series } from '../api';
import { PageLayout } from '../components/PageLayout';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function SeriesListPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [refreshTick, setRefreshTick] = useState(0);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setInlineMessage(null);
      try {
        const response = await listSeries({ pageSize: 50, titleSearch: debouncedSearch });
        if (!cancelled) {
          setSeries(response.series);
          setNextToken(response.next_page_token ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load series');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, refreshTick]);

  const handleLoadMore = useCallback(async () => {
    if (!nextToken) return;
    setLoadingMore(true);
    try {
      const response = await listSeries({ pageSize: 50, pageToken: nextToken, titleSearch: debouncedSearch });
      setSeries((prev) => [...prev, ...response.series]);
      setNextToken(response.next_page_token ?? null);
      setInlineMessage(null);
    } catch (err) {
      if (!series.length) {
        setError(err instanceof Error ? err.message : 'Unable to load series');
      } else {
        setInlineMessage(err instanceof Error ? err.message : 'Unable to load more');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [nextToken, debouncedSearch, series.length]);

  useEffect(() => {
    const observerTarget = loadMoreSentinelRef.current;
    if (!observerTarget || !nextToken || loadingMore || loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        rootMargin: '200px',
      },
    );

    observer.observe(observerTarget);

    return () => {
      observer.disconnect();
    };
  }, [nextToken, handleLoadMore, loadingMore, loading]);

  let content: React.ReactNode;
  if (loading) {
    content = <LoadingState label="Gathering your library…" />;
  } else if (error) {
    content = (
      <div className="space-y-4">
        <ErrorState message={error} onRetry={() => setRefreshTick((value) => value + 1)} />
        <ConnectionDebug />
      </div>
    );
  } else if (!series.length) {
    content = (
      <EmptyState title="No series found" description="Try a different search term or make sure the backend is running." />
    );
  } else {
    content = (
      <>
        <div className="space-y-3">
          {series.map((item) => (
            <Link
              key={item.series_id}
              to={`/series/${item.series_id}`}
              className="block rounded-3xl bg-ink-900 p-4 shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-400"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{item.title ?? 'Untitled Series'}</p>
                  <p className="text-sm text-slate-400">{item.publisher ?? 'Publisher unknown'}</p>
                </div>
                <span className="rounded-full bg-ink-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                  #{item.series_id}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                {item.age ? <span className="rounded-full bg-ink-800 px-2 py-1 text-slate-200">{item.age}</span> : null}
                {item.series_group ? (
                  <span className="rounded-full bg-ink-800 px-2 py-1 text-slate-200">{item.series_group}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
        {nextToken ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={handleLoadMore}
            className="mt-6 w-full rounded-full bg-ink-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load more series'}
          </button>
        ) : null}
        {inlineMessage ? <p className="mt-2 text-center text-xs text-rose-400">{inlineMessage}</p> : null}
        <div aria-hidden ref={loadMoreSentinelRef} />
      </>
    );
  }

  return (
    <PageLayout title="Library" subtitle="Browse series pulled from CLZ">
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Search</label>
        <input
          type="search"
          name="series-search"
          placeholder="Start typing a title…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-ink-700 bg-ink-900 px-4 py-3 text-base text-white shadow-card placeholder:text-slate-500 focus:border-ink-400 focus:outline-none"
        />
      </div>
      {content}
    </PageLayout>
  );
}

function ConnectionDebug() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/60 px-4 py-3 text-xs text-slate-400">
      <p className="font-semibold uppercase tracking-wide text-slate-300">Connection debug</p>
      <p className="mt-1 break-words">
        Frontend origin: <span className="text-white">{origin}</span>
      </p>
      <p className="break-words">
        API base: <span className="text-white">{API_BASE_URL}</span>
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        If the API base shows 127.0.0.1 on a phone/tablet, it cannot reach your desktop backend. Point{' '}
        <code className="rounded bg-ink-800 px-1">VITE_API_BASE_URL</code> to your LAN IP and restart the dev server.
      </p>
    </div>
  );
}
