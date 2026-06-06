// 表示テーマの設定。OS追従(auto)・明るい(light)・暗い(dark)の3択を
// 持ち、選択を保存する。実際の色はCSSのprefers-color-schemeとdata-theme属性で
// 切り替えるので、ここでは値の管理だけを担う。

export type ThemePref = 'auto' | 'light' | 'dark';

export const THEME_PREFS: ThemePref[] = ['auto', 'light', 'dark'];

export const THEME_LABELS: Record<ThemePref, string> = {
  auto: '端末に合わせる',
  light: '明るい',
  dark: '暗い',
};

export function isThemePref(value: unknown): value is ThemePref {
  return value === 'auto' || value === 'light' || value === 'dark';
}

/** トグルで次に進むテーマ。auto → light → dark → auto の順で巡る */
export function nextTheme(pref: ThemePref): ThemePref {
  const i = THEME_PREFS.indexOf(pref);
  return THEME_PREFS[(i + 1) % THEME_PREFS.length] ?? 'auto';
}

/** 設定とOSの好みから、実際に適用する明暗を決める */
export function resolveTheme(pref: ThemePref, prefersDark: boolean): 'light' | 'dark' {
  if (pref === 'auto') return prefersDark ? 'dark' : 'light';
  return pref;
}

const STORAGE_KEY = 'okurimono.theme.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadTheme(storage: StorageLike): ThemePref {
  const raw = storage.getItem(STORAGE_KEY);
  return isThemePref(raw) ? raw : 'auto';
}

export function saveTheme(storage: StorageLike, pref: ThemePref): void {
  storage.setItem(STORAGE_KEY, pref);
}
