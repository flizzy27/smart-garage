"use client";

import { useEffect, useRef } from "react";

const OPEN_COUNT = { current: 0 };

function lockBodyScroll() {
  if (OPEN_COUNT.current === 0) {
    const previous = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      top: window.scrollY,
    };
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }
    document.body.style.position = "fixed";
    document.body.style.top = `-${previous.top}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, previous.top);
    };
  }
  return () => {};
}

export function useBodyScrollLock(active: boolean) {
  const restoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) return;
    OPEN_COUNT.current += 1;
    restoreRef.current = lockBodyScroll();
    return () => {
      OPEN_COUNT.current = Math.max(0, OPEN_COUNT.current - 1);
      restoreRef.current?.();
      restoreRef.current = null;
    };
  }, [active]);
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const firstFocusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusables = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [active, containerRef]);
}