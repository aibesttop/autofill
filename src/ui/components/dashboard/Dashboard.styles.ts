/**
 * Dashboard Styles
 */

import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7fafc;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
`;

export const Logo = styled.img`
  width: 32px;
  height: 32px;
`;

export const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
  flex: 1;
`;

export const Version = styled.span`
  font-size: 12px;
  color: #a0aec0;
  background: #f7fafc;
  padding: 4px 8px;
  border-radius: 4px;
`;

export const Tabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
`;

export const Tab = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;

  ${({ active }) =>
    active
      ? css`
          background: #edf2f7;
          color: #2d3748;
          font-weight: 600;
        `
      : css`
          color: #718096;
          &:hover {
            background: #f7fafc;
          }
        `}
`;

export const TabIcon = styled.span`
  font-size: 16px;
`;

export const TabLabel = styled.span`
  font-size: 13px;
`;

export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;
