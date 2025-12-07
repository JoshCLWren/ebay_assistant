import { useState } from 'react';
import { buildImageUrl, type ComicImage } from '../api';

interface PhotoGridProps {
  images: ComicImage[];
  onDelete?: (image: ComicImage) => void;
  deletingFileName?: string | null;
}

export function PhotoGrid({ images, onDelete, deletingFileName }: PhotoGridProps) {
  const [active, setActive] = useState<ComicImage | null>(null);

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900 px-4 py-8 text-center text-sm text-slate-300">
        No photos yet. Upload shots as you prep this copy.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {images.map((image) => (
          <div key={image.relative_path} className="overflow-hidden rounded-xl bg-ink-800 shadow-card">
            <button
              type="button"
              onClick={() => setActive(image)}
              aria-label={`Preview ${image.image_type} photo`}
              className="block w-full overflow-hidden"
            >
              <img
                src={buildImageUrl(image.relative_path, image.file_name)}
                alt={image.image_type}
                className="h-28 w-full object-cover transition hover:scale-105"
              />
            </button>
            <div className="flex items-center justify-between px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
              <span className="truncate">{image.image_type.replace(/_/g, ' ')}</span>
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(image)}
                  disabled={Boolean(deletingFileName)}
                  className="ml-2 rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200 disabled:opacity-50"
                >
                  {deletingFileName === image.file_name ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6 py-10"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-full max-w-md overflow-hidden rounded-3xl bg-ink-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={buildImageUrl(active.relative_path, active.file_name)}
              alt={active.image_type}
              className="max-h-[80vh] w-full object-contain"
            />
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-ink-900/80 px-4 py-2 text-sm font-semibold text-white shadow-card"
              onClick={() => setActive(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
