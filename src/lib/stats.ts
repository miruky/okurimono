// 台帳全体の集計。「今年いくら包んだか」「もらった分とのつり合い」を
// ひと目で把握するための数値を作る。表示の体裁には関与しない。

import { KIND_LABELS, type GiftRecord, type Kind } from './record';

export interface KindStat {
  kind: Kind;
  label: string;
  count: number;
  total: number;
}

export interface LedgerStats {
  total: number;
  givenCount: number;
  receivedCount: number;
  givenTotal: number;
  receivedTotal: number;
  /** もらった額 − あげた額。プラスはもらい越し、マイナスは贈り越し */
  balance: number;
  pendingCount: number;
  /** 種別ごとの件数と金額。件数の多い順、同数なら金額の多い順 */
  byKind: KindStat[];
}

export function computeStats(records: GiftRecord[]): LedgerStats {
  let givenCount = 0;
  let receivedCount = 0;
  let givenTotal = 0;
  let receivedTotal = 0;
  let pendingCount = 0;
  const kinds = new Map<Kind, KindStat>();

  for (const r of records) {
    if (r.direction === 'given') {
      givenCount += 1;
      givenTotal += r.amount;
    } else {
      receivedCount += 1;
      receivedTotal += r.amount;
      if (r.returnStatus === 'pending') pendingCount += 1;
    }
    const k = kinds.get(r.kind) ?? { kind: r.kind, label: KIND_LABELS[r.kind], count: 0, total: 0 };
    k.count += 1;
    k.total += r.amount;
    kinds.set(r.kind, k);
  }

  const byKind = [...kinds.values()].sort((a, b) => b.count - a.count || b.total - a.total);

  return {
    total: records.length,
    givenCount,
    receivedCount,
    givenTotal,
    receivedTotal,
    balance: receivedTotal - givenTotal,
    pendingCount,
    byKind,
  };
}
