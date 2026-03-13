import { useState } from 'react';
import { useWebsites } from '../../hooks/useWebsites';
import { useAutomationWorkspace } from '../../hooks/useAutomationWorkspace';
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
  const { websites, isLoading, error, refresh } = useWebsites();
  const { selectedWebsiteId, selectedWebsiteSnapshot, selectWebsite } = useAutomationWorkspace();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSelectWebsite = async (websiteId: string) => {
    const website = websites.find((item) => item.id === websiteId) || null;
    if (!website) {
      return;
    }

    setSelectingId(websiteId);
    setFeedback(null);

    try {
      await selectWebsite(website);
      setFeedback(`Active profile updated to ${website.name}.`);
    } catch (nextError) {
      setFeedback(
        nextError instanceof Error ? nextError.message : 'Failed to update the active website profile.'
      );
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <S.Container>
      <S.Header>
        <div>
          <S.Title>🌐 Website Profiles</S.Title>
          <S.Description>Review the websites returned by your authenticated autofill account</S.Description>
        </div>
        <Button variant="secondary" onClick={() => void refresh()} isLoading={isLoading}>
          Refresh
        </Button>
      </S.Header>

      {error ? <S.ErrorText>{error}</S.ErrorText> : null}
      {feedback ? <S.InfoText>{feedback}</S.InfoText> : null}

      <Card>
        <S.ActiveProfilePanel>
          <S.ActiveProfileLabel>Current active profile</S.ActiveProfileLabel>
          <S.ActiveProfileName>
            {selectedWebsiteSnapshot ? selectedWebsiteSnapshot.name : 'No profile selected'}
          </S.ActiveProfileName>
          <S.ActiveProfileMeta>
            {selectedWebsiteSnapshot
              ? [
                  selectedWebsiteSnapshot.category || selectedWebsiteSnapshot.url,
                  selectedWebsiteSnapshot.tags?.length
                    ? `Tags: ${selectedWebsiteSnapshot.tags.join(', ')}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Choose a website below to make Quick Fill and Batch Submit use it by default.'}
          </S.ActiveProfileMeta>
        </S.ActiveProfilePanel>
      </Card>

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
            <Card
              key={website.id}
              hover
              onClick={() => void handleSelectWebsite(website.id)}
            >
              <S.WebsiteCard isSelected={selectedWebsiteId === website.id}>
                <S.WebsiteTopRow>
                  <div>
                    <S.WebsiteName>{website.name}</S.WebsiteName>
                    <S.WebsiteUrl
                      href={website.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
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
                  {website.tags?.length ? (
                    <S.MetadataItem>
                      Tags: {website.tags.join(', ')}
                    </S.MetadataItem>
                  ) : null}
                  <S.MetadataItem>
                    Updated: {formatDate(website.updated_at)}
                  </S.MetadataItem>
                </S.MetadataRow>
                <S.ActionRow>
                  <Button
                    size="sm"
                    variant={selectedWebsiteId === website.id ? 'secondary' : 'primary'}
                    isLoading={selectingId === website.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleSelectWebsite(website.id);
                    }}
                  >
                    {selectedWebsiteId === website.id ? 'Selected' : 'Use Profile'}
                  </Button>
                  <S.ActionHint>
                    {selectedWebsiteId === website.id
                      ? 'Quick Fill and Batch Submit are using this profile now.'
                      : 'Click anywhere on this card to make it the active profile.'}
                  </S.ActionHint>
                </S.ActionRow>
              </S.WebsiteCard>
            </Card>
          ))}
        </S.List>
      ) : null}
    </S.Container>
  );
};

export default WebsiteManager;
