import styled from '@emotion/styled';
import { css } from '@emotion/react';
import type { ButtonVariant, ButtonSize } from '../../types/ui';

const baseStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  &:not(:disabled):active { transform: translateY(0); }
`;

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    &:hover:not(:disabled) { background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%); }
  `,
  secondary: css`
    background: #f7fafc; color: #2d3748; border: 1px solid #e2e8f0;
    &:hover:not(:disabled) { background: #edf2f7; border-color: #cbd5e0; }
  `,
  ghost: css`
    background: transparent; color: #4a5568;
    &:hover:not(:disabled) { background: rgba(0,0,0,0.05); }
  `,
  danger: css`
    background: #fc8181; color: white;
    &:hover:not(:disabled) { background: #f56565; }
  `,
};

const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  sm: css`padding: 6px 12px; font-size: 14px; min-height: 32px;`,
  md: css`padding: 10px 16px; font-size: 14px; min-height: 40px;`,
  lg: css`padding: 14px 20px; font-size: 16px; min-height: 48px;`,
};

export const Button = styled.button<{ variant: ButtonVariant; size: ButtonSize; fullWidth: boolean }>`
  ${baseStyles}
  ${({ variant }) => variantStyles[variant]}
  ${({ size }) => sizeStyles[size]}
  ${({ fullWidth }) => fullWidth && css`width: 100%;`}
`;

export const LoadingSpinner = styled.span`
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
  border-radius: 50%; animation: spin 0.6s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;
