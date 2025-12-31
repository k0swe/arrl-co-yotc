import { describe, it, expect } from 'vitest';
import { generateSlugFromName } from './slug.util';

describe('generateSlugFromName', () => {
  it('should generate slug from club name with multiple words', () => {
    expect(generateSlugFromName('Denver Radio Club')).toBe('drc');
  });

  it('should generate slug from club name with four words', () => {
    expect(generateSlugFromName('Rocky Mountain Radio League')).toBe('rmrl');
  });

  it('should handle single word club names', () => {
    expect(generateSlugFromName('Clubname')).toBe('c');
  });

  it('should handle extra whitespace between words', () => {
    expect(generateSlugFromName('Denver  Radio   Club')).toBe('drc');
  });

  it('should handle leading and trailing whitespace', () => {
    expect(generateSlugFromName('  Denver Radio Club  ')).toBe('drc');
  });

  it('should return empty string for empty input', () => {
    expect(generateSlugFromName('')).toBe('');
  });

  it('should return empty string for whitespace-only input', () => {
    expect(generateSlugFromName('   ')).toBe('');
  });

  it('should convert to lowercase', () => {
    expect(generateSlugFromName('DENVER RADIO CLUB')).toBe('drc');
  });

  it('should handle mixed case', () => {
    expect(generateSlugFromName('The Amateur Radio Club')).toBe('tarc');
  });

  it('should handle club names with articles', () => {
    expect(generateSlugFromName('The Denver Radio Club')).toBe('tdrc');
  });

  it('should handle numbers in club names', () => {
    expect(generateSlugFromName('440 Radio Club')).toBe('4rc');
  });

  it('should handle special characters at word boundaries', () => {
    expect(generateSlugFromName('Mile-High Radio Club')).toBe('mhrc');
  });
});
