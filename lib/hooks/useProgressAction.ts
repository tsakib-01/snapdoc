'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useProgressAction() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startProgress = useCallback(() => {
    cleanup();
    setIsProcessing(true);
    setProgress(14);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 38) {
          return prev + Math.floor(Math.random() * 6) + 3;
        } else if (prev < 68) {
          return prev + Math.floor(Math.random() * 4) + 2;
        } else if (prev < 88) {
          return prev + Math.floor(Math.random() * 2) + 1;
        } else if (prev < 96) {
          return Math.min(96, prev + 0.8);
        } else {
          return Math.min(98, prev + 0.2);
        }
      });
    }, 65);
  }, [cleanup]);

  const finishProgress = useCallback(
    async (onComplete?: () => void) => {
      cleanup();
      setProgress(100);
      // Give user time to see the 100% completed status
      await new Promise((resolve) => setTimeout(resolve, 240));
      if (onComplete) onComplete();
      setIsProcessing(false);
      setProgress(0);
    },
    [cleanup]
  );

  const resetProgress = useCallback(() => {
    cleanup();
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
