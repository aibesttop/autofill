import styled from '@emotion/styled';
import { css } from '@emotion/react';

type QueueItemStatus = 'pending' | 'running' | 'completed' | 'failed';

const statusStyles: Record<QueueItemStatus, ReturnType<typeof css>> = {
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
  failed: css`
    background: rgba(229, 62, 62, 0.12);
    color: #c53030;
  `,
};

export const Container = styled.div`max-width: 1040px; margin: 0 auto;`;
export const Header = styled.div`margin-bottom: 24px;`;
export const Title = styled.h2`margin: 0 0 8px 0; font-size: 24px; color: #1a202c;`;
export const Description = styled.p`margin: 0; font-size: 14px; line-height: 1.6; color: #718096; max-width: 760px;`;
export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.9fr);
  gap: 16px;
`;
export const FormSection = styled.div`display: flex; flex-direction: column; gap: 20px;`;
export const FieldGroup = styled.div`display: flex; flex-direction: column; gap: 8px;`;
export const Label = styled.label`font-size: 13px; font-weight: 700; color: #2d3748;`;
export const Select = styled.select`
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #2d3748;
  outline: none;
  &:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
`;
export const Textarea = styled.textarea`
  width: 100%;
  min-height: 220px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #2d3748;
  font: inherit;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  &:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
`;
export const TaskTextarea = styled(Textarea)`min-height: 120px;`;
export const HelperText = styled.p`margin: 0; font-size: 12px; line-height: 1.5; color: #718096;`;
export const ErrorText = styled.p`margin: 0; font-size: 12px; line-height: 1.5; color: #e53e3e;`;
export const ActionRow = styled.div`display: flex; gap: 12px; flex-wrap: wrap;`;
export const Sidebar = styled.div`display: flex; flex-direction: column; gap: 16px;`;
export const SummaryGrid = styled.div`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;`;
export const SummaryCard = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
`;
export const SummaryValue = styled.div`font-size: 24px; font-weight: 700; color: #1a202c;`;
export const SummaryLabel = styled.div`font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #718096;`;
export const QueueSection = styled.div`display: flex; flex-direction: column; gap: 16px;`;
export const QueueHeader = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 12px;`;
export const QueueTitle = styled.h3`margin: 0; font-size: 16px; color: #1a202c;`;
export const QueueMeta = styled.p`margin: 0; font-size: 12px; color: #718096;`;
export const QueueMessage = styled.p`margin: 8px 0 0 0; font-size: 12px; line-height: 1.5; color: #4a5568;`;
export const QueueList = styled.div`display: flex; flex-direction: column; gap: 12px;`;
export const QueueItem = styled.div`
  padding: 14px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
`;
export const QueueItemTopRow = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px;`;
export const QueueUrl = styled.a`
  color: #2d3748;
  font-size: 13px;
  line-height: 1.5;
  text-decoration: none;
  word-break: break-all;
  &:hover { color: #5a67d8; }
`;
export const StatusBadge = styled.span<{ status: QueueItemStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  ${({ status }) => statusStyles[status]}
`;
export const EmptyState = styled.div`
  padding: 24px 16px;
  border-radius: 10px;
  text-align: center;
  background: #f8fafc;
  color: #718096;
  font-size: 13px;
`;
