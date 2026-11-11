// Behaviour shared by every page: the comparison sliders and the copy
// buttons. Page-specific motion lives next to this file (home.ts).
//
// Motion on this site explains something or it is absent. There are no
// scroll reveals: content is simply there.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = window.matchMedia('(pointer: coarse)').matches;

/** The one easing curve of the site (the CSS --ease), as GSAP names it. */
export const EASE = 'power4.out';

declare global {
  interface Window {
    __novaMotion?: boolean;
  }
}

gsap.defaults({ ease: EASE, duration: 0.4 });
ScrollTrigger.config({ ignoreMobileResize: true });

// --------------------------------------------------------- comparison sliders
function initCompare() {
  document.querySelectorAll<HTMLElement>('[data-compare]').forEach((el) => {
    const handle = el.querySelector<HTMLElement>('[data-compare-handle]');
    if (!handle) return;
    let pos = 50;
    let dragging = false;
    let touched = false;

    const set = (p: number) => {
      pos = Math.min(100, Math.max(0, p));
      el.style.setProperty('--pos', `${pos}%`);
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
    };
    const fromEvent = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      touched = true;
      hint?.kill();
      el.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    el.addEventListener('pointermove', (e) => dragging && fromEvent(e));
    const end = () => (dragging = false);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') set(pos - step);
      else if (e.key === 'ArrowRight') set(pos + step);
      else if (e.key === 'Home') set(0);
      else if (e.key === 'End') set(100);
      else return;
      touched = true;
      hint?.kill();
      e.preventDefault();
    });

    // One sweep on first sight shows that the divider moves.
    let hint: gsap.core.Timeline | undefined;
    if (!reduced) {
      const o = { p: 50 };
      const apply = () => !touched && set(o.p);
      hint = gsap
        .timeline({ scrollTrigger: { trigger: el, start: 'top 62%', once: true }, defaults: { ease: 'power2.inOut', onUpdate: apply } })
        .to(o, { p: 64, duration: 0.8 })
        .to(o, { p: 50, duration: 0.8 });
    }
  });
}

// ---------------------------------------------------------------- copy buttons
function initCopy() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    const label = btn.querySelector<HTMLElement>('[data-copy-label]');
    const status = btn.querySelector<HTMLElement>('[data-copy-status]');
    let timer: number | undefined;
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      btn.setAttribute('data-done', '');
      if (label) label.textContent = 'Copied';
      if (status) status.textContent = 'Copied to clipboard';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        btn.removeAttribute('data-done');
        if (label) label.textContent = 'Copy';
        if (status) status.textContent = '';
      }, 1400);
    });
  });
}

// ------------------------------------------------------------------------ boot
function boot() {
  window.__novaMotion = true;
  initCopy();
  initCompare();
  // Layout settles once the variable fonts are in; measure again then.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
