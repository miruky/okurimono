// 台帳のCSV書き出し。表計算に貼って親戚と突き合わせる用途を想定し、
// Excelで文字化けしないようBOMを付ける。

import { DIRECTION_LABELS, KIND_LABELS, RETURN_LABELS, type GiftRecord } from './record';

/** カンマ・引用符・改行を含むフィールドを引用符で包む */
export function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export const CSV_HEADER = ['日付', '区分', '種別', '相手', '品物', '金額', 'お返し', 'メモ'];

export function recordsToCsv(records: GiftRecord[]): string {
  const rows = records.map((r) =>
    [
      r.date,
      DIRECTION_LABELS[r.direction],
      KIND_LABELS[r.kind],
      r.person,
      r.item,
      String(r.amount),
      RETURN_LABELS[r.returnStatus],
      r.note,
    ]
      .map(csvField)
      .join(','),
  );
  return '\ufeff' + `${[CSV_HEADER.join(','), ...rows].join('\r\n')}\r\n`;
}
