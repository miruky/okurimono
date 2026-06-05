import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';
import type { GiftRecord } from './record';

function rec(p: Partial<GiftRecord>): GiftRecord {
  return {
    id: Math.random().toString(36).slice(2),
    direction: 'received',
    kind: 'wedding',
    person: '誰か',
    item: '',
    amount: 0,
    date: '2026-01-01',
    returnStatus: 'none',
    note: '',
    ...p,
  };
}

describe('computeStats', () => {
  it('空の台帳ではすべて0', () => {
    const s = computeStats([]);
    expect(s.total).toBe(0);
    expect(s.balance).toBe(0);
    expect(s.byKind).toEqual([]);
  });

  it('方向ごとの件数と金額を分けて集計する', () => {
    const s = computeStats([
      rec({ direction: 'received', amount: 50000 }),
      rec({ direction: 'received', amount: 10000 }),
      rec({ direction: 'given', amount: 30000 }),
    ]);
    expect(s.receivedCount).toBe(2);
    expect(s.givenCount).toBe(1);
    expect(s.receivedTotal).toBe(60000);
    expect(s.givenTotal).toBe(30000);
  });

  it('balanceはもらった額からあげた額を引いた差', () => {
    const s = computeStats([
      rec({ direction: 'received', amount: 20000 }),
      rec({ direction: 'given', amount: 50000 }),
    ]);
    expect(s.balance).toBe(-30000);
  });

  it('お返し待ちはreceived且つpendingだけ数える', () => {
    const s = computeStats([
      rec({ direction: 'received', returnStatus: 'pending' }),
      rec({ direction: 'received', returnStatus: 'done' }),
      rec({ direction: 'given', returnStatus: 'pending' }),
    ]);
    expect(s.pendingCount).toBe(1);
  });

  it('種別の内訳は件数の多い順に並ぶ', () => {
    const s = computeStats([
      rec({ kind: 'wedding', amount: 30000 }),
      rec({ kind: 'condolence', amount: 10000 }),
      rec({ kind: 'condolence', amount: 5000 }),
    ]);
    expect(s.byKind[0]?.kind).toBe('condolence');
    expect(s.byKind[0]?.count).toBe(2);
    expect(s.byKind[0]?.total).toBe(15000);
    expect(s.byKind[1]?.kind).toBe('wedding');
  });

  it('同じ件数なら金額の多い種別を先に並べる', () => {
    const s = computeStats([
      rec({ kind: 'baby', amount: 5000 }),
      rec({ kind: 'housewarming', amount: 30000 }),
    ]);
    expect(s.byKind[0]?.kind).toBe('housewarming');
  });
});
