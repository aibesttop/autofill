import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_BATCH_AGENT_TASK_TEMPLATE } from '../../../agent/batch-runner';
import { useAutomationWorkspace } from '../../hooks/useAutomationWorkspace';
import { useWebsites } from '../../hooks/useWebsites';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import * as S from './BatchSubmit.styles';

function getQueueCounts(items: ReturnType<typeof useAutomationWorkspace>['batchState']['items']) {
  return {
    total: items.length,
    pending: items.filter((item) => item.status === 'pending').length,
    running: items.filter((item) => item.status === 'running').length,
    completed: items.filter((item) => item.status === 'completed').length,
    failed: items.filter((item) => item.status === 'failed').length,
  };
}

export const BatchSubmit: React.FC = () => {
  const { websites, isLoading: isLoadingWebsites, error: websiteError, refresh: refreshWebsites } = useWebsites();
  const {
    batchState,
    selectedWebsiteId,
    selectedWebsiteSnapshot,
    isLoading,
    isRunningBatch,
    error,
    setDraftUrls,
    setAgentTaskTemplate,
    selectWebsite,
    queueBatch,
    runBatch,
    runBatchWithAgent,
    clearBatchQueue,
  } = useAutomationWorkspace();
  const [draftUrls, setLocalDraftUrls] = useState(batchState.draftUrls);
  const [agentTaskTemplate, setLocalAgentTaskTemplate] = useState(
    batchState.agentTaskTemplate || DEFAULT_BATCH_AGENT_TASK_TEMPLATE
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setLocalDraftUrls(batchState.draftUrls);
  }, [batchState.draftUrls]);

  useEffect(() => {
    setLocalAgentTaskTemplate(batchState.agentTaskTemplate || DEFAULT_BATCH_AGENT_TASK_TEMPLATE);
  }, [batchState.agentTaskTemplate]);

  const queueCounts = useMemo(() => getQueueCounts(batchState.items), [batchState.items]);

  const handleWebsiteChange = async (websiteId: string) => {
    const selectedWebsite = websites.find((website) => website.id === websiteId) || null;
    await selectWebsite(selectedWebsite);
  };

  const handleQueueBatch = async () => {
    setFeedback(null);

    try {
      await setDraftUrls(draftUrls);
      const result = await queueBatch(draftUrls);
      setFeedback(
        result.invalidUrls.length > 0
          ? `${result.queuedCount} URLs queued. Skipped ${result.invalidUrls.length} invalid entries.`
          : `${result.queuedCount} URLs queued and ready to launch.`
      );
    } catch (nextError) {
      setFeedback(nextError instanceof Error ? nextError.message : 'Failed to queue batch');
    }
  };

  const handleRunBatch = async () => {
    setFeedback(null);

    try {
      await runBatch();
      setFeedback('Batch launch finished. Check the queue and task history for details.');
    } catch (nextError) {
      setFeedback(nextError instanceof Error ? nextError.message : 'Failed to launch batch');
    }
  };

  const handleRunAgentBatch = async () => {
    setFeedback(null);

    try {
      await setAgentTaskTemplate(agentTaskTemplate);
      await runBatchWithAgent(agentTaskTemplate);
      setFeedback('AI Agent batch finished. Review the queue and task history for each run.');
    } catch (nextError) {
      setFeedback(
        nextError instanceof Error ? nextError.message : 'Failed to run the AI Agent batch'
      );
    }
  };

  const handleClearQueue = async () => {
    setFeedback(null);
    await clearBatchQueue();
  };

  return (
    <S.Container>
      <S.Header>
        <S.Title>📋 Batch Submit</S.Title>
        <S.Description>
          Prepare a queue of target URLs, then either launch them into grouped tabs or run an AI
          Agent workflow on each URL.
        </S.Description>
      </S.Header>

      <S.Layout>
        <Card>
          <S.FormSection>
            <S.FieldGroup>
              <S.Label>Website profile</S.Label>
              <S.Select
                value={selectedWebsiteId || ''}
                onChange={(event) => void handleWebsiteChange(event.target.value)}
                disabled={isLoadingWebsites}
              >
                <option value="">No profile selected</option>
                {websites.map((website) => (
                  <option key={website.id} value={website.id}>
                    {website.name}
                  </option>
                ))}
              </S.Select>
              {selectedWebsiteSnapshot ? (
                <S.HelperText>
                  Active profile: {selectedWebsiteSnapshot.name}
                  {selectedWebsiteSnapshot.category ? ` · ${selectedWebsiteSnapshot.category}` : ''}
                </S.HelperText>
              ) : (
                <S.HelperText>
                  You can queue a batch without a profile, but naming and grouping will be less specific.
                </S.HelperText>
              )}
            </S.FieldGroup>

            <S.FieldGroup>
              <S.Label>Target URLs</S.Label>
              <S.Textarea
                value={draftUrls}
                onChange={(event) => setLocalDraftUrls(event.target.value)}
                onBlur={() => void setDraftUrls(draftUrls)}
                placeholder={'https://example.com/submit\nhttps://another-site.com/listing'}
              />
              <S.HelperText>One URL per line. Only `http` and `https` entries are accepted.</S.HelperText>
            </S.FieldGroup>

            <S.FieldGroup>
              <S.Label>AI Agent task</S.Label>
              <S.TaskTextarea
                value={agentTaskTemplate}
                onChange={(event) => setLocalAgentTaskTemplate(event.target.value)}
                onBlur={() => void setAgentTaskTemplate(agentTaskTemplate)}
                placeholder={DEFAULT_BATCH_AGENT_TASK_TEMPLATE}
              />
              <S.HelperText>
                This instruction is applied to every queued URL. The runner will tell the agent to
                open the target URL first, then follow this workflow with the selected profile
                context.
              </S.HelperText>
            </S.FieldGroup>

            <S.ActionRow>
              <Button
                variant="secondary"
                onClick={() => void refreshWebsites()}
                isLoading={isLoadingWebsites}
              >
                Refresh Profiles
              </Button>
              <Button onClick={handleQueueBatch} disabled={isLoading || isRunningBatch}>
                Save Queue
              </Button>
              <Button
                variant="secondary"
                onClick={handleRunBatch}
                isLoading={isRunningBatch}
                disabled={batchState.items.length === 0 || isLoading}
              >
                Launch Tabs
              </Button>
              <Button
                variant="primary"
                onClick={handleRunAgentBatch}
                isLoading={isRunningBatch}
                disabled={batchState.items.length === 0 || isLoading}
              >
                Run AI Batch
              </Button>
              <Button
                variant="ghost"
                onClick={handleClearQueue}
                disabled={batchState.items.length === 0 || isRunningBatch}
              >
                Clear Queue
              </Button>
            </S.ActionRow>

            {websiteError ? <S.ErrorText>{websiteError}</S.ErrorText> : null}
            {error ? <S.ErrorText>{error}</S.ErrorText> : null}
            {feedback ? <S.HelperText>{feedback}</S.HelperText> : null}
          </S.FormSection>
        </Card>

        <S.Sidebar>
          <S.SummaryGrid>
            <S.SummaryCard>
              <S.SummaryValue>{queueCounts.total}</S.SummaryValue>
              <S.SummaryLabel>Queued</S.SummaryLabel>
            </S.SummaryCard>
            <S.SummaryCard>
              <S.SummaryValue>{queueCounts.completed}</S.SummaryValue>
              <S.SummaryLabel>Completed</S.SummaryLabel>
            </S.SummaryCard>
            <S.SummaryCard>
              <S.SummaryValue>{queueCounts.failed}</S.SummaryValue>
              <S.SummaryLabel>Failed</S.SummaryLabel>
            </S.SummaryCard>
          </S.SummaryGrid>

          <Card>
            <S.QueueSection>
              <S.QueueHeader>
                <S.QueueTitle>Current Queue</S.QueueTitle>
                {batchState.activeTaskId ? <S.QueueMeta>Task linked</S.QueueMeta> : null}
              </S.QueueHeader>

              {batchState.items.length === 0 ? (
                <S.EmptyState>No batch queued yet.</S.EmptyState>
              ) : (
                <S.QueueList>
                  {batchState.items.map((item) => (
                    <S.QueueItem key={item.url}>
                      <S.QueueItemTopRow>
                        <S.QueueUrl href={item.url} target="_blank" rel="noreferrer">
                          {item.url}
                        </S.QueueUrl>
                        <S.StatusBadge status={item.status}>{item.status}</S.StatusBadge>
                      </S.QueueItemTopRow>
                      <S.QueueMeta>
                        {item.result?.tabId
                          ? `Tab #${item.result.tabId}${item.result?.groupId ? ` · Group #${item.result.groupId}` : ''}`
                          : item.executionMode === 'agent'
                            ? 'Handled by AI Agent'
                            : 'Not opened yet'}
                      </S.QueueMeta>
                      {item.message ? <S.QueueMessage>{item.message}</S.QueueMessage> : null}
                      {item.error ? <S.ErrorText>{item.error}</S.ErrorText> : null}
                    </S.QueueItem>
                  ))}
                </S.QueueList>
              )}
            </S.QueueSection>
          </Card>
        </S.Sidebar>
      </S.Layout>
    </S.Container>
  );
};

export default BatchSubmit;
