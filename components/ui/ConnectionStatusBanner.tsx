'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerShake = () => {
    setIsShaking(false);
    setTimeout(() => {
      setIsShaking(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setIsShaking(false);
      }, 450);
    }, 10);
  };

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

  // When connection is lost: completely lock down and block all interactions
  useEffect(() => {
    if (isOnline || typeof window === 'undefined') return;

    const blockAllEvents = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if ('stopImmediatePropagation' in e) {
        (e as any).stopImmediatePropagation();
      }
      triggerShake();
    };

    // Capture and block every user interaction at the root window level
    window.addEventListener('click', blockAllEvents, true);
    window.addEventListener('mousedown', blockAllEvents, true);
    window.addEventListener('touchstart', blockAllEvents, true);
    window.addEventListener('keydown', blockAllEvents, true);
    window.addEventListener('drop', blockAllEvents, true);
    window.addEventListener('dragover', blockAllEvents, true);

    return () => {
      window.removeEventListener('click', blockAllEvents, true);
      window.removeEventListener('mousedown', blockAllEvents, true);
      window.removeEventListener('touchstart', blockAllEvents, true);
      window.removeEventListener('keydown', blockAllEvents, true);
      window.removeEventListener('drop', blockAllEvents, true);
      window.removeEventListener('dragover', blockAllEvents, true);
    };
  }, [isOnline]);

  if (isOnline && !showRestored) {
    return null;
  }

  if (!isOnline) {
    return (
      <>
        {/* Top Warning Banner */}
        <aside
          role="alert"
          aria-live="assertive"
          className="w-full bg-slate-900 dark:bg-black text-rose-400 border-b border-rose-500/20 py-2.5 px-4 shadow-md backdrop-blur-md flex items-center justify-center select-none fixed top-0 left-0 right-0 z-[10000]"
        >
          <span
            className={`text-xs sm:text-sm font-semibold tracking-wide text-rose-300 transition-transform flex items-center gap-2 ${
              isShaking ? 'animate-shake text-rose-200' : ''
            }`}
          >
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            Connection lost — An internet connection is required to use tools and process files
          </span>
        </aside>

        {/* Full-Screen Interaction Shield & Notice */}
        <div
          className="fixed inset-0 top-[38px] z-[9999] bg-base-100/75 dark:bg-black/75 backdrop-blur-[3px] flex items-center justify-center p-4 cursor-not-allowed select-none animate-in fade-in duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerShake();
          }}
        >
          <div
            className={`max-w-md w-full bg-base-100 dark:bg-base-200 border border-base-300 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4 transition-transform ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
              <WifiOff className="w-8 h-8 animate-pulse text-rose-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-base-content">
                Connection Lost
              </h3>
              <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                All file uploads, conversions, editing tools, and downloads are paused while you are offline. Please reconnect to the internet to continue.
              </p>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Waiting for network connection...
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (showRestored) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="w-full bg-slate-900 dark:bg-black text-emerald-400 border-b border-emerald-500/20 py-2.5 px-4 shadow-sm backdrop-blur-md flex items-center justify-center select-none animate-in fade-in slide-in-from-top-1 duration-200 fixed top-0 left-0 right-0 z-[10000]"
      >
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-emerald-300 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          Back online — Connection restored
        </span>
      </aside>
    );
  }

  return null;
}
