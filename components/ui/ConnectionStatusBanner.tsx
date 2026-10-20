'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge any legacy service worker and cached files
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      }).catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name).catch(() => {});
        }
      }).catch(() => {});
    }

    // Defensive guard: Suppress any legacy download completion toast if still in memory
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (
              node.textContent &&
              (node.textContent.includes('Download Complete!') ||
               node.textContent.includes('Download Complete'))
            ) {
              node.remove();
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      observer.disconnect();
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // When connection is lost: block all functions, clicks, uploads, and downloads while shaking banner
  useEffect(() => {
    if (isOnline || typeof window === 'undefined') return;

    const handleBlockedAction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if ('stopImmediatePropagation' in e) {
        (e as any).stopImmediatePropagation();
      }

      setIsShaking(false);
      setTimeout(() => {
        setIsShaking(true);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => {
          setIsShaking(false);
        }, 450);
      }, 10);
    };

    // Capture and block every interaction at the root window level
    window.addEventListener('click', handleBlockedAction, true);
    window.addEventListener('mousedown', handleBlockedAction, true);
    window.addEventListener('touchstart', handleBlockedAction, true);
    window.addEventListener('keydown', handleBlockedAction, true);
    window.addEventListener('drop', handleBlockedAction, true);
    window.addEventListener('dragover', handleBlockedAction, true);

    return () => {
      window.removeEventListener('click', handleBlockedAction, true);
      window.removeEventListener('mousedown', handleBlockedAction, true);
      window.removeEventListener('touchstart', handleBlockedAction, true);
      window.removeEventListener('keydown', handleBlockedAction, true);
      window.removeEventListener('drop', handleBlockedAction, true);
      window.removeEventListener('dragover', handleBlockedAction, true);
    };
  }, [isOnline]);

  if (isOnline && !showRestored) {
    return null;
  }

  if (!isOnline) {
    return (
      <aside
        role="alert"
        aria-live="assertive"
        className="w-full bg-slate-900 dark:bg-black text-rose-400 border-b border-rose-500/20 py-2.5 px-4 shadow-sm backdrop-blur-md flex items-center justify-center select-none"
      >
        <span
          className={`text-xs sm:text-sm font-semibold tracking-wide text-rose-300 transition-transform ${
            isShaking ? 'animate-shake text-rose-200' : ''
          }`}
        >
          Connection lost
        </span>
      </aside>
    );
  }

  if (showRestored) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="w-full bg-slate-900 dark:bg-black text-emerald-400 border-b border-emerald-500/20 py-2.5 px-4 shadow-sm backdrop-blur-md flex items-center justify-center select-none animate-in fade-in slide-in-from-top-1 duration-200"
      >
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-emerald-300">
          Back online
        </span>
      </aside>
    );
  }

  return null;
}
