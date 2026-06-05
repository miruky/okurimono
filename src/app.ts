// 画面の描画。1画面構成で、状態が変わるたびに全体を描き直す。
// テキスト入力はchangeイベント(確定時)で反映するので、再描画で入力が途切れない。
// 記録は常に新しい日付順で保持し、表示の並びと配列の添字を一致させる。

import {
  DIRECTION_LABELS,
  KIND_LABELS,
  newRecordId,
  RETURN_LABELS,
  sortByDateDesc,
  type Direction,
  type GiftRecord,
  type Kind,
  type RecordStore,
  type ReturnStatus,
} from './lib/record';
import { formatYen, pendingReturns, suggestReturn } from './lib/okaeshi';
import { personSummaries } from './lib/person';
import { recordsToCsv } from './lib/csv';
import { icons } from './icons';

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

export interface AppDeps {
  root: HTMLElement;
  store: RecordStore;
  initialRecords: GiftRecord[];
  today: string;
}

export function createApp({ root, store, initialRecords, today }: AppDeps): void {
  let records = sortByDateDesc(initialRecords);
  let personQuery = '';
  let filterDirection: Direction | '' = '';
  let copied = false;

  function commit(): void {
    records = sortByDateDesc(records);
    store.save(records);
    render();
  }

  // ---- 部品 ----

  function header(): string {
    const pending = pendingReturns(records).length;
    return `
      <header class="site-header">
        <div class="site-header-inner">
          <span class="brand">${icons.logo}<span>okurimono</span></span>
          ${pending > 0 ? `<span class="attention-badge">お返し待ち ${pending}件</span>` : '<span class="attention-none">お返し待ちなし</span>'}
        </div>
      </header>`;
  }

  function pendingPanel(): string {
    const pending = pendingReturns(records);
    if (pending.length === 0) return '';
    const rows = pending
      .map((r, i) => {
        const range = suggestReturn(r.amount);
        const hint = range
          ? `目安 ${formatYen(range.low)}〜${formatYen(range.high)}`
          : '金額の記録なし';
        return `
          <li style="--i:${i}">
            <span class="pending-date">${formatDateJa(r.date)}</span>
            <span class="pending-body"><strong>${esc(r.person)}</strong> から ${KIND_LABELS[r.kind]}
              ${r.amount > 0 ? `(${formatYen(r.amount)})` : ''}</span>
            <span class="pending-hint">${hint}</span>
          </li>`;
      })
      .join('');
    return `
      <section class="panel pending-panel">
        <h2>お返し待ち</h2>
        <p class="hint">半返しの相場(3分の1〜2分の1)から目安を出しています。地域や間柄に合わせて調整してください。</p>
        <ul class="pending-list">${rows}</ul>
      </section>`;
  }

  function personPanel(): string {
    const summaries = personSummaries(records);
    if (summaries.length === 0) return '';
    const rows = summaries
      .map(
        (s) => `
          <tr>
            <th scope="row"><button type="button" class="person-link" data-person="${esc(s.person)}">${esc(s.person)}</button></th>
            <td>${s.count}件</td>
            <td class="amount">${formatYen(s.givenTotal)}</td>
            <td class="amount">${formatYen(s.receivedTotal)}</td>
            <td class="muted">${formatDateJa(s.lastDate)}</td>
          </tr>`,
      )
      .join('');
    return `
      <section class="panel">
        <h2>相手ごとの集計</h2>
        <div class="table-scroll">
          <table class="persons">
            <thead>
              <tr><th>相手</th><th>件数</th><th>あげた計</th><th>もらった計</th><th>最終</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }

  function recordRow(r: GiftRecord, index: number): string {
    return `
      <li class="record-row dir-${r.direction}" style="--i:${index}">
        <input type="date" id="r-${index}-date" data-record="${index}:date" value="${esc(r.date)}" aria-label="日付" />
        <select id="r-${index}-direction" data-record="${index}:direction" aria-label="区分">
          ${options(DIRECTION_LABELS, r.direction)}
        </select>
        <select id="r-${index}-kind" data-record="${index}:kind" aria-label="種別">
          ${options(KIND_LABELS, r.kind)}
        </select>
        <input id="r-${index}-person" data-record="${index}:person" value="${esc(r.person)}" aria-label="相手" />
        <input id="r-${index}-item" data-record="${index}:item" value="${esc(r.item)}" placeholder="品物" aria-label="品物" />
        <input class="amount-input" id="r-${index}-amount" data-record="${index}:amount"
          type="number" min="0" step="100" value="${r.amount}" aria-label="金額(円)" />
        <select id="r-${index}-return" data-record="${index}:returnStatus" aria-label="お返し"
          ${r.direction === 'given' ? 'disabled' : ''}>
          ${options(RETURN_LABELS, r.returnStatus)}
        </select>
        <button type="button" class="icon-button" id="r-${index}-del" data-del="${index}"
          aria-label="${esc(r.person)}への記録を削除">${icons.trash}</button>
      </li>`;
  }

  function recordsPanel(): string {
    const query = personQuery.trim();
    const visible = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => filterDirection === '' || record.direction === filterDirection)
      .filter(
        ({ record }) =>
          query === '' || record.person.includes(query) || record.item.includes(query),
      );
    const rows = visible.map(({ record, index }) => recordRow(record, index)).join('');
    const empty =
      records.length === 0
        ? '<p class="empty">記録がまだありません。下の行から追加してください。</p>'
        : visible.length === 0
          ? '<p class="empty">条件に当てはまる記録がありません。</p>'
          : '';
    return `
      <section class="panel">
        <div class="panel-head">
          <h2>記録</h2>
          <div class="filters">
            <label class="search">${icons.search}
              <input type="search" id="filter-person" placeholder="相手・品物で探す"
                value="${esc(personQuery)}" aria-label="記録を検索" /></label>
            <select id="filter-direction" aria-label="区分で絞り込む">
              ${options(DIRECTION_LABELS, filterDirection, 'あげた・もらった両方')}
            </select>
          </div>
        </div>
        ${empty || `<ul class="record-list">${rows}</ul>`}
        <form class="record-add" id="add-form">
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
        <div class="list-actions">
          <button type="button" class="button" id="copy-csv">
            ${copied ? icons.check : icons.copy}<span>${copied ? 'コピーしました' : 'CSVをコピー'}</span></button>
          <button type="button" class="button" id="download-csv">
            ${icons.download}<span>CSVを保存</span></button>
        </div>
      </section>`;
  }

  // ---- イベント ----

  /** お返しを考えなくて良い季節の贈答 */
  const NO_RETURN_KINDS: Kind[] = ['chugen', 'seibo', 'newyear'];

  function bindEvents(): void {
    const search = root.querySelector<HTMLInputElement>('#filter-person');
    search?.addEventListener('input', () => {
      personQuery = search.value;
      render();
    });
    root.querySelector('#filter-direction')?.addEventListener('change', (e) => {
      filterDirection = (e.target as HTMLSelectElement).value as Direction | '';
      render();
    });

    for (const el of root.querySelectorAll<HTMLElement>('[data-person]')) {
      el.addEventListener('click', () => {
        personQuery = el.dataset.person ?? '';
        filterDirection = '';
        render();
        root.querySelector<HTMLInputElement>('#filter-person')?.focus();
      });
    }

    for (const el of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-record]')) {
      el.addEventListener('change', () => {
        const [idxRaw, field] = (el.dataset.record ?? '').split(':');
        const record = records[Number(idxRaw)];
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
        }
        commit();
      });
    }

    for (const el of root.querySelectorAll<HTMLElement>('[data-del]')) {
      el.addEventListener('click', () => {
        records.splice(Number(el.dataset.del), 1);
        commit();
      });
    }

    root.querySelector<HTMLFormElement>('#add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget as HTMLFormElement);
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
      commit();
      root.querySelector<HTMLInputElement>('#add-person')?.focus();
    });

    root.querySelector('#copy-csv')?.addEventListener('click', () => {
      void navigator.clipboard.writeText(recordsToCsv(records)).then(() => {
        copied = true;
        render();
        setTimeout(() => {
          copied = false;
          render();
        }, 2000);
      });
    });
    root.querySelector('#download-csv')?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([recordsToCsv(records)], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'okurimono.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function render(): void {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const activeId = active?.id ?? '';
    const selection =
      active instanceof HTMLInputElement && activeId === 'filter-person'
        ? active.selectionStart
        : null;
    root.innerHTML = `
      ${header()}
      <main class="site-main">
        <section class="view">
          ${pendingPanel()}
          ${personPanel()}
          ${recordsPanel()}
        </section>
      </main>
      <footer class="site-footer">
        <p>okurimono — 贈答の記録帳。データはこの端末のブラウザにだけ保存されます。</p>
      </footer>`;
    bindEvents();
    if (activeId !== '') {
      const el = document.getElementById(activeId);
      el?.focus();
      if (el instanceof HTMLInputElement && selection !== null) {
        el.setSelectionRange(selection, selection);
      }
    }
  }

  render();
}
