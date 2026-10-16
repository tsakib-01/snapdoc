/**
 * Universal professional download completion toast notification
 * Displays a warm emerald success notification with file details for 3.5 seconds
 */

let activeToast: HTMLElement | null = null;
let toastTimeout: NodeJS.Timeout | null = null;

export function showDownloadToast(filename?: string): void {
  if (typeof window === 'undefined') return;

  // Clear any existing active toast to avoid stacking clutter
  if (activeToast) {
    try {
      activeToast.remove();
    } catch {
      // ignore
    }
    activeToast = null;
  }
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  // Defensive inline styles guarantee positioning, layering & animation across all screens
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%) translateY(24px)',
    zIndex: '9999999',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 18px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    color: '#ffffff',
    boxShadow: '0 20px 25px -5px rgba(6, 78, 59, 0.45), 0 8px 10px -6px rgba(6, 78, 59, 0.35)',
    border: '1px solid rgba(110, 231, 183, 0.45)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    maxWidth: 'min(92vw, 440px)',
    width: 'max-content',
    pointerEvents: 'auto',
    opacity: '0',
    transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
  });

  const cleanFilename = filename ? filename.replace(/[<>"'&]/g, '') : '';

  toast.innerHTML = `
    <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.22); color: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);">
      <svg style="width: 18px; height: 18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div style="flex: 1 1 0%; min-width: 0; padding-right: 4px; text-align: left;">
      <p style="font-weight: 800; font-size: 14px; line-height: 1.2; color: #ffffff; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Download Complete!</p>
      <p style="font-size: 12px; color: #d1fae5; font-weight: 500; margin: 2px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">
        ${cleanFilename ? `${cleanFilename} has been saved.` : 'Your file has been downloaded successfully.'}
      </p>
    </div>
    <button type="button" aria-label="Close" style="background: none; border: none; padding: 4px; margin-left: 4px; cursor: pointer; color: rgba(255, 255, 255, 0.8); border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: color 0.15s, background-color 0.15s;" onmouseover="this.style.color='#ffffff';this.style.backgroundColor='rgba(255,255,255,0.15)'" onmouseout="this.style.color='rgba(255,255,255,0.8)';this.style.backgroundColor='transparent'">
      <svg style="width: 16px; height: 16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  document.body.appendChild(toast);
  activeToast = toast;

  // Animate in smoothly after DOM insertion
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (activeToast === toast) {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      }
    });
  });

  const closeToast = () => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(16px)';
    setTimeout(() => {
      try {
        toast.remove();
      } catch {
        // ignore
      }
      if (activeToast === toast) {
        activeToast = null;
      }
    }, 320);
  };

  const closeBtn = toast.querySelector('button');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeToast();
    };
  }

  // Display for 3.5 seconds so users can easily see it
  toastTimeout = setTimeout(closeToast, 3500);
}
