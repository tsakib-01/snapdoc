'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register offline caching service worker so refreshing stays on the page
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.debug('ServiceWorker registration optional error:', err);
      });
    }

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
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // Listen to any click on the page when offline to shake the banner text
  useEffect(() => {
    if (isOnline || typeof window === 'undefined') return;

    const handleDocumentClick = () => {
      setIsShaking(false);
      // Small timeout to allow re-triggering animation on consecutive clicks
      setTimeout(() => {
        setIsShaking(true);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => {
          setIsShaking(false);
        }, 450);
      }, 10);
    };

    window.addEventListener('click', handleDocumentClick);
    return () => {
      window.removeEventListener('click', handleDocumentClick);
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

