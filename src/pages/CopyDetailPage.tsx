import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getCopy,
  listCopyImages,
  updateCopy,
  uploadCopyImagesWithPolling,
  type ComicImage,
  type Copy,
  type ImageType,
} from '../api';
import { PageLayout } from '../components/PageLayout';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { PhotoGrid } from '../components/PhotoGrid';

const IMAGE_TYPE_OPTIONS: { label: string; value: ImageType }[] = [
  { label: 'Front Cover', value: 'front' },
  { label: 'Back Cover', value: 'back' },
  { label: 'Spine', value: 'spine' },
  { label: 'Staples', value: 'staples' },
  { label: 'Interior Front Cover', value: 'interior_front_cover' },
  { label: 'Interior Back Cover', value: 'interior_back_cover' },
  { label: 'Misc', value: 'misc' },
];

export function CopyDetailPage() {
  const { seriesId: seriesParam, issueId: issueParam, copyId: copyParam } = useParams<{
    seriesId: string;
    issueId: string;
    copyId: string;
  }>();
  const seriesId = Number(seriesParam);
  const issueId = Number(issueParam);
  const copyId = Number(copyParam);

  const [copy, setCopy] = useState<Copy | null>(null);
  const [images, setImages] = useState<ComicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);
  const [imageType, setImageType] = useState<ImageType>('front');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [copyResponse, imagesResponse] = await Promise.all([
          getCopy(issueId, copyId),
          listCopyImages(seriesId, issueId, copyId),
        ]);
        if (cancelled) return;
        setCopy(copyResponse);
        setImages(imagesResponse.images);
        setNotes(copyResponse.grader_notes ?? '');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load copy');
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
  }, [seriesId, issueId, copyId, refreshTick]);

  const handleNotesSave = async () => {
    if (!copy) return;
    setNotesSaving(true);
    setUploadMessage(null);
    try {
      const updated = await updateCopy(issueId, copyId, { grader_notes: notes || null });
      setCopy(updated);
      setNotes(updated.grader_notes ?? '');
      setNotesSavedAt(Date.now());
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Unable to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    if (!selected.length) return;
    setUploading(true);
    setUploadMessage('Uploading…');
    try {
      const uploaded = await uploadCopyImagesWithPolling({
        seriesId,
        issueId,
        copyId,
        files: selected,
        imageType,
        onStatus: ({ fileName, status }) => {
          setUploadMessage(`${fileName}: ${status.replace('_', ' ')}`);
        },
      });
      setImages((prev) => [...uploaded, ...prev]);
      setUploadMessage(`Uploaded ${uploaded.length} photo${uploaded.length === 1 ? '' : 's'}`);
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setRefreshTick((value) => value + 1);
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return '—';
    return `$${value.toFixed(2)}`;
  };

  const metadata = useMemo(() => {
    if (!copy) return null;
    const rows = [
      { label: 'Grade', value: copy.grade ?? 'Ungraded' },
      { label: 'Raw/Slabbed', value: copy.raw_slabbed ?? copy.format ?? '—' },
      { label: 'Asking Value', value: formatCurrency(copy.value) },
      { label: 'My Value', value: formatCurrency(copy.my_value) },
      { label: 'Purchase', value: formatCurrency(copy.purchase_price) },
      { label: 'Store', value: copy.purchase_store ?? '—' },
      { label: 'Location', value: copy.custom_label ?? '—' },
      { label: 'Barcode', value: copy.barcode ?? '—' },
    ];
    return (
      <dl className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-4 shadow-card">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
            <dd className="mt-1 text-base font-semibold text-ink-900 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }, [copy]);

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingState label="Loading copy…" />;
  } else if (error) {
    body = <ErrorState message={error} onRetry={() => setRefreshTick((value) => value + 1)} />;
  } else if (!copy) {
    body = <ErrorState message="Copy not found" />;
  } else {
    body = (
      <div className="space-y-6">
        {metadata}
        <section className="rounded-3xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Notes</h2>
            {notesSavedAt ? (
              <span className="text-xs text-slate-500">Saved {new Date(notesSavedAt).toLocaleTimeString()}</span>
            ) : null}
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Capture defects, pressing notes, or location tips…"
            className="mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-base focus:border-ink-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleNotesSave}
            disabled={notesSaving}
            className="mt-3 w-full rounded-full bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {notesSaving ? 'Saving…' : 'Save notes'}
          </button>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Photos</h2>
              <p className="text-sm text-slate-500">{images.length} uploaded</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex flex-col text-xs font-semibold uppercase text-slate-500">
                Image type
                <select
                  value={imageType}
                  onChange={(event) => setImageType(event.target.value as ImageType)}
                  className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-ink-900 focus:border-ink-500 focus:outline-none"
                >
                  {IMAGE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                htmlFor="photo-upload"
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 py-3 text-center text-sm font-semibold ${
                  uploading ? 'border-slate-300 text-slate-400' : 'border-ink-900 text-ink-900'
                }`}
              >
                {uploading ? 'Uploading…' : 'Add photos'}
              </label>
              <input
                id="photo-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </div>
          </div>
          {uploadMessage ? <p className="mt-3 text-xs text-slate-500">{uploadMessage}</p> : null}
          <div className="mt-4">
            <PhotoGrid images={images} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <PageLayout
      title={`Copy #${copyId}`}
      subtitle={copy?.grade ?? 'Ungraded'}
      backTo={`/series/${seriesId}/issues/${issueId}`}
    >
      {body}
    </PageLayout>
  );
}
