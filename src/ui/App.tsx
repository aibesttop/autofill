/**
 * Root App Component
 * Main application entry point with auth guard
 */

import { useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/auth/LoginScreen';
import { Dashboard } from './components/dashboard/Dashboard';
import * as S from './App.styles';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <S.Container>
        <S.Spinner />
      </S.Container>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <S.Container>
      <Dashboard />
    </S.Container>
  );
}

export default App;
