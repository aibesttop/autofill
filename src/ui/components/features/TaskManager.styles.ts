import styled from '@emotion/styled';
import { css } from '@emotion/react';
import type { TaskStatus } from '../../types/ui';

const statusStyles: Record<TaskStatus, ReturnType<typeof css>> = {
  idle: css`
    background: rgba(160, 174, 192, 0.18);
    color: #4a5568;
  `,
  pending: css`
    background: rgba(221, 107, 32, 0.12);
    color: #c05621;
  `,
  running: css`
    background: rgba(49, 130, 206, 0.14);
    color: #2b6cb0;
  `,
  completed: css`
    background: rgba(72, 187, 120, 0.16);
    color: #2f855a;
  `,
  error: css`
    background: rgba(229, 62, 62, 0.12);
    color: #c53030;
  `,
  paused: css`
    background: rgba(113, 128, 150, 0.14);
    color: #4a5568;
  `,
};

export const Container = styled.div`max-width: 920px; margin: 0 auto;`;
export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
`;
export const Title = styled.h2`margin: 0 0 8px 0; font-size: 24px; color: #1a202c;`;
export const Description = styled.p`margin: 0; font-size: 14px; line-height: 1.6; color: #718096; max-width: 620px;`;
export const SummaryGrid = styled.div`display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px;`;
export const SummaryCard = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
`;
export const SummaryValue = styled.div`font-size: 24px; font-weight: 700; color: #1a202c;`;
export const SummaryLabel = styled.div`font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #718096;`;
export const TaskList = styled.div`display: flex; flex-direction: column; gap: 12px;`;
export const TaskCard = styled.div`display: flex; flex-direction: column; gap: 16px;`;
export const TaskTopRow = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;`;
export const TaskHeaderActions = styled.div`display: flex; align-items: center; gap: 8px;`;
export const TaskTitle = styled.h3`margin: 0 0 6px 0; font-size: 18px; color: #1a202c;`;
export const TaskMeta = styled.p`margin: 0; font-size: 12px; color: #718096; word-break: break-all;`;
export const TaskSummary = styled.p`margin: 0; font-size: 13px; line-height: 1.6; color: #4a5568;`;
export const StatusBadge = styled.span<{ status: TaskStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  ${({ status }) => statusStyles[status]}
`;
export const MetricRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
export const MetricChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: #edf2f7;
  color: #4a5568;
  font-size: 12px;
  font-weight: 600;
`;
export const StepList = styled.div`display: flex; flex-direction: column; gap: 10px;`;
export const StepItem = styled.div`
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
`;
export const StepTopRow = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px;`;
export const StepName = styled.div`font-size: 13px; font-weight: 700; color: #2d3748;`;
export const StepStatus = styled.span<{ status: TaskStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  ${({ status }) => statusStyles[status]}
`;
export const StepMessage = styled.p`margin: 0 0 6px 0; font-size: 12px; line-height: 1.5; color: #4a5568;`;
export const StepTimestamp = styled.p`margin: 0; font-size: 11px; color: #718096;`;
export const EmptyState = styled.div`
  padding: 32px 20px;
  text-align: center;
  color: #718096;
  font-size: 14px;
`;
export const ErrorText = styled.p`margin: 0; font-size: 12px; line-height: 1.5; color: #e53e3e;`;
