import { useAuth } from '../../hooks/useAuth';
import { Button } from '../shared/Button';
import * as S from './LoginScreen.styles';

export const LoginScreen: React.FC = () => {
  const { isAuthenticated, login, isLoading } = useAuth();

  if (isAuthenticated) return null;

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <S.Container>
      <S.Logo src="/icons/128.png" alt="autofill Logo" />
      <S.Title>autofill</S.Title>
      <S.Description>AI-powered SEO directory submission tool</S.Description>
      <Button onClick={handleLogin} isLoading={isLoading} fullWidth size="lg">
        Sign In with autofill
      </Button>
      <S.FooterText>
        By signing in, you agree to our Terms of Service and Privacy Policy
      </S.FooterText>
    </S.Container>
  );
};

export default LoginScreen;
