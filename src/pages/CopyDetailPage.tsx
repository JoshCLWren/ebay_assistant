import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  deleteCopyImage,
  getCopy,
  listCopyImages,
  updateCopy,
  uploadCopyImagesWithPolling,
  type ComicImage,
  type Copy,
  type ImageType,
} from '../api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { PhotoGrid } from '../components/PhotoGrid';
import { PageLayout } from '../components/PageLayout';
import { SeriesSearchToolbar } from '../components/SeriesSearchToolbar';

const IMAGE_TYPE_OPTIONS: { label: string; value: ImageType }[] = [
  { label: 'Front Cover', value: 'front' },
  { label: 'Back Cover', value: 'back' },
  { label: 'Spine', value: 'spine' },
  { label: 'Staples', value: 'staples' },
  { label: 'Interior Front Cover', value: 'interior_front_cover' },
  { label: 'Interior Back Cover', value: 'interior_back_cover' },
  { label: 'Misc', value: 'misc' },
];

const OPTIONAL_GUIDED_IMAGE_TYPE: ImageType = 'misc';
const REQUIRED_GUIDED_TYPES: ImageType[] = IMAGE_TYPE_OPTIONS.filter(
  (option) => option.value !== OPTIONAL_GUIDED_IMAGE_TYPE,
).map((option) => option.value);

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
  const [currentImageType, setCurrentImageType] = useState<ImageType>(IMAGE_TYPE_OPTIONS[0].value);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null);
  const [guidedCaptureActive, setGuidedCaptureActive] = useState(false);
  const [guidedCaptureIndex, setGuidedCaptureIndex] = useState(0);
  const [activeUploads, setActiveUploads] = useState(0);
  const getImageTypeLabel = useCallback(
    (type: ImageType) => IMAGE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Photo',
    [],
  );

  const refreshImages = useCallback(async () => {
    try {
      const response = await listCopyImages(seriesId, issueId, copyId);
      setImages(response.images);
    } catch (err) {
      console.error('Failed to refresh images', err);
      setUploadMessage((prev) => prev ?? (err instanceof Error ? err.message : 'Unable to refresh photos'));
    }
  }, [seriesId, issueId, copyId]);

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

  const imageTypeCounts = useMemo(() => {
    const counts: Partial<Record<ImageType, number>> = {};
    for (const image of images) {
      counts[image.image_type] = (counts[image.image_type] ?? 0) + 1;
    }
    return counts;
  }, [images]);

  const nextPendingImageType = useMemo(() => {
    return IMAGE_TYPE_OPTIONS.find((option) => !(imageTypeCounts[option.value] ?? 0))?.value;
  }, [imageTypeCounts]);

  useEffect(() => {
    if (guidedCaptureActive || !nextPendingImageType) return;
    setCurrentImageType((prev) => {
      if ((imageTypeCounts[prev] ?? 0) > 0 && prev !== nextPendingImageType) {
        return nextPendingImageType;
      }
      if (!(imageTypeCounts[prev] ?? 0)) {
        return prev;
      }
      return nextPendingImageType;
    });
  }, [guidedCaptureActive, imageTypeCounts, nextPendingImageType]);

  const optionalMiscRemaining = (imageTypeCounts[OPTIONAL_GUIDED_IMAGE_TYPE] ?? 0) === 0;
  const guidedCaptureStepType = guidedCaptureActive
    ? guidedCaptureIndex < REQUIRED_GUIDED_TYPES.length
      ? REQUIRED_GUIDED_TYPES[guidedCaptureIndex]
      : optionalMiscRemaining && guidedCaptureIndex === REQUIRED_GUIDED_TYPES.length
        ? OPTIONAL_GUIDED_IMAGE_TYPE
        : null
    : null;
  const guidedStepIsOptional =
    guidedCaptureActive && guidedCaptureIndex === REQUIRED_GUIDED_TYPES.length && Boolean(guidedCaptureStepType);

  useEffect(() => {
    if (!guidedCaptureActive || !guidedCaptureStepType) return;
    setCurrentImageType(guidedCaptureStepType);
  }, [guidedCaptureActive, guidedCaptureStepType]);

  const endGuidedCapture = useCallback(
    (message?: string) => {
      setGuidedCaptureActive(false);
      setGuidedCaptureIndex(0);
      if (message) {
        setUploadMessage(message);
      }
    },
    [],
  );

  const advanceGuidedCapture = useCallback(() => {
    if (!guidedCaptureActive) return;
    setGuidedCaptureIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex < REQUIRED_GUIDED_TYPES.length) {
        return nextIndex;
      }
      if (nextIndex === REQUIRED_GUIDED_TYPES.length && optionalMiscRemaining) {
        return nextIndex;
      }
      endGuidedCapture('Guided capture complete');
      return 0;
    });
  }, [endGuidedCapture, guidedCaptureActive, optionalMiscRemaining]);

  const handleCaptureClick = () => {
    if (!guidedCaptureActive && images.length === 0) {
      setGuidedCaptureActive(true);
      setGuidedCaptureIndex(0);
      const firstLabel = REQUIRED_GUIDED_TYPES[0] ? getImageTypeLabel(REQUIRED_GUIDED_TYPES[0]) : null;
      setUploadMessage(firstLabel ? `Guided capture started with ${firstLabel}` : 'Guided capture started');
    }
    fileInputRef.current?.click();
  };

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

  const handleGuidedSkipOptional = () => {
    if (!guidedStepIsOptional) return;
    endGuidedCapture('Skipped optional misc photo');
  };

  const handleGuidedCancel = () => {
    if (!guidedCaptureActive) return;
    endGuidedCapture();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    if (!selected.length) return;
    const captureType = currentImageType;
    const shouldReplace = replaceExisting;
    selected.forEach((file) => {
      setUploadMessage(`Uploading ${file.name}…`);
      setActiveUploads((count) => count + 1);
      uploadCopyImagesWithPolling({
        seriesId,
        issueId,
        copyId,
        files: [file],
        imageType: captureType,
        replaceExisting: shouldReplace,
        onStatus: ({ fileName, status }) => {
          setUploadMessage(`${fileName}: ${status.replace('_', ' ')}`);
        },
      })
        .then(async (uploaded) => {
          await refreshImages();
          setUploadMessage(`Uploaded ${uploaded.length} photo${uploaded.length === 1 ? '' : 's'}`);
        })
        .catch((err) => {
          setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
        })
        .finally(() => {
          setActiveUploads((count) => Math.max(0, count - 1));
        });
    });
    if (guidedCaptureActive) {
      advanceGuidedCapture();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (image: ComicImage) => {
    if (deletingFileName) return;
    setDeletingFileName(image.file_name);
    setUploadMessage(`Deleting ${image.file_name}…`);
    try {
      await deleteCopyImage(seriesId, issueId, copyId, image.file_name);
      await refreshImages();
      setUploadMessage('Photo deleted');
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingFileName(null);
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
      <dl className="grid grid-cols-2 gap-4 rounded-3xl bg-ink-900 p-4 shadow-card">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</dt>
            <dd className="mt-1 break-words text-base font-semibold text-white">{row.value}</dd>
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
        <section className="rounded-3xl bg-ink-900 p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Photos</h2>
              <p className="text-sm text-slate-400">{images.length} uploaded</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-ink-800 bg-slate-950 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Up next</p>
                <p className="text-base font-semibold text-white">
                  {getImageTypeLabel(currentImageType)}
                </p>
                <p className="text-xs text-slate-500">We&apos;ll cycle through each required angle automatically.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-ink-800 bg-slate-950 px-3 py-2 text-xs font-semibold uppercase text-slate-300">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-ink-400 focus:ring-ink-400"
                />
                Replace existing
              </label>
              <button
                type="button"
                onClick={handleCaptureClick}
                className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-white/40 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                {`Capture ${getImageTypeLabel(currentImageType)}${
                  activeUploads ? ` · ${activeUploads} uploading` : ''
                }`}
              </button>
              <input
                id="photo-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
          {guidedCaptureActive && guidedCaptureStepType ? (
            <div className="mt-4 rounded-2xl border border-ink-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Guided capture in progress</p>
                <button
                  type="button"
                  onClick={handleGuidedCancel}
                  className="text-xs font-semibold uppercase tracking-wide text-rose-200"
                >
                  End walkthrough
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-200">
                {guidedStepIsOptional ? 'Optional shot' : 'Next photo'}:{' '}
                <span className="font-semibold text-white">{getImageTypeLabel(guidedCaptureStepType)}</span>
              </p>
              <p className="text-xs text-slate-400">
                {guidedStepIsOptional
                  ? 'Misc can be skipped. Tap Capture to grab it or skip to move on.'
                  : 'Tap Capture to open the camera for this angle. We will prompt for the next one automatically.'}
              </p>
              {guidedStepIsOptional ? (
                <button
                  type="button"
                  onClick={handleGuidedSkipOptional}
                  className="mt-3 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200"
                >
                  Skip misc for now
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {IMAGE_TYPE_OPTIONS.map((option) => {
              const count = imageTypeCounts[option.value] ?? 0;
              const isActive = option.value === currentImageType;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCurrentImageType(option.value)}
                  className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${
                    count
                      ? 'border-emerald-400/30 bg-emerald-900/30 text-emerald-200'
                      : isActive
                        ? 'border-white/70 bg-white/5 text-white'
                        : 'border-ink-800 bg-slate-950 text-slate-300'
                  }`}
                >
                  <span className="block">{option.label}</span>
                  <span className="text-[10px] font-normal tracking-normal text-slate-400">
                    {count ? `${count} uploaded` : isActive ? 'Up next' : 'Queued'}
                  </span>
                </button>
              );
            })}
          </div>
          {uploadMessage ? <p className="mt-3 text-xs text-slate-400">{uploadMessage}</p> : null}
          <div className="mt-4">
            <PhotoGrid
              images={images}
              onDelete={handleDeleteImage}
              deletingFileName={deletingFileName}
            />
          </div>
        </section>

        <section className="rounded-3xl bg-ink-900 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Notes</h2>
            {notesSavedAt ? (
              <span className="text-xs text-slate-400">Saved {new Date(notesSavedAt).toLocaleTimeString()}</span>
            ) : null}
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Capture defects, pressing notes, or location tips…"
            className="mt-3 min-h-[120px] w-full rounded-2xl border border-ink-800 bg-slate-950 px-3 py-3 text-base text-white placeholder:text-slate-500 focus:border-ink-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleNotesSave}
            disabled={notesSaving}
            className="mt-3 w-full rounded-full bg-ink-800 px-4 py-3 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {notesSaving ? 'Saving…' : 'Save notes'}
          </button>
        </section>
      </div>
    );
  }

  const pageTitle = copy?.grade ?? 'Copy details';
  const pageSubtitle = copy?.raw_slabbed ?? copy?.format ?? 'Copy overview';

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      backTo={`/series/${seriesId}/issues/${issueId}`}
      homeTo="/"
      rightSlot={<SeriesSearchToolbar />}
    >
      {body}
    </PageLayout>
  );
}
