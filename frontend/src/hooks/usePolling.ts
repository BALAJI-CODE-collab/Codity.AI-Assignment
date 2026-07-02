import { useEffect, useRef } from 'react';

export function usePolling(callback: () => Promise<void> | void, intervalMs: number) {
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  useEffect(() => {
    const timer = window.setInterval(() => {
      void callbackRef.current();
    }, intervalMs);

    void callbackRef.current();

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs]);
}
