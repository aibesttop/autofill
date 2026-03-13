/**
 * Input Component
 * Reusable input field with label and error handling
 */

import { InputType } from '../../types/ui';
import * as S from './Input.styles';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  type?: InputType;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  error,
  fullWidth = false,
  disabled,
  ...props
}) => {
  return (
    <S.Wrapper fullWidth={fullWidth}>
      {label && <S.Label disabled={disabled}>{label}</S.Label>}
      <S.Input
        type={type}
        error={!!error}
        disabled={disabled}
        fullWidth={fullWidth}
        {...props}
      />
      {error && <S.Error>{error}</S.Error>}
    </S.Wrapper>
  );
};

export default Input;
