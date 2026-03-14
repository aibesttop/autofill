/**
 * React hook for using MultiPageAgent
 */
import type {
  AgentActivity,
  AgentStatus,
  HistoricalEvent,
} from '@page-agent/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MultiPageAgent } from './MultiPageAgent';
import { loadAgentConfig, saveAgentConfig, validateAgentConfig } from './config-storage';
import type { ExtConfig } from './config-storage';
import { buildAgentTaskWithProfileContext } from './task-context';
import type { AgentWebsiteProfileContext } from './task-context';
export type { ExtConfig, LanguagePreference } from './config-storage';

export interface UseAgentResult {
  status: AgentStatus;
  history: HistoricalEvent[];
  activity: AgentActivity | null;
  currentTask: string;
  config: ExtConfig | null;
  error: string | null;
  isConfigLoading: boolean;
  execute: (task: string) => Promise<void>;
  stop: () => void;
  configure: (config: ExtConfig) => Promise<void>;
}

export interface UseAgentOptions {
  websiteProfile?: AgentWebsiteProfileContext | null;
}

export function useAgent(options: UseAgentOptions = {}): UseAgentResult {
  const agentRef = useRef<MultiPageAgent | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [history, setHistory] = useState<HistoricalEvent[]>([]);
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [currentTask, setCurrentTask] = useState('');
  const [config, setConfig] = useState<ExtConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const { websiteProfile = null } = options;

  useEffect(() => {
    let isMounted = true;

    void loadAgentConfig()
      .then((storedConfig) => {
        if (!isMounted) {
          return;
        }

        const validationError = validateAgentConfig(storedConfig);
        setConfig(storedConfig);
        setError(validationError);
        setStatus(validationError ? 'error' : 'idle');
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load AI Agent settings.'
        );
        setStatus('error');
      })
      .finally(() => {
        if (isMounted) {
          setIsConfigLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!config) return;

    const validationError = validateAgentConfig(config);
    if (validationError) {
      setError(validationError);
      setStatus('error');
      agentRef.current = null;
      return;
    }

    let agent: MultiPageAgent;

    try {
      const { systemInstruction, ...agentConfig } = config;
      agent = new MultiPageAgent({
        ...agentConfig,
        instructions: systemInstruction ? { system: systemInstruction } : undefined,
      });
      setError(null);
    } catch (initError) {
      setError(
        initError instanceof Error ? initError.message : 'Failed to initialize the AI Agent.'
      );
      setStatus('error');
      return;
    }

    agentRef.current = agent;

    const handleStatusChange = () => {
      const newStatus = agent.status as AgentStatus;
      setStatus(newStatus);
      if (newStatus === 'idle' || newStatus === 'completed' || newStatus === 'error') {
        setActivity(null);
      }
    };

    const handleHistoryChange = () => {
      setHistory([...agent.history]);
    };

    const handleActivity = (e: Event) => {
      const newActivity = (e as CustomEvent).detail as AgentActivity;
      setActivity(newActivity);
    };

    agent.addEventListener('statuschange', handleStatusChange);
    agent.addEventListener('historychange', handleHistoryChange);
    agent.addEventListener('activity', handleActivity);

    return () => {
      agent.removeEventListener('statuschange', handleStatusChange);
      agent.removeEventListener('historychange', handleHistoryChange);
      agent.removeEventListener('activity', handleActivity);
      agent.dispose();
    };
  }, [config]);

  const execute = useCallback(async (task: string) => {
    const agent = agentRef.current;
    console.log('[useAgent] start executing task:', task);
    if (!agent) {
      throw new Error(error || 'Agent not initialized');
    }

    setCurrentTask(task);
    setHistory([]);
    await agent.execute(buildAgentTaskWithProfileContext(task, websiteProfile));
  }, [error, websiteProfile]);

  const stop = useCallback(() => {
    agentRef.current?.stop();
  }, []);

  const configure = useCallback(
    async (nextConfig: ExtConfig) => {
      await saveAgentConfig(nextConfig);
      setConfig(nextConfig);
      setError(validateAgentConfig(nextConfig));
    },
    []
  );

  return {
    status,
    history,
    activity,
    currentTask,
    config,
    error,
    isConfigLoading,
    execute,
    stop,
    configure,
  };
}
