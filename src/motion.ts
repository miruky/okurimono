// 動きの担当。入場の演出、スクロールに連れた各段の出現、数値のカウントアップ。
// いずれも prefers-reduced-motion: reduce のときは何もせず、最終状態のまま見せる。

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { formatYen } from './lib/okaeshi';

gsap.registerPlugin(ScrollTrigger);

// 水引の結びを象った装飾の罫線。中央に「あわじ結び」、両側へ水引が伸びる。
export const mizuhikiRule = `<svg class="rule-svg" viewBox="0 0 240 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
  <path d="M0 10H96" />
  <path d="M144 10H240" />
  <path d="M96 10c0-8 16-8 24 0 8 8 24 8 24 0 0-8-16-8-24 0-8 8-24 8-24 0Z" />
</svg>`;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** 初回マウント時の入場演出。見出し→図版→罫線→各段の順に現れる。 */
export function revealOnMount(root: HTMLElement): void {
  if (prefersReducedMotion()) return;

  const text = root.querySelectorAll('.masthead-text > *');
  const figure = root.querySelector('.masthead-figure');
  const rule = root.querySelector('.rule');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(root.querySelector('.topbar .bar-inner'), { yPercent: -30, opacity: 0, duration: 0.45 })
    .from(text, { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.15')
    .from(figure, { y: 22, opacity: 0, duration: 0.8 }, '<0.1')
    .from(rule, { opacity: 0, scaleX: 0.6, duration: 0.6, transformOrigin: 'center' }, '-=0.35');

  for (const el of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    gsap.from(el, {
      opacity: 0,
      y: 24,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  }

  // マストヘッドの写真をスクロールに合わせてわずかに動かす(視差)。
  const img = root.querySelector('.masthead-figure img');
  const masthead = root.querySelector('.masthead');
  if (img && masthead) {
    gsap.fromTo(
      img,
      { yPercent: -5, scale: 1.08 },
      {
        yPercent: 5,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: { trigger: masthead, start: 'top top', end: 'bottom top', scrub: true },
      },
    );
  }
}

/** data-num を持つ数値を 0 から目標値まで数え上げる。 */
export function countUp(region: HTMLElement): void {
  const reduce = prefersReducedMotion();
  for (const el of region.querySelectorAll<HTMLElement>('[data-num]')) {
    const target = Number(el.dataset.num);
    const suffix = el.dataset.suffix ?? '';
    const format = (n: number): string =>
      el.dataset.fmt === 'yen' ? formatYen(Math.round(n)) : `${Math.round(n)}${suffix}`;
    if (reduce || !Number.isFinite(target) || target === 0) {
      el.textContent = format(target);
      continue;
    }
    const state = { value: 0 };
    gsap.to(state, {
      value: target,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = format(state.value);
      },
      onComplete: () => {
        el.textContent = format(target);
      },
    });
  }
}
