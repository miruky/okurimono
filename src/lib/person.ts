// 相手ごとの集計。いくら包むか迷ったとき、その相手との過去のやりとりを
// すぐたどれるようにする。

import type { GiftRecord } from './record';

export interface PersonSummary {
  person: string;
  count: number;
  givenTotal: number;
  receivedTotal: number;
  /** 最後にやりとりした日 */
  lastDate: string;
}

/** 相手ごとに件数と金額を集計し、やりとりの新しい順に並べる */
export function personSummaries(records: GiftRecord[]): PersonSummary[] {
  const map = new Map<string, PersonSummary>();
  for (const r of records) {
    const s = map.get(r.person) ?? {
      person: r.person,
      count: 0,
      givenTotal: 0,
      receivedTotal: 0,
      lastDate: r.date,
    };
    s.count += 1;
    if (r.direction === 'given') s.givenTotal += r.amount;
    else s.receivedTotal += r.amount;
    if (r.date > s.lastDate) s.lastDate = r.date;
    map.set(r.person, s);
  }
  return [...map.values()].sort(
    (a, b) => b.lastDate.localeCompare(a.lastDate) || a.person.localeCompare(b.person, 'ja'),
  );
}
