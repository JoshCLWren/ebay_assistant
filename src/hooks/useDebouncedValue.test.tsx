import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('delays updates until the provided timeout', () => {
    vi.useFakeTimers();
    const { result, rerender, unmount } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'alpha', delay: 200 },
    });

    expect(result.current).toBe('alpha');

    rerender({ value: 'beta', delay: 200 });
    expect(result.current).toBe('alpha');

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe('alpha');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('beta');

    rerender({ value: 'gamma', delay: 100 });
    rerender({ value: 'delta', delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('delta');

    unmount();
    vi.useRealTimers();
  });
});
