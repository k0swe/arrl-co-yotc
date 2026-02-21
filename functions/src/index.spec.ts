import { describe, it, expect } from 'vitest';
import { escapeHtml, buildClubSuggestionHtml } from './index';

describe('escapeHtml', () => {
  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<a href="x&y">it\'s</a>')).toBe(
      '&lt;a href=&quot;x&amp;y&quot;&gt;it&#39;s&lt;/a&gt;',
    );
  });
});

describe('buildClubSuggestionHtml', () => {
  const base = {
    name: 'Denver ARC',
    callsign: 'W0DEN',
    location: 'Denver, CO',
    description: 'The Denver Amateur Radio Club',
  };

  it('includes the club name', () => {
    expect(buildClubSuggestionHtml(base)).toContain('Denver ARC');
  });

  it('includes the callsign', () => {
    expect(buildClubSuggestionHtml(base)).toContain('W0DEN');
  });

  it('includes the location', () => {
    expect(buildClubSuggestionHtml(base)).toContain('Denver, CO');
  });

  it('includes the description', () => {
    expect(buildClubSuggestionHtml(base)).toContain('The Denver Amateur Radio Club');
  });

  it('includes a website link when provided', () => {
    const html = buildClubSuggestionHtml({ ...base, website: 'https://example.com' });
    expect(html).toContain('https://example.com');
    expect(html).toContain('<a href=');
  });

  it('omits the website line when not provided', () => {
    const html = buildClubSuggestionHtml(base);
    expect(html).not.toContain('Website');
  });

  it('escapes HTML in club fields', () => {
    const html = buildClubSuggestionHtml({ ...base, name: '<Evil> Club & Co' });
    expect(html).toContain('&lt;Evil&gt; Club &amp; Co');
    expect(html).not.toContain('<Evil>');
  });

  it('escapes HTML in the website URL', () => {
    const html = buildClubSuggestionHtml({
      ...base,
      website: 'https://example.com?a=1&b=2',
    });
    expect(html).toContain('&amp;');
  });
});
