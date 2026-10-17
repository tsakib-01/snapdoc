/**
 * Smoothly anchors the user's viewport to the tool container and prevents
 * automatic downward scroll jumps when files are uploaded, operations run,
 * or results appear.
 */
export function scrollToTool(options?: { force?: boolean }) {
  if (typeof window === 'undefined') return;

  // 1. Blur the currently active element (e.g. dropzone or convert button)
  // to prevent browser focus-recovery algorithms from jumping down to the next
  // focusable DOM element (such as FAQ buttons or footer links) upon unmounting.
  if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }

  // 2. Perform smooth realignment on the next animation frame
  requestAnimationFrame(() => {
    const el = document.getElementById('tool-sandbox') || document.querySelector('.tool-interactive-sandbox');
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const stickyHeaderOffset = 76; // Sticky navigation bar height + comfortable top breathing room
    const targetScrollY = window.scrollY + rect.top - stickyHeaderOffset;

    // Trigger realignment if:
    // a) Explicitly forced (e.g., conversion finished and result card mounted).
    // b) Tool top has scrolled up off-screen behind sticky header (rect.top < stickyHeaderOffset - 15).
    // c) Tool top is pushed too far down into lower viewport (rect.top > window.innerHeight * 0.45).
    if (options?.force || rect.top < stickyHeaderOffset - 15 || rect.top > window.innerHeight * 0.45) {
      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: 'smooth',
      });
    }
  });
}
