// Behaviour shared by every page: how content arrives while scrolling, what
// answers the pointer, the comparison sliders and the copy buttons.
// Page-specific motion lives next to this file (home.ts).
//
// Markup opts in with attributes:
//   data-words     a headline that scrolling lights word by word
//   data-reveal    an element that arrives once, with one short move
//   data-stagger   a container whose children arrive one after another
//   data-count     a figure that counts up to its value
//   data-bars      a chart whose bars grow from zero
//   data-drift     a large figure that drifts a little against the page
//   data-focus     a list whose rows dim while another row is under the pointer (CSS only)
//
// Before first paint `html.motion` holds these in their opening state
// (global.css). Without JavaScript, or with reduced motion, the class is
// never set and everything is simply there.

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

// --------------------------------------------------------------- scroll motion
// A headline is lit by scrolling, the way the statement in the hero is.
function initWords() {
  document.querySelectorAll<HTMLElement>('[data-words]').forEach((el) => {
    const { words } = SplitText.create(el, { type: 'words', aria: 'auto' });
    gsap.set(el, { opacity: 1 });
    gsap.fromTo(
      words,
      { opacity: 0.16 },
      {
        opacity: 1,
        ease: 'none',
        duration: 0.5,
        stagger: { each: 1 / words.length },
        scrollTrigger: { trigger: el, start: 'top 88%', end: 'clamp(top 52%)', scrub: 0.5 },
      },
    );
  });
}

// Everything else arrives once. When it has, the inline styles are removed
// again, so hover transforms and transitions written in CSS work as usual.
function arrive(targets: Element[]) {
  if (!targets.length) return;
  gsap.to(targets, {
    opacity: 1,
    y: 0,
    duration: 0.7,
    stagger: 0.07,
    overwrite: true,
    onComplete() {
      targets.forEach((t) => t.setAttribute('data-in', ''));
      gsap.set(targets, { clearProps: 'opacity,transform' });
    },
  });
}

function initReveals() {
  // No clamp here: content that is in view when the page opens must arrive at once.
  ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: arrive });
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    ScrollTrigger.create({
      trigger: group,
      start: 'top 86%',
      once: true,
      onEnter: () => arrive([...group.children]),
    });
  });
}

// A figure counts up to the value in the markup. Every number in the text
// runs ("9–16" counts both), with the decimals it is written with.
function initCounts() {
  const number = /\d+(?:\.\d+)?/g;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const final = el.textContent ?? '';
    if (!final.match(number)) return;
    const at = (p: number) =>
      final.replace(number, (m) => (parseFloat(m) * p).toFixed((m.split('.')[1] ?? '').length));
    const o = { p: 0 };
    el.textContent = at(0);
    gsap.to(o, {
      p: 1,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = at(o.p)),
      onComplete: () => (el.textContent = final),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

// Bars grow from zero to their measured length (CSS multiplies --w by --g).
function initBars() {
  document.querySelectorAll<HTMLElement>('[data-bars]').forEach((chart) => {
    gsap.fromTo(
      chart.querySelectorAll('i'),
      { '--g': 0 },
      {
        '--g': 1,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.05,
        scrollTrigger: { trigger: chart, start: 'top 84%', once: true },
      },
    );
  });
}

// A large figure drifts a little against the page while it crosses the view.
function initDrift() {
  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((el) => {
    const d = Number(el.dataset.drift) || 24;
    gsap.fromTo(
      el,
      { y: d },
      { y: -d, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } },
    );
  });
}

// The hairline along the top edge follows the scroll position.
function initProgress() {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return;
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.2 },
  });
}

// The wordmark that closes the page rises letter by letter, and its dot is
// the last thing to come on.
function initSignOff() {
  const sign = document.querySelector<HTMLElement>('[data-sign]');
  if (!sign) return;
  gsap
    .timeline({ scrollTrigger: { trigger: sign, start: 'clamp(top 96%)', end: 'clamp(top 46%)', scrub: 0.6 } })
    .from(sign.querySelectorAll('.wm-letter'), { yPercent: 16, opacity: 0, duration: 1, stagger: 0.14, ease: 'power2.out' })
    .from(sign.querySelector('.wm-dot'), { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'power2.out' }, '-=0.25');
}

// ---------------------------------------------------------------------- pointer
// A card is lit where the pointer is: the position goes to CSS as --mx, --my.
function initPointerLight() {
  if (coarse) return;
  document.addEventListener(
    'pointermove',
    (e) => {
      const card = (e.target as Element | null)?.closest?.<HTMLElement>('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
      card.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
    },
    { passive: true },
  );
}

// The primary action leans a few pixels towards the pointer (--tx, --ty).
function initMagnetic() {
  if (coarse || reduced) return;
  document.querySelectorAll<HTMLElement>('.btn--primary').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      btn.style.setProperty('--tx', `${(Math.max(-1, Math.min(1, x)) * 4).toFixed(1)}px`);
      btn.style.setProperty('--ty', `${(Math.max(-1, Math.min(1, y)) * 3).toFixed(1)}px`);
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.removeProperty('--tx');
      btn.style.removeProperty('--ty');
    });
  });
}

// ------------------------------------------------------------------- footnotes
// The notes are closed until asked for. A footnote marker, or an address that
// names a note, opens them, marks the note and brings it into view.
function initNotes() {
  const notes = document.querySelector<HTMLDetailsElement>('[data-notes]');
  if (!notes) return;
  const go = (hash: string, smooth: boolean) => {
    if (!/^#fn-\d+$/.test(hash)) return false;
    const note = notes.querySelector<HTMLElement>(hash);
    if (!note) return false;
    notes.open = true;
    notes.querySelectorAll('[data-current]').forEach((n) => n.removeAttribute('data-current'));
    note.setAttribute('data-current', '');
    // The list takes a moment to open; go once it has its height.
    window.setTimeout(() => note.scrollIntoView({ behavior: smooth && !reduced ? 'smooth' : 'auto', block: 'center' }), 450);
    return true;
  };
  go(location.hash, false);
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('sup.fn a');
    if (!a || !go(a.hash, true)) return;
    e.preventDefault();
    history.replaceState(null, '', a.hash);
  });
}

// ------------------------------------------------------------------------ boot
function boot() {
  window.__novaMotion = true;
  initCopy();
  initCompare();
  initNotes();
  initPointerLight();
  initMagnetic();
  // Words are split on final metrics, so the scroll motion waits for the fonts.
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    if (!reduced) {
      initWords();
      initReveals();
      initCounts();
      initBars();
      initDrift();
      initProgress();
      initSignOff();
    }
    ScrollTrigger.refresh();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
