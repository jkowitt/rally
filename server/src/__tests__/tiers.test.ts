import { describe, it, expect } from 'vitest';
import { getTier } from '../lib/tiers';

describe('getTier', () => {
  it('returns Bronze for 0 points', () => {
    expect(getTier(0)).toBe('Bronze');
  });

  it('returns Bronze for 999 points', () => {
    expect(getTier(999)).toBe('Bronze');
  });

  it('returns Silver at 1000 points', () => {
    expect(getTier(1000)).toBe('Silver');
  });

  it('returns Silver at 2499 points', () => {
    expect(getTier(2499)).toBe('Silver');
  });

  it('returns Gold at 2500 points', () => {
    expect(getTier(2500)).toBe('Gold');
  });

  it('returns Gold at 4999 points', () => {
    expect(getTier(4999)).toBe('Gold');
  });

  it('returns Platinum at 5000 points', () => {
    expect(getTier(5000)).toBe('Platinum');
  });

  it('returns Platinum at very high points', () => {
    expect(getTier(100000)).toBe('Platinum');
  });

  it('returns Bronze for negative points', () => {
    expect(getTier(-100)).toBe('Bronze');
  });
});
