'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
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
    };
  }, []);

  if (isOnline && !showRestored) {
    return null;
  }

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="sticky top-0 z-[100] w-full bg-error text-error-content px-4 py-2.5 shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-200"
      >
        <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
        <span>Connection lost. You are currently offline — please check your internet connection. Your work on this page will remain safe.</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-[100] w-full bg-success text-success-content px-4 py-2 shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-200 animate-in fade-in"
      >
        <Wifi className="w-4 h-4 shrink-0" />
        <span>Connection restored! You are back online.</span>
      </div>
    );
  }

  return null;
}
