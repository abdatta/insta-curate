import { useCallback, useEffect, useState } from 'preact/hooks';
import { api } from '../services/api';
import type { CuratedResponse } from '../types';

export function useCuratedPosts() {
  const [data, setData] = useState<CuratedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLatestCurated();
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { data, loading, error, refresh: fetchPosts };
}
