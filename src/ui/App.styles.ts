/**
 * App Styles
 */

import styled from '@emotion/styled';

export const Container = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f7fafc;
  color: #1a202c;
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  margin: 40px auto;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
