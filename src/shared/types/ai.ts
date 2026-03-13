// AI-related type definitions

export interface AIAgentConfig {
  instructions: {
    system: string;
    page?: string;
  };
  maxSteps: number;
  includeInitialTab: boolean;
  timeout?: number;
}

export interface AIAgentActivity {
  type: 'step' | 'error' | 'complete';
  timestamp: number;
  data: {
    action?: string;
    element?: string;
    error?: string;
    result?: any;
  };
}

export interface AIBrowserSnapshot {
  elements: Array<{
    ref: string;
    description: string;
    type: string;
    interactive: boolean;
  }>;
  url: string;
  title: string;
  timestamp: number;
}

export interface AITask {
  id: string;
  taskText: string;
  config: AIAgentConfig;
  status: 'running' | 'completed' | 'error';
  result?: any;
  activities: AIAgentActivity[];
  createdAt: number;
  completedAt?: number;
}
