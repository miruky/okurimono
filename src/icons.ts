// UIで使う線画アイコン。24pxグリッド・stroke=currentColorで統一し、
// 隣に必ずテキストラベルを置く前提ですべて装飾(aria-hidden)とする。

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  // 水引の結びを象ったマーク。中心の結び目から三方へ輪が伸び、二本の水引が垂れる。
  // 贈答の象徴として全体の意匠を束ねる。
  logo: svg(
    '<path d="M12 12C8 3 16 3 12 12Z"/>' +
      '<path d="M12 12C3 8 3 16 12 12Z"/>' +
      '<path d="M12 12C21 8 21 16 12 12Z"/>' +
      '<path d="M11 12.5 9 21"/><path d="M13 12.5 15 21"/>',
  ),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  trash: svg(
    '<path d="M4 7h16"/>' +
      '<path d="M9.5 7V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v2"/>' +
      '<path d="m6.5 7 .7 11.2a2 2 0 0 0 2 1.8h5.6a2 2 0 0 0 2-1.8L17.5 7"/>' +
      '<path d="M10 11v5.5"/><path d="M14 11v5.5"/>',
  ),
  copy: svg(
    '<rect x="9" y="9" width="11" height="11" rx="2"/>' + '<path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  ),
  check: svg('<path d="m5 13 4.5 4.5L19 7"/>'),
  checkCircle: svg('<circle cx="12" cy="12" r="8.5"/><path d="m8.4 12 2.4 2.4L15.6 9.6"/>'),
  download: svg('<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>'),
  upload: svg('<path d="M12 20V9"/><path d="m7 13 5-5 5 5"/><path d="M5 4h14"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>'),
  note: svg(
    '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/>' +
      '<path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h5"/>',
  ),
  // テーマトグルの3状態。auto=半分陰の円、light=陽、dark=月。
  themeAuto: svg(
    '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/>',
  ),
  themeLight: svg(
    '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/>' +
      '<path d="m5.6 5.6 1.4 1.4"/><path d="m17 17 1.4 1.4"/><path d="m18.4 5.6-1.4 1.4"/><path d="m7 17-1.4 1.4"/>',
  ),
  themeDark: svg('<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z"/>'),
} as const;

export type ThemeIconKey = 'themeAuto' | 'themeLight' | 'themeDark';
