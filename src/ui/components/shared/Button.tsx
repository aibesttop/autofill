import type { ButtonVariant, ButtonSize } from '../../types/ui';
import * as S from './Button.styles';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  children,
  ...props
}) => {
  return (
    <S.Button variant={variant} size={size} disabled={disabled || isLoading} fullWidth={fullWidth} {...props}>
      {isLoading ? <S.LoadingSpinner /> : children}
    </S.Button>
  );
};

export default Button;
