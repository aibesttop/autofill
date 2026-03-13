import styled from '@emotion/styled';
import { css } from '@emotion/react';

const paddingStyles: Record<'none' | 'sm' | 'md' | 'lg', ReturnType<typeof css>> = {
  none: css``,
  sm: css`padding: 12px;`,
  md: css`padding: 16px;`,
  lg: css`padding: 24px;`,
};

export const Card = styled.div<{ padding: 'none' | 'sm' | 'md' | 'lg'; hover: boolean }>`
  background: white; border-radius: 8px; border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  ${({ padding }) => paddingStyles[padding]}
  ${({ hover }) => hover && css`
    cursor: pointer; transition: all 150ms ease;
    &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: #cbd5e0; }
  `}
`;
