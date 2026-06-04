// 初回起動時に入れる見本の記録。一度でも保存があれば使わない。

import type { GiftRecord } from './record';

export function seedRecords(): GiftRecord[] {
  return [
    {
      id: 'seed-1',
      direction: 'received',
      kind: 'wedding',
      person: '伯母(佐藤)',
      item: 'ご祝儀',
      amount: 50000,
      date: '2026-04-12',
      returnStatus: 'pending',
      note: '結婚式に出席いただいた分とは別',
    },
    {
      id: 'seed-2',
      direction: 'received',
      kind: 'baby',
      person: '高橋さん(職場)',
      item: 'ベビー服',
      amount: 0,
      date: '2026-03-08',
      returnStatus: 'done',
      note: 'お返しはお菓子の詰め合わせ',
    },
    {
      id: 'seed-3',
      direction: 'given',
      kind: 'condolence',
      person: '田中家',
      item: '香典',
      amount: 10000,
      date: '2026-02-20',
      returnStatus: 'none',
      note: '',
    },
    {
      id: 'seed-4',
      direction: 'given',
      kind: 'seibo',
      person: '伯母(佐藤)',
      item: 'ハムの詰め合わせ',
      amount: 5000,
      date: '2025-12-10',
      returnStatus: 'none',
      note: '毎年贈っている',
    },
    {
      id: 'seed-5',
      direction: 'received',
      kind: 'chugen',
      person: '伯母(佐藤)',
      item: 'そうめん',
      amount: 3000,
      date: '2025-07-05',
      returnStatus: 'none',
      note: '',
    },
  ];
}
