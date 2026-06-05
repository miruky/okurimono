import './style.css';
import { createApp } from './app';
import { createStore } from './lib/record';
import { seedRecords } from './lib/seed';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

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

createApp({ root, store, initialRecords: records, today });
