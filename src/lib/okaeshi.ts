// お返しの計算。世間の目安とされる「3分の1返し〜半返し」を機械的に出す。

import type { GiftRecord } from './record';

/** 「12,300円」形式。3桁区切りはロケールに頼らず自前で入れる */
export function formatYen(amount: number): string {
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}円`;
}

export interface ReturnRange {
  low: number;
  high: number;
}

/**
 * お返し金額の目安。3分の1〜2分の1を100円単位に丸める。
 * 金額が分からない(0)ならnull。
 */
export function suggestReturn(amount: number): ReturnRange | null {
  if (amount <= 0) return null;
  const round100 = (v: number): number => Math.round(v / 100) * 100;
  return { low: round100(amount / 3), high: round100(amount / 2) };
}

/** お返し待ちの記録。古いものから並べる(先に来たものから返す) */
export function pendingReturns(records: GiftRecord[]): GiftRecord[] {
  return records
    .filter((r) => r.direction === 'received' && r.returnStatus === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date));
}
