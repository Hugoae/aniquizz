import { describe, expect, it, vi } from 'vitest';
import { routeIntentHandlers } from './routePrefetch';

describe('routeIntentHandlers', () => {
  it('fires the same warmup on pointer enter, focus, and pointer down (touch)', () => {
    const run = vi.fn();
    const handlers = routeIntentHandlers(run);
    handlers.onPointerEnter();
    handlers.onFocus();
    handlers.onPointerDown();
    expect(run).toHaveBeenCalledTimes(3);
  });
});
