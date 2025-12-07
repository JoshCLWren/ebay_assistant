import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSeries, listCopyImages, listCopies, listIssues, type Issue, type Series } from '../api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageLayout } from '../components/PageLayout';
import { SeriesSearchToolbar } from '../components/SeriesSearchToolbar';

type IssueStats = Record<number, { copyCount: number; photoCount: number }>;

export function SeriesDetailPage() {
  const { seriesId: seriesIdParam } = useParams<{ seriesId: string }>();
  const seriesId = Number(seriesIdParam);
  const [series, setSeries] = useState<Series | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueToken, setIssueToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<IssueStats>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const fetchedStatsRef = useRef<Set<number>>(new Set());
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!seriesId) {
      setError('Invalid series id');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [seriesResponse, issuesResponse] = await Promise.all([
          getSeries(seriesId),
          listIssues(seriesId, { pageSize: 25 }),
        ]);
        if (cancelled) return;
        setSeries(seriesResponse);
        setIssues(issuesResponse.issues);
        setIssueToken(issuesResponse.next_page_token ?? null);
        fetchedStatsRef.current = new Set();
        setStats({});
        setInlineMessage(null);
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
    load();
    return () => {
      cancelled = true;
    };
  }, [seriesId, refreshTick]);

  const loadMoreIssues = async () => {
    if (!issueToken) return;
    try {
      const response = await listIssues(seriesId, { pageSize: 25, pageToken: issueToken });
      setIssues((prev) => [...prev, ...response.issues]);
      setIssueToken(response.next_page_token ?? null);
      setInlineMessage(null);
    } catch (err) {
      if (!issues.length) {
        setError(err instanceof Error ? err.message : 'Unable to load issues');
      } else {
        setInlineMessage(err instanceof Error ? err.message : 'Unable to load more issues right now');
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    const pendingIssues = issues.filter((issue) => !fetchedStatsRef.current.has(issue.issue_id));
    if (!pendingIssues.length) {
      setStatsLoading(false);
      return undefined;
    }

    const run = async () => {
      setStatsLoading(true);
      for (const issue of pendingIssues) {
        try {
          const copies = await collectAllCopies(issue.issue_id);
          let photoCount = 0;
          for (const copy of copies) {
            const response = await listCopyImages(seriesId, issue.issue_id, copy.copy_id);
            photoCount += response.images.length;
          }
          if (cancelled) return;
          fetchedStatsRef.current.add(issue.issue_id);
          setStats((prev) => ({
            ...prev,
            [issue.issue_id]: {
              copyCount: copies.length,
              photoCount,
            },
          }));
        } catch (err) {
          console.error('Failed to load issue stats', err);
        }
      }
      if (!cancelled) {
        setStatsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [issues, seriesId]);

  const infoRows = useMemo(() => {
    if (!series) return null;
    const rows = [
      { label: 'Publisher', value: series.publisher ?? 'Unknown' },
      { label: 'Age', value: series.age ?? '—' },
      { label: 'Group', value: series.series_group ?? '—' },
      { label: 'Series ID', value: `#${series.series_id}` },
    ];
    return (
      <dl className="grid grid-cols-2 gap-4 rounded-3xl bg-ink-900 p-4 shadow-card">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</dt>
            <dd className="mt-1 text-base font-semibold text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }, [series]);

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingState label="Loading series…" />;
  } else if (error) {
    body = <ErrorState message={error} onRetry={() => setRefreshTick((value) => value + 1)} />;
  } else if (!series) {
    body = <EmptyState title="Series not found" />;
  } else {
    body = (
      <div className="space-y-6">
        {infoRows}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Issues</h2>
            {statsLoading ? <span className="text-xs text-slate-400">Syncing counts…</span> : null}
          </div>
          {issues.length ? (
            <div className="space-y-3">
              {issues.map((issue) => {
                const stat = stats[issue.issue_id];
                const issueNumberDisplay = issue.issue_nr?.trim() ? issue.issue_nr : String(issue.issue_id);
                return (
                  <Link
                    key={issue.issue_id}
                    to={`/series/${series.series_id}/issues/${issue.issue_id}`}
                    className="block rounded-3xl bg-ink-900 p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-4xl font-black uppercase tracking-tight text-orange-400 leading-none">
                          {issueNumberDisplay}
                        </p>
                        {issue.variant ? <p className="mt-2 text-sm text-slate-400">Variant: {issue.variant}</p> : null}
                      </div>
                      <span className="text-sm text-slate-400">{issue.cover_date ?? issue.cover_year ?? '—'}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase text-slate-300">
                      <span className="rounded-full bg-ink-800 px-3 py-1 text-slate-100">
                        Copies: {stat ? stat.copyCount : '…'}
                      </span>
                      <span className="rounded-full bg-ink-800 px-3 py-1 text-slate-100">
                        Photos: {stat ? stat.photoCount : '…'}
                      </span>
                      {issue.story_arc ? (
                        <span className="rounded-full bg-ink-800 px-3 py-1 text-white">{issue.story_arc}</span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
              {issueToken ? (
                <button
                  type="button"
                  onClick={loadMoreIssues}
                  className="w-full rounded-full bg-ink-800 px-4 py-3 text-sm font-semibold text-white shadow-card"
                >
                  Load more issues
                </button>
              ) : null}
              {inlineMessage ? <p className="text-center text-xs text-rose-400">{inlineMessage}</p> : null}
            </div>
          ) : (
            <EmptyState title="No issues yet" />
          )}
        </section>
      </div>
    );
  }

  return (
    <PageLayout
      title={series?.title ?? 'Series'}
      subtitle={series?.publisher ?? ''}
      backTo={-1}
      homeTo="/"
      rightSlot={<SeriesSearchToolbar />}
    >
      {body}
    </PageLayout>
  );
}

async function collectAllCopies(issueId: number) {
  let copies: Awaited<ReturnType<typeof listCopies>>['copies'] = [];
  let token: string | null | undefined = null;
  do {
    const response = await listCopies(issueId, { pageSize: 50, pageToken: token ?? undefined });
    copies = copies.concat(response.copies);
    token = response.next_page_token ?? null;
  } while (token);
  return copies;
}
