import { useState } from 'react';
import { buildImageUrl, type ComicImage } from '../api';

interface PhotoGridProps {
  images: ComicImage[];
  onDelete?: (image: ComicImage) => void;
  deletingFileName?: string | null;
}

const IMAGE_TYPE_PRIORITY: Record<string, number> = {
  front: 1,
  back: 2,
  spine: 3,
  staples: 4,
  interior_front_cover: 5,
  interior_back_cover: 6,
  misc: 7,
};

export function PhotoGrid({ images, onDelete, deletingFileName }: PhotoGridProps) {
  const [active, setActive] = useState<ComicImage | null>(null);

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900 px-4 py-8 text-center text-sm text-slate-300">
        No photos yet. Upload shots as you prep this copy.
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => {
    const priorityA = IMAGE_TYPE_PRIORITY[a.image_type] ?? 99;
    const priorityB = IMAGE_TYPE_PRIORITY[b.image_type] ?? 99;
    return priorityA - priorityB;
  });

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {sortedImages.map((image, index) => (
          <div
            key={image.relative_path}
            className="group relative overflow-hidden rounded-2xl bg-ink-800/40 shadow-card backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-ink-800/60 hover:ring-2 hover:ring-primary-500/50 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
          >
            <button
              type="button"
              onClick={() => setActive(image)}
              aria-label={`Preview ${image.image_type} photo`}
              className="block w-full overflow-hidden"
            >
              <img
                src={buildImageUrl(image.relative_path, image.file_name)}
                alt={image.image_type}
                className="h-32 w-full object-cover transition duration-500 group-hover:scale-110 group-active:scale-105"
              />
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent p-2 pt-6">
              <div className="flex items-center justify-between text-left">
                <span className="truncate text-[10px] font-bold uppercase tracking-wider text-ink-200 group-hover:text-primary-200">
                  {image.image_type.replace(/_/g, ' ')}
                </span>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(image)}
                    disabled={Boolean(deletingFileName)}
                    className="ml-1 rounded-full bg-rose-500/10 p-1.5 text-rose-300 backdrop-blur transition hover:bg-rose-500/20 active:scale-90"
                    aria-label="Delete"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
            {/* Overlay loading/deleting state could go here */}
            {deletingFileName === image.file_name ? (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-ink-900 ring-1 ring-white/10 shadow-2xl animate-scale-up"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={buildImageUrl(active.relative_path, active.file_name)}
              alt={active.image_type}
              className="max-h-[85vh] w-full object-contain bg-black/20"
            />

            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-start pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur text-xs font-bold uppercase tracking-wider text-white ring-1 ring-white/10">
                {active.image_type.replace(/_/g, ' ')}
              </span>
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-black/40 p-2 text-white backdrop-blur ring-1 ring-white/10 transition hover:bg-white/10 active:scale-90"
                onClick={() => setActive(null)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
