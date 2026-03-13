/**
 * Login Screen Styles
 */

import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 32px 24px;
  text-align: center;
`;

export const Logo = styled.img`
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
`;

export const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 8px;
`;

export const Description = styled.p`
  font-size: 14px;
  color: #718096;
  margin-bottom: 32px;
`;

export const FooterText = styled.p`
  font-size: 12px;
  color: #a0aec0;
  margin-top: 24px;
  max-width: 300px;
`;
