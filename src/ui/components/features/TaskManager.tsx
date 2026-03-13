import { useMemo } from 'react';
import { useAutomationWorkspace } from '../../hooks/useAutomationWorkspace';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import * as S from './TaskManager.styles';

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export const TaskManager: React.FC = () => {
  const { batchState, isLoading, error, clearTaskHistory, removeTask } = useAutomationWorkspace();

  const stats = useMemo(() => {
    return {
      total: batchState.tasks.length,
      running: batchState.tasks.filter((task) => task.status === 'running').length,
      completed: batchState.tasks.filter((task) => task.status === 'completed').length,
      error: batchState.tasks.filter((task) => task.status === 'error').length,
    };
  }, [batchState.tasks]);

  return (
    <S.Container>
      <S.Header>
        <div>
          <S.Title>📝 Task Manager</S.Title>
          <S.Description>
            Review Quick Discover analyses, batch execution results, and AI Agent runs stored on
            this device.
          </S.Description>
        </div>
        <Button
          variant="ghost"
          onClick={() => void clearTaskHistory()}
          disabled={batchState.tasks.length === 0 || isLoading}
        >
          Clear History
        </Button>
      </S.Header>

      <S.SummaryGrid>
        <S.SummaryCard>
          <S.SummaryValue>{stats.total}</S.SummaryValue>
          <S.SummaryLabel>Total Tasks</S.SummaryLabel>
        </S.SummaryCard>
        <S.SummaryCard>
          <S.SummaryValue>{stats.running}</S.SummaryValue>
          <S.SummaryLabel>Running</S.SummaryLabel>
        </S.SummaryCard>
        <S.SummaryCard>
          <S.SummaryValue>{stats.completed}</S.SummaryValue>
          <S.SummaryLabel>Completed</S.SummaryLabel>
        </S.SummaryCard>
        <S.SummaryCard>
          <S.SummaryValue>{stats.error}</S.SummaryValue>
          <S.SummaryLabel>Errors</S.SummaryLabel>
        </S.SummaryCard>
      </S.SummaryGrid>

      {error ? <S.ErrorText>{error}</S.ErrorText> : null}

      {batchState.tasks.length === 0 ? (
        <Card>
          <S.EmptyState>
            No tasks recorded yet. Quick Discover analyses, batch launches, and AI Agent runs will
            appear here.
          </S.EmptyState>
        </Card>
      ) : (
        <S.TaskList>
          {batchState.tasks.map((task) => (
            <Card key={task.id}>
              <S.TaskCard>
                <S.TaskTopRow>
                  <div>
                    <S.TaskTitle>{task.title || task.type}</S.TaskTitle>
                    <S.TaskMeta>
                      {task.url ? task.url : 'No URL'}
                      {' · '}
                      {formatTimestamp(task.createdAt)}
                    </S.TaskMeta>
                  </div>
                  <S.TaskHeaderActions>
                    <S.StatusBadge status={task.status}>{task.status}</S.StatusBadge>
                    <Button variant="ghost" size="sm" onClick={() => void removeTask(task.id)}>
                      Remove
                    </Button>
                  </S.TaskHeaderActions>
                </S.TaskTopRow>

                {task.summary ? <S.TaskSummary>{task.summary}</S.TaskSummary> : null}
                {task.error ? <S.ErrorText>{task.error}</S.ErrorText> : null}

                {task.metrics ? (
                  <S.MetricRow>
                    {typeof task.metrics.total === 'number' ? (
                      <S.MetricChip>Total: {task.metrics.total}</S.MetricChip>
                    ) : null}
                    {typeof task.metrics.completed === 'number' ? (
                      <S.MetricChip>Completed: {task.metrics.completed}</S.MetricChip>
                    ) : null}
                    {typeof task.metrics.failed === 'number' ? (
                      <S.MetricChip>Failed: {task.metrics.failed}</S.MetricChip>
                    ) : null}
                    {typeof task.metrics.fieldCount === 'number' ? (
                      <S.MetricChip>Fields: {task.metrics.fieldCount}</S.MetricChip>
                    ) : null}
                    {typeof task.metrics.formCount === 'number' ? (
                      <S.MetricChip>Forms: {task.metrics.formCount}</S.MetricChip>
                    ) : null}
                    {typeof task.metrics.submitButtonCount === 'number' ? (
                      <S.MetricChip>Submit Controls: {task.metrics.submitButtonCount}</S.MetricChip>
                    ) : null}
                  </S.MetricRow>
                ) : null}

                <S.StepList>
                  {task.steps.map((step) => (
                    <S.StepItem key={step.id}>
                      <S.StepTopRow>
                        <S.StepName>{step.name}</S.StepName>
                        <S.StepStatus status={step.status}>{step.status}</S.StepStatus>
                      </S.StepTopRow>
                      {step.message ? <S.StepMessage>{step.message}</S.StepMessage> : null}
                      <S.StepTimestamp>{formatTimestamp(step.timestamp)}</S.StepTimestamp>
                    </S.StepItem>
                  ))}
                </S.StepList>
              </S.TaskCard>
            </Card>
          ))}
        </S.TaskList>
      )}
    </S.Container>
  );
};

export default TaskManager;
