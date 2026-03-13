import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Container = styled.div`max-width: 800px; margin: 0 auto;`;
export const Header = styled.div`margin-bottom: 24px;`;
export const Title = styled.h2`margin: 0 0 8px 0; font-size: 24px; color: #1a202c;`;
export const Description = styled.p`margin: 0; font-size: 14px; color: #718096;`;
export const SectionGroup = styled.div`display: flex; flex-direction: column; gap: 16px;`;
export const Section = styled.div`display: flex; flex-direction: column; gap: 8px;`;
export const SectionTitle = styled.h3`margin: 0 0 8px 0; font-size: 16px; color: #2d3748;`;
export const Setting = styled.div<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #edf2f7;
  &:last-child { border-bottom: none; }
  ${({ disabled }) => disabled && css`opacity: 0.6;`}
`;
export const SettingCopy = styled.div`display: flex; flex-direction: column; gap: 4px; max-width: 420px;`;
export const SettingLabel = styled.span`font-size: 14px; font-weight: 600; color: #2d3748;`;
export const SettingDescription = styled.span`font-size: 12px; line-height: 1.45; color: #718096;`;
export const Toggle = styled.input`
  width: 44px;
  height: 24px;
  appearance: none;
  background: #cbd5e0;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 150ms ease;
  &:checked { background: #667eea; }
  &:disabled { cursor: not-allowed; opacity: 0.6; }
  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 150ms ease;
  }
  &:checked::before { transform: translateX(20px); }
`;
export const AccountRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
`;
export const AccountLabel = styled.span`font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #718096;`;
export const AccountValue = styled.span`font-size: 14px; font-weight: 600; color: #2d3748;`;
export const Actions = styled.div`display: flex; gap: 12px; margin-top: 8px;`;
export const ErrorText = styled.p`margin: 16px 0 0 0; font-size: 13px; color: #e53e3e;`;
