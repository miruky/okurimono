import './style.css';
import { createApp, type ThemeControl } from './app';
import { createStore } from './lib/record';
import { seedRecords } from './lib/seed';
import { loadTheme, nextTheme, saveTheme, type ThemePref } from './lib/theme';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

// 明示指定(light/dark)はdata-theme属性で固定し、autoはOS設定(CSSのメディア
// クエリ)に委ねる。初回描画前のFOUCはindex.htmlの先頭スクリプトで防ぐ。
function applyTheme(pref: ThemePref): void {
  if (pref === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', pref);
}

let themePref = loadTheme(localStorage);
applyTheme(themePref);

const theme: ThemeControl = {
  get: () => themePref,
  cycle: () => {
    themePref = nextTheme(themePref);
    saveTheme(localStorage, themePref);
    applyTheme(themePref);
    return themePref;
  },
};

const store = createStore(localStorage);

// 初回起動だけ見本の記録を入れて保存する。一度でも保存があれば
// (全件削除して空にした場合も含めて)その状態を尊重する。
let records = store.load();
if (records === null) {
  records = seedRecords();
  store.save(records);
}

const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

createApp({ root, store, initialRecords: records, today, theme });
