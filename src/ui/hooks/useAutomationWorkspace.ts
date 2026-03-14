import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@shared/constants';
import type { Website } from '@shared/types';
import { LOCAL_TEST_DEFAULT_WEBSITE, LOCAL_TEST_MODE } from '@shared/testing/local-test';
import type { FormDetectionResult } from '@content/types';
import type { HistoricalEvent } from '@page-agent/core';
import {
  DEFAULT_BATCH_AGENT_TASK_TEMPLATE,
  executeBatchAgentRun,
} from '../../agent/batch-runner';
import { clearSessions, deleteSession, saveSession } from '../../lib/db';
import type { BatchSubmitItem, Task, TaskMetrics, TaskStatus, TaskStep } from '../types/ui';

export interface WebsiteSnapshot {
  id: string;
  name: string;
  url: string;
  category?: string;
  categories?: string[];
  description?: string;
  tags?: string[];
  status?: 'pending' | 'active' | 'error';
}

export interface BatchWorkspaceState {
  draftUrls: string;
  agentTaskTemplate: string;
  items: BatchSubmitItem[];
  activeTaskId: string | null;
  tasks: Task[];
  lastRunAt: number | null;
}

interface WorkspaceStorageState {
  batchState: BatchWorkspaceState;
  selectedWebsiteId: string | null;
  selectedWebsiteSnapshot: WebsiteSnapshot | null;
}

interface AutomationWorkspaceHookState extends WorkspaceStorageState {
  isLoading: boolean;
  isRunningBatch: boolean;
  error: string | null;
}

export interface QueueBatchResult {
  queuedCount: number;
  invalidUrls: string[];
  task: Task;
}

export interface AgentTaskRecordInput {
  sessionId?: string;
  task: string;
  history: HistoricalEvent[];
  status: Extract<TaskStatus, 'completed' | 'error'>;
  taskType?: Extract<Task['type'], 'quick_fill' | 'ai_agent'>;
  title?: string;
  websiteId?: string;
  websiteName?: string;
  url?: string;
  createdAt?: number;
  completedAt?: number;
}

const DEFAULT_BATCH_STATE: BatchWorkspaceState = {
  draftUrls: '',
  agentTaskTemplate: DEFAULT_BATCH_AGENT_TASK_TEMPLATE,
  items: [],
  activeTaskId: null,
  tasks: [],
  lastRunAt: null,
};
const AI_AGENT_TASK_ID_PREFIX = 'ai-agent-';

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function sanitizeTaskStep(value: unknown): TaskStep | null {
  if (!isPlainObject(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    status: (value.status as TaskStatus) || 'idle',
    message: typeof value.message === 'string' ? value.message : undefined,
    timestamp: typeof value.timestamp === 'number' ? value.timestamp : Date.now(),
  };
}

function sanitizeTaskMetrics(value: unknown): TaskMetrics | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  return {
    total: typeof value.total === 'number' ? value.total : undefined,
    completed: typeof value.completed === 'number' ? value.completed : undefined,
    failed: typeof value.failed === 'number' ? value.failed : undefined,
    fieldCount: typeof value.fieldCount === 'number' ? value.fieldCount : undefined,
    formCount: typeof value.formCount === 'number' ? value.formCount : undefined,
    submitButtonCount:
      typeof value.submitButtonCount === 'number' ? value.submitButtonCount : undefined,
  };
}

function sanitizeTask(value: unknown): Task | null {
  if (!isPlainObject(value) || typeof value.id !== 'string' || typeof value.type !== 'string') {
    return null;
  }

  const steps = Array.isArray(value.steps)
    ? value.steps.map(sanitizeTaskStep).filter((step): step is TaskStep => step !== null)
    : [];

  return {
    id: value.id,
    type: value.type as Task['type'],
    title: typeof value.title === 'string' ? value.title : undefined,
    status: (value.status as TaskStatus) || 'idle',
    url: typeof value.url === 'string' ? value.url : undefined,
    summary: typeof value.summary === 'string' ? value.summary : undefined,
    websiteId: typeof value.websiteId === 'string' ? value.websiteId : undefined,
    websiteName: typeof value.websiteName === 'string' ? value.websiteName : undefined,
    metrics: sanitizeTaskMetrics(value.metrics),
    steps,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    completedAt: typeof value.completedAt === 'number' ? value.completedAt : undefined,
    error: typeof value.error === 'string' ? value.error : undefined,
  };
}

function sanitizeBatchItem(value: unknown): BatchSubmitItem | null {
  if (!isPlainObject(value) || typeof value.url !== 'string') {
    return null;
  }

  const result = isPlainObject(value.result)
    ? {
        tabId: typeof value.result.tabId === 'number' ? value.result.tabId : undefined,
        windowId: typeof value.result.windowId === 'number' ? value.result.windowId : undefined,
        groupId: typeof value.result.groupId === 'number' ? value.result.groupId : undefined,
      }
    : undefined;

  return {
    url: value.url,
    websiteId: typeof value.websiteId === 'string' ? value.websiteId : undefined,
    status: (value.status as BatchSubmitItem['status']) || 'pending',
    executionMode:
      value.executionMode === 'launch' || value.executionMode === 'agent'
        ? value.executionMode
        : undefined,
    message: typeof value.message === 'string' ? value.message : undefined,
    error: typeof value.error === 'string' ? value.error : undefined,
    result,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : undefined,
  };
}

function sanitizeWebsiteSnapshot(value: unknown): WebsiteSnapshot | null {
  if (!isPlainObject(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  const categories = toStringList(value.categories);
  const tags = toStringList(value.tags);

  return {
    id: value.id,
    name: value.name,
    url: typeof value.url === 'string' ? value.url : '',
    category: typeof value.category === 'string' ? value.category : undefined,
    categories,
    description: typeof value.description === 'string' ? value.description : undefined,
    tags,
    status: value.status as WebsiteSnapshot['status'],
  };
}

function normalizeBatchState(value: unknown): BatchWorkspaceState {
  if (!isPlainObject(value)) {
    return DEFAULT_BATCH_STATE;
  }

  return {
    draftUrls: typeof value.draftUrls === 'string' ? value.draftUrls : '',
    agentTaskTemplate:
      typeof value.agentTaskTemplate === 'string'
        ? value.agentTaskTemplate
        : DEFAULT_BATCH_AGENT_TASK_TEMPLATE,
    items: Array.isArray(value.items)
      ? value.items.map(sanitizeBatchItem).filter((item): item is BatchSubmitItem => item !== null)
      : [],
    activeTaskId: typeof value.activeTaskId === 'string' ? value.activeTaskId : null,
    tasks: Array.isArray(value.tasks)
      ? value.tasks.map(sanitizeTask).filter((task): task is Task => task !== null)
      : [],
    lastRunAt: typeof value.lastRunAt === 'number' ? value.lastRunAt : null,
  };
}

function limitTasks(tasks: Task[]): Task[] {
  return tasks.slice(0, 50);
}

function createTaskStep(
  name: string,
  status: TaskStatus,
  message?: string,
  timestamp: number = Date.now()
): TaskStep {
  return {
    id: createId('step'),
    name,
    status,
    message,
    timestamp,
  };
}

function getHostnameLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function buildBatchMetrics(items: BatchSubmitItem[]): TaskMetrics {
  return {
    total: items.length,
    completed: items.filter((item) => item.status === 'completed').length,
    failed: items.filter((item) => item.status === 'failed').length,
  };
}

function buildBatchSummary(items: BatchSubmitItem[]): string {
  const metrics = buildBatchMetrics(items);
  return `${metrics.completed || 0}/${metrics.total || 0} URLs launched${metrics.failed ? `, ${metrics.failed} failed` : ''}`;
}

function buildAgentBatchSummary(items: BatchSubmitItem[]): string {
  const metrics = buildBatchMetrics(items);
  return `${metrics.completed || 0}/${metrics.total || 0} URLs processed by AI Agent${metrics.failed ? `, ${metrics.failed} failed` : ''}`;
}

function upsertTask(tasks: Task[], task: Task): Task[] {
  return limitTasks([task, ...tasks.filter((existingTask) => existingTask.id !== task.id)]);
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getAgentSummary(history: HistoricalEvent[], fallbackTask: string): string {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const event = history[index];

    if (event.type === 'step') {
      const action = event.action;
      if (action?.name !== 'done') {
        continue;
      }

      if (
        isPlainObject(action.input) &&
        typeof action.input.text === 'string' &&
        action.input.text.trim().length > 0
      ) {
        return truncateText(action.input.text.trim(), 180);
      }

      if (typeof action.output === 'string' && action.output.trim().length > 0) {
        return truncateText(action.output.trim(), 180);
      }
    }

    if (event.type === 'error' && event.message.trim().length > 0) {
      return truncateText(event.message.trim(), 180);
    }
  }

  return truncateText(fallbackTask, 180);
}

function buildAgentTaskSteps(history: HistoricalEvent[], baseTimestamp: number): TaskStep[] {
  const steps = history.flatMap((event, index) => {
    const timestamp = baseTimestamp + index;

    if (event.type === 'step') {
      const action = event.action;
      const stepIndex = typeof event.stepIndex === 'number' ? event.stepIndex + 1 : index + 1;

      if (action?.name === 'done') {
        const succeeded =
          !isPlainObject(action.input) || action.input.success !== false;

        return [
          createTaskStep(
            succeeded ? 'Agent completed' : 'Agent failed',
            succeeded ? 'completed' : 'error',
            typeof action.output === 'string' ? truncateText(action.output, 180) : undefined,
            timestamp
          ),
        ];
      }

      return [
        createTaskStep(
          `Step ${stepIndex}${action?.name ? ` · ${action.name}` : ''}`,
          'completed',
          typeof action?.output === 'string' ? truncateText(action.output, 180) : undefined,
          timestamp
        ),
      ];
    }

    if (event.type === 'observation') {
      return [createTaskStep('Observation', 'completed', truncateText(event.content, 180), timestamp)];
    }

    if (event.type === 'retry') {
      return [
        createTaskStep(
          `Retry ${event.attempt}/${event.maxAttempts}`,
          'pending',
          truncateText(event.message, 180),
          timestamp
        ),
      ];
    }

    if (event.type === 'error') {
      return [createTaskStep('Error', 'error', truncateText(event.message, 180), timestamp)];
    }

    return [];
  });

  return steps.length > 0
    ? steps
    : [createTaskStep('Agent run', 'completed', 'No detailed history was captured.', baseTimestamp)];
}

function buildAgentTaskMetrics(steps: TaskStep[]): TaskMetrics {
  return {
    total: steps.length,
    completed: steps.filter((step) => step.status === 'completed').length,
    failed: steps.filter((step) => step.status === 'error').length,
  };
}

function getAgentSessionId(taskId: string): string | null {
  return taskId.startsWith(AI_AGENT_TASK_ID_PREFIX)
    ? taskId.slice(AI_AGENT_TASK_ID_PREFIX.length)
    : null;
}

function parseBatchUrls(input: string): { validUrls: string[]; invalidUrls: string[] } {
  const candidates = input
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueUrls = new Set<string>();
  const validUrls: string[] = [];
  const invalidUrls: string[] = [];

  candidates.forEach((candidate) => {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        invalidUrls.push(candidate);
        return;
      }

      if (!uniqueUrls.has(parsed.toString())) {
        uniqueUrls.add(parsed.toString());
        validUrls.push(parsed.toString());
      }
    } catch {
      invalidUrls.push(candidate);
    }
  });

  return { validUrls, invalidUrls };
}

function updateTaskList(tasks: Task[], taskId: string, updater: (task: Task) => Task): Task[] {
  return tasks.map((task) => (task.id === taskId ? updater(task) : task));
}

function toWebsiteSnapshot(website: Website): WebsiteSnapshot {
  return {
    id: website.id,
    name: website.name,
    url: website.url,
    category: website.category,
    categories: website.categories,
    description: website.description,
    tags: website.tags,
    status: website.status,
  };
}

function isWebsiteSnapshot(website: Website | WebsiteSnapshot): website is WebsiteSnapshot {
  return !('created_at' in website);
}

async function readWorkspaceStorage(): Promise<WorkspaceStorageState> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.BATCH_STATE,
    STORAGE_KEYS.SELECTED_WEBSITE_ID,
    STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT,
  ]);

  const selectedWebsiteSnapshot = sanitizeWebsiteSnapshot(
    result[STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT]
  );
  const selectedWebsiteId =
    typeof result[STORAGE_KEYS.SELECTED_WEBSITE_ID] === 'string'
      ? result[STORAGE_KEYS.SELECTED_WEBSITE_ID]
      : null;

  if (LOCAL_TEST_MODE && !selectedWebsiteSnapshot) {
    const fallbackSnapshot = toWebsiteSnapshot(LOCAL_TEST_DEFAULT_WEBSITE);
    return {
      batchState: normalizeBatchState(result[STORAGE_KEYS.BATCH_STATE]),
      selectedWebsiteId: fallbackSnapshot.id,
      selectedWebsiteSnapshot: fallbackSnapshot,
    };
  }

  return {
    batchState: normalizeBatchState(result[STORAGE_KEYS.BATCH_STATE]),
    selectedWebsiteId,
    selectedWebsiteSnapshot,
  };
}

async function persistBatchState(batchState: BatchWorkspaceState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.BATCH_STATE]: batchState });
}

async function persistSelectedWebsite(snapshot: WebsiteSnapshot | null): Promise<void> {
  if (!snapshot) {
    await chrome.storage.local.remove([
      STORAGE_KEYS.SELECTED_WEBSITE_ID,
      STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT,
    ]);
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.SELECTED_WEBSITE_ID]: snapshot.id,
    [STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT]: snapshot,
  });
}

export async function recordQuickDiscoverTask(result: FormDetectionResult): Promise<Task> {
  const workspace = await readWorkspaceStorage();
  const now = Date.now();
  const task: Task = {
    id: createId('task'),
    type: 'quick_discover',
    title: `Quick Discover · ${getHostnameLabel(result.pageUrl)}`,
    status: 'completed',
    url: result.pageUrl,
    summary: `${result.fieldCount} fields across ${result.formCount} forms`,
    metrics: {
      total: result.fieldCount,
      fieldCount: result.fieldCount,
      formCount: result.formCount,
      submitButtonCount: result.submitButtonCount,
    },
    steps: [
      createTaskStep(
        'Page analyzed',
        'completed',
        `Detected ${result.fieldCount} fields and ${result.submitButtonCount} submit controls`
      ),
    ],
    createdAt: now,
    completedAt: now,
  };

  await persistBatchState({
    ...workspace.batchState,
    tasks: upsertTask(workspace.batchState.tasks, task),
  });

  return task;
}

export async function recordAgentTask(input: AgentTaskRecordInput): Promise<Task> {
  const workspace = await readWorkspaceStorage();
  const createdAt = input.createdAt ?? Date.now();
  const steps = buildAgentTaskSteps(input.history, createdAt);
  const metrics = buildAgentTaskMetrics(steps);
  const taskType = input.taskType ?? 'ai_agent';
  const taskTitle =
    input.title ??
    (taskType === 'quick_fill'
      ? `Quick Fill Agent · ${truncateText(input.task, 72)}`
      : `AI Agent · ${truncateText(input.task, 72)}`);
  const task: Task = {
    id: input.sessionId ? `ai-agent-${input.sessionId}` : createId('task'),
    type: taskType,
    title: taskTitle,
    status: input.status,
    url: input.url,
    summary: getAgentSummary(input.history, input.task),
    websiteId: input.websiteId,
    websiteName: input.websiteName,
    metrics,
    steps,
    createdAt,
    completedAt: input.completedAt ?? createdAt,
    error: input.status === 'error' ? getAgentSummary(input.history, input.task) : undefined,
  };

  await persistBatchState({
    ...workspace.batchState,
    tasks: upsertTask(workspace.batchState.tasks, task),
  });

  return task;
}

export function useAutomationWorkspace() {
  const [state, setState] = useState<AutomationWorkspaceHookState>({
    batchState: DEFAULT_BATCH_STATE,
    selectedWebsiteId: null,
    selectedWebsiteSnapshot: null,
    isLoading: true,
    isRunningBatch: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    void readWorkspaceStorage()
      .then((nextState) => {
        if (LOCAL_TEST_MODE && nextState.selectedWebsiteSnapshot) {
          void persistSelectedWebsite(nextState.selectedWebsiteSnapshot);
        }

        if (isMounted) {
          setState((prev) => ({
            ...prev,
            ...nextState,
            isLoading: false,
            error: null,
          }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load automation workspace',
          }));
        }
      });

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local' || !isMounted) {
        return;
      }

      const nextState: Partial<AutomationWorkspaceHookState> = {};
      let hasChanges = false;

      if (changes[STORAGE_KEYS.BATCH_STATE]) {
        nextState.batchState = normalizeBatchState(changes[STORAGE_KEYS.BATCH_STATE].newValue);
        hasChanges = true;
      }

      if (changes[STORAGE_KEYS.SELECTED_WEBSITE_ID]) {
        nextState.selectedWebsiteId =
          typeof changes[STORAGE_KEYS.SELECTED_WEBSITE_ID].newValue === 'string'
            ? changes[STORAGE_KEYS.SELECTED_WEBSITE_ID].newValue
            : null;
        hasChanges = true;
      }

      if (changes[STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT]) {
        nextState.selectedWebsiteSnapshot = sanitizeWebsiteSnapshot(
          changes[STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT].newValue
        );
        hasChanges = true;
      }

      if (hasChanges) {
        setState((prev) => ({
          ...prev,
          ...nextState,
          isLoading: false,
        }));
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      isMounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const refresh = async () => {
    try {
      const nextState = await readWorkspaceStorage();
      if (LOCAL_TEST_MODE && nextState.selectedWebsiteSnapshot) {
        await persistSelectedWebsite(nextState.selectedWebsiteSnapshot);
      }
      setState((prev) => ({
        ...prev,
        ...nextState,
        isLoading: false,
        error: null,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh automation workspace',
      }));
    }
  };

  const saveBatchState = async (batchState: BatchWorkspaceState) => {
    setState((prev) => ({ ...prev, batchState, error: null }));
    await persistBatchState(batchState);
  };

  const setDraftUrls = async (draftUrls: string) => {
    await saveBatchState({
      ...state.batchState,
      draftUrls,
    });
  };

  const setAgentTaskTemplate = async (agentTaskTemplate: string) => {
    await saveBatchState({
      ...state.batchState,
      agentTaskTemplate,
    });
  };

  const selectWebsite = async (website: Website | WebsiteSnapshot | null) => {
    const snapshot = website ? (isWebsiteSnapshot(website) ? website : toWebsiteSnapshot(website)) : null;

    setState((prev) => ({
      ...prev,
      selectedWebsiteId: snapshot?.id || null,
      selectedWebsiteSnapshot: snapshot,
      error: null,
    }));

    await persistSelectedWebsite(snapshot);
  };

  const queueBatch = async (draftInput?: string): Promise<QueueBatchResult> => {
    const draftUrls = draftInput ?? state.batchState.draftUrls;
    const { validUrls, invalidUrls } = parseBatchUrls(draftUrls);

    if (validUrls.length === 0) {
      const errorMessage = 'Enter at least one valid http/https URL.';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw new Error(errorMessage);
    }

    const now = Date.now();
    const items: BatchSubmitItem[] = validUrls.map((url) => ({
      url,
      websiteId: state.selectedWebsiteId || undefined,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }));

    const task: Task = {
      id: createId('task'),
      type: 'batch_submit',
      title: state.selectedWebsiteSnapshot
        ? `Batch Submit · ${state.selectedWebsiteSnapshot.name}`
        : 'Batch Submit',
      status: 'pending',
      url: validUrls[0],
      summary: `${validUrls.length} URLs queued${invalidUrls.length ? `, ${invalidUrls.length} invalid skipped` : ''}`,
      websiteId: state.selectedWebsiteId || undefined,
      websiteName: state.selectedWebsiteSnapshot?.name,
      metrics: {
        total: validUrls.length,
        completed: 0,
        failed: 0,
      },
      steps: [
        createTaskStep(
          'Queue prepared',
          'completed',
          `${validUrls.length} URLs ready to launch${invalidUrls.length ? `, ${invalidUrls.length} invalid skipped` : ''}`
        ),
      ],
      createdAt: now,
    };

    const nextBatchState: BatchWorkspaceState = {
      ...state.batchState,
      draftUrls,
      items,
      activeTaskId: task.id,
      tasks: limitTasks([task, ...state.batchState.tasks]),
    };

    await saveBatchState(nextBatchState);

    return {
      queuedCount: validUrls.length,
      invalidUrls,
      task,
    };
  };

  const runBatch = async () => {
    if (state.batchState.items.length === 0) {
      const errorMessage = 'Queue a batch before launching tabs.';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw new Error(errorMessage);
    }

    setState((prev) => ({ ...prev, isRunningBatch: true, error: null }));

    const activeTaskId = state.batchState.activeTaskId;
    const workingState: BatchWorkspaceState = {
      ...state.batchState,
      items: state.batchState.items.map((item) => ({ ...item })),
      tasks: [...state.batchState.tasks],
    };

    if (activeTaskId) {
      workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
        ...task,
        status: 'running',
        summary: `Launching ${workingState.items.length} queued URLs`,
        steps: [
          ...task.steps,
          createTaskStep('Launching tabs', 'running', `Opening ${workingState.items.length} queued URLs`),
        ],
      }));
      await saveBatchState(workingState);
    }

    const openedTabs: { tabId: number; windowId?: number }[] = [];

    try {
      for (let index = 0; index < workingState.items.length; index += 1) {
        const currentItem = workingState.items[index];
        workingState.items[index] = {
          ...currentItem,
          status: 'running',
          executionMode: 'launch',
          message: 'Opening browser tab...',
          error: undefined,
          updatedAt: Date.now(),
        };

        if (activeTaskId) {
          workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
            ...task,
            metrics: buildBatchMetrics(workingState.items),
            summary: buildBatchSummary(workingState.items),
          }));
        }

        await saveBatchState(workingState);

        try {
          const response = await chrome.runtime.sendMessage({
            type: 'TAB_CONTROL',
            action: 'open_new_tab',
            payload: { url: currentItem.url },
          });

          if (!response?.success || typeof response.tabId !== 'number') {
            throw new Error(response?.error || 'Failed to open tab');
          }

          workingState.items[index] = {
            ...workingState.items[index],
            status: 'completed',
            executionMode: 'launch',
            message: `Opened in tab #${response.tabId}`,
            result: {
              tabId: response.tabId,
              windowId: response.windowId,
            },
            updatedAt: Date.now(),
          };

          openedTabs.push({
            tabId: response.tabId,
            windowId: response.windowId,
          });
        } catch (error) {
          workingState.items[index] = {
            ...workingState.items[index],
            status: 'failed',
            executionMode: 'launch',
            message: 'Failed to open tab',
            error: error instanceof Error ? error.message : 'Failed to open tab',
            updatedAt: Date.now(),
          };
        }

        if (activeTaskId) {
          workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
            ...task,
            metrics: buildBatchMetrics(workingState.items),
            summary: buildBatchSummary(workingState.items),
          }));
        }

        await saveBatchState(workingState);
      }

      let groupId: number | undefined;
      if (openedTabs.length > 1) {
        try {
          const groupResponse = await chrome.runtime.sendMessage({
            type: 'TAB_CONTROL',
            action: 'create_tab_group',
            payload: { tabIds: openedTabs.map((tab) => tab.tabId), windowId: openedTabs[0]?.windowId },
          });

          if (groupResponse?.success && typeof groupResponse.groupId === 'number') {
            groupId = groupResponse.groupId;
            await chrome.runtime.sendMessage({
              type: 'TAB_CONTROL',
              action: 'update_tab_group',
              payload: {
                groupId,
                properties: {
                  title: state.selectedWebsiteSnapshot
                    ? `autofill · ${state.selectedWebsiteSnapshot.name}`
                    : 'autofill batch',
                  color: 'blue',
                },
              },
            });

            workingState.items = workingState.items.map((item) => ({
              ...item,
              result: item.result ? { ...item.result, groupId } : item.result,
            }));
          }
        } catch {
          // Grouping is best-effort only
        }
      }

      const metrics = buildBatchMetrics(workingState.items);
      const failedCount = metrics.failed || 0;
      const finalStatus: TaskStatus = failedCount > 0 ? 'error' : 'completed';
      const finalSummary = buildBatchSummary(workingState.items);

      if (activeTaskId) {
        workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
          ...task,
          status: finalStatus,
          summary: finalSummary,
          metrics,
          error: failedCount > 0 ? `${failedCount} URLs failed to launch` : undefined,
          completedAt: Date.now(),
          steps: [
            ...task.steps,
            createTaskStep(
              failedCount > 0 ? 'Batch completed with errors' : 'Batch launched',
              failedCount > 0 ? 'error' : 'completed',
              groupId
                ? `${finalSummary}. Tabs were grouped together.`
                : finalSummary
            ),
          ],
        }));
      }

      workingState.lastRunAt = Date.now();
      await saveBatchState(workingState);
    } finally {
      setState((prev) => ({ ...prev, isRunningBatch: false }));
    }
  };

  const runBatchWithAgent = async (taskTemplateInput?: string) => {
    if (state.batchState.items.length === 0) {
      const errorMessage = 'Queue a batch before starting AI Agent runs.';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw new Error(errorMessage);
    }

    const taskTemplate = (taskTemplateInput ?? state.batchState.agentTaskTemplate).trim();
    const effectiveTaskTemplate = taskTemplate || DEFAULT_BATCH_AGENT_TASK_TEMPLATE;

    setState((prev) => ({ ...prev, isRunningBatch: true, error: null }));

    const activeTaskId = state.batchState.activeTaskId;
    const workingState: BatchWorkspaceState = {
      ...state.batchState,
      agentTaskTemplate: effectiveTaskTemplate,
      items: state.batchState.items.map((item) => ({ ...item })),
      tasks: [...state.batchState.tasks],
    };

    if (activeTaskId) {
      workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
        ...task,
        status: 'running',
        summary: `Running AI Agent across ${workingState.items.length} queued URLs`,
        steps: [
          ...task.steps,
          createTaskStep(
            'Running AI Agent batch',
            'running',
            `Starting AI Agent on ${workingState.items.length} queued URLs`
          ),
        ],
      }));
      await saveBatchState(workingState);
    }

    try {
      for (let index = 0; index < workingState.items.length; index += 1) {
        const currentItem = workingState.items[index];

        workingState.items[index] = {
          ...currentItem,
          status: 'running',
          executionMode: 'agent',
          message: 'AI Agent is processing this URL...',
          error: undefined,
          updatedAt: Date.now(),
        };

        if (activeTaskId) {
          workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
            ...task,
            metrics: buildBatchMetrics(workingState.items),
            summary: buildAgentBatchSummary(workingState.items),
          }));
        }

        await saveBatchState(workingState);

        try {
          const execution = await executeBatchAgentRun({
            targetUrl: currentItem.url,
            taskTemplate: effectiveTaskTemplate,
            websiteProfile: state.selectedWebsiteSnapshot,
          });

          let agentTask: Task;

          try {
            const savedSession = await saveSession({
              task: execution.task,
              history: execution.history,
              status: execution.status,
            });

            agentTask = await recordAgentTask({
              sessionId: savedSession.id,
              task: execution.task,
              history: execution.history,
              status: execution.status,
              websiteId: state.selectedWebsiteSnapshot?.id,
              websiteName: state.selectedWebsiteSnapshot?.name,
              url: currentItem.url,
              createdAt: savedSession.createdAt,
              completedAt: savedSession.createdAt,
            });
          } catch {
            agentTask = await recordAgentTask({
              task: execution.task,
              history: execution.history,
              status: execution.status,
              websiteId: state.selectedWebsiteSnapshot?.id,
              websiteName: state.selectedWebsiteSnapshot?.name,
              url: currentItem.url,
            });
          }

          workingState.tasks = upsertTask(workingState.tasks, agentTask);
          const itemMessage = truncateText(
            execution.resultText || (execution.status === 'completed' ? 'Agent run completed.' : 'Agent run failed.'),
            180
          );

          workingState.items[index] = {
            ...workingState.items[index],
            status: execution.status === 'completed' ? 'completed' : 'failed',
            executionMode: 'agent',
            message: itemMessage,
            error: execution.status === 'error' ? itemMessage : undefined,
            updatedAt: Date.now(),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI Agent run failed';
          workingState.items[index] = {
            ...workingState.items[index],
            status: 'failed',
            executionMode: 'agent',
            message: 'AI Agent run failed',
            error: message,
            updatedAt: Date.now(),
          };
        }

        if (activeTaskId) {
          workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
            ...task,
            metrics: buildBatchMetrics(workingState.items),
            summary: buildAgentBatchSummary(workingState.items),
          }));
        }

        await saveBatchState(workingState);
      }

      const metrics = buildBatchMetrics(workingState.items);
      const failedCount = metrics.failed || 0;
      const finalStatus: TaskStatus = failedCount > 0 ? 'error' : 'completed';
      const finalSummary = buildAgentBatchSummary(workingState.items);

      if (activeTaskId) {
        workingState.tasks = updateTaskList(workingState.tasks, activeTaskId, (task) => ({
          ...task,
          status: finalStatus,
          summary: finalSummary,
          metrics,
          error: failedCount > 0 ? `${failedCount} AI Agent runs failed` : undefined,
          completedAt: Date.now(),
          steps: [
            ...task.steps,
            createTaskStep(
              failedCount > 0 ? 'AI batch completed with errors' : 'AI batch completed',
              failedCount > 0 ? 'error' : 'completed',
              finalSummary
            ),
          ],
        }));
      }

      workingState.lastRunAt = Date.now();
      await saveBatchState(workingState);
    } finally {
      setState((prev) => ({ ...prev, isRunningBatch: false }));
    }
  };

  const clearBatchQueue = async () => {
    await saveBatchState({
      ...state.batchState,
      items: [],
      activeTaskId: null,
    });
  };

  const clearTaskHistory = async () => {
    await saveBatchState({
      ...state.batchState,
      tasks: [],
      activeTaskId: null,
    });

    await clearSessions();
  };

  const removeTask = async (taskId: string) => {
    await saveBatchState({
      ...state.batchState,
      activeTaskId: state.batchState.activeTaskId === taskId ? null : state.batchState.activeTaskId,
      tasks: state.batchState.tasks.filter((task) => task.id !== taskId),
    });

    const agentSessionId = getAgentSessionId(taskId);
    if (agentSessionId) {
      await deleteSession(agentSessionId);
    }
  };

  return {
    batchState: state.batchState,
    selectedWebsiteId: state.selectedWebsiteId,
    selectedWebsiteSnapshot: state.selectedWebsiteSnapshot,
    isLoading: state.isLoading,
    isRunningBatch: state.isRunningBatch,
    error: state.error,
    refresh,
    setDraftUrls,
    setAgentTaskTemplate,
    selectWebsite,
    queueBatch,
    runBatch,
    runBatchWithAgent,
    clearBatchQueue,
    clearTaskHistory,
    removeTask,
  };
}
