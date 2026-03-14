import type { AgentActivity, AgentStatus, HistoricalEvent } from '@page-agent/core';
import { useEffect, useRef, useState } from 'react';
import { buildQuickFillAgentTask, type AgentWebsiteProfileContext } from '../../../agent/task-context';
import { useAgent } from '../../../agent/useAgent';
import { saveSession } from '../../../lib/db';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { useExtensionSettings } from '../../hooks/useExtensionSettings';
import { useActiveTab } from '../../hooks/useActiveTab';
import { recordAgentTask, useAutomationWorkspace } from '../../hooks/useAutomationWorkspace';
import { canUseTabMessaging } from '../../utils/tab-messaging';
import * as S from './QuickFill.styles';

const STATUS_COPY: Record<AgentStatus, string> = {
  idle: 'Ready to run a full agent loop on the current page.',
  running: 'The agent is iterating on the current page and handling dynamic UI.',
  completed: 'The agent finished its current pass on this page.',
  error: 'The agent stopped before finishing the current page.',
};

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getHostnameLabel(url: string | undefined): string {
  if (!url) {
    return 'Current page';
  }

  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function toWebsiteProfileContext(
  profile: ReturnType<typeof useAutomationWorkspace>['selectedWebsiteSnapshot']
): AgentWebsiteProfileContext | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    name: profile.name,
    url: profile.url,
    category: profile.category,
    categories: profile.categories,
    description: profile.description,
    tags: profile.tags,
  };
}

function getHistoryEventLabel(event: HistoricalEvent): string {
  if (event.type === 'step') {
    return event.action?.name === 'done'
      ? 'Result'
      : `Step ${(typeof event.stepIndex === 'number' ? event.stepIndex + 1 : 0) || '?'}`;
  }

  if (event.type === 'observation') {
    return 'Observation';
  }

  if (event.type === 'retry') {
    return `Retry ${event.attempt}/${event.maxAttempts}`;
  }

  return 'Error';
}

function getHistoryEventText(event: HistoricalEvent): string {
  if (event.type === 'step') {
    if (event.action?.name === 'done') {
      const doneInput = event.action.input as { text?: string } | undefined;
      return truncateText(doneInput?.text || event.action.output || 'Agent run completed.', 200);
    }

    const actionOutput =
      typeof event.action?.output === 'string' && event.action.output.trim().length > 0
        ? event.action.output
        : `Executed ${event.action?.name || 'agent step'}.`;
    return truncateText(actionOutput, 200);
  }

  if (event.type === 'observation') {
    return truncateText(event.content, 200);
  }

  if (event.type === 'retry') {
    return truncateText(event.message, 200);
  }

  return truncateText('message' in event ? event.message : 'Agent execution requires manual takeover.', 200);
}

function getActivityText(activity: AgentActivity | null): string | null {
  if (!activity) {
    return null;
  }

  switch (activity.type) {
    case 'thinking':
      return 'Planning the next interaction...';
    case 'executing':
      return `Executing ${activity.tool}...`;
    case 'executed':
      return `Completed ${activity.tool}.`;
    case 'retrying':
      return `Retrying step ${activity.attempt}/${activity.maxAttempts}...`;
    case 'error':
      return activity.message;
    default:
      return null;
  }
}

function getCompletionSummary(history: HistoricalEvent[], status: AgentStatus): string {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const event = history[index];

    if (event.type === 'step' && event.action?.name === 'done') {
      const doneInput = event.action.input as { text?: string } | undefined;
      if (doneInput?.text?.trim()) {
        return doneInput.text.trim();
      }

      if (typeof event.action.output === 'string' && event.action.output.trim()) {
        return event.action.output.trim();
      }
    }

    if (event.type === 'error' && event.message.trim()) {
      return event.message.trim();
    }
  }

  return status === 'completed'
    ? 'The agent finished its current pass on this page.'
    : 'The agent stopped before it could finish this page.';
}

export const QuickFill: React.FC = () => {
  const {
    settings,
    isLoading,
    error,
    refresh,
    togglePlugin,
    toggleAutoDetect,
    toggleFloatingButton,
  } = useExtensionSettings();
  const { tab } = useActiveTab();
  const { selectedWebsiteSnapshot } = useAutomationWorkspace();
  const websiteProfileContext = toWebsiteProfileContext(selectedWebsiteSnapshot);
  const { status, history, activity, currentTask, error: agentError, isConfigLoading, execute, stop } =
    useAgent({
      websiteProfile: websiteProfileContext,
    });
  const [fillFeedback, setFillFeedback] = useState<string | null>(null);
  const previousStatusRef = useRef<AgentStatus>(status);
  const canFillCurrentTab = !!tab?.id && canUseTabMessaging(tab.url);
  const isAgentRunning = status === 'running';

  useEffect(() => {
    if (status === 'completed' || status === 'error') {
      setFillFeedback(getCompletionSummary(history, status));
    }
  }, [history, status]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (
      previousStatus !== 'running' ||
      (status !== 'completed' && status !== 'error') ||
      !currentTask
    ) {
      return;
    }

    let cancelled = false;
    const taskTitle = `Quick Fill Agent · ${tab?.title || getHostnameLabel(tab?.url)}`;

    void (async () => {
      try {
        const savedSession = await saveSession({
          task: currentTask,
          history,
          status,
        });

        if (cancelled) {
          return;
        }

        await recordAgentTask({
          sessionId: savedSession.id,
          task: currentTask,
          history,
          status,
          taskType: 'quick_fill',
          title: taskTitle,
          websiteId: selectedWebsiteSnapshot?.id,
          websiteName: selectedWebsiteSnapshot?.name,
          url: tab?.url,
          createdAt: savedSession.createdAt,
          completedAt: savedSession.createdAt,
        });
      } catch {
        if (cancelled) {
          return;
        }

        try {
          await recordAgentTask({
            task: currentTask,
            history,
            status,
            taskType: 'quick_fill',
            title: taskTitle,
            websiteId: selectedWebsiteSnapshot?.id,
            websiteName: selectedWebsiteSnapshot?.name,
            url: tab?.url,
          });
        } catch {
          // Ignore persistence failures in the UI layer.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTask, history, selectedWebsiteSnapshot, status, tab?.title, tab?.url]);

  const handleFillCurrentForm = async () => {
    if (!tab?.id || !canFillCurrentTab) {
      setFillFeedback('Open a regular http/https page before running the Quick Fill agent.');
      return;
    }

    if (!selectedWebsiteSnapshot) {
      setFillFeedback('Select a website profile before running the Quick Fill agent.');
      return;
    }

    setFillFeedback(null);

    try {
      await execute(
        buildQuickFillAgentTask({
          url: tab.url,
          title: tab.title,
        })
      );
    } catch (nextError) {
      setFillFeedback(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to start the Quick Fill agent on the current page'
      );
    }
  };

  const recentEvents = history.slice(-5);
  const activityText = getActivityText(activity);

  return (
    <S.Container>
      <S.Header>
        <S.Title>⚡ Quick Fill</S.Title>
        <S.Description>
          Run the full single-page AI agent loop so Quick Fill can handle dynamic dropdowns,
          searchable pickers, and multi-step form interactions.
        </S.Description>
      </S.Header>
      <Card>
        <S.Section>
          <S.SectionTitle>Automation Status</S.SectionTitle>
          <S.StatusRow>
            <S.StatusBadge active={settings.enabled}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </S.StatusBadge>
            <S.StatusText>
              {settings.enabled
                ? 'Quick Fill can inspect supported pages and keep your preferences synchronized.'
                : 'The extension is paused across supported tabs until you turn it back on.'}
            </S.StatusText>
          </S.StatusRow>
          <S.ProfileText>
            {selectedWebsiteSnapshot
              ? `Selected profile: ${selectedWebsiteSnapshot.name}`
              : 'No website profile selected yet. Choose one in Website Profiles before running Quick Fill.'}
          </S.ProfileText>
          <S.MetaText>
            {tab?.url
              ? `Current page: ${tab.title || getHostnameLabel(tab.url)} · ${tab.url}`
              : 'Current page: unavailable'}
          </S.MetaText>
        </S.Section>
        <S.Section>
          <S.SectionTitle>How it works</S.SectionTitle>
          <S.List>
            <S.ListItem>
              <S.ListIcon>1️⃣</S.ListIcon>
              <S.ListText>Open the target submission page and keep the correct website profile selected</S.ListText>
            </S.ListItem>
            <S.ListItem>
              <S.ListIcon>2️⃣</S.ListIcon>
              <S.ListText>Run the agent so it can observe, act, and re-check the page after each dynamic interaction</S.ListText>
            </S.ListItem>
            <S.ListItem>
              <S.ListIcon>3️⃣</S.ListIcon>
              <S.ListText>Review the result summary and stop the run if the page needs manual intervention</S.ListText>
            </S.ListItem>
          </S.List>
        </S.Section>
        <S.Section>
          <S.SectionTitle>Agent Fill Loop</S.SectionTitle>
          <S.AgentPanel>
            <S.AgentTopRow>
              <S.AgentStatusGroup>
                <S.AgentStatusBadge status={status}>{status}</S.AgentStatusBadge>
                <S.AgentStatusText>{STATUS_COPY[status]}</S.AgentStatusText>
              </S.AgentStatusGroup>
            </S.AgentTopRow>

            {currentTask ? (
              <S.AgentTaskCard>
                <S.AgentTaskLabel>Active Task</S.AgentTaskLabel>
                <S.AgentTaskText>{currentTask}</S.AgentTaskText>
              </S.AgentTaskCard>
            ) : null}

            {activityText ? (
              <S.AgentTaskCard>
                <S.AgentTaskLabel>Current Activity</S.AgentTaskLabel>
                <S.AgentTaskText>{activityText}</S.AgentTaskText>
              </S.AgentTaskCard>
            ) : null}

            {recentEvents.length > 0 ? (
              <S.AgentHistoryList>
                {recentEvents.map((event, index) => (
                  <S.AgentHistoryItem key={`${event.type}-${index}`}>
                    <S.AgentHistoryLabel>{getHistoryEventLabel(event)}</S.AgentHistoryLabel>
                    <S.AgentHistoryText>{getHistoryEventText(event)}</S.AgentHistoryText>
                  </S.AgentHistoryItem>
                ))}
              </S.AgentHistoryList>
            ) : (
              <S.AgentTaskCard>
                <S.AgentTaskLabel>Ready</S.AgentTaskLabel>
                <S.AgentTaskText>
                  Quick Fill now uses the full agent loop. It can keep working through dynamic
                  dropdowns, tag inputs, and multi-step UI until the page is genuinely settled.
                </S.AgentTaskText>
              </S.AgentTaskCard>
            )}
          </S.AgentPanel>
        </S.Section>
        <S.Section>
          <S.SectionTitle>Quick Fill Controls</S.SectionTitle>
          <S.Setting>
            <S.SettingCopy>
              <S.SettingLabel>Enable autofill</S.SettingLabel>
              <S.SettingDescription>Turn the extension on or off in every supported tab.</S.SettingDescription>
            </S.SettingCopy>
            <S.Toggle
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => void togglePlugin(event.target.checked)}
              disabled={isLoading}
            />
          </S.Setting>
          <S.Setting disabled={!settings.enabled}>
            <S.SettingCopy>
              <S.SettingLabel>Auto-detect forms</S.SettingLabel>
              <S.SettingDescription>
                Scan the current page for eligible inputs when the extension is active.
              </S.SettingDescription>
            </S.SettingCopy>
            <S.Toggle
              type="checkbox"
              checked={settings.autoDetect}
              onChange={(event) => void toggleAutoDetect(event.target.checked)}
              disabled={isLoading || !settings.enabled}
            />
          </S.Setting>
          <S.Setting disabled={!settings.enabled}>
            <S.SettingCopy>
              <S.SettingLabel>Show floating button</S.SettingLabel>
              <S.SettingDescription>
                Save whether page-level entry points should be visible on supported pages.
              </S.SettingDescription>
            </S.SettingCopy>
            <S.Toggle
              type="checkbox"
              checked={settings.showFloatingButton}
              onChange={(event) => void toggleFloatingButton(event.target.checked)}
              disabled={isLoading || !settings.enabled}
            />
          </S.Setting>
        </S.Section>
        {isLoading || isConfigLoading ? (
          <S.LoadingText>Loading current extension preferences and agent configuration...</S.LoadingText>
        ) : null}
        {error ? <S.ErrorText>{error}</S.ErrorText> : null}
        {agentError ? <S.ErrorText>{agentError}</S.ErrorText> : null}
        {!canFillCurrentTab && tab?.url ? (
          <S.InfoText>Quick Fill only works on regular website pages.</S.InfoText>
        ) : null}
        {!selectedWebsiteSnapshot ? (
          <S.InfoText>Select a website profile first so the agent has source data to use.</S.InfoText>
        ) : null}
        {fillFeedback ? <S.InfoText>{fillFeedback}</S.InfoText> : null}
        <S.Actions>
          {isAgentRunning ? (
            <Button
              fullWidth
              variant="danger"
              onClick={() => stop()}
              disabled={isLoading || isConfigLoading}
            >
              Stop Agent
            </Button>
          ) : (
            <Button
              fullWidth
              onClick={handleFillCurrentForm}
              disabled={
                !settings.enabled ||
                isLoading ||
                isConfigLoading ||
                !canFillCurrentTab ||
                !selectedWebsiteSnapshot ||
                !!agentError
              }
            >
              Run Agent Fill
            </Button>
          )}
          <Button fullWidth variant="secondary" onClick={() => void refresh()} disabled={isLoading}>
            Refresh State
          </Button>
        </S.Actions>
      </Card>
    </S.Container>
  );
};

export default QuickFill;
