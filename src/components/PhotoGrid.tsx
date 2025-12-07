import { useState } from 'react';
import { buildImageUrl, type ComicImage } from '../api';

interface PhotoGridProps {
  images: ComicImage[];
}

export function PhotoGrid({ images }: PhotoGridProps) {
  const [active, setActive] = useState<ComicImage | null>(null);

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No photos yet. Upload shots as you prep this copy.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {images.map((image) => (
          <button
            key={image.relative_path}
            type="button"
            onClick={() => setActive(image)}
            className="group overflow-hidden rounded-xl bg-slate-200 shadow-card"
          >
            <img
              src={buildImageUrl(image.relative_path)}
              alt={image.image_type}
              className="h-28 w-full object-cover transition group-hover:scale-105"
            />
            <div className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              {image.image_type.replace(/_/g, ' ')}
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6 py-10"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-full max-w-md overflow-hidden rounded-3xl bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={buildImageUrl(active.relative_path)}
              alt={active.image_type}
              className="max-h-[80vh] w-full object-contain"
            />
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-ink-900"
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
