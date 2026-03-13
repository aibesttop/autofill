/**
 * AI Agent Panel - Integrated from Page Agent Extension
 * Provides LLM-driven multi-page browser automation
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import { useAgent } from '../../../agent/useAgent';
import type { ExtConfig, LanguagePreference } from '../../../agent/useAgent';
import { DEFAULT_API_KEY, DEFAULT_BASE_URL, DEFAULT_MODEL } from '../../../agent/constants';
import { saveSession, listSessions, deleteSession, clearSessions, getSession } from '../../../lib/db';
import type { SessionRecord } from '../../../lib/db';
import type {
  AgentActivity,
  AgentStepEvent,
  HistoricalEvent,
  ObservationEvent,
  RetryEvent,
  AgentErrorEvent,
  AgentStatus,
} from '@page-agent/core';

// ============= Styled Components =============

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #fafbfc;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatusIndicator = styled.span<{ status: AgentStatus }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  ${({ status }) => {
    switch (status) {
      case 'running': return css`background: #3b82f6; animation: ${pulse} 2s ease-in-out infinite;`;
      case 'completed': return css`background: #22c55e;`;
      case 'error': return css`background: #ef4444;`;
      default: return css`background: #94a3b8;`;
    }
  }}
`;

const StatusLabel = styled.span`
  font-size: 11px;
  color: #94a3b8;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`;

const TaskBar = styled.div`
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const TaskLabel = styled.div`
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TaskText = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HistoryArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 24px;
`;

const EmptyStateTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
`;

const EmptyStateDesc = styled.div`
  font-size: 12px;
  color: #94a3b8;
`;

const InputArea = styled.div`
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-family: inherit;
  min-height: 36px;
  max-height: 80px;
  outline: none;
  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
  }
  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
  }
`;

const SendButton = styled.button<{ variant?: 'primary' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 150ms ease;
  ${({ variant }) => variant === 'danger'
    ? css`background: #ef4444; color: white; &:hover { background: #dc2626; }`
    : css`background: #667eea; color: white; &:hover { background: #5a67d8; }`
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Card styles
const StepCardContainer = styled.div`
  border-left: 2px solid rgba(59, 130, 246, 0.5);
  border: 1px solid #e2e8f0;
  border-left: 2px solid rgba(59, 130, 246, 0.5);
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px;
`;

const StepLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
`;

const ReflectionGrid = styled.div`
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 4px 8px;
  margin-bottom: 8px;
`;

const ReflectionIcon = styled.span`
  font-size: 12px;
  display: flex;
  justify-content: center;
`;

const ReflectionText = styled.span<{ expanded?: boolean }>`
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  ${({ expanded }) => !expanded && css`
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  `}
  &:hover { color: #475569; }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const ActionName = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: rgba(51, 65, 85, 0.7);
`;

const ActionInput = styled.span`
  font-size: 11px;
  color: rgba(100, 116, 139, 0.7);
  margin-left: 6px;
`;

const ActionOutput = styled.div`
  font-size: 11px;
  color: rgba(100, 116, 139, 0.7);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  &:hover {
    -webkit-line-clamp: 3;
  }
`;

const ObservationCardContainer = styled.div`
  border-left: 2px solid rgba(34, 197, 94, 0.5);
  border: 1px solid #e2e8f0;
  border-left: 2px solid rgba(34, 197, 94, 0.5);
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const RetryCardContainer = styled.div`
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #d97706;
`;

const ErrorCardContainer = styled.div`
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #ef4444;
`;

const ResultCardContainer = styled.div<{ success: boolean }>`
  border-radius: 8px;
  padding: 12px;
  ${({ success }) => success
    ? css`border: 1px solid rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.1);`
    : css`border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1);`
  }
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const ResultLabel = styled.span<{ success: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ success }) => success ? '#16a34a' : '#ef4444'};
`;

const ResultText = styled.p`
  font-size: 11px;
  color: #64748b;
  padding-left: 20px;
  white-space: pre-wrap;
  margin: 0;
`;

const ActivityCardContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const ActivityText = styled.span<{ colorClass: string }>`
  font-size: 12px;
  color: ${({ colorClass }) => colorClass};
`;

// Config Panel styles
const ConfigContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
`;

const ConfigTitle = styled.h2`
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.label`
  font-size: 11px;
  color: #94a3b8;
`;

const FieldInput = styled.input`
  height: 32px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0 10px;
  outline: none;
  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
  }
`;

const FieldSelect = styled.select`
  height: 32px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0 10px;
  background: white;
  cursor: pointer;
  outline: none;
  &:focus {
    border-color: #667eea;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const Button = styled.button<{ variant?: 'primary' | 'outline' }>`
  flex: 1;
  height: 32px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
  ${({ variant }) => variant === 'outline'
    ? css`background: white; border: 1px solid #e2e8f0; color: #64748b; &:hover { background: #f8fafc; }`
    : css`background: #667eea; border: none; color: white; &:hover { background: #5a67d8; }`
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  margin: 0 auto;
`;

// History List styles
const HistoryListContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
`;

const HistoryHeaderTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  flex: 1;
`;

const ClearButton = styled.button`
  font-size: 10px;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  &:hover { color: #ef4444; background: #fef2f2; }
`;

const SessionItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  &:hover { background: #f8fafc; }
`;

const SessionContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const SessionTask = styled.p`
  font-size: 12px;
  font-weight: 500;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SessionMeta = styled.p`
  font-size: 10px;
  color: #94a3b8;
  margin: 2px 0 0;
`;

const DeleteButton = styled.button`
  opacity: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  ${SessionItem}:hover & { opacity: 1; }
  &:hover { color: #ef4444; }
`;

const EmptyMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 128px;
  font-size: 12px;
  color: #94a3b8;
`;

// ============= Sub Components =============

function ReflectionItem({ icon, value }: { icon: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <ReflectionIcon>{icon}</ReflectionIcon>
      <ReflectionText expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {value}
      </ReflectionText>
    </>
  );
}

function ReflectionSection({ reflection }: {
  reflection: { evaluation_previous_goal?: string; memory?: string; next_goal?: string };
}) {
  const items = [
    { icon: '☑️', label: 'eval', value: reflection.evaluation_previous_goal },
    { icon: '🧠', label: 'memory', value: reflection.memory },
    { icon: '🎯', label: 'goal', value: reflection.next_goal },
  ].filter((item) => item.value);

  if (items.length === 0) return null;

  return (
    <ReflectionGrid>
      {items.map((item) => (
        <ReflectionItem key={item.label} icon={item.icon} value={item.value!} />
      ))}
    </ReflectionGrid>
  );
}

function StepCard({ event }: { event: AgentStepEvent }) {
  return (
    <StepCardContainer>
      <StepLabel>Step #{(event.stepIndex ?? 0) + 1}</StepLabel>
      {event.reflection && <ReflectionSection reflection={event.reflection} />}
      {event.action && (
        <div>
          <StepLabel>Actions</StepLabel>
          <ActionRow>
            <span style={{ fontSize: 14, color: '#3b82f6', marginTop: 2 }}>⚡</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12 }}>
                <ActionName>{event.action.name}</ActionName>
                {event.action.name !== 'done' && (
                  <ActionInput>{JSON.stringify(event.action.input)}</ActionInput>
                )}
              </div>
              <ActionOutput>└ {event.action.output}</ActionOutput>
            </div>
          </ActionRow>
        </div>
      )}
    </StepCardContainer>
  );
}

function ObservationCard({ event }: { event: ObservationEvent }) {
  return (
    <ObservationCardContainer>
      <span style={{ fontSize: 14, color: '#22c55e' }}>👁</span>
      <span style={{ fontSize: 11, color: '#64748b' }}>{event.content}</span>
    </ObservationCardContainer>
  );
}

function RetryCard({ event }: { event: RetryEvent }) {
  return (
    <RetryCardContainer>
      <span>🔄</span>
      <span>{event.message} ({event.attempt}/{event.maxAttempts})</span>
    </RetryCardContainer>
  );
}

function ErrorCard({ event }: { event: AgentErrorEvent }) {
  return (
    <ErrorCardContainer>
      <span>❌</span>
      <span>{event.message}</span>
    </ErrorCardContainer>
  );
}

function ResultCard({ success, text }: { success: boolean; text: string }) {
  return (
    <ResultCardContainer success={success}>
      <ResultHeader>
        <span style={{ fontSize: 14 }}>{success ? '✅' : '❌'}</span>
        <ResultLabel success={success}>Result: {success ? 'Success' : 'Failed'}</ResultLabel>
      </ResultHeader>
      <ResultText>{text}</ResultText>
    </ResultCardContainer>
  );
}

function EventCard({ event }: { event: HistoricalEvent }) {
  if (event.type === 'step' && event.action?.name === 'done') {
    const input = event.action.input as { text?: string; success?: boolean };
    return (
      <>
        <StepCard event={event as AgentStepEvent} />
        <ResultCard
          success={input?.success ?? true}
          text={input?.text || event.action.output || ''}
        />
      </>
    );
  }

  if (event.type === 'step') return <StepCard event={event as AgentStepEvent} />;
  if (event.type === 'observation') return <ObservationCard event={event as ObservationEvent} />;
  if (event.type === 'retry') return <RetryCard event={event as RetryEvent} />;
  if (event.type === 'error') return <ErrorCard event={event as AgentErrorEvent} />;
  return null;
}

function ActivityCard({ activity }: { activity: AgentActivity }) {
  const getInfo = () => {
    switch (activity.type) {
      case 'thinking': return { text: 'Thinking...', color: '#3b82f6' };
      case 'executing': return { text: `Executing ${activity.tool}...`, color: '#f59e0b' };
      case 'executed': return { text: `Done: ${activity.tool}`, color: '#22c55e' };
      case 'retrying': return { text: `Retrying (${activity.attempt}/${activity.maxAttempts})...`, color: '#f59e0b' };
      case 'error': return { text: activity.message, color: '#ef4444' };
    }
  };

  const info = getInfo();
  return (
    <ActivityCardContainer>
      <span style={{ fontSize: 14, color: info.color }}>✨</span>
      <ActivityText colorClass={info.color}>{info.text}</ActivityText>
    </ActivityCardContainer>
  );
}

// ============= Config Panel =============

function AgentConfigPanel({ config, onSave, onClose }: {
  config: ExtConfig | null;
  onSave: (config: ExtConfig) => Promise<void>;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState(config?.apiKey || DEFAULT_API_KEY);
  const [baseURL, setBaseURL] = useState(config?.baseURL || DEFAULT_BASE_URL);
  const [model, setModel] = useState(config?.model || DEFAULT_MODEL);
  const [language, setLanguage] = useState<LanguagePreference>(config?.language);
  const [maxSteps, setMaxSteps] = useState<number | undefined>(config?.maxSteps);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setApiKey(config?.apiKey || DEFAULT_API_KEY);
    setBaseURL(config?.baseURL || DEFAULT_BASE_URL);
    setModel(config?.model || DEFAULT_MODEL);
    setLanguage(config?.language);
    setMaxSteps(config?.maxSteps);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ apiKey, baseURL, model, language, maxSteps: maxSteps || undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfigContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ConfigTitle>Agent Settings</ConfigTitle>
        <IconButton onClick={onClose} title="Back">↩</IconButton>
      </div>

      <FieldGroup>
        <FieldLabel>Base URL</FieldLabel>
        <FieldInput
          placeholder="https://api.openai.com/v1"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Model</FieldLabel>
        <FieldInput
          placeholder="gpt-4o"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>API Key</FieldLabel>
        <FieldInput
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Language</FieldLabel>
        <FieldSelect
          value={language ?? ''}
          onChange={(e) => setLanguage((e.target.value || undefined) as LanguagePreference)}
        >
          <option value="">System</option>
          <option value="en-US">English</option>
          <option value="zh-CN">中文</option>
        </FieldSelect>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Max Steps</FieldLabel>
        <FieldInput
          type="number"
          placeholder="40"
          min={1}
          max={200}
          value={maxSteps ?? ''}
          onChange={(e) => setMaxSteps(e.target.value ? Number(e.target.value) : undefined)}
        />
      </FieldGroup>

      <ButtonRow>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner /> : 'Save'}
        </Button>
      </ButtonRow>
    </ConfigContainer>
  );
}

// ============= History Views =============

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AgentHistoryList({ onSelect, onBack }: {
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setSessions(await listSessions());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <HistoryListContainer>
      <HistoryHeader>
        <IconButton onClick={onBack} title="Back">←</IconButton>
        <HistoryHeaderTitle>History</HistoryHeaderTitle>
        {sessions.length > 0 && (
          <ClearButton onClick={async () => { await clearSessions(); setSessions([]); }}>
            🗑 Clear All
          </ClearButton>
        )}
      </HistoryHeader>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <EmptyMessage>Loading...</EmptyMessage>}
        {!loading && sessions.length === 0 && <EmptyMessage>No history yet</EmptyMessage>}
        {sessions.map((session) => (
          <SessionItem key={session.id} onClick={() => onSelect(session.id)}>
            <span style={{ fontSize: 14, marginTop: 2 }}>
              {session.status === 'completed' ? '✅' : '❌'}
            </span>
            <SessionContent>
              <SessionTask>{session.task}</SessionTask>
              <SessionMeta>{timeAgo(session.createdAt)} · {session.history.length} steps</SessionMeta>
            </SessionContent>
            <DeleteButton onClick={(e) => handleDelete(e, session.id)}>🗑</DeleteButton>
          </SessionItem>
        ))}
      </div>
    </HistoryListContainer>
  );
}

function AgentHistoryDetail({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [session, setSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    getSession(sessionId).then((s) => setSession(s ?? null));
  }, [sessionId]);

  if (!session) {
    return <EmptyMessage>Loading...</EmptyMessage>;
  }

  return (
    <HistoryListContainer>
      <HistoryHeader>
        <IconButton onClick={onBack} title="Back">←</IconButton>
        <HistoryHeaderTitle>History</HistoryHeaderTitle>
      </HistoryHeader>
      <TaskBar>
        <TaskLabel>Task</TaskLabel>
        <TaskText title={session.task}>{session.task}</TaskText>
      </TaskBar>
      <HistoryArea>
        {session.history.map((event, index) => (
          <EventCard key={index} event={event} />
        ))}
      </HistoryArea>
    </HistoryListContainer>
  );
}

// ============= Main Agent Panel =============

type AgentView =
  | { name: 'chat' }
  | { name: 'config' }
  | { name: 'history' }
  | { name: 'history-detail'; sessionId: string };

export const AgentPanel: React.FC = () => {
  const [view, setView] = useState<AgentView>({ name: 'chat' });
  const [inputValue, setInputValue] = useState('');
  const historyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { status, history, activity, currentTask, config, execute, stop, configure } = useAgent();

  // Persist session when task finishes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (
      prev === 'running' &&
      (status === 'completed' || status === 'error') &&
      history.length > 0 &&
      currentTask
    ) {
      saveSession({ task: currentTask, history, status }).catch((err) =>
        console.error('[AgentPanel] Failed to save session:', err)
      );
    }
  }, [status, history, currentTask]);

  // Auto-scroll
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history, activity]);

  const handleSubmit = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      if (!inputValue.trim() || status === 'running') return;

      const taskToExecute = inputValue.trim();
      setInputValue('');

      execute(taskToExecute).catch((error) => {
        console.error('[AgentPanel] Failed to execute task:', error);
      });
    },
    [inputValue, status, execute]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // View routing
  if (view.name === 'config') {
    return (
      <AgentConfigPanel
        config={config}
        onSave={async (newConfig) => {
          await configure(newConfig);
          setView({ name: 'chat' });
        }}
        onClose={() => setView({ name: 'chat' })}
      />
    );
  }

  if (view.name === 'history') {
    return (
      <AgentHistoryList
        onSelect={(id) => setView({ name: 'history-detail', sessionId: id })}
        onBack={() => setView({ name: 'chat' })}
      />
    );
  }

  if (view.name === 'history-detail') {
    return (
      <AgentHistoryDetail
        sessionId={view.sessionId}
        onBack={() => setView({ name: 'history' })}
      />
    );
  }

  // Chat view
  const isRunning = status === 'running';
  const showEmptyState = !currentTask && history.length === 0 && !isRunning;

  const statusLabels: Record<AgentStatus, string> = {
    idle: 'Ready',
    running: 'Running',
    completed: 'Done',
    error: 'Error',
  };

  return (
    <Panel>
      <PanelHeader>
        <HeaderLeft>
          <StatusIndicator status={status} />
          <StatusLabel>{statusLabels[status]}</StatusLabel>
        </HeaderLeft>
        <HeaderRight>
          <IconButton onClick={() => setView({ name: 'history' })} title="History">📋</IconButton>
          <IconButton onClick={() => setView({ name: 'config' })} title="Settings">⚙️</IconButton>
        </HeaderRight>
      </PanelHeader>

      {currentTask && (
        <TaskBar>
          <TaskLabel>Task</TaskLabel>
          <TaskText title={currentTask}>{currentTask}</TaskText>
        </TaskBar>
      )}

      <HistoryArea ref={historyRef}>
        {showEmptyState && (
          <EmptyStateContainer>
            <EmptyStateTitle>AI Agent</EmptyStateTitle>
            <EmptyStateDesc>
              Describe a task to automate browser actions using AI.
              <br />
              The agent can navigate pages, fill forms, click buttons, and more.
            </EmptyStateDesc>
          </EmptyStateContainer>
        )}

        {history.map((event, index) => (
          <EventCard key={index} event={event} />
        ))}

        {activity && <ActivityCard activity={activity} />}
      </HistoryArea>

      <InputArea>
        <InputRow>
          <TextArea
            ref={textareaRef}
            placeholder="Describe your task... (Enter to send)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            rows={1}
          />
          {isRunning ? (
            <SendButton variant="danger" onClick={handleStop} title="Stop">
              ■
            </SendButton>
          ) : (
            <SendButton
              onClick={() => handleSubmit()}
              disabled={!inputValue.trim()}
              title="Send"
            >
              ▶
            </SendButton>
          )}
        </InputRow>
      </InputArea>
    </Panel>
  );
};

export default AgentPanel;
