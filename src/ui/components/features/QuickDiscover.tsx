import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import * as S from './QuickDiscover.styles';

export const QuickDiscover: React.FC = () => {
  return (
    <S.Container>
      <S.Header>
        <S.Title>🔍 Quick Discover</S.Title>
        <S.Description>Analyze web pages for submission opportunities</S.Description>
      </S.Header>
      <Card>
        <S.Content>
          <S.Input type="url" placeholder="Enter URL to analyze..." fullWidth />
          <Button fullWidth>Analyze Page</Button>
        </S.Content>
      </Card>
    </S.Container>
  );
};
