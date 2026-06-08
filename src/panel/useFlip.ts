import { RefObject, useLayoutEffect, useRef } from 'react';

// FLIP (First, Last, Invert, Play) reorder animation, dependency-free.
// Children must expose a stable `data-id`. On each commit we measure the new
// positions, compare with the positions captured last time, and animate the
// delta away so rows glide to their new slots instead of snapping.
const PREFERS_REDUCED = '(prefers-reduced-motion: reduce)';

export function useFlip(containerRef: RefObject<HTMLElement | null>, orderKey: string): void {
  const prev = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const map = new Map<string, DOMRect>();
      for (const child of Array.from(el.children)) {
        if (!(child instanceof HTMLElement)) continue;
        const id = child.dataset.id;
        if (id) map.set(id, child.getBoundingClientRect());
      }
      return map;
    };

    const reduced = window.matchMedia(PREFERS_REDUCED).matches;
    const next = measure();

    if (!reduced) {
      for (const child of Array.from(el.children)) {
        if (!(child instanceof HTMLElement)) continue;
        const id = child.dataset.id;
        if (!id) continue;
        const oldRect = prev.current.get(id);
        const newRect = next.get(id);
        if (!oldRect || !newRect) continue; // entering rows animate via CSS
        const dy = oldRect.top - newRect.top;
        if (!dy) continue;
        child.style.transition = 'none';
        child.style.transform = `translateY(${dy}px)`;
        requestAnimationFrame(() => {
          child.style.transition = 'transform 240ms cubic-bezier(0.2, 0.7, 0.3, 1)';
          child.style.transform = '';
        });
      }
    }

    prev.current = next;
  }, [containerRef, orderKey]);
}
