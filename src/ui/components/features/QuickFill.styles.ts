import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Container = styled.div`max-width: 800px; margin: 0 auto;`;
export const Header = styled.div`margin-bottom: 24px;`;
export const Title = styled.h2`font-size: 24px; font-weight: 700; color: #1a202c; margin: 0 0 8px 0;`;
export const Description = styled.p`font-size: 14px; color: #718096; margin: 0;`;
export const Section = styled.div`margin-bottom: 24px; &:last-child { margin-bottom: 0; }`;
export const SectionTitle = styled.h3`font-size: 16px; font-weight: 600; color: #2d3748; margin: 0 0 16px 0;`;
export const List = styled.div`display: flex; flex-direction: column; gap: 12px;`;
export const ListItem = styled.div`display: flex; align-items: center; gap: 12px;`;
export const ListIcon = styled.span`font-size: 20px;`;
export const ListText = styled.span`font-size: 14px; color: #4a5568;`;
export const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
  border: 1px solid rgba(102, 126, 234, 0.18);
  border-radius: 10px;
`;
export const StatusBadge = styled.span<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  ${({ active }) =>
    active
      ? css`
          background: rgba(72, 187, 120, 0.16);
          color: #2f855a;
        `
      : css`
          background: rgba(229, 62, 62, 0.12);
          color: #c53030;
        `}
`;
export const StatusText = styled.p`margin: 0; font-size: 13px; line-height: 1.5; color: #4a5568;`;
export const ProfileText = styled.p`margin: 12px 0 0 0; font-size: 12px; line-height: 1.5; color: #718096;`;
export const MetaText = styled.p`margin: 8px 0 0 0; font-size: 12px; line-height: 1.5; color: #4a5568;`;
export const Setting = styled.div<{ disabled?: boolean }>`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid #e2e8f0;
  &:last-child { border-bottom: none; }
  ${({ disabled }) => disabled && css`opacity: 0.6;`}
`;
export const SettingCopy = styled.div`display: flex; flex-direction: column; gap: 4px; max-width: 420px;`;
export const SettingLabel = styled.span`font-size: 14px; font-weight: 600; color: #2d3748;`;
export const SettingDescription = styled.span`font-size: 12px; line-height: 1.45; color: #718096;`;
export const Toggle = styled.input`
  width: 44px; height: 24px; appearance: none; background: #cbd5e0;
  border-radius: 12px; position: relative; cursor: pointer; transition: background 150ms ease;
  &:checked { background: #667eea; }
  &:disabled { cursor: not-allowed; opacity: 0.6; }
  &::before {
    content: ''; position: absolute; width: 20px; height: 20px;
    background: white; border-radius: 50%; top: 2px; left: 2px;
    transition: transform 150ms ease;
  }
  &:checked::before { transform: translateX(20px); }
`;
export const Actions = styled.div`display: flex; gap: 12px; margin-top: 24px;`;
export const LoadingText = styled.p`margin: 0; font-size: 13px; color: #718096;`;
export const ErrorText = styled.p`margin: 0; font-size: 13px; color: #e53e3e;`;
export const InfoText = styled.p`margin: 0; font-size: 13px; color: #2d3748;`;
export const AgentPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(237, 242, 247, 0.9), rgba(255, 255, 255, 0.95));
  border: 1px solid #e2e8f0;
`;
export const AgentTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;
export const AgentStatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
export const AgentStatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  ${({ status }) => {
    if (status === 'running') {
      return css`
        background: rgba(49, 130, 206, 0.14);
        color: #2b6cb0;
      `;
    }

    if (status === 'completed') {
      return css`
        background: rgba(72, 187, 120, 0.16);
        color: #2f855a;
      `;
    }

    if (status === 'error') {
      return css`
        background: rgba(229, 62, 62, 0.12);
        color: #c53030;
      `;
    }

    return css`
      background: rgba(113, 128, 150, 0.14);
      color: #4a5568;
    `;
  }}
`;
export const AgentStatusText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #2d3748;
`;
export const AgentTaskCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
`;
export const AgentTaskLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #718096;
`;
export const AgentTaskText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #2d3748;
  white-space: pre-wrap;
`;
export const AgentHistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
export const AgentHistoryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(226, 232, 240, 0.95);
`;
export const AgentHistoryLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4a5568;
`;
export const AgentHistoryText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #2d3748;
  white-space: pre-wrap;
`;
