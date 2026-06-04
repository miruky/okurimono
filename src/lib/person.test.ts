import { describe, expect, it } from 'vitest';
import { personSummaries } from './person';
import type { GiftRecord } from './record';

function record(over: Partial<GiftRecord>): GiftRecord {
  return {
    id: 'x',
    direction: 'given',
    kind: 'other',
    person: '相手',
    item: '',
    amount: 1000,
    date: '2026-06-13',
    returnStatus: 'none',
    note: '',
    ...over,
  };
}

describe('personSummaries', () => {
  it('相手ごとに件数と金額を分けて集計する', () => {
    const records = [
      record({ person: '佐藤', direction: 'given', amount: 5000, date: '2026-01-01' }),
      record({ person: '佐藤', direction: 'received', amount: 3000, date: '2026-03-01' }),
      record({ person: '田中', direction: 'given', amount: 10000, date: '2026-02-01' }),
    ];
    expect(personSummaries(records)).toEqual([
      { person: '佐藤', count: 2, givenTotal: 5000, receivedTotal: 3000, lastDate: '2026-03-01' },
      { person: '田中', count: 1, givenTotal: 10000, receivedTotal: 0, lastDate: '2026-02-01' },
    ]);
  });

  it('やりとりの新しい順に並ぶ', () => {
    const records = [
      record({ person: '古い人', date: '2025-01-01' }),
      record({ person: '最近の人', date: '2026-06-01' }),
    ];
    expect(personSummaries(records).map((s) => s.person)).toEqual(['最近の人', '古い人']);
  });

  it('記録がなければ空', () => {
    expect(personSummaries([])).toEqual([]);
  });
});
