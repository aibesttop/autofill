// API response type definitions

export interface AuthToken {
  access_token: string;
  token_type: string;
  client_id?: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface ClientInfo {
  client_id: string;
  access_token: string;
  token_type: string;
}

export interface Website {
  id: string;
  name: string;
  url: string;
  description?: string;
  category?: string;
  categories?: string[];
  tags?: string[];
  status: 'pending' | 'active' | 'error';
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T = any> {
  code: number;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubmitTask {
  id: string;
  websiteId: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'error' | 'skipped';
  progress: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AITaskConfig {
  provider: 'autofill' | 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey?: string;
  baseURL?: string;
}
