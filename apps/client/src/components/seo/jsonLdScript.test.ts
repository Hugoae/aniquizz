import { describe, expect, it } from 'vitest';
import { jsonLdScriptHtml } from './jsonLdScript';

describe('jsonLdScriptHtml', () => {
  it('keeps a script tag from being closed by a string value', () => {
    const html = jsonLdScriptHtml({ name: '</script><script>alert(1)</script>' });
    expect(html).not.toContain('<');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(html)).toEqual({
      name: '</script><script>alert(1)</script>',
    });
  });

  it('escapes ampersands and line separators', () => {
    const html = jsonLdScriptHtml({ name: 'a&b\u2028c' });
    expect(html).toContain('\\u0026');
    expect(html).toContain('\\u2028');
    expect(html).not.toContain('&');
    expect(html).not.toContain('\u2028');
  });
});
