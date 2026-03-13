import * as S from './Card.styles';

export interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, padding = 'md', hover = false, onClick }) => {
  return (
    <S.Card padding={padding} hover={hover} onClick={onClick}>
      {children}
    </S.Card>
  );
};

export default Card;
