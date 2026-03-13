import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

export const Header = styled.div`
  margin-bottom: 24px;
`;

export const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 8px 0;
`;

export const Description = styled.p`
  font-size: 14px;
  color: #718096;
  margin: 0;
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Input = styled.input<{ fullWidth: boolean }>`
  padding: 12px;
  font-size: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  outline: none;

  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}
`;
