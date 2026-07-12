let firstLandingPaint = true;

/** True only for the first landing render in this tab — skip entry motion on cold load. */
export function isFirstLandingPaint(): boolean {
  return firstLandingPaint;
}

export function markLandingPaintDone(): void {
  firstLandingPaint = false;
}
