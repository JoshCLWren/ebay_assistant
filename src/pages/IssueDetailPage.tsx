import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getIssue, listCopyImages, listCopies, type Copy, type Issue } from '../api';
import { PageLayout } from '../components/PageLayout';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type CopyStats = Record<number, number>;

export function IssueDetailPage() {
  const { seriesId: seriesIdParam, issueId: issueIdParam } = useParams<{ seriesId: string; issueId: string }>();
  const seriesId = Number(seriesIdParam);
  const issueId = Number(issueIdParam);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [copyToken, setCopyToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoCounts, setPhotoCounts] = useState<CopyStats>({});
  const [refreshTick, setRefreshTick] = useState(0);
  const fetchedCopyRef = useRef<Set<number>>(new Set());
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [issueResponse, copiesResponse] = await Promise.all([
          getIssue(seriesId, issueId),
          listCopies(issueId, { pageSize: 50 }),
        ]);
        if (cancelled) return;
        setIssue(issueResponse);
        setCopies(copiesResponse.copies);
        setCopyToken(copiesResponse.next_page_token ?? null);
        fetchedCopyRef.current = new Set();
        setPhotoCounts({});
        setInlineMessage(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load issue');
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
  }, [seriesId, issueId, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    const pendingCopies = copies.filter((copy) => !fetchedCopyRef.current.has(copy.copy_id));
    if (!pendingCopies.length) {
      return undefined;
    }
    const run = async () => {
      for (const copy of pendingCopies) {
        try {
          const response = await listCopyImages(seriesId, issueId, copy.copy_id);
          if (cancelled) return;
          fetchedCopyRef.current.add(copy.copy_id);
          setPhotoCounts((prev) => ({ ...prev, [copy.copy_id]: response.images.length }));
        } catch (err) {
          console.error('Failed to fetch photo count', err);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [copies, issueId, seriesId]);

  const loadMoreCopies = async () => {
    if (!copyToken) return;
    try {
      const response = await listCopies(issueId, { pageSize: 50, pageToken: copyToken });
      setCopies((prev) => [...prev, ...response.copies]);
      setCopyToken(response.next_page_token ?? null);
      setInlineMessage(null);
    } catch (err) {
      if (!copies.length) {
        setError(err instanceof Error ? err.message : 'Unable to load copies');
      } else {
        setInlineMessage(err instanceof Error ? err.message : 'Unable to load more copies');
      }
    }
  };

  const metadata = useMemo(() => {
    if (!issue) return null;
    const rows = [
      { label: 'Issue #', value: issue.issue_nr },
      { label: 'Cover Date', value: issue.cover_date ?? issue.cover_year ?? '—' },
      { label: 'Story Arc', value: issue.story_arc ?? '—' },
      { label: 'Variant', value: issue.variant ?? 'Standard' },
    ];
    return (
      <dl className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-4 shadow-card">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
            <dd className="mt-1 text-base font-semibold text-ink-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }, [issue]);

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingState label="Loading issue…" />;
  } else if (error) {
    body = <ErrorState message={error} onRetry={() => setRefreshTick((value) => value + 1)} />;
  } else if (!issue) {
    body = <EmptyState title="Issue not found" />;
  } else {
    body = (
      <div className="space-y-6">
        {metadata}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Copies</h2>
            <span className="text-xs text-slate-500">{copies.length} on file</span>
          </div>
          {copies.length ? (
            <>
              <div className="space-y-3">
                {copies.map((copy) => (
                  <Link
                    key={copy.copy_id}
                    to={`/series/${seriesId}/issues/${issue.issue_id}/copies/${copy.copy_id}`}
                    className="block rounded-3xl bg-white p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Copy #{copy.copy_id}
                        </p>
                        <p className="text-lg font-semibold text-ink-900">{copy.grade ?? 'Ungraded'}</p>
                        <p className="text-sm text-slate-500">{copy.raw_slabbed ?? copy.format ?? 'Format unknown'}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>Photos</p>
                        <p className="text-xl font-semibold text-ink-900">{photoCounts[copy.copy_id] ?? '…'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase text-slate-500">
                      {copy.custom_label ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1">{copy.custom_label}</span>
                      ) : null}
                      {copy.purchase_store ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1">{copy.purchase_store}</span>
                      ) : null}
                      {copy.value !== null && copy.value !== undefined ? (
                        <span className="rounded-full bg-ink-900 px-3 py-1 text-white">
                          Value ${copy.value.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
              {copyToken ? (
                <button
                  type="button"
                  onClick={loadMoreCopies}
                  className="mt-5 w-full rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-card"
                >
                  Load more copies
                </button>
              ) : null}
              {inlineMessage ? <p className="mt-2 text-center text-xs text-rose-600">{inlineMessage}</p> : null}
            </>
          ) : (
            <EmptyState title="No copies recorded" />
          )}
        </section>
      </div>
    );
  }

  return (
    <PageLayout
      title={issue?.title ?? issue?.full_title ?? 'Issue'}
      subtitle={`Series #${seriesId}`}
      backTo={`/series/${seriesId}`}
    >
      {body}
    </PageLayout>
  );
}
