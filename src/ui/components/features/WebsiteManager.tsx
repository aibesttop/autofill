import { useEffect, useState } from 'react';
import type { Website as ApiWebsite } from '@shared/types';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import * as S from './WebsiteManager.styles';

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export const WebsiteManager: React.FC = () => {
  const [websites, setWebsites] = useState<ApiWebsite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWebsites = async () => {
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
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to load websites'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWebsites();
  }, []);

  return (
    <S.Container>
      <S.Header>
        <div>
          <S.Title>🌐 Website Profiles</S.Title>
          <S.Description>Review the websites returned by your authenticated autofill account</S.Description>
        </div>
        <Button variant="secondary" onClick={() => void loadWebsites()} isLoading={isLoading}>
          Refresh
        </Button>
      </S.Header>

      {error ? <S.ErrorText>{error}</S.ErrorText> : null}

      {isLoading ? (
        <Card>
          <S.EmptyState>Loading website profiles...</S.EmptyState>
        </Card>
      ) : null}

      {!isLoading && !error && websites.length === 0 ? (
        <Card>
          <S.EmptyState>No website profiles were returned for this account.</S.EmptyState>
        </Card>
      ) : null}

      {!isLoading && websites.length > 0 ? (
        <S.List>
          {websites.map((website) => (
            <Card key={website.id}>
              <S.WebsiteCard>
                <S.WebsiteTopRow>
                  <div>
                    <S.WebsiteName>{website.name}</S.WebsiteName>
                    <S.WebsiteUrl href={website.url} target="_blank" rel="noreferrer">
                      {website.url}
                    </S.WebsiteUrl>
                  </div>
                  <S.StatusBadge status={website.status}>{website.status}</S.StatusBadge>
                </S.WebsiteTopRow>
                {website.description ? (
                  <S.WebsiteDescription>{website.description}</S.WebsiteDescription>
                ) : null}
                <S.MetadataRow>
                  <S.MetadataItem>
                    Category: {website.category || 'Uncategorized'}
                  </S.MetadataItem>
                  <S.MetadataItem>
                    Updated: {formatDate(website.updated_at)}
                  </S.MetadataItem>
                </S.MetadataRow>
              </S.WebsiteCard>
            </Card>
          ))}
        </S.List>
      ) : null}
    </S.Container>
  );
};

export default WebsiteManager;
