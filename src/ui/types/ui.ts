/**
 * UI-related type definitions
 */

/**
 * Button variants
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Button sizes
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Input types
 */
export type InputType = 'text' | 'email' | 'password' | 'url' | 'number' | 'textarea';

/**
 * Task status
 */
export type TaskStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused';

/**
 * Task step
 */
export interface TaskStep {
  id: string;
  name: string;
  status: TaskStatus;
  message?: string;
  timestamp: number;
}

/**
 * Task
 */
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

/**
 * Batch submit item
 */
export interface BatchSubmitItem {
  url: string;
  websiteId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  result?: any;
}

/**
 * Auth state
 */
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

/**
 * Website
 */
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

/**
 * Website field
 */
export interface WebsiteField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}

/**
 * Quick fill settings
 */
export interface QuickFillSettings {
  enabled: boolean;
  autoDetect: boolean;
  showFloatingButton: boolean;
}
