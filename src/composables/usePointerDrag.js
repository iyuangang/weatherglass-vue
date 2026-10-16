import { onScopeDispose } from "vue";

export function usePointerDrag(
  element,
  { onDown, onDrag, onUp, immediate = false, slop = 4 },
) {
  let pointer = null;
  let originX = 0;
  let originY = 0;
  let moved = false;
  let bounds;
  function finish(event, cancelled = false) {
    if (event.pointerId !== pointer) return;
    pointer = null;
    try {
      element.value?.releasePointerCapture(event.pointerId);
    } catch {
      /* Already released. */
    }
    onUp?.(event, bounds, moved, cancelled);
    moved = false;
  }
  onScopeDispose(() => {
    if (pointer !== null) {
      try {
        element.value?.releasePointerCapture(pointer);
      } catch {
        /* Detached element. */
      }
    }
    pointer = null;
  });
  return {
    pointerdown(event) {
      if (
        pointer !== null ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      bounds = element.value.getBoundingClientRect();
      if (onDown?.(event, bounds) === false) return;
      pointer = event.pointerId;
      originX = event.clientX;
      originY = event.clientY;
      moved = false;
      try {
        element.value.setPointerCapture(pointer);
      } catch {
        /* Keyboard/synthetic input. */
      }
      event.preventDefault();
      if (immediate) {
        moved = true;
        onDrag?.(event, bounds, true);
      }
    },
    pointermove(event) {
      if (event.pointerId !== pointer) return;
      let first = false;
      if (
        !moved &&
        Math.hypot(event.clientX - originX, event.clientY - originY) > slop
      ) {
        moved = true;
        first = true;
      }
      if (moved) onDrag?.(event, bounds, first);
    },
    pointerup: (event) => finish(event),
    pointercancel: (event) => finish(event, true),
    lostpointercapture: (event) => finish(event, true),
  };
}
