import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client';

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useApi<T>(path: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<T>(path);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
