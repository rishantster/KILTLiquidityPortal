import { useState, useEffect } from 'react';

/**
 * Hook to defer data loading until after initial render
 * This prevents blocking the initial app load
 */
export function useDeferredData<T>(
  dataFetcher: () => Promise<T> | T,
  fallbackValue: T,
  delay: number = 100
): { data: T; isLoading: boolean; error: Error | null } {
  const [data, setData] = useState<T>(fallbackValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await dataFetcher();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [dataFetcher, delay]);

  return { data, isLoading, error };
}