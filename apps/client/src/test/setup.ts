import '@testing-library/jest-dom/vitest';
import i18n from '@/lib/i18n';

// Copy getters follow i18n. Tests assert the French source.
void i18n.changeLanguage('fr');

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
