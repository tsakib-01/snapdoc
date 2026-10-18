'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Calculates simulated progress based on absolute elapsed real time rather than interval ticks.
 * This ensures that when browsers throttle timers on background tabs, the progress does not
 * freeze or stay behind when the user switches tabs.
 */
function getProgressForElapsedMs(elapsed: number): number {
  if (elapsed <= 0) return 15;
  if (elapsed < 600) {
    // 0ms - 600ms: fast initial ramp up to ~45%
    return 15 + Math.round((elapsed / 600) * 30);
  } else if (elapsed < 1800) {
    // 600ms - 1800ms: smooth progression to ~75%
    const ratio = (elapsed - 600) / 1200;
    return 45 + Math.round(ratio * 30);
  } else if (elapsed < 3500) {
    // 1800ms - 3500ms: steady advancement to ~90%
    const ratio = (elapsed - 1800) / 1700;
    return 75 + Math.round(ratio * 15);
  } else if (elapsed < 6000) {
    // 3500ms - 6000ms: decelerating to ~96%
    const ratio = (elapsed - 3500) / 2500;
    return 90 + Math.round(ratio * 6);
  } else {
    // 6000ms+: asymptotic crawl towards 98%
    const extra = Math.min(2.5, (elapsed - 6000) / 4000);
    return Math.min(98, 96 + extra);
  }
}

export function useProgressAction() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateProgressFromTime = useCallback(() => {
    if (!isProcessingRef.current || startTimeRef.current === 0) return;
    const elapsed = Date.now() - startTimeRef.current;
    const nextVal = getProgressForElapsedMs(elapsed);
    setProgress((prev) => Math.max(prev, nextVal));
  }, []);

  useEffect(() => {
    // When user returns to the tab, immediately catch up progress based on real elapsed time
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isProcessingRef.current) {
        updateProgressFromTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanup, updateProgressFromTime]);

  const startProgress = useCallback(() => {
    cleanup();
    setIsProcessing(true);
    isProcessingRef.current = true;
    startTimeRef.current = Date.now();
    setProgress(15);

    intervalRef.current = setInterval(() => {
      updateProgressFromTime();
    }, 60);
  }, [cleanup, updateProgressFromTime]);

  const finishProgress = useCallback(
    async (onComplete?: () => void) => {
      cleanup();
      setProgress(100);
      isProcessingRef.current = false;
      startTimeRef.current = 0;

      // If user is actively viewing the tab, give a brief 220ms visual confirmation of 100%
      const delay = typeof document !== 'undefined' && document.visibilityState === 'visible' ? 220 : 0;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      if (onComplete) onComplete();
      setIsProcessing(false);
      setProgress(0);
    },
    [cleanup]
  );

  const resetProgress = useCallback(() => {
    cleanup();
    isProcessingRef.current = false;
    startTimeRef.current = 0;
    setIsProcessing(false);
    setProgress(0);
  }, [cleanup]);

  return {
    isProcessing,
    progress,
    startProgress,
    finishProgress,
    resetProgress,
    setProgress,
  };
}
