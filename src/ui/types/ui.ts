/**
 * UI-related type definitions
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type InputType = 'text' | 'email' | 'password' | 'url' | 'number' | 'textarea';
export type TaskStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused';

export interface TaskStep {
  id: string;
  name: string;
  status: TaskStatus;
  message?: string;
  timestamp: number;
}

export interface Task {
  id: string;
  type: 'quick_fill' | 'quick_discover' | 'batch_submit';
  status: TaskStatus;
  url?: string;
  steps: TaskStep[];
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface BatchSubmitItem {
  url: string;
  websiteId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  result?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id?: string;
    email?: string;
    name?: string;
  } | null;
  isLoading: boolean;
  error: string | null;
}

export interface Website {
  id: string;
  name: string;
  url: string;
  category?: string;
  description?: string;
  fields: WebsiteField[];
  createdAt?: number;
  updatedAt?: number;
}

export interface WebsiteField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}

export interface QuickFillSettings {
  enabled: boolean;
  autoDetect: boolean;
  showFloatingButton: boolean;
}
