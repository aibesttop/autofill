import type { Website } from '@shared/types';

export interface LocalTestAuthToken {
  access_token: string;
  token_type: string;
  client_id: string;
}

export const LOCAL_TEST_MODE = import.meta.env.VITE_LOCAL_TEST_MODE === 'true';

export const LOCAL_TEST_AUTH_TOKEN: LocalTestAuthToken = {
  access_token: 'local-test-access-token',
  token_type: 'Bearer',
  client_id: 'local-test-client',
};

export const LOCAL_TEST_WEBSITES: Website[] = [
  {
    id: 'local-site-1',
    name: 'Acme Launchpad',
    url: 'https://acme.test',
    description: 'A local testing profile for directory submissions and startup listings.',
    category: 'SaaS',
    categories: ['SaaS', 'AI Tools'],
    tags: ['startup', 'directory', 'automation', 'launch'],
    status: 'active',
    created_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-03-14T00:00:00.000Z').toISOString(),
  },
  {
    id: 'local-site-2',
    name: 'Northwind Studio',
    url: 'https://northwind.test',
    description: 'A mock creative studio profile for local autofill and batch-submission testing.',
    category: 'Design',
    categories: ['Design', 'Creative Agency'],
    tags: ['branding', 'studio', 'creative', 'portfolio'],
    status: 'active',
    created_at: new Date('2026-03-02T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-03-14T00:00:00.000Z').toISOString(),
  },
];

export const LOCAL_TEST_DEFAULT_WEBSITE = LOCAL_TEST_WEBSITES[0];
