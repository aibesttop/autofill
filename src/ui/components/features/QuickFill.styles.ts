import styled from '@emotion/styled';
import { css } from '@emotion/react';

export const Container = styled.div`max-width: 800px; margin: 0 auto;`;
export const Header = styled.div`margin-bottom: 24px;`;
export const Title = styled.h2`font-size: 24px; font-weight: 700; color: #1a202c; margin: 0 0 8px 0;`;
export const Description = styled.p`font-size: 14px; color: #718096; margin: 0;`;
export const Section = styled.div`margin-bottom: 24px; &:last-child { margin-bottom: 0; }`;
export const SectionTitle = styled.h3`font-size: 16px; font-weight: 600; color: #2d3748; margin: 0 0 16px 0;`;
export const List = styled.div`display: flex; flex-direction: column; gap: 12px;`;
export const ListItem = styled.div`display: flex; align-items: center; gap: 12px;`;
export const ListIcon = styled.span`font-size: 20px;`;
export const ListText = styled.span`font-size: 14px; color: #4a5568;`;
export const Setting = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid #e2e8f0;
  &:last-child { border-bottom: none; }
`;
export const SettingLabel = styled.span`font-size: 14px; color: #2d3748;`;
export const Toggle = styled.input`
  width: 44px; height: 24px; appearance: none; background: #cbd5e0;
  border-radius: 12px; position: relative; cursor: pointer; transition: background 150ms ease;
  &:checked { background: #667eea; }
  &::before {
    content: ''; position: absolute; width: 20px; height: 20px;
    background: white; border-radius: 50%; top: 2px; left: 2px;
    transition: transform 150ms ease;
  }
  &:checked::before { transform: translateX(20px); }
`;
export const Actions = styled.div`display: flex; gap: 12px; margin-top: 24px;`;
