import { useEffect, type RefObject } from 'react';

/**
 * Close a card when the user presses outside it. Presses inside `ref`, on an
 * element matching `ignore` (e.g. another word, which opens its own card), or
 * with Shift held (building a group) are left alone.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
  ignore?: string,
) {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || e.shiftKey) return;
      if (ref.current?.contains(target)) return;
      if (ignore && target.closest(ignore)) return;
      onDismiss();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [ref, active, onDismiss, ignore]);
}
