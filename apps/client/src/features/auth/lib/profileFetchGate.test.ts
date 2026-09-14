import { describe, expect, it } from 'vitest';
import { createProfileFetchGate } from './profileFetchGate';

describe('createProfileFetchGate', () => {
  it('ignores a slower fetch after the session user changes', () => {
    const gate = createProfileFetchGate();
    const first = gate.begin('user-a');
    const second = gate.begin('user-b');

    expect(first.skipped).toBe(false);
    expect(second.skipped).toBe(false);
    expect(gate.isCurrent(first.generation)).toBe(false);
    expect(gate.isCurrent(second.generation)).toBe(true);
  });

  it('does not start a second SELECT for the same user already in flight', () => {
    const gate = createProfileFetchGate();
    const first = gate.begin('user-a');
    const duplicate = gate.begin('user-a');

    expect(first.skipped).toBe(false);
    expect(duplicate.skipped).toBe(true);
    expect(gate.isCurrent(first.generation)).toBe(true);
  });

  it('allows a retry after invalidate (sign-out or failed generation)', () => {
    const gate = createProfileFetchGate();
    const first = gate.begin('user-a');
    gate.invalidate();

    expect(gate.isCurrent(first.generation)).toBe(false);

    const retry = gate.begin('user-a');
    expect(retry.skipped).toBe(false);
    expect(gate.isCurrent(retry.generation)).toBe(true);
  });
});
