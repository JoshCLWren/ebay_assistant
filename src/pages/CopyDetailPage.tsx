import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  deleteCopyImage,
  getCopy,
  getSeries,
  getIssue,
  listCopies,
  listCopyImages,
  listEbayDescriptions,
  listEbayModels,
  createEbayDescription,
  updateEbayDescription,
  uploadCopyImagesWithPolling,
  estimateEbayDescriptionCost,
  type ComicImage,
  type Copy,
  type Series,
  type Issue,
  type EbayDescription,
  type EbayModel,
  type ImageType,
  type CostEstimateResponse,
} from '../api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { PhotoGrid } from '../components/PhotoGrid';
import { PageLayout } from '../components/PageLayout';
import { SeriesSearchToolbar } from '../components/SeriesSearchToolbar';
import { ClipboardDocumentIcon, PencilSquareIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';

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
  const [series, setSeries] = useState<Series | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [images, setImages] = useState<ComicImage[]>([]);
  const [descriptions, setDescriptions] = useState<EbayDescription[]>([]);
  const [models, setModels] = useState<EbayModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageType, setCurrentImageType] = useState<ImageType>(IMAGE_TYPE_OPTIONS[0].value);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null);
  const [guidedCaptureActive, setGuidedCaptureActive] = useState(false);
  const [guidedCaptureIndex, setGuidedCaptureIndex] = useState(0);
  const [activeUploads, setActiveUploads] = useState(0);
  const [isSingleCopy, setIsSingleCopy] = useState(false);
  const [isPhotosExpanded, setIsPhotosExpanded] = useState(false);

  // Enhancement States
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [estimate, setEstimate] = useState<CostEstimateResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [confirmingRegenId, setConfirmingRegenId] = useState<number | null>(null);
  const [recentlyRegeneratedId, setRecentlyRegeneratedId] = useState<number | null>(null);
  const [descMessage, setDescMessage] = useState<string | null>(null);

  const toggleExpand = (id: number) => {
    if (isEditing) return; // Prevent collapse while editing
    setExpandedId(expandedId === id ? null : id);
  };

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

  const refreshDescriptions = useCallback(async () => {
    try {
      const response = await listEbayDescriptions({ seriesId, pageSize: 100 });
      const matching = response.descriptions.filter((d: EbayDescription) => d.issue_id === issueId);
      setDescriptions(matching);
      // Auto-expand the first one if none expanded and we have some
      if (matching.length > 0 && expandedId === null) {
        setExpandedId(matching[0].id);
      }
    } catch (err) {
      console.error('Failed to refresh descriptions', err);
    }
  }, [seriesId, issueId, expandedId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          copyResponse,
          seriesResponse,
          issueResponse,
          imagesResponse,
          copiesListResponse,
          descriptionsResponse,
          modelsResponse
        ] = await Promise.all([
          getCopy(issueId, copyId),
          getSeries(seriesId),
          getIssue(seriesId, issueId),
          listCopyImages(seriesId, issueId, copyId),
          listCopies(issueId, { pageSize: 2 }),
          listEbayDescriptions({ seriesId, pageSize: 100 }),
          listEbayModels(),
        ]);
        if (cancelled) return;
        setCopy(copyResponse);
        setSeries(seriesResponse);
        setIssue(issueResponse);
        setImages(imagesResponse.images);
        setIsSingleCopy(copiesListResponse.copies.length === 1);

        const matchingDescriptions = descriptionsResponse.descriptions.filter((d: EbayDescription) => d.issue_id === issueId);
        setDescriptions(matchingDescriptions);
        setModels(modelsResponse.models);
        if (modelsResponse.models.length > 0) {
          setSelectedModelId(modelsResponse.models[0].id);
        }

        // Auto-expand photos if there are any
        if (imagesResponse.images.length > 0) {
          setIsPhotosExpanded(true);
        }

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

  const handleCopyDescription = async () => {
    const desc = descriptions.find(d => d.id === expandedId);
    if (!desc) return;
    try {
      await navigator.clipboard.writeText(desc.description);
      setUploadMessage('Description copied to clipboard');
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (err) {
      setUploadMessage('Failed to copy');
    }
  };

  const startEditing = () => {
    const desc = descriptions.find(d => d.id === expandedId);
    if (!desc) return;
    setEditContent(desc.description);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const saveDescription = async () => {
    const desc = descriptions.find((d) => d.id === expandedId);
    if (!desc) return;
    setDescMessage('Saving description…');
    try {
      await updateEbayDescription(desc.id, { description: editContent });
      await refreshDescriptions();
      setIsEditing(false);
      setDescMessage('Description updated');
      setRecentlyRegeneratedId(desc.id);
      setTimeout(() => {
        setRecentlyRegeneratedId(null);
        setDescMessage(null);
      }, 4000);
    } catch (err) {
      setDescMessage(err instanceof Error ? err.message : 'Save failed');
      setTimeout(() => setDescMessage(null), 5000);
    } finally {
      setIsEditing(false);
    }
  };

  const fetchEstimate = useCallback(async (modelId: string) => {
    if (!modelId) return;
    setIsEstimating(true);
    try {
      const resp = await estimateEbayDescriptionCost({
        issue_id: issueId,
        copy_id: copyId,
        model: modelId,
      });
      setEstimate(resp);
    } catch (err) {
      console.error('Failed to fetch cost estimate', err);
    } finally {
      setIsEstimating(false);
    }
  }, [issueId, copyId]);

  useEffect(() => {
    if (showGenerateForm && selectedModelId) {
      fetchEstimate(selectedModelId);
    } else if (!showGenerateForm) {
      setEstimate(null);
    }
  }, [showGenerateForm, selectedModelId, fetchEstimate]);

  const handleGenerate = async () => {
    if (!selectedModelId) return;
    setIsGenerating(true);
    setDescMessage('Generating description…');
    try {
      const resp = await createEbayDescription({
        issue_id: issueId,
        model: selectedModelId,
        estimate_id: estimate?.estimate_id,
      });
      await refreshDescriptions();
      setDescMessage('Description generated');
      setRecentlyRegeneratedId(resp.id);
      setShowGenerateForm(false);
      setEstimate(null);
      setTimeout(() => {
        setRecentlyRegeneratedId(null);
        setDescMessage(null);
      }, 4000);
    } catch (err) {
      setDescMessage(err instanceof Error ? err.message : 'Generation failed');
      setTimeout(() => setDescMessage(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (descId: number) => {
    const desc = descriptions.find((d) => d.id === descId);
    if (!desc) {
      console.error('[Regen] No description found for id:', descId);
      return;
    }

    try {
      setIsGenerating(true);
      setUploadMessage('Regenerating description…');
      console.log('[Regen] Sending update request for:', desc.id);
      await updateEbayDescription(desc.id, {
        regenerate: true,
      });
      await refreshDescriptions();
      setRecentlyRegeneratedId(desc.id);
      setDescMessage('Description regenerated');
      console.log('[Regen] Success');
      setTimeout(() => {
        setRecentlyRegeneratedId(null);
        setDescMessage(null);
      }, 4000);
    } catch (err) {
      console.error('[Regen] Fatal error:', err);
      const msg = err instanceof Error ? err.message : 'Regeneration failed';
      setDescMessage(msg);
      setTimeout(() => setDescMessage(null), 5000);
    } finally {
      setIsGenerating(false);
      setEstimate(null);
      setConfirmingRegenId(null);
    }
  };

  const prepareRegen = async (desc: EbayDescription) => {
    if (confirmingRegenId === desc.id) {
      handleRegenerate(desc.id);
      return;
    }

    try {
      setIsEstimating(true);
      console.log('[Regen] Fetching estimate for model:', desc.model);
      const currentEstimate = await estimateEbayDescriptionCost({
        issue_id: issueId,
        copy_id: copyId,
        model: desc.model,
      });
      setEstimate(currentEstimate);
      setConfirmingRegenId(desc.id);
      console.log('[Regen] Estimate received. Ready to confirm.');
    } catch (err) {
      console.error('[Regen] Failed to fetch estimate:', err);
      setUploadMessage('Unable to fetch cost estimate. Please try again.');
    } finally {
      setIsEstimating(false);
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



  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 10) return 'just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };


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
        <section className="rounded-3xl bg-ink-900 shadow-card">
          <button
            type="button"
            onClick={() => setIsPhotosExpanded(!isPhotosExpanded)}
            className="flex w-full items-center justify-between p-4"
          >
            <div className="text-left">
              <h2 className="text-base font-semibold text-white">Photos</h2>
              <p className="text-sm text-slate-400">
                {images.length} uploaded {isPhotosExpanded ? '' : '(Collapsed)'}
              </p>
            </div>
            <div className={`text-slate-400 transition-transform duration-300 ${isPhotosExpanded ? 'rotate-180' : ''}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {isPhotosExpanded && (
            <div className="p-4 pt-0 border-t border-ink-800/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="rounded-2xl border border-ink-800 bg-slate-950 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Up next</p>
                    <p className="text-base font-semibold text-white">
                      {getImageTypeLabel(currentImageType)}
                    </p>
                    <p className="text-xs text-slate-500">We&apos;ll cycle through angles automatically.</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-ink-800 bg-slate-950 px-3 py-2 text-xs font-semibold uppercase text-slate-300">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(event) => setReplaceExisting(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-ink-400 focus:ring-ink-400"
                    />
                    Replace
                  </label>
                  <button
                    type="button"
                    onClick={handleCaptureClick}
                    className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-white/40 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    {`Capture ${getImageTypeLabel(currentImageType)}${activeUploads ? ` · ${activeUploads} uploading` : ''}`}
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

              {guidedCaptureActive && guidedCaptureStepType && (
                <div className="mb-4 rounded-2xl border border-ink-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">Guided capture</p>
                    <button
                      type="button"
                      onClick={handleGuidedCancel}
                      className="text-xs font-semibold uppercase tracking-wide text-rose-200"
                    >
                      End
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    {guidedStepIsOptional ? 'Optional' : 'Next'}:{' '}
                    <span className="font-semibold text-white">{getImageTypeLabel(guidedCaptureStepType)}</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {IMAGE_TYPE_OPTIONS.map((option) => {
                  const count = imageTypeCounts[option.value] ?? 0;
                  const isActive = option.value === currentImageType;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCurrentImageType(option.value)}
                      className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${count
                        ? 'border-emerald-400/30 bg-emerald-900/30 text-emerald-200'
                        : isActive
                          ? 'border-white/70 bg-white/5 text-white'
                          : 'border-ink-800 bg-slate-950 text-slate-300'
                        }`}
                    >
                      <span className="block truncate">{option.label}</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        {count ? `${count} up` : isActive ? 'Next' : 'Queued'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {uploadMessage && <p className="mt-3 text-xs text-slate-400">{uploadMessage}</p>}

              <div className="mt-4">
                <PhotoGrid
                  images={images}
                  onDelete={handleDeleteImage}
                  deletingFileName={deletingFileName}
                />
              </div>
            </div>
          )}
        </section>


        {/* Enhanced eBay Descriptions Section (Accordion List View) */}
        <section className="rounded-3xl bg-ink-900 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">eBay Descriptions</h2>
            <div className="flex items-center gap-3">
              {descMessage && (
                <span className="animate-fade-in text-xs font-medium text-emerald-400">
                  {descMessage}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowGenerateForm(!showGenerateForm)}
                className="flex items-center gap-1.5 rounded-full bg-ink-800 px-3 py-1.5 text-xs font-semibold text-primary-400 transition-colors hover:bg-ink-700 hover:text-primary-300"
              >
                <SparklesIcon className="h-3 w-3" />
                New
              </button>
            </div>
          </div>

          {showGenerateForm && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-ink-800 bg-slate-950 p-4 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-500/10 text-primary-400">
                  <SparklesIcon className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Generate New Description</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="flex-1 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="" disabled>Select a model</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedModelId || isEstimating}
                  className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-900/40 disabled:opacity-50"
                >
                  <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
                  {isGenerating ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Estimate Display */}
              {(isEstimating || estimate) && (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/5 bg-ink-900/50 p-3 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-y-2 text-[11px]">
                    <div className="flex items-center gap-3">
                      {isEstimating ? (
                        <span className="flex items-center gap-2 font-medium text-slate-400">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500" />
                          Analyzing contents...
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase tracking-wider text-slate-500">Resource Usage</span>
                            <span className="font-semibold text-slate-300">
                              {estimate?.estimated_prompt_tokens} prompt / {estimate?.estimated_completion_tokens} completion
                            </span>
                          </div>
                          <div className="h-6 w-px bg-white/5" />
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase tracking-wider text-slate-500">Projected Cost</span>
                            <span className="font-bold text-emerald-400">
                              ${estimate?.estimated_cost_usd?.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {descriptions.length > 0 ? (
              descriptions.map((desc) => {
                const isExpanded = expandedId === desc.id;
                const isRecent = recentlyRegeneratedId === desc.id;
                const descText = desc.description || '';
                const firstLine = (descText.split('\n')[0] || '').substring(0, 100);
                const charCount = descText.length;

                return (
                  <div
                    key={desc.id}
                    className={`overflow-hidden rounded-2xl border transition-all duration-500 ${isRecent
                      ? 'animate-success-pulse ring-2 ring-emerald-500/20'
                      : 'border-ink-800 bg-slate-950'
                      }`}
                  >
                    {/* Header/Preview */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(desc.id)}
                      className={`flex w-full flex-col p-4 text-left transition-colors hover:bg-white/5 ${isExpanded ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isRecent && <CheckIcon className="h-3 w-3 text-emerald-400 animate-bounce" />}
                          <span className="rounded-lg bg-ink-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            {desc.model}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatRelativeTime(desc.created_at)}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">{charCount} chars</span>
                      </div>
                      {!isExpanded && (
                        <p className="mt-2 truncate text-sm text-slate-400">{firstLine}...</p>
                      )}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-ink-800 p-4 pt-2">
                        <div className="mb-3 flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleCopyDescription}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-ink-800 hover:text-white"
                            title="Copy to clipboard"
                          >
                            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={startEditing}
                            disabled={isEditing}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-ink-800 hover:text-white disabled:opacity-50"
                            title="Edit description"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <div className="flex items-center gap-1.5">
                            {confirmingRegenId === desc.id ? (
                              <div className="flex items-center gap-2 rounded-lg bg-emerald-900/30 px-2 py-1">
                                <span className="text-[10px] font-medium text-emerald-300">
                                  Confirm? {estimate ? `(Est: $${Number(estimate.estimated_cost_usd).toFixed(4)})` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRegenerate(desc.id)}
                                  disabled={isGenerating}
                                  className="text-xs font-bold text-emerald-400 hover:text-emerald-200"
                                >
                                  YES
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmingRegenId(null);
                                    setEstimate(null);
                                  }}
                                  className="text-xs font-bold text-slate-400 hover:text-slate-200"
                                >
                                  NO
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => prepareRegen(desc)}
                                disabled={isGenerating || isEstimating || isEditing}
                                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-ink-800 hover:text-white disabled:opacity-50"
                                title="Regenerate with same model"
                              >
                                {isEstimating && expandedId === desc.id ? (
                                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
                                ) : (
                                  <SparklesIcon className="h-3.5 w-3.5" />
                                )}
                                Regen
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[200px] w-full rounded-2xl border border-ink-800 bg-ink-900 p-4 font-mono text-sm leading-relaxed text-slate-300 focus:border-ink-400 focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="rounded-full px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveDescription}
                                className="rounded-full bg-ink-800 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-700"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-ink-900 p-4 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                            {desc.description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              !showGenerateForm && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-800 py-8 text-center bg-white/5">
                  <SparklesIcon className="mb-2 h-6 w-6 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">No descriptions yet</p>
                  <p className="text-xs text-slate-600">Generate one using AI to get started</p>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    );
  }

  const pageTitle = series?.title ?? 'Copy details';
  const pageSubtitle = issue?.issue_nr ? `Issue #${issue.issue_nr}` : `Copy #${copyId}`;

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      backTo={
        isSingleCopy
          ? `/series/${seriesId}`
          : `/series/${seriesId}/issues/${issueId}`
      }
      backState={
        isSingleCopy
          ? undefined
          : { preventAutoRedirect: true }
      }
      homeTo="/"
      rightSlot={<SeriesSearchToolbar />}
    >
      {body}
    </PageLayout>
  );
}
