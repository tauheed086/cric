import { useEffect, useRef } from 'react';
import { eventUrl } from '../api/client';

export function useSse<T>(path: string | null, onMessage: (event: T) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!path) {
      return;
    }
    const source = new EventSource(eventUrl(path));
    source.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as T;
        onMessageRef.current(parsed);
      } catch {
        // ignore malformed payloads
      }
    };
    source.onerror = () => {
      // Browser EventSource automatically attempts to reconnect on transient disconnects.
    };
    return () => {
      source.close();
    };
  }, [path]);
}
