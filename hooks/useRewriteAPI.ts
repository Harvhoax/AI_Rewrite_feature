import { useState, useCallback } from 'react';
import { SafeRewriterResponse, SafeRewriterError } from '@/lib/types/communication';

interface RewriteAPIResponse {
  success: boolean;
  data?: SafeRewriterResponse;
  error?: {
    message: string;
    code: string;
  };
  cached?: boolean;
  timestamp?: string;
}

export function useRewriteAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SafeRewriterError | null>(null);

  const rewriteMessage = useCallback(async (
    message: string,
    region: string = 'US',
    userId?: string
  ): Promise<SafeRewriterResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          region,
          userId,
        }),
      });

      const data: RewriteAPIResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to rewrite message');
      }

      if (!data.data) {
        throw new Error('No data received from API');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const safeRewriterError = new SafeRewriterError({
        message: errorMessage,
        code: 'API_ERROR',
        details: err instanceof Error ? err.stack : undefined,
      });
      setError(safeRewriterError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    rewriteMessage,
    clearError,
  };
}
