// Motion shared by every page: smooth scrolling, the reveal system, counters,
// bars, comparison sliders and copy buttons. Page-specific choreography lives
// next to this file (home.ts).
//
// Everything here degrades to plain, fully visible content when the visitor
// prefers reduced motion.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = window.matchMedia('(pointer: coarse)').matches;

declare global {
  interface Window {
    __novaMotion?: boolean;
  }
}

gsap.defaults({ ease: 'expo.out', duration: 1 });
ScrollTrigger.config({ ignoreMobileResize: true });

// ---------------------------------------------------------------- smooth scroll
export let lenis: Lenis | undefined;
if (!reduced && !coarse) {
  lenis = new Lenis({ lerp: 0.12, anchors: { offset: -80 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// --------------------------------------------------------------------- reveals
function initReveals() {
  if (reduced) return;

  // Headlines: lines rise out of a mask.
  document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      linesClass: 'line',
      onSplit(self) {
        gsap.set(el, { visibility: 'visible' });
        return gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.2,
          stagger: 0.09,
          delay: Number(el.dataset.delay ?? 0),
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      },
    });
  });

  // Blocks: a short rise and fade.
  gsap.utils.toArray<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 26 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.2,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      },
    );
  });

  // Groups: children arrive one after another.
  gsap.utils.toArray<HTMLElement>('[data-reveal="stagger"]').forEach((el) => {
    gsap.set(el, { visibility: 'visible' });
    gsap.fromTo(
      el.children,
      { autoAlpha: 0, y: 22 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        stagger: Number(el.dataset.stagger ?? 0.06),
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      },
    );
  });

  // Media: the frame opens from a slightly smaller inset.
  gsap.utils.toArray<HTMLElement>('[data-reveal="frame"]').forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, scale: 0.965, y: 40 },
      {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 1.4,
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      },
    );
  });
}

// -------------------------------------------------------------------- counters
// <span data-count data-to="15.7" data-decimals="1">15.7</span>
function initCounters() {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const to = Number(el.dataset.to ?? el.textContent);
    const decimals = Number(el.dataset.decimals ?? 0);
    if (!Number.isFinite(to)) return;
    const state = { v: 0 };
    const final = el.textContent ?? '';
    el.textContent = (0).toFixed(decimals);
    gsap.to(state, {
      v: to,
      duration: 1.8,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => (el.textContent = state.v.toFixed(decimals)),
      onComplete: () => (el.textContent = final),
    });
  });
}

// ------------------------------------------------------------------------ bars
// Bars are sized in CSS by --w (0..1) and drawn by --p (0..1).
function initBars() {
  document.querySelectorAll<HTMLElement>('[data-bars]').forEach((group) => {
    const bars = group.querySelectorAll<HTMLElement>('[data-bar]');
    if (reduced) return;
    gsap.set(bars, { '--p': 0 });
    gsap.to(bars, {
      '--p': 1,
      duration: 1.5,
      ease: 'expo.out',
      stagger: 0.07,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true },
    });
  });
}

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

    // One slow sweep on first sight shows that the divider moves.
    let hint: gsap.core.Timeline | undefined;
    if (!reduced) {
      const o = { p: 50 };
      const apply = () => !touched && set(o.p);
      hint = gsap
        .timeline({ scrollTrigger: { trigger: el, start: 'top 62%', once: true }, defaults: { ease: 'power2.inOut', onUpdate: apply } })
        .to(o, { p: 68, duration: 1 })
        .to(o, { p: 34, duration: 1.5 })
        .to(o, { p: 50, duration: 1 });
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

// ------------------------------------------------------------ small pleasures
// A hairline at the top of the page shows how far the reader has come.
function initProgress() {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return;
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 0, end: 'max', scrub: 0.3 },
  });
}

// Panels catch a little light where the pointer is.
function initSpot() {
  if (coarse) return;
  document.querySelectorAll<HTMLElement>('[data-spot]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--sx', `${e.clientX - r.left}px`);
      el.style.setProperty('--sy', `${e.clientY - r.top}px`);
    });
  });
}

// The footnotes are closed until asked for. A footnote marker, or an address
// that names a note, opens the list first, so the scroll to the note has
// somewhere to go, and marks the note.
function initNotes() {
  const notes = document.querySelector<HTMLDetailsElement>('[data-notes]');
  if (!notes) return;
  const mark = (hash: string) => {
    if (!/^#fn-\d+$/.test(hash)) return null;
    const note = notes.querySelector<HTMLElement>(hash);
    if (!note) return null;
    notes.open = true;
    notes.querySelectorAll('[data-current]').forEach((n) => n.removeAttribute('data-current'));
    note.setAttribute('data-current', '');
    return note;
  };
  // In the capture phase: before anything measures where the note is.
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('sup.fn a');
      if (a) mark(a.hash);
    },
    true,
  );
  const named = mark(location.hash);
  if (named) requestAnimationFrame(() => named.scrollIntoView({ block: 'center' }));
}

// Lists that keep the row under the pointer lit (data-focus, global.css) get
// their transition on the first visit, long after they have arrived.
function initFocus() {
  if (coarse) return;
  document.querySelectorAll<HTMLElement>('[data-focus]').forEach((list) => {
    list.addEventListener('pointerenter', () => list.classList.add('is-live'), { once: true });
  });
}

// Primary actions lean towards the pointer.
function initMagnetic() {
  if (coarse || reduced) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.16);
      y((e.clientY - (r.top + r.height / 2)) * 0.28);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

// The wordmark that signs the page off rises letter by letter.
function initSignOff() {
  const sign = document.querySelector<HTMLElement>('[data-sign]');
  if (!sign || reduced) return;
  gsap.from(sign.querySelectorAll('.wm-letter, .wm-dot, .wm-glow'), {
    yPercent: 16,
    opacity: 0,
    stagger: 0.05,
    ease: 'none',
    scrollTrigger: { trigger: sign, start: 'top 98%', end: 'top 58%', scrub: 0.5 },
  });
}

// ------------------------------------------------------------------------ boot
function boot() {
  window.__novaMotion = true;
  initCopy();
  initCompare();
  initSpot();
  initNotes();
  initFocus();
  initMagnetic();
  initProgress();
  initSignOff();
  initReveals();
  initCounters();
  initBars();
  // Layout settles once the variable fonts are in; measure again then.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
