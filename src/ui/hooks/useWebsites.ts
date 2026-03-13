import { useEffect, useState } from 'react';
import type { Website } from '@shared/types';

export function useWebsites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({ type: 'getWebsites' });

      if (!response || !Array.isArray(response.websites)) {
        throw new Error('Unexpected website response');
      }

      setWebsites(response.websites);
    } catch (nextError) {
      setWebsites([]);
      setError(nextError instanceof Error ? nextError.message : 'Failed to load websites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return {
    websites,
    isLoading,
    error,
    refresh,
  };
}
