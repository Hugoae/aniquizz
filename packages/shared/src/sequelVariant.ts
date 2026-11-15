/**
 * Two catalogue titles that share a stem and differ only by a season marker.
 * "Tokyo Ghoul" vs "Tokyo Ghoul:re", "My Hero Academia" vs "My Hero Academia 2".
 * A one-character typo ("narutoo") is not a marker, so spelling tolerance still applies.
 */
const SEQUEL_EXTRA =
  /^(?:re|r\d+|s\d+|\d+(?:st|nd|rd|th)?(?:season|part|cour)?|ii|iii|iv|v|vi|vii|viii|ix|x|season\d*|part\d*|cour\d*|film\w*|movie\w*|ova|ona|special\w*|final\w*)$/;

export function isSequelVariant(left: string, right: string): boolean {
  if (!left || !right || left === right) return false;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  // Stems shorter than this are too small to decide ("re" itself, "ii").
  if (shorter.length < 4) return false;
  if (!longer.startsWith(shorter)) return false;
  return SEQUEL_EXTRA.test(longer.slice(shorter.length));
}
