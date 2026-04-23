import { useEffect } from 'react';
import { eventUrl } from '../api/client';

export function useSse<T>(path: string | null, onMessage: (event: T) => void) {
  useEffect(() => {
    if (!path) {
      return;
    }
    const source = new EventSource(eventUrl(path));
    source.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as T;
        onMessage(parsed);
      } catch {
        // ignore malformed payloads
      }
    };
    source.onerror = () => {
      source.close();
    };
    return () => {
      source.close();
    };
  }, [path, onMessage]);
}
