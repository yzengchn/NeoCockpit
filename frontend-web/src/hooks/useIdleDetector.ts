import { useEffect, useRef, useState, useCallback } from 'react';
import { addWindowEventListener } from '@/utils/browser';
import { clearTimeoutSafe, setTimeoutSafe } from '@/utils/timers';

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes

/**
 * Tracks whether the user is idle (no mouse/keyboard/touch/scroll activity for 3 min).
 * Returns { isIdle, resetIdle } — pages can use isIdle to disable polling.
 */
export function useIdleDetector(timeout = IDLE_TIMEOUT) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeoutSafe>>();

  const resetIdle = useCallback(() => {
    setIsIdle(false);
    clearTimeoutSafe(timerRef.current);
    timerRef.current = setTimeoutSafe(() => setIsIdle(true), timeout);
  }, [timeout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
    const handler = () => resetIdle();

    // Start the initial timer
    resetIdle();

    const cleanups = events.map((eventName) => addWindowEventListener(eventName, handler, { passive: true }));
    return () => {
      clearTimeoutSafe(timerRef.current);
      timerRef.current = undefined;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [resetIdle]);

  return { isIdle, resetIdle };
}
