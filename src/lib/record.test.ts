import { describe, expect, it } from 'vitest';
import {
  createStore,
  deserializeRecords,
  isSortMode,
  serializeRecords,
  sortByDateDesc,
  sortRecords,
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

describe('sortRecords', () => {
  const records = [
    record({ id: 'a', date: '2026-01-01', amount: 5000, person: 'さとう' }),
    record({ id: 'b', date: '2026-06-01', amount: 30000, person: 'たなか' }),
    record({ id: 'c', date: '2025-12-31', amount: 10000, person: 'あべ' }),
  ];

  it('日付の新しい順・古い順', () => {
    expect(sortRecords(records, 'date-desc').map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(sortRecords(records, 'date-asc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('金額の高い順', () => {
    expect(sortRecords(records, 'amount-desc').map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('相手の名前順', () => {
    expect(sortRecords(records, 'person').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('元の配列を変更しない', () => {
    const before = records.map((r) => r.id);
    sortRecords(records, 'amount-desc');
    expect(records.map((r) => r.id)).toEqual(before);
  });
});

describe('isSortMode', () => {
  it('既知のモードだけ受け入れる', () => {
    expect(isSortMode('amount-desc')).toBe(true);
    expect(isSortMode('color')).toBe(false);
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
