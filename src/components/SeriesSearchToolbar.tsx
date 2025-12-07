import { useEffect, useMemo, useRef, useState, type KeyboardEventHandler } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSeries, type Series } from '../api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function SeriesSearchToolbar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);
  const [results, setResults] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const run = async () => {
      try {
        const response = await listSeries({ pageSize: 5, titleSearch: debouncedQuery.trim() });
        if (!cancelled) {
          setResults(response.series);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed');
          setResults([]);
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
  }, [debouncedQuery]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const showEmptyState = useMemo(() => {
    if (!open) return false;
    if (loading) return false;
    if (error) return false;
    return !debouncedQuery.trim() || results.length === 0;
  }, [debouncedQuery, error, loading, open, results.length]);

  const handleSelect = (series: Series) => {
    navigate(`/series/${series.series_id}`);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && results[0]) {
      event.preventDefault();
      handleSelect(results[0]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      (event.target as HTMLInputElement).blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-[140px] flex-shrink-0 sm:w-[220px]">
      <label htmlFor="toolbar-series-search" className="sr-only">
        Search series
      </label>
      <input
        id="toolbar-series-search"
        type="search"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search series"
        className="h-11 w-full rounded-2xl border border-ink-700 bg-ink-900 px-4 text-sm text-white placeholder:text-slate-500 focus:border-ink-400 focus:outline-none"
      />
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-full min-w-[180px] rounded-3xl border border-ink-800 bg-slate-950 p-2 shadow-card">
          {loading ? (
            <p className="px-2 py-3 text-center text-xs text-slate-400">Searching…</p>
          ) : error ? (
            <p className="px-2 py-3 text-center text-xs text-rose-300">{error}</p>
          ) : showEmptyState ? (
            <p className="px-2 py-3 text-center text-xs text-slate-400">
              {debouncedQuery.trim() ? 'No matching series yet' : 'Start typing to search your series'}
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((series) => (
                <li key={series.series_id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(series)}
                    className="w-full rounded-2xl px-3 py-2 text-left hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-400"
                  >
                    <p className="text-sm font-semibold text-white">{series.title ?? 'Untitled Series'}</p>
                    <p className="text-[11px] text-slate-400">{series.publisher ?? 'Publisher unknown'}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
