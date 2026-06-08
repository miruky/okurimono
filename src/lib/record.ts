// 贈答記録の型・検証・永続化。あげた・もらったの両方向を1つの台帳で持つ。

export type Direction = 'given' | 'received';

export const DIRECTION_LABELS: Record<Direction, string> = {
  given: 'あげた',
  received: 'もらった',
};

export type Kind =
  | 'wedding'
  | 'baby'
  | 'condolence'
  | 'chugen'
  | 'seibo'
  | 'newyear'
  | 'admission'
  | 'recovery'
  | 'housewarming'
  | 'other';

export const KIND_LABELS: Record<Kind, string> = {
  wedding: '結婚祝い',
  baby: '出産祝い',
  condolence: '香典',
  chugen: 'お中元',
  seibo: 'お歳暮',
  newyear: 'お年賀',
  admission: '入学祝い',
  recovery: '快気祝い',
  housewarming: '新築祝い',
  other: 'その他',
};

/** お返しの状態。あげた記録と、お返し不要のもらい物はnone */
export type ReturnStatus = 'none' | 'pending' | 'done';

export const RETURN_LABELS: Record<ReturnStatus, string> = {
  none: 'お返し不要',
  pending: 'お返し待ち',
  done: 'お返し済み',
};

export interface GiftRecord {
  id: string;
  direction: Direction;
  kind: Kind;
  /** 相手の名前(「山田家」「田中部長」のような呼び方で良い) */
  person: string;
  /** 品物の内容。現金だけなら空でも良い */
  item: string;
  /** 金額(円)。品物で金額が分からなければ0 */
  amount: number;
  /** 贈った・もらった日(YYYY-MM-DD) */
  date: string;
  returnStatus: ReturnStatus;
  note: string;
}

export function newRecordId(): string {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is GiftRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.direction === 'string' &&
    r.direction in DIRECTION_LABELS &&
    typeof r.kind === 'string' &&
    r.kind in KIND_LABELS &&
    typeof r.person === 'string' &&
    r.person !== '' &&
    typeof r.item === 'string' &&
    typeof r.amount === 'number' &&
    Number.isFinite(r.amount) &&
    r.amount >= 0 &&
    typeof r.date === 'string' &&
    DATE_RE.test(r.date) &&
    typeof r.returnStatus === 'string' &&
    r.returnStatus in RETURN_LABELS &&
    typeof r.note === 'string'
  );
}

/** JSON文字列から復元する。形の崩れた要素は読み飛ばす */
export function deserializeRecords(json: string): GiftRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isRecord);
}

export function serializeRecords(records: GiftRecord[]): string {
  return JSON.stringify(records);
}

/** 新しい日付が先頭に来るよう並べる。同日なら入力順を保つ */
export function sortByDateDesc(records: GiftRecord[]): GiftRecord[] {
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => b.record.date.localeCompare(a.record.date) || a.index - b.index)
    .map((k) => k.record);
}

export type SortMode = 'date-desc' | 'date-asc' | 'amount-desc' | 'person';

export const SORT_LABELS: Record<SortMode, string> = {
  'date-desc': '日付が新しい順',
  'date-asc': '日付が古い順',
  'amount-desc': '金額が高い順',
  person: '相手の名前順',
};

export function isSortMode(value: unknown): value is SortMode {
  return (
    value === 'date-desc' || value === 'date-asc' || value === 'amount-desc' || value === 'person'
  );
}

/** 記録に含まれる年(YYYY)を新しい順の重複なしで返す。年での絞り込みに使う */
export function recordYears(records: GiftRecord[]): string[] {
  const years = new Set<string>();
  for (const r of records) {
    const y = r.date.slice(0, 4);
    if (/^\d{4}$/.test(y)) years.add(y);
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

/**
 * 表示用の並べ替え。元配列は変更しない。安定ソートを使い、比較が同値の
 * ときは元の順序(保存時の新しい日付順)を保つ。
 */
export function sortRecords(records: GiftRecord[], mode: SortMode): GiftRecord[] {
  const indexed = records.map((record, index) => ({ record, index }));
  const tie = (a: { index: number }, b: { index: number }): number => a.index - b.index;
  switch (mode) {
    case 'date-asc':
      return indexed
        .sort((a, b) => a.record.date.localeCompare(b.record.date) || tie(a, b))
        .map((k) => k.record);
    case 'amount-desc':
      return indexed
        .sort((a, b) => b.record.amount - a.record.amount || tie(a, b))
        .map((k) => k.record);
    case 'person':
      return indexed
        .sort((a, b) => a.record.person.localeCompare(b.record.person, 'ja') || tie(a, b))
        .map((k) => k.record);
    case 'date-desc':
    default:
      return indexed
        .sort((a, b) => b.record.date.localeCompare(a.record.date) || tie(a, b))
        .map((k) => k.record);
  }
}

export interface RecordStore {
  load(): GiftRecord[] | null;
  save(records: GiftRecord[]): void;
}

const STORAGE_KEY = 'okurimono.records.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createStore(storage: StorageLike): RecordStore {
  return {
    // 「保存されていない」(null)と「全件削除した」(空配列)を区別する
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      return raw === null ? null : deserializeRecords(raw);
    },
    save(records) {
      storage.setItem(STORAGE_KEY, serializeRecords(records));
    },
  };
}
