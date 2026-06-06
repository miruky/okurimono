import { describe, expect, it } from 'vitest';
import { importBackup } from './backup';
import { serializeRecords, type GiftRecord } from './record';

function rec(id: string, p: Partial<GiftRecord> = {}): GiftRecord {
  return {
    id,
    direction: 'received',
    kind: 'wedding',
    person: '伯母',
    item: 'ご祝儀',
    amount: 30000,
    date: '2026-01-01',
    returnStatus: 'pending',
    note: '',
    ...p,
  };
}

describe('importBackup', () => {
  it('新しいidだけ取り込む', () => {
    const existing = [rec('a')];
    const json = serializeRecords([rec('b'), rec('c')]);
    const result = importBackup(existing, json);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.records.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('idが重複する記録は既存を残して見送る', () => {
    const existing = [rec('a', { person: '元の名前' })];
    const json = serializeRecords([rec('a', { person: '上書きしたい名前' }), rec('b')]);
    const result = importBackup(existing, json);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.records.find((r) => r.id === 'a')?.person).toBe('元の名前');
  });

  it('壊れたJSONは何も取り込まない', () => {
    const existing = [rec('a')];
    const result = importBackup(existing, '{壊れた');
    expect(result.added).toBe(0);
    expect(result.records).toHaveLength(1);
  });

  it('形が不正な要素は読み飛ばす', () => {
    const existing: GiftRecord[] = [];
    const json = JSON.stringify([{ id: 'x', person: '' }, rec('ok')]);
    const result = importBackup(existing, json);
    expect(result.added).toBe(1);
    expect(result.records[0]?.id).toBe('ok');
  });
});
