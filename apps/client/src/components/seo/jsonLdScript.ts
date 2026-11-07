/**
 * react-helmet-async copies `<script>` children into `innerHTML`.
 * `JSON.stringify` leaves `<` intact, so a value could close the tag.
 * Escape the characters that are special inside an HTML script body.
 */
export function jsonLdScriptHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
