// API response type definitions

interface AuthToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in?: number;
  refresh_token?: string;
}

interface ClientInfo {
  client_id: string;
  access_token: string;
  token_type: string;
}

interface Website {
  id: string;
  name: string;
  url: string;
  description?: string;
  category?: string;
  status: 'pending' | 'active' | 'error';
  created_at: string;
  updated_at: string;
}

interface APIResponse<T = any> {
  code: number;
  message?: string;
  data: T;
}

interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface SubmitTask {
  id: string;
  websiteId: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'error' | 'skipped';
  progress: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface AITaskConfig {
  provider: 'autofill' | 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export type {
  AuthToken,
  ClientInfo,
  Website,
  APIResponse,
  PaginatedResponse,
  SubmitTask,
  AITaskConfig,
};
