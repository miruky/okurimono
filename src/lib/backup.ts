// バックアップの取り込み。書き出したJSONを別の端末や作り直した環境へ
// 復元する。同じ記録を二重に増やさないよう、idが既にあるものは取り込まない。

import { deserializeRecords, type GiftRecord } from './record';

export interface ImportResult {
  /** 取り込み後の全記録(既存 + 新規) */
  records: GiftRecord[];
  /** 新たに加わった件数 */
  added: number;
  /** idが重複して見送った件数 */
  skipped: number;
}

/**
 * 取り込むJSONを検証して既存の台帳へ重ねる。
 * 形の崩れた要素は読み飛ばし、既存と同じidは既存を優先して見送る。
 */
export function importBackup(existing: GiftRecord[], json: string): ImportResult {
  const incoming = deserializeRecords(json);
  const known = new Set(existing.map((r) => r.id));
  const merged = [...existing];
  let added = 0;
  let skipped = 0;
  for (const r of incoming) {
    if (known.has(r.id)) {
      skipped += 1;
      continue;
    }
    known.add(r.id);
    merged.push(r);
    added += 1;
  }
  return { records: merged, added, skipped };
}
