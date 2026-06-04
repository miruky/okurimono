import { describe, expect, it } from 'vitest';
import {
  createStore,
  deserializeRecords,
  serializeRecords,
  sortByDateDesc,
  type GiftRecord,
} from './record';
import { seedRecords } from './seed';

function record(over: Partial<GiftRecord>): GiftRecord {
  return {
    id: 'x',
    direction: 'given',
    kind: 'other',
    person: '相手',
    item: '',
    amount: 0,
    date: '2026-06-13',
    returnStatus: 'none',
    note: '',
    ...over,
  };
}

describe('deserializeRecords', () => {
  it('seedRecordsと往復できる', () => {
    const records = seedRecords();
    expect(deserializeRecords(serializeRecords(records))).toEqual(records);
  });

  it('壊れたJSON・配列でないものは空', () => {
    expect(deserializeRecords('{')).toEqual([]);
    expect(deserializeRecords('{"a":1}')).toEqual([]);
  });

  it('形の崩れた要素だけを読み飛ばす', () => {
    const good = record({ id: 'ok' });
    const json = JSON.stringify([
      good,
      { ...good, direction: 'lent' },
      { ...good, amount: -1 },
      { ...good, person: '' },
      { ...good, date: '6月13日' },
    ]);
    expect(deserializeRecords(json)).toEqual([good]);
  });
});

describe('sortByDateDesc', () => {
  it('新しい日付が先頭、同日は入力順', () => {
    const records = [
      record({ id: 'a', date: '2026-01-01' }),
      record({ id: 'b', date: '2026-06-01' }),
      record({ id: 'c', date: '2026-06-01' }),
      record({ id: 'd', date: '2025-12-31' }),
    ];
    expect(sortByDateDesc(records).map((r) => r.id)).toEqual(['b', 'c', 'a', 'd']);
  });
});

describe('createStore', () => {
  function memoryStorage(): {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
  } {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    };
  }

  it('保存して読み戻し、空配列とnullを区別する', () => {
    const store = createStore(memoryStorage());
    expect(store.load()).toBeNull();
    store.save([]);
    expect(store.load()).toEqual([]);
    const records = seedRecords();
    store.save(records);
    expect(store.load()).toEqual(records);
  });
});
