import { useEffect, useRef, useState } from 'react';

/**
 * Counts down to a fixed `endTime` (ms epoch). Calls `onExpire` once when it
 * hits zero. Survives re-renders/refreshes because it's derived from a fixed
 * timestamp rather than an accumulating counter.
 */
export function useCountdown(endTime, onExpire) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(endTime - Date.now(), 0));
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!endTime) return;
    expiredRef.current = false;

    const tick = () => {
      const remaining = Math.max(endTime - Date.now(), 0);
      setRemainingMs(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { remainingMs, formatted, isLow: remainingMs > 0 && remainingMs <= 60_000, isExpired: remainingMs <= 0 };
}
