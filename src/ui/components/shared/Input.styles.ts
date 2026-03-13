import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Wrapper = styled.div<{ fullWidth: boolean }>`
  display: flex; flex-direction: column; gap: 6px;
  ${({ fullWidth }) => fullWidth && css`width: 100%;`}
`;

export const Label = styled.label<{ disabled?: boolean }>`
  font-size: 14px; font-weight: 500; color: #2d3748;
  ${({ disabled }) => disabled && css`opacity: 0.5;`}
`;

export const Input = styled.input<{ error: boolean; fullWidth: boolean; disabled?: boolean }>`
  padding: 10px 12px; font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border: 1px solid #e2e8f0; border-radius: 6px; outline: none;
  transition: all 150ms ease; background: white;
  ${({ error }) => error
    ? css`border-color: #fc8181; &:focus { border-color: #f56565; box-shadow: 0 0 0 3px rgba(245,101,101,0.1); }`
    : css`border-color: #e2e8f0; &:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }`
  }
  ${({ fullWidth }) => fullWidth && css`width: 100%;`}
  ${({ disabled }) => disabled && css`opacity: 0.5; cursor: not-allowed; background: #f7fafc;`}
`;

export const Error = styled.span`font-size: 12px; color: #f56565;`;
