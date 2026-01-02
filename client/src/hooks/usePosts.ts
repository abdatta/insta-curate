import { useCallback, useEffect, useState } from 'preact/hooks';
import { api } from '../services/api';
import type { CuratedResponse, Post } from '../types';

export function useCuratedPosts() {
  const [data, setData] = useState<CuratedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updatePost = useCallback(
    (shortcode: string, updates: Partial<Post>) => {
      setData((prev) => {
        if (!prev) return prev;

        const postIndex = prev.posts.findIndex(
          (p) => p.shortcode === shortcode
        );
        if (postIndex === -1) return prev;

        const updatedPost = { ...prev.posts[postIndex], ...updates };
        const updatedPosts = [...prev.posts];
        updatedPosts[postIndex] = updatedPost;

        return { ...prev, posts: updatedPosts };
      });
    },
    []
  );

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

  return { data, loading, error, refresh: fetchPosts, updatePost };
}
