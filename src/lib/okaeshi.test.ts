import { describe, expect, it } from 'vitest';
import { formatYen, pendingReturns, suggestReturn } from './okaeshi';
import type { GiftRecord } from './record';

function record(over: Partial<GiftRecord>): GiftRecord {
  return {
    id: 'x',
    direction: 'received',
    kind: 'wedding',
    person: '相手',
    item: '',
    amount: 10000,
    date: '2026-06-13',
    returnStatus: 'pending',
    note: '',
    ...over,
  };
}

describe('formatYen', () => {
  it('3桁区切りを入れる', () => {
    expect(formatYen(0)).toBe('0円');
    expect(formatYen(5000)).toBe('5,000円');
    expect(formatYen(1234567)).toBe('1,234,567円');
  });
});

describe('suggestReturn', () => {
  it('3分の1から半返しを100円単位で出す', () => {
    expect(suggestReturn(30000)).toEqual({ low: 10000, high: 15000 });
    expect(suggestReturn(10000)).toEqual({ low: 3300, high: 5000 });
    expect(suggestReturn(5000)).toEqual({ low: 1700, high: 2500 });
  });

  it('金額の分からない品物はnull', () => {
    expect(suggestReturn(0)).toBeNull();
  });
});

describe('pendingReturns', () => {
  it('もらった×お返し待ちだけを古い順に並べる', () => {
    const records = [
      record({ id: 'new', date: '2026-06-01' }),
      record({ id: 'old', date: '2026-01-01' }),
      record({ id: 'done', returnStatus: 'done' }),
      record({ id: 'given', direction: 'given', returnStatus: 'none' }),
      record({ id: 'norequire', returnStatus: 'none' }),
    ];
    expect(pendingReturns(records).map((r) => r.id)).toEqual(['old', 'new']);
  });
});
