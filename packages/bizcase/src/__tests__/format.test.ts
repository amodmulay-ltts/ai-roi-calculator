import { describe, it, expect } from 'vitest';
import { formatMoney, formatPayback, formatRoi } from '../format.js';

describe('formatMoney', () => {
  it('uses K for hundreds of thousands and M for millions', () => {
    expect(formatMoney(418400)).toBe('€418K');
    expect(formatMoney(1066000)).toBe('€1.1M');
  });
  it('shows full euros below 100,000', () => {
    expect(formatMoney(19400)).toBe('€19,400');
  });
  it('puts the minus sign before the euro symbol', () => {
    expect(formatMoney(-187112)).toBe('-€187K');
    expect(formatMoney(-19400)).toBe('-€19,400');
  });
});

describe('formatPayback and formatRoi', () => {
  it('formats payback months and the no-payback case', () => {
    expect(formatPayback(15)).toBe('Month 15');
    expect(formatPayback(null)).toBe('Not within 36 months');
  });
  it('rounds ROI and shows n/a without an investment', () => {
    expect(formatRoi(210.3)).toBe('210%');
    expect(formatRoi(null)).toBe('n/a');
  });
});
