// 画面の組み立て。骨格(見出し・図版・操作部)は最初に一度だけ描き、
// 数値や一覧などデータで変わる領域だけを差し替える。テキスト入力は確定時
// (changeイベント)に反映し、各入力を記録のidで対応づけるので、再描画や
// 並べ替えでフォーカスや入力途中の値が失われない。

import {
  DIRECTION_LABELS,
  KIND_LABELS,
  newRecordId,
  RETURN_LABELS,
  SORT_LABELS,
  serializeRecords,
  sortByDateDesc,
  sortRecords,
  type Direction,
  type GiftRecord,
  type Kind,
  type RecordStore,
  type ReturnStatus,
  type SortMode,
} from './lib/record';
import { formatYen, pendingReturns, suggestReturn } from './lib/okaeshi';
import { personSummaries } from './lib/person';
import { computeStats } from './lib/stats';
import { recordsToCsv } from './lib/csv';
import { importBackup } from './lib/backup';
import { icons } from './icons';
import { THEME_LABELS, type ThemePref } from './lib/theme';
import { countUp, mizuhikiRule, revealOnMount } from './motion';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

function options<T extends string>(
  labels: Record<T, string>,
  selected: T | '',
  emptyLabel?: string,
): string {
  const head =
    emptyLabel === undefined
      ? ''
      : `<option value="" ${selected === '' ? 'selected' : ''}>${emptyLabel}</option>`;
  return (
    head +
    (Object.keys(labels) as T[])
      .map(
        (key) =>
          `<option value="${key}" ${key === selected ? 'selected' : ''}>${labels[key]}</option>`,
      )
      .join('')
  );
}

function formatDateJa(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(y)}年${Number(mo)}月${Number(d)}日`;
}

export interface ThemeControl {
  get(): ThemePref;
  cycle(): ThemePref;
}

export interface AppDeps {
  root: HTMLElement;
  store: RecordStore;
  initialRecords: GiftRecord[];
  today: string;
  theme: ThemeControl;
}

export function createApp({ root, store, initialRecords, today, theme }: AppDeps): void {
  let records = sortByDateDesc(initialRecords);
  let personQuery = '';
  let filterDirection: Direction | '' = '';
  let sortMode: SortMode = 'date-desc';

  /** お返しを考えなくて良い季節の贈答 */
  const NO_RETURN_KINDS: Kind[] = ['chugen', 'seibo', 'newyear'];

  // ---- データを伴わない骨格 ----

  function skeleton(): string {
    return `
      <header class="topbar">
        <div class="bar-inner">
          <span class="brand">${icons.logo}<span class="brand-name">okurimono</span></span>
          <button type="button" class="theme-toggle" id="theme-toggle" aria-label="表示テーマを切り替える"></button>
        </div>
      </header>
      <main class="page">
        <section class="masthead" aria-labelledby="masthead-title">
          <div class="masthead-text">
            <p class="kicker">贈答記録帳</p>
            <h1 class="masthead-title" id="masthead-title">いただきものと<br />おくりものの控え。</h1>
            <p class="lede">結婚や出産の祝い、弔事の香典、中元・歳暮まで。誰に何をいくら贈り、いただいたかを一冊にまとめ、お返しの抜けと金額の目安を見通せるようにします。記録はこの端末の中だけに残ります。</p>
            <div class="masthead-status" id="header-status"></div>
          </div>
          <figure class="masthead-figure">
            <img
              src="https://picsum.photos/seed/okurimono-noshi/720/900?grayscale"
              alt="" width="360" height="450" loading="lazy" decoding="async" />
            <span class="figure-seal" aria-hidden="true">${icons.logo}</span>
          </figure>
        </section>

        <div class="rule" aria-hidden="true">${mizuhikiRule}</div>

        <section class="band stats" id="stat-region" data-reveal aria-label="台帳のまとめ"></section>

        <section class="band" id="pending-region" data-reveal></section>

        <section class="band" id="persons-region" data-reveal></section>

        <section class="band records" id="records-region" data-reveal aria-labelledby="records-title">
          <div class="section-head">
            <div>
              <p class="kicker">台帳</p>
              <h2 id="records-title">記録</h2>
            </div>
            <div class="controls">
              <label class="search">${icons.search}
                <input type="search" id="filter-person" placeholder="相手・品物で探す" aria-label="記録を検索" /></label>
              <select id="filter-direction" aria-label="区分で絞り込む">
                ${options(DIRECTION_LABELS, '', 'あげた・もらった両方')}
              </select>
              <select id="sort-mode" aria-label="並べ替え">
                ${options(SORT_LABELS, sortMode)}
              </select>
            </div>
          </div>

          <div id="records-list-region"></div>

          <form class="record-add" id="add-form" aria-label="記録を追加">
            <input type="date" name="date" id="add-date" value="${today}" required aria-label="日付" />
            <select name="direction" id="add-direction" aria-label="区分">${options(DIRECTION_LABELS, 'received')}</select>
            <select name="kind" id="add-kind" aria-label="種別">${options(KIND_LABELS, 'wedding')}</select>
            <input name="person" id="add-person" placeholder="相手(例: 伯母)" required aria-label="相手" />
            <input name="item" id="add-item" placeholder="品物・内容" aria-label="品物" />
            <input class="amount-input" name="amount" id="add-amount" type="number" min="0" step="100"
              placeholder="金額" aria-label="金額(円)" />
            <button type="submit" class="icon-button accent" id="add-submit" aria-label="記録を追加">${icons.plus}</button>
          </form>
          <p class="hint">もらった記録は追加時に「お返し待ち」になります(お中元・お歳暮・お年賀は「お返し不要」)。金額が分からない品物は空のままで構いません。</p>

          <div class="ledger-tools">
            <button type="button" class="button" id="copy-csv">${icons.copy}<span>CSVをコピー</span></button>
            <button type="button" class="button" id="download-csv">${icons.download}<span>CSVを保存</span></button>
            <button type="button" class="button" id="download-json">${icons.download}<span>バックアップ(JSON)</span></button>
            <label class="button" id="import-label">${icons.upload}<span>取り込み</span>
              <input type="file" id="import-json" accept="application/json,.json" hidden /></label>
            <span class="tool-msg" id="ledger-msg" role="status" aria-live="polite"></span>
          </div>
        </section>
      </main>
      <footer class="site-footer">
        <p>おくりもの帳。記録はこの端末のブラウザにだけ保存され、サーバーには送られません。バックアップから別の端末へ引き継げます。</p>
      </footer>`;
  }

  // ---- データで変わる領域 ----

  function renderThemeToggle(): void {
    const pref = theme.get();
    const iconKey = pref === 'light' ? 'themeLight' : pref === 'dark' ? 'themeDark' : 'themeAuto';
    const btn = root.querySelector<HTMLButtonElement>('#theme-toggle');
    if (!btn) return;
    btn.innerHTML = `${icons[iconKey]}<span>${THEME_LABELS[pref]}</span>`;
    btn.setAttribute('aria-label', `表示テーマ: ${THEME_LABELS[pref]}(押すと切り替え)`);
  }

  function renderHeaderStatus(): void {
    const region = root.querySelector('#header-status');
    if (!region) return;
    const pending = pendingReturns(records).length;
    region.innerHTML =
      pending > 0
        ? `<span class="status-pill">${icons.note}お返し待ち <strong>${pending}</strong> 件</span>`
        : records.length > 0
          ? `<span class="status-pill quiet">${icons.checkCircle}お返し待ちはありません</span>`
          : '';
  }

  function renderStats(animate = false): void {
    const region = root.querySelector('#stat-region');
    if (!region) return;
    const s = computeStats(records);
    const figure = (label: string, num: number, fmt: 'yen' | 'int', suffix = ''): string =>
      `<div class="stat">
         <span class="stat-label">${label}</span>
         <span class="stat-num" data-num="${num}" data-fmt="${fmt}" data-suffix="${suffix}">${
           fmt === 'yen' ? formatYen(num) : `${num}${suffix}`
         }</span>
       </div>`;
    const kinds = s.byKind
      .slice(0, 6)
      .map(
        (k) =>
          `<span class="kind-chip">${k.label}<span class="kind-count">${k.count}</span></span>`,
      )
      .join('');
    region.innerHTML = `
      <div class="stat-grid">
        ${figure('いただいた額', s.receivedTotal, 'yen')}
        ${figure('おくった額', s.givenTotal, 'yen')}
        ${figure('記録の数', s.total, 'int', '件')}
        ${figure('お返し待ち', s.pendingCount, 'int', '件')}
      </div>
      ${s.byKind.length > 0 ? `<div class="kind-row"><span class="kind-row-label">内訳</span>${kinds}</div>` : ''}`;
    if (animate) countUp(region as HTMLElement);
  }

  function renderPending(): void {
    const region = root.querySelector('#pending-region');
    if (!region) return;
    const pending = pendingReturns(records);
    if (pending.length === 0) {
      region.innerHTML = '';
      return;
    }
    const rows = pending
      .map((r, i) => {
        const range = suggestReturn(r.amount);
        const hint = range
          ? `目安 ${formatYen(range.low)}〜${formatYen(range.high)}`
          : '金額の記録なし';
        return `
          <li class="pending-item" style="--i:${i}">
            <span class="pending-date">${formatDateJa(r.date)}</span>
            <span class="pending-body"><strong>${esc(r.person)}</strong> から ${KIND_LABELS[r.kind]}${
              r.amount > 0 ? ` ・ ${formatYen(r.amount)}` : ''
            }${r.item ? ` <span class="pending-item-name">(${esc(r.item)})</span>` : ''}</span>
            <span class="pending-hint">${hint}</span>
            <button type="button" class="ghost-button" data-mark-done="${esc(r.id)}">${icons.check}<span>お返し済みに</span></button>
          </li>`;
      })
      .join('');
    region.innerHTML = `
      <div class="section-head">
        <div><p class="kicker">要対応</p><h2>お返し待ち</h2></div>
      </div>
      <p class="hint">半返し(3分の1〜2分の1)から目安を出しています。地域や間柄に合わせて調整してください。</p>
      <ul class="pending-list">${rows}</ul>`;
    for (const el of region.querySelectorAll<HTMLElement>('[data-mark-done]')) {
      el.addEventListener('click', () => {
        const r = records.find((x) => x.id === el.dataset.markDone);
        if (r) r.returnStatus = 'done';
        commit();
      });
    }
  }

  function renderPersons(): void {
    const region = root.querySelector('#persons-region');
    if (!region) return;
    const summaries = personSummaries(records);
    if (summaries.length === 0) {
      region.innerHTML = '';
      return;
    }
    const rows = summaries
      .map(
        (s, i) => `
          <tr style="--i:${i}">
            <th scope="row"><button type="button" class="person-link" data-person="${esc(s.person)}">${esc(s.person)}</button></th>
            <td class="num">${s.count}</td>
            <td class="amount">${formatYen(s.givenTotal)}</td>
            <td class="amount">${formatYen(s.receivedTotal)}</td>
            <td class="muted">${formatDateJa(s.lastDate)}</td>
          </tr>`,
      )
      .join('');
    region.innerHTML = `
      <div class="section-head">
        <div><p class="kicker">相手別</p><h2>やりとりの集計</h2></div>
      </div>
      <div class="table-scroll">
        <table class="persons">
          <thead>
            <tr><th>相手</th><th class="num">件数</th><th class="amount">あげた計</th><th class="amount">もらった計</th><th>最終</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    for (const el of region.querySelectorAll<HTMLElement>('[data-person]')) {
      el.addEventListener('click', () => {
        personQuery = el.dataset.person ?? '';
        filterDirection = '';
        const search = root.querySelector<HTMLInputElement>('#filter-person');
        const filter = root.querySelector<HTMLSelectElement>('#filter-direction');
        if (search) search.value = personQuery;
        if (filter) filter.value = '';
        renderList();
        search?.focus();
      });
    }
  }

  function recordRow(r: GiftRecord, i: number): string {
    const id = esc(r.id);
    return `
      <li class="entry dir-${r.direction}" style="--i:${i}">
        <div class="entry-main">
          <input type="date" id="r-${id}-date" data-record="${id}:date" value="${esc(r.date)}" aria-label="日付" />
          <select id="r-${id}-direction" data-record="${id}:direction" aria-label="区分">
            ${options(DIRECTION_LABELS, r.direction)}
          </select>
          <select id="r-${id}-kind" data-record="${id}:kind" aria-label="種別">
            ${options(KIND_LABELS, r.kind)}
          </select>
          <input id="r-${id}-person" data-record="${id}:person" value="${esc(r.person)}" aria-label="相手" />
          <input id="r-${id}-item" data-record="${id}:item" value="${esc(r.item)}" placeholder="品物" aria-label="品物" />
          <input class="amount-input" id="r-${id}-amount" data-record="${id}:amount"
            type="number" min="0" step="100" value="${r.amount}" aria-label="金額(円)" />
          <select id="r-${id}-return" data-record="${id}:returnStatus" aria-label="お返し"
            ${r.direction === 'given' ? 'disabled' : ''}>
            ${options(RETURN_LABELS, r.returnStatus)}
          </select>
          <button type="button" class="icon-button" data-del="${id}"
            aria-label="${esc(r.person)}への記録を削除">${icons.trash}</button>
        </div>
        <div class="entry-note">
          <span class="note-mark" aria-hidden="true">${icons.note}</span>
          <input id="r-${id}-note" data-record="${id}:note" value="${esc(r.note)}"
            placeholder="覚え書き(お返しの内容、間柄、出席の有無など)" aria-label="${esc(r.person)}への記録のメモ" />
        </div>
      </li>`;
  }

  function renderList(animate = false): void {
    const region = root.querySelector('#records-list-region');
    if (!region) return;
    const query = personQuery.trim();
    const visible = sortRecords(records, sortMode).filter(
      (r) =>
        (filterDirection === '' || r.direction === filterDirection) &&
        (query === '' || r.person.includes(query) || r.item.includes(query)),
    );
    const empty =
      records.length === 0
        ? '<p class="empty">記録がまだありません。下の行から追加してください。</p>'
        : visible.length === 0
          ? '<p class="empty">条件に当てはまる記録がありません。</p>'
          : '';
    const enter = animate ? ' is-enter' : '';
    region.innerHTML =
      empty ||
      `<ul class="record-list${enter}">${visible.map((r, i) => recordRow(r, i)).join('')}</ul>`;
    bindRecordEvents(region as HTMLElement);
  }

  function bindRecordEvents(region: HTMLElement): void {
    for (const el of region.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '[data-record]',
    )) {
      el.addEventListener('change', () => {
        const [id, field] = (el.dataset.record ?? '').split(':');
        const record = records.find((r) => r.id === id);
        if (!record) return;
        if (field === 'date') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(el.value)) record.date = el.value;
        } else if (field === 'direction') {
          record.direction = el.value as Direction;
          if (record.direction === 'given') record.returnStatus = 'none';
        } else if (field === 'kind') {
          record.kind = el.value as Kind;
        } else if (field === 'person') {
          if (el.value.trim() !== '') record.person = el.value.trim();
        } else if (field === 'item') {
          record.item = el.value.trim();
        } else if (field === 'amount') {
          const amount = Number(el.value);
          if (Number.isFinite(amount) && amount >= 0) record.amount = amount;
        } else if (field === 'returnStatus') {
          record.returnStatus = el.value as ReturnStatus;
        } else if (field === 'note') {
          record.note = el.value.trim();
        }
        commit();
      });
    }
    for (const el of region.querySelectorAll<HTMLElement>('[data-del]')) {
      el.addEventListener('click', () => {
        const idx = records.findIndex((r) => r.id === el.dataset.del);
        if (idx >= 0) records.splice(idx, 1);
        commit();
      });
    }
  }

  // ---- 確定とイベント ----

  function commit(): void {
    records = sortByDateDesc(records);
    store.save(records);
    renderHeaderStatus();
    renderStats();
    renderPending();
    renderPersons();
    renderList();
  }

  function flash(message: string): void {
    const msg = root.querySelector('#ledger-msg');
    if (!msg) return;
    msg.textContent = message;
    window.setTimeout(() => {
      if (msg.textContent === message) msg.textContent = '';
    }, 2600);
  }

  function bindStaticEvents(): void {
    root.querySelector('#theme-toggle')?.addEventListener('click', () => {
      theme.cycle();
      renderThemeToggle();
    });

    const search = root.querySelector<HTMLInputElement>('#filter-person');
    search?.addEventListener('input', () => {
      personQuery = search.value;
      renderList();
    });
    root.querySelector('#filter-direction')?.addEventListener('change', (e) => {
      filterDirection = (e.target as HTMLSelectElement).value as Direction | '';
      renderList();
    });
    root.querySelector('#sort-mode')?.addEventListener('change', (e) => {
      sortMode = (e.target as HTMLSelectElement).value as SortMode;
      renderList();
    });

    root.querySelector<HTMLFormElement>('#add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const fd = new FormData(form);
      const read = (key: string): string => String(fd.get(key) ?? '').trim();
      const person = read('person');
      const date = read('date');
      if (person === '' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const direction = (read('direction') || 'received') as Direction;
      const kind = (read('kind') || 'other') as Kind;
      const amount = Number(read('amount') || '0');
      records.push({
        id: newRecordId(),
        direction,
        kind,
        person,
        item: read('item'),
        amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        date,
        returnStatus:
          direction === 'received' && !NO_RETURN_KINDS.includes(kind) ? 'pending' : 'none',
        note: '',
      });
      const personInput = form.querySelector<HTMLInputElement>('#add-person');
      const itemInput = form.querySelector<HTMLInputElement>('#add-item');
      const amountInput = form.querySelector<HTMLInputElement>('#add-amount');
      if (personInput) personInput.value = '';
      if (itemInput) itemInput.value = '';
      if (amountInput) amountInput.value = '';
      commit();
      personInput?.focus();
    });

    root.querySelector('#copy-csv')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      void navigator.clipboard.writeText(recordsToCsv(records)).then(() => {
        btn.innerHTML = `${icons.check}<span>コピーしました</span>`;
        window.setTimeout(() => {
          btn.innerHTML = `${icons.copy}<span>CSVをコピー</span>`;
        }, 2000);
      });
    });

    root.querySelector('#download-csv')?.addEventListener('click', () => {
      downloadFile('okurimono.csv', recordsToCsv(records), 'text/csv;charset=utf-8');
    });

    root.querySelector('#download-json')?.addEventListener('click', () => {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadFile(`okurimono-${stamp}.json`, serializeRecords(records), 'application/json');
      flash('バックアップを保存しました');
    });

    const importInput = root.querySelector<HTMLInputElement>('#import-json');
    importInput?.addEventListener('change', () => {
      const file = importInput.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        const result = importBackup(records, text);
        importInput.value = '';
        if (result.added === 0 && result.skipped === 0) {
          flash('取り込める記録がありませんでした');
          return;
        }
        records = result.records;
        commit();
        flash(
          `${result.added}件を取り込みました${result.skipped > 0 ? `(重複${result.skipped}件は見送り)` : ''}`,
        );
      });
    });
  }

  // ---- 初期化 ----

  root.innerHTML = skeleton();
  bindStaticEvents();
  renderThemeToggle();
  renderHeaderStatus();
  renderStats(true);
  renderPending();
  renderPersons();
  renderList(true);
  revealOnMount(root);
}

function downloadFile(name: string, body: string, type: string): void {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
