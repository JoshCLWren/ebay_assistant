import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhotoGrid } from './PhotoGrid';
import type { ComicImage } from '../api';

const mockImage = (overrides: Partial<ComicImage> = {}): ComicImage => ({
  series_id: 1,
  issue_id: 2,
  copy_id: 3,
  image_type: 'interior_back_cover',
  file_name: 'test.jpg',
  relative_path: '/media/test.jpg',
  ...overrides,
});

describe('PhotoGrid', () => {
  it('renders an empty state when no images are provided', () => {
    render(<PhotoGrid images={[]} />);
    expect(
      screen.getByText('No photos yet. Upload shots as you prep this copy.'),
    ).toBeInTheDocument();
  });

  it('shows and hides the overlay as images are selected', async () => {
    const user = userEvent.setup();
    render(
      <PhotoGrid
        images={[
          mockImage({ image_type: 'front', relative_path: '/media/front.jpg' }),
          mockImage({ image_type: 'back', relative_path: '/media/back.jpg' }),
        ]}
      />,
    );

    const thumbButtons = screen.getAllByRole('button', { name: /preview/i });
    expect(thumbButtons).toHaveLength(2);

    await user.click(thumbButtons[0]);
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeVisible();

    await user.click(closeButton);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('surfaces delete buttons when a handler is provided', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const images = [mockImage({ file_name: 'delete-me.jpg' })];

    render(<PhotoGrid images={images} onDelete={onDelete} deletingFileName={null} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(images[0]);
  });
});
