import { describe, expect, it } from 'vitest';
import { csvField, recordsToCsv } from './csv';
import type { GiftRecord } from './record';

function record(over: Partial<GiftRecord>): GiftRecord {
  return {
    id: 'x',
    direction: 'given',
    kind: 'seibo',
    person: '佐藤',
    item: 'ハム',
    amount: 5000,
    date: '2025-12-10',
    returnStatus: 'none',
    note: '',
    ...over,
  };
}

describe('csvField', () => {
  it('カンマ・引用符・改行を含むときだけ引用符で包む', () => {
    expect(csvField('ハム')).toBe('ハム');
    expect(csvField('ハム,ソーセージ')).toBe('"ハム,ソーセージ"');
    expect(csvField('彼は"先生"です')).toBe('"彼は""先生""です"');
    expect(csvField('1行目\n2行目')).toBe('"1行目\n2行目"');
  });
});

describe('recordsToCsv', () => {
  it('BOM付きでヘッダ行と記録を書き出す', () => {
    const csv = recordsToCsv([record({})]);
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('日付,区分,種別,相手,品物,金額,お返し,メモ');
    expect(csv).toContain('2025-12-10,あげた,お歳暮,佐藤,ハム,5000,お返し不要,');
  });

  it('メモのカンマで列がずれない', () => {
    const csv = recordsToCsv([record({ note: '伯母,毎年' })]);
    expect(csv).toContain('"伯母,毎年"');
  });
});
