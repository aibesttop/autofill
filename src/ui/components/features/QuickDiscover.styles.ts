import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Container = styled.div`max-width: 800px; margin: 0 auto;`;
export const Header = styled.div`margin-bottom: 24px;`;
export const Title = styled.h2`font-size: 24px; font-weight: 700; color: #1a202c; margin: 0 0 8px 0;`;
export const Description = styled.p`font-size: 14px; color: #718096; margin: 0;`;
export const Content = styled.div`display: flex; flex-direction: column; gap: 16px;`;
export const FieldLabel = styled.span`font-size: 13px; font-weight: 600; color: #2d3748;`;
export const Input = styled.input<{ fullWidth: boolean }>`
  padding: 12px; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none;
  color: #2d3748; background: #f8fafc;
  &:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
  ${({ fullWidth }) => fullWidth && css`width: 100%;`}
`;
export const TabTitle = styled.p`margin: -6px 0 0 0; font-size: 13px; color: #2d3748; font-weight: 600;`;
export const TabDomain = styled.p`margin: -10px 0 0 0; font-size: 12px; color: #718096;`;
export const Actions = styled.div`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;`;
export const HelperText = styled.p`margin: 0; font-size: 12px; color: #718096;`;
export const ErrorText = styled.p`margin: 0; font-size: 13px; color: #e53e3e;`;
export const Results = styled.div`display: flex; flex-direction: column; gap: 16px; margin-top: 16px;`;
export const SummaryGrid = styled.div`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;`;
export const SummaryCard = styled.div`
  padding: 16px;
  border-radius: 10px;
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
`;
export const SummaryValue = styled.div`font-size: 24px; font-weight: 700; color: #1a202c;`;
export const SummaryLabel = styled.div`font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #718096;`;
export const ResultsHeader = styled.div`display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;`;
export const ResultsTitle = styled.h3`margin: 0; font-size: 16px; color: #1a202c;`;
export const ResultsMeta = styled.p`margin: 0; font-size: 12px; color: #718096;`;
export const FieldList = styled.div`display: flex; flex-direction: column; gap: 12px;`;
export const FieldItem = styled.div`
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
`;
export const FieldTopRow = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;`;
export const FieldName = styled.div`font-size: 14px; font-weight: 600; color: #2d3748;`;
export const FieldType = styled.div`
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(102, 126, 234, 0.12);
  color: #5a67d8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;
export const FieldMeta = styled.div`font-size: 12px; line-height: 1.5; color: #718096;`;
export const EmptyState = styled.div`
  padding: 24px 16px;
  border-radius: 8px;
  background: #f8fafc;
  color: #718096;
  text-align: center;
  font-size: 13px;
`;
