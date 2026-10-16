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
    activeToast.remove();
    activeToast = null;
  }
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  const toast = document.createElement('div');
  toast.className =
    'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl shadow-emerald-950/40 border border-emerald-400/40 backdrop-blur-md max-w-[92vw] sm:max-w-md pointer-events-auto transition-all duration-300 ease-out translate-y-8 opacity-0 select-none';

  const cleanFilename = filename ? filename.replace(/[<>"'&]/g, '') : '';

  toast.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0 shadow-inner">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div class="flex-1 min-w-0 pr-1 text-left">
      <p class="font-extrabold text-sm sm:text-base leading-tight text-white drop-shadow-xs">Download Complete!</p>
      <p class="text-[11px] sm:text-xs text-emerald-100 font-medium truncate mt-0.5">
        ${cleanFilename ? `${cleanFilename} has been saved.` : 'Your file has been downloaded successfully.'}
      </p>
    </div>
    <button type="button" class="btn btn-ghost btn-xs btn-circle text-white/80 hover:text-white hover:bg-white/10 shrink-0 ml-1">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  document.body.appendChild(toast);
  activeToast = toast;

  // Animate in smoothly
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-8', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  const closeToast = () => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => {
      toast.remove();
      if (activeToast === toast) {
        activeToast = null;
      }
    }, 300);
  };

  const closeBtn = toast.querySelector('button');
  if (closeBtn) {
    closeBtn.onclick = closeToast;
  }

  // Display for 3.5 seconds so users can easily see it
  toastTimeout = setTimeout(closeToast, 3500);
}
