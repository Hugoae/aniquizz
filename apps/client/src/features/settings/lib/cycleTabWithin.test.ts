import { describe, expect, it } from 'vitest';
import { cycleTabWithin } from './cycleTabWithin';

function tabEvent(shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
}

function visibleButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = label;
  Object.defineProperty(button, 'offsetParent', {
    configurable: true,
    get: () => document.body,
  });
  return button;
}

describe('cycleTabWithin', () => {
  it('wraps Tab from the last control back to the first', () => {
    const root = document.createElement('div');
    const first = visibleButton('first');
    const last = visibleButton('last');
    root.append(first, last);
    document.body.append(root);
    last.focus();

    const event = tabEvent();
    cycleTabWithin(root, event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    root.remove();
  });

  it('wraps Shift+Tab from the first control back to the last', () => {
    const root = document.createElement('div');
    const first = visibleButton('first');
    const last = visibleButton('last');
    root.append(first, last);
    document.body.append(root);
    first.focus();

    const event = tabEvent(true);
    cycleTabWithin(root, event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    root.remove();
  });
});
