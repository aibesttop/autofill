import { useEffect, useMemo, useRef, useState } from 'react';
import type { Website } from '@shared/types';
import { useWebsites } from '../../hooks/useWebsites';
import { useAutomationWorkspace } from '../../hooks/useAutomationWorkspace';
import {
  buildWebsiteProfile,
  deleteLocalWebsiteProfile,
  importLocalWebsiteProfiles,
  sanitizeWebsiteProfile,
} from '../../services/localWebsiteProfiles';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import * as S from './WebsiteManager.styles';

interface ProfileFormState {
  id?: string;
  name: string;
  url: string;
  category: string;
  categoriesText: string;
  description: string;
  tagsText: string;
  contactName: string;
  contactEmail: string;
  submissionWebsiteUrl: string;
  submissionComment: string;
  status: Website['status'];
}

const EMPTY_FORM: ProfileFormState = {
  name: '',
  url: '',
  category: '',
  categoriesText: '',
  description: '',
  tagsText: '',
  contactName: '',
  contactEmail: '',
  submissionWebsiteUrl: '',
  submissionComment: '',
  status: 'active',
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function toFormState(website: Website): ProfileFormState {
  return {
    id: website.id,
    name: website.name,
    url: website.url,
    category: website.category || '',
    categoriesText: website.categories?.join(', ') || '',
    description: website.description || '',
    tagsText: website.tags?.join(', ') || '',
    contactName: website.contactName || website.name,
    contactEmail: website.contactEmail || '',
    submissionWebsiteUrl: website.submissionWebsiteUrl || website.url,
    submissionComment: website.submissionComment || '',
    status: website.status || 'active',
  };
}

function getSearchText(website: Website): string {
  return [
    website.name,
    website.url,
    website.category,
    website.categories?.join(' '),
    website.tags?.join(' '),
    website.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getImportArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.websites)) {
      return record.websites;
    }
    if (Array.isArray(record.profiles)) {
      return record.profiles;
    }
    if (Array.isArray(record.data)) {
      return record.data;
    }
  }

  return [];
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      row.push(value.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += character;
  }

  row.push(value.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function parseCsvProfiles(input: string): Website[] {
  const rows = parseCsvRows(input);
  const [headers, ...dataRows] = rows;

  if (!headers?.length) {
    return [];
  }

  return dataRows
    .map((row) => {
      const record = headers.reduce<Record<string, string>>((result, header, index) => {
        result[header.trim()] = row[index] || '';
        return result;
      }, {});
      return sanitizeWebsiteProfile(record);
    })
    .filter((profile): profile is Website => profile !== null);
}

function parseImportedProfiles(fileName: string, text: string): Website[] {
  const isCsv = fileName.toLowerCase().endsWith('.csv');

  if (isCsv) {
    return parseCsvProfiles(text);
  }

  const parsed = JSON.parse(text) as unknown;
  return getImportArray(parsed)
    .map(sanitizeWebsiteProfile)
    .filter((profile): profile is Website => profile !== null);
}

function downloadJsonFile(fileName: string, websites: Website[]): void {
  const blob = new Blob([JSON.stringify(websites, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export const WebsiteManager: React.FC = () => {
  const { websites, localWebsiteIds, isLoading, error, refresh } = useWebsites();
  const {
    selectedWebsiteId,
    selectedWebsiteSnapshot,
    selectWebsite,
    saveWebsiteProfileOverride,
  } = useAutomationWorkspace();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formState, setFormState] = useState<ProfileFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!selectedWebsiteSnapshot) {
      setFormState(EMPTY_FORM);
      return;
    }

    setFormState(toFormState({
      ...selectedWebsiteSnapshot,
      status: selectedWebsiteSnapshot.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }, [selectedWebsiteSnapshot]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    websites.forEach((website) => {
      if (website.category) {
        categorySet.add(website.category);
      }
      website.categories?.forEach((category) => categorySet.add(category));
    });
    return [...categorySet].sort((a, b) => a.localeCompare(b));
  }, [websites]);

  const filteredWebsites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return websites.filter((website) => {
      const matchesQuery = normalizedQuery.length === 0 || getSearchText(website).includes(normalizedQuery);
      const websiteCategories = [website.category, ...(website.categories || [])].filter(Boolean);
      const matchesCategory =
        categoryFilter.length === 0 || websiteCategories.includes(categoryFilter);

      return matchesQuery && matchesCategory;
    });
  }, [categoryFilter, query, websites]);

  const updateForm = (field: keyof ProfileFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewProfile = () => {
    setFeedback(null);
    setFormState(EMPTY_FORM);
  };

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

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      const existingProfile = formState.id
        ? websites.find((website) => website.id === formState.id)
        : undefined;
      const profile = buildWebsiteProfile(
        {
          id: formState.id,
          name: formState.name,
          url: formState.url,
          category: formState.category,
          categoriesText: formState.categoriesText,
          description: formState.description,
          tagsText: formState.tagsText,
          contactName: formState.contactName,
          contactEmail: formState.contactEmail,
          submissionWebsiteUrl: formState.submissionWebsiteUrl,
          submissionComment: formState.submissionComment,
          status: formState.status,
        },
        existingProfile
      );

      await importLocalWebsiteProfiles([profile]);
      await saveWebsiteProfileOverride(profile.id, {
        contactName: profile.contactName,
        contactEmail: profile.contactEmail,
        submissionWebsiteUrl: profile.submissionWebsiteUrl,
        submissionComment: profile.submissionComment,
      });
      await selectWebsite(profile);
      await refresh();
      setFormState(toFormState(profile));
      setFeedback(`Saved local profile for ${profile.name}.`);
    } catch (nextError) {
      setFeedback(nextError instanceof Error ? nextError.message : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocalProfile = async (website: Website) => {
    setFeedback(null);

    try {
      await deleteLocalWebsiteProfile(website.id);
      if (selectedWebsiteId === website.id && localWebsiteIds.has(website.id)) {
        await selectWebsite(null);
      }
      await refresh();
      setFeedback(`Deleted the local copy for ${website.name}.`);
    } catch (nextError) {
      setFeedback(nextError instanceof Error ? nextError.message : 'Failed to delete local profile.');
    }
  };

  const handleExport = () => {
    downloadJsonFile('autofill-website-profiles.json', websites);
    setFeedback(`Exported ${websites.length} profile${websites.length === 1 ? '' : 's'}.`);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    setFeedback(null);

    try {
      const text = await file.text();
      const profiles = parseImportedProfiles(file.name, text);

      if (profiles.length === 0) {
        throw new Error('No valid profiles found. Include at least name and url columns or fields.');
      }

      await importLocalWebsiteProfiles(profiles);
      await refresh();
      setFeedback(`Imported ${profiles.length} local profile${profiles.length === 1 ? '' : 's'}.`);
    } catch (nextError) {
      setFeedback(nextError instanceof Error ? nextError.message : 'Failed to import profiles.');
    } finally {
      event.target.value = '';
      setIsImporting(false);
    }
  };

  return (
    <S.Container>
      <S.Header>
        <div>
          <S.Title>Website Profiles</S.Title>
          <S.Description>
            Manage local-first profiles used by Quick Fill, Batch Submit, and the AI Agent.
          </S.Description>
        </div>
        <S.HeaderActions>
          <Button variant="secondary" onClick={handleNewProfile}>
            New Profile
          </Button>
          <Button variant="secondary" onClick={() => importInputRef.current?.click()} isLoading={isImporting}>
            Import
          </Button>
          <Button variant="secondary" onClick={handleExport} disabled={websites.length === 0}>
            Export
          </Button>
          <Button variant="secondary" onClick={() => void refresh()} isLoading={isLoading}>
            Refresh
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            hidden
            onChange={(event) => void handleImportFile(event)}
          />
        </S.HeaderActions>
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
              : 'Choose a profile below or create a local one.'}
          </S.ActiveProfileMeta>
        </S.ActiveProfilePanel>
      </Card>

      <Card>
        <S.Editor>
          <S.SectionTitle>{formState.id ? 'Edit Profile' : 'New Local Profile'}</S.SectionTitle>
          <S.FieldGrid>
            <S.FieldGroup>
              <S.FieldLabel>Name</S.FieldLabel>
              <S.TextInput
                value={formState.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Product or website name"
              />
            </S.FieldGroup>
            <S.FieldGroup>
              <S.FieldLabel>URL</S.FieldLabel>
              <S.TextInput
                type="url"
                value={formState.url}
                onChange={(event) => updateForm('url', event.target.value)}
                placeholder="https://example.com"
              />
            </S.FieldGroup>
            <S.FieldGroup>
              <S.FieldLabel>Status</S.FieldLabel>
              <S.Select
                value={formState.status}
                onChange={(event) => updateForm('status', event.target.value)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
              </S.Select>
            </S.FieldGroup>
          </S.FieldGrid>

          <S.FieldGrid>
            <S.FieldGroup>
              <S.FieldLabel>Primary Category</S.FieldLabel>
              <S.TextInput
                value={formState.category}
                onChange={(event) => updateForm('category', event.target.value)}
                placeholder="AI Tools"
              />
            </S.FieldGroup>
            <S.FieldGroup>
              <S.FieldLabel>Categories</S.FieldLabel>
              <S.TextInput
                value={formState.categoriesText}
                onChange={(event) => updateForm('categoriesText', event.target.value)}
                placeholder="AI Tools, Productivity"
              />
            </S.FieldGroup>
            <S.FieldGroup>
              <S.FieldLabel>Tags</S.FieldLabel>
              <S.TextInput
                value={formState.tagsText}
                onChange={(event) => updateForm('tagsText', event.target.value)}
                placeholder="automation, SEO, forms"
              />
            </S.FieldGroup>
          </S.FieldGrid>

          <S.FieldGroup>
            <S.FieldLabel>Description</S.FieldLabel>
            <S.Textarea
              value={formState.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="Short listing description used by directory forms."
            />
          </S.FieldGroup>

          <S.SectionTitle>Submission Defaults</S.SectionTitle>
          <S.FieldGrid>
            <S.FieldGroup>
              <S.FieldLabel>Name</S.FieldLabel>
              <S.TextInput
                value={formState.contactName}
                onChange={(event) => updateForm('contactName', event.target.value)}
                placeholder={formState.name || 'Contact name'}
              />
            </S.FieldGroup>
            <S.FieldGroup>
              <S.FieldLabel>Email</S.FieldLabel>
              <S.TextInput
                type="email"
                value={formState.contactEmail}
                onChange={(event) => updateForm('contactEmail', event.target.value)}
                placeholder="name@example.com"
              />
            </S.FieldGroup>
            <S.FieldGroup>
              <S.FieldLabel>Website Field URL</S.FieldLabel>
              <S.TextInput
                type="url"
                value={formState.submissionWebsiteUrl}
                onChange={(event) => updateForm('submissionWebsiteUrl', event.target.value)}
                placeholder={formState.url || 'https://example.com'}
              />
            </S.FieldGroup>
          </S.FieldGrid>
          <S.FieldGroup>
            <S.FieldLabel>Comment</S.FieldLabel>
            <S.Textarea
              value={formState.submissionComment}
              onChange={(event) => updateForm('submissionComment', event.target.value)}
              placeholder="Default comment for comment, reply, and listing notes fields."
            />
          </S.FieldGroup>
          <S.DefaultActions>
            <Button onClick={() => void handleSaveProfile()} isLoading={isSaving}>
              Save Local Profile
            </Button>
            <S.ActionHint>
              Saved profiles are available offline and override matching API profiles locally.
            </S.ActionHint>
          </S.DefaultActions>
        </S.Editor>
      </Card>

      <S.Filters>
        <S.TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, URL, category, tag, or description"
        />
        <S.Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </S.Select>
      </S.Filters>

      {isLoading ? (
        <Card>
          <S.EmptyState>Loading website profiles...</S.EmptyState>
        </Card>
      ) : null}

      {!isLoading && !error && websites.length === 0 ? (
        <Card>
          <S.EmptyState>No profiles yet. Create a local profile or import JSON/CSV.</S.EmptyState>
        </Card>
      ) : null}

      {!isLoading && websites.length > 0 && filteredWebsites.length === 0 ? (
        <Card>
          <S.EmptyState>No profiles match the current filters.</S.EmptyState>
        </Card>
      ) : null}

      {!isLoading && filteredWebsites.length > 0 ? (
        <S.List>
          {filteredWebsites.map((website) => {
            const isLocal = localWebsiteIds.has(website.id);
            return (
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
                    <S.BadgeStack>
                      {isLocal ? <S.SourceBadge>Local</S.SourceBadge> : <S.SourceBadge>API</S.SourceBadge>}
                      <S.StatusBadge status={website.status}>{website.status}</S.StatusBadge>
                    </S.BadgeStack>
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
                    <S.ActionGroup>
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
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setFormState(toFormState(website));
                          setFeedback(`Editing ${website.name}.`);
                        }}
                      >
                        Edit
                      </Button>
                      {isLocal ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteLocalProfile(website);
                          }}
                        >
                          Delete Local
                        </Button>
                      ) : null}
                    </S.ActionGroup>
                    <S.ActionHint>
                      {selectedWebsiteId === website.id
                        ? 'Quick Fill, Batch Submit, and Agent runs use this profile.'
                        : 'Select this profile before running an automated submission.'}
                    </S.ActionHint>
                  </S.ActionRow>
                </S.WebsiteCard>
              </Card>
            );
          })}
        </S.List>
      ) : null}
    </S.Container>
  );
};

export default WebsiteManager;
