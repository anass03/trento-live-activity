import { useEffect, useRef } from 'react';

/**
 * Keeps data fresh without a manual "Aggiorna" button.
 *
 * Re-runs `callback`:
 *  - every `intervalMs` (default 30s) while the tab is visible,
 *  - when the window regains focus,
 *  - when the tab becomes visible again.
 *
 * It does NOT run on mount — pages already do their initial load in their own
 * effect — so this only handles the periodic/wake-up refreshes. The callback is
 * held in a ref so changing closures don't reset the interval.
 *
 * Polling pauses while the tab is hidden to avoid pointless background traffic.
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  intervalMs = 30_000,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => { void callbackRef.current(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') run(); };

    let timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') run();
    }, intervalMs);

    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
