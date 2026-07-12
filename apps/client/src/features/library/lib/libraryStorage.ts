const FRANCHISES_KEY = 'library-expanded-franchises';
const ANIMES_KEY = 'library-expanded-animes';

export function loadExpandedFranchises(): Set<string> {
  try {
    const raw = sessionStorage.getItem(FRANCHISES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveExpandedFranchises(keys: Set<string>): void {
  try {
    sessionStorage.setItem(FRANCHISES_KEY, JSON.stringify([...keys]));
  } catch {
    /* ignore quota errors */
  }
}

export function loadExpandedAnimes(): Set<number> {
  try {
    const raw = sessionStorage.getItem(ANIMES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(
      Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'number' && Number.isFinite(v)) : [],
    );
  } catch {
    return new Set();
  }
}

export function saveExpandedAnimes(ids: Set<number>): void {
  try {
    sessionStorage.setItem(ANIMES_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota errors */
  }
}
