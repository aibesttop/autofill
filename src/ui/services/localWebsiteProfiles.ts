import { STORAGE_KEYS } from '@shared/constants';
import type { Website } from '@shared/types';

export type WebsiteProfileInput = Partial<Website> &
  Pick<Website, 'name' | 'url'> & {
    tagsText?: string;
    categoriesText?: string;
  };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createLocalWebsiteId(): string {
  return `local-${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function sanitizeWebsiteProfile(value: unknown): Website | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const name = cleanString(value.name);
  const url = cleanString(value.url);

  if (!name || !url) {
    return null;
  }

  const createdAt = cleanString(value.created_at) || nowIso();
  const updatedAt = cleanString(value.updated_at) || createdAt;

  return {
    id: cleanString(value.id) || createLocalWebsiteId(),
    name,
    url,
    description: cleanString(value.description),
    category: cleanString(value.category),
    categories: toStringList(value.categories),
    tags: toStringList(value.tags),
    contactName: cleanString(value.contactName),
    contactEmail: cleanString(value.contactEmail),
    submissionWebsiteUrl: cleanString(value.submissionWebsiteUrl),
    submissionComment: cleanString(value.submissionComment),
    status:
      value.status === 'pending' || value.status === 'error' || value.status === 'active'
        ? value.status
        : 'active',
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function buildWebsiteProfile(input: WebsiteProfileInput, existing?: Website): Website {
  const timestamp = nowIso();
  const profile = sanitizeWebsiteProfile({
    ...existing,
    ...input,
    categories: input.categories ?? input.categoriesText,
    tags: input.tags ?? input.tagsText,
    id: existing?.id ?? input.id ?? createLocalWebsiteId(),
    status: input.status ?? existing?.status ?? 'active',
    created_at: existing?.created_at ?? input.created_at ?? timestamp,
    updated_at: timestamp,
  });

  if (!profile) {
    throw new Error('Website profile requires a name and URL.');
  }

  return profile;
}

export async function readLocalWebsiteProfiles(): Promise<Website[]> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.LOCAL_WEBSITE_PROFILES]);
  const value = result[STORAGE_KEYS.LOCAL_WEBSITE_PROFILES];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(sanitizeWebsiteProfile)
    .filter((profile): profile is Website => profile !== null);
}

async function writeLocalWebsiteProfiles(profiles: Website[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.LOCAL_WEBSITE_PROFILES]: profiles,
  });
}

export async function upsertLocalWebsiteProfile(profile: Website): Promise<Website[]> {
  const profiles = await readLocalWebsiteProfiles();
  const nextProfiles = [
    profile,
    ...profiles.filter((existingProfile) => existingProfile.id !== profile.id),
  ];

  await writeLocalWebsiteProfiles(nextProfiles);
  return nextProfiles;
}

export async function deleteLocalWebsiteProfile(profileId: string): Promise<Website[]> {
  const profiles = await readLocalWebsiteProfiles();
  const nextProfiles = profiles.filter((profile) => profile.id !== profileId);

  await writeLocalWebsiteProfiles(nextProfiles);
  return nextProfiles;
}

export async function replaceLocalWebsiteProfiles(profiles: Website[]): Promise<Website[]> {
  await writeLocalWebsiteProfiles(profiles);
  return profiles;
}

export async function importLocalWebsiteProfiles(importedProfiles: Website[]): Promise<Website[]> {
  const profiles = await readLocalWebsiteProfiles();
  const importedIds = new Set(importedProfiles.map((profile) => profile.id));
  const nextProfiles = [
    ...importedProfiles,
    ...profiles.filter((profile) => !importedIds.has(profile.id)),
  ];

  await writeLocalWebsiteProfiles(nextProfiles);
  return nextProfiles;
}
