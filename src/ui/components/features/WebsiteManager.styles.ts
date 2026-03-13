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
export const List = styled.div`display: flex; flex-direction: column; gap: 12px;`;
export const WebsiteCard = styled.div`display: flex; flex-direction: column; gap: 14px;`;
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
export const EmptyState = styled.div`
  padding: 32px 20px;
  text-align: center;
  color: #718096;
  font-size: 14px;
`;
