import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@shared/constants';
import type { Website } from '@shared/types';
import { readLocalWebsiteProfiles } from '../services/localWebsiteProfiles';

function mergeWebsiteProfiles(localProfiles: Website[], remoteProfiles: Website[]): Website[] {
  const localIds = new Set(localProfiles.map((profile) => profile.id));

  return [
    ...localProfiles,
    ...remoteProfiles.filter((profile) => !localIds.has(profile.id)),
  ];
}

export function useWebsites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [localWebsiteIds, setLocalWebsiteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [response, localProfiles] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'getWebsites' }),
        readLocalWebsiteProfiles(),
      ]);

      if (!response || !Array.isArray(response.websites)) {
        throw new Error('Unexpected website response');
      }

      setLocalWebsiteIds(new Set(localProfiles.map((profile) => profile.id)));
      setWebsites(mergeWebsiteProfiles(localProfiles, response.websites));
    } catch (nextError) {
      const localProfiles = await readLocalWebsiteProfiles().catch(() => []);
      setLocalWebsiteIds(new Set(localProfiles.map((profile) => profile.id)));
      setWebsites(localProfiles);
      setError(nextError instanceof Error ? nextError.message : 'Failed to load websites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.LOCAL_WEBSITE_PROFILES]) {
        void refresh();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    websites,
    localWebsiteIds,
    isLoading,
    error,
    refresh,
  };
}
