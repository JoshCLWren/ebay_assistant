import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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

    const thumbButtons = screen.getAllByRole('button');
    expect(thumbButtons).toHaveLength(2);

    await user.click(thumbButtons[0]);
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeVisible();

    await user.click(closeButton);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });
});
