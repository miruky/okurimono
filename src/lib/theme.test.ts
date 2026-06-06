import { describe, expect, it } from 'vitest';
import { isThemePref, loadTheme, nextTheme, resolveTheme, saveTheme } from './theme';

describe('nextTheme', () => {
  it('auto → light → dark → auto の順に巡る', () => {
    expect(nextTheme('auto')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('auto');
  });
});

describe('resolveTheme', () => {
  it('autoはOSの好みに従う', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });

  it('明示指定はOSの好みを無視する', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('isThemePref', () => {
  it('既知の値だけ受け入れる', () => {
    expect(isThemePref('auto')).toBe(true);
    expect(isThemePref('sepia')).toBe(false);
    expect(isThemePref(null)).toBe(false);
  });
});

describe('保存と読み込み', () => {
  function memStore() {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    };
  }

  it('保存した設定を読み戻せる', () => {
    const s = memStore();
    saveTheme(s, 'dark');
    expect(loadTheme(s)).toBe('dark');
  });

  it('未保存・壊れた値のときはautoにフォールバックする', () => {
    const s = memStore();
    expect(loadTheme(s)).toBe('auto');
    s.setItem('okurimono.theme.v1', 'rainbow');
    expect(loadTheme(s)).toBe('auto');
  });
});
