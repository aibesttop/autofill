/**
 * Quick Fill Feature
 * AI-powered form auto-fill
 */

import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import * as S from './QuickFill.styles';

export const QuickFill: React.FC = () => {
  return (
    <S.Container>
      <S.Header>
        <S.Title>⚡ Quick Fill</S.Title>
        <S.Description>
          Automatically fill forms with AI-powered suggestions
        </S.Description>
      </S.Header>

      <Card>
        <S.Section>
          <S.SectionTitle>How it works</S.SectionTitle>
          <S.List>
            <S.ListItem>
              <S.ListIcon>1️⃣</S.ListIcon>
              <S.ListText>Navigate to a form on any website</S.ListText>
            </S.ListItem>
            <S.ListItem>
              <S.ListIcon>2️⃣</S.ListIcon>
              <S.ListText>Click the AI fill button that appears</S.ListText>
            </S.ListItem>
            <S.ListItem>
              <S.ListIcon>3️⃣</S.ListIcon>
              <S.ListText>AI analyzes the form and fills it automatically</S.ListText>
            </S.ListItem>
          </S.List>
        </S.Section>

        <S.Section>
          <S.SectionTitle>Settings</S.SectionTitle>
          <S.Setting>
            <S.SettingLabel>Auto-detect forms</S.SettingLabel>
            <S.Toggle type="checkbox" defaultChecked={false} />
          </S.Setting>
          <S.Setting>
            <S.SettingLabel>Show floating button</S.SettingLabel>
            <S.Toggle type="checkbox" defaultChecked={true} />
          </S.Setting>
        </S.Section>

        <S.Actions>
          <Button fullWidth>Learn More</Button>
        </S.Actions>
      </Card>
    </S.Container>
  );
};

export default QuickFill;
