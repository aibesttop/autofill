import styled from '@emotion/styled';
import { css } from '@emotion/react';

type WebsiteStatus = 'pending' | 'active' | 'error';

const statusStyles: Record<WebsiteStatus, ReturnType<typeof css>> = {
  pending: css`
    background: rgba(221, 107, 32, 0.12);
    color: #c05621;
  `,
  active: css`
    background: rgba(72, 187, 120, 0.16);
    color: #2f855a;
  `,
  error: css`
    background: rgba(229, 62, 62, 0.12);
    color: #c53030;
  `,
};

export const Container = styled.div`max-width: 800px; margin: 0 auto;`;
export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
`;
export const Title = styled.h2`margin: 0 0 8px 0; font-size: 24px; color: #1a202c;`;
export const Description = styled.p`margin: 0; font-size: 14px; color: #718096; max-width: 520px;`;
export const InfoText = styled.p`
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #2d3748;
  background: linear-gradient(135deg, rgba(90, 103, 216, 0.08), rgba(49, 151, 149, 0.08));
  border: 1px solid rgba(90, 103, 216, 0.14);
  border-radius: 12px;
  padding: 12px 14px;
`;
export const ActiveProfilePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;
export const ActiveProfileLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #718096;
`;
export const ActiveProfileName = styled.strong`
  font-size: 18px;
  color: #1a202c;
`;
export const ActiveProfileMeta = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #4a5568;
`;
export const SubmissionDefaults = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
`;
export const SubmissionDefaultsTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  color: #1a202c;
`;
export const SubmissionDefaultsHint = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #718096;
`;
export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;
export const FieldGroup = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;
export const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #2d3748;
`;
export const TextInput = styled.input`
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  color: #1a202c;
  background: #ffffff;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: #5a67d8;
    box-shadow: 0 0 0 3px rgba(90, 103, 216, 0.12);
  }
`;
export const Textarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  color: #1a202c;
  background: #ffffff;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: #5a67d8;
    box-shadow: 0 0 0 3px rgba(90, 103, 216, 0.12);
  }
`;
export const DefaultActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;
export const List = styled.div`display: flex; flex-direction: column; gap: 12px; margin-top: 12px;`;
export const WebsiteCard = styled.div<{ isSelected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
  border-radius: 12px;
  background: ${({ isSelected }) =>
    isSelected
      ? 'linear-gradient(135deg, rgba(90, 103, 216, 0.08), rgba(49, 151, 149, 0.08))'
      : 'transparent'};
  box-shadow: ${({ isSelected }) =>
    isSelected ? 'inset 0 0 0 1px rgba(90, 103, 216, 0.18)' : 'none'};
`;
export const WebsiteTopRow = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;`;
export const WebsiteName = styled.h3`margin: 0 0 6px 0; font-size: 18px; color: #1a202c;`;
export const WebsiteUrl = styled.a`
  color: #5a67d8;
  font-size: 13px;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;
export const WebsiteDescription = styled.p`margin: 0; font-size: 13px; line-height: 1.6; color: #4a5568;`;
export const MetadataRow = styled.div`display: flex; gap: 16px; flex-wrap: wrap;`;
export const MetadataItem = styled.span`font-size: 12px; color: #718096;`;
export const StatusBadge = styled.span<{ status: WebsiteStatus }>`
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
export const ErrorText = styled.p`margin: 0 0 16px 0; font-size: 13px; color: #e53e3e;`;
export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 2px;
`;
export const ActionHint = styled.span`
  flex: 1;
  min-width: 220px;
  font-size: 12px;
  line-height: 1.5;
  color: #718096;
`;
export const EmptyState = styled.div`
  padding: 32px 20px;
  text-align: center;
  color: #718096;
  font-size: 14px;
`;
