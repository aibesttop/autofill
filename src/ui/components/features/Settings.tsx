import { useAuth } from '../../hooks/useAuth';
import { useExtensionSettings } from '../../hooks/useExtensionSettings';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import * as S from './Settings.styles';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    settings,
    isLoading,
    error,
    refresh,
    togglePlugin,
    toggleContextMenu,
    toggleAutoDetect,
    toggleFloatingButton,
  } = useExtensionSettings();

  return (
    <S.Container>
      <S.Header>
        <S.Title>⚙️ Settings</S.Title>
        <S.Description>Configure extension-wide behavior and review your authenticated session</S.Description>
      </S.Header>

      <S.SectionGroup>
        <Card>
          <S.Section>
            <S.SectionTitle>Extension Controls</S.SectionTitle>
            <S.Setting>
              <S.SettingCopy>
                <S.SettingLabel>Plugin enabled</S.SettingLabel>
                <S.SettingDescription>Pause or resume autofill across all supported tabs.</S.SettingDescription>
              </S.SettingCopy>
              <S.Toggle
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => void togglePlugin(event.target.checked)}
                disabled={isLoading}
              />
            </S.Setting>
            <S.Setting disabled={!settings.enabled}>
              <S.SettingCopy>
                <S.SettingLabel>Context menu</S.SettingLabel>
                <S.SettingDescription>Show the right-click shortcut that opens the autofill panel.</S.SettingDescription>
              </S.SettingCopy>
              <S.Toggle
                type="checkbox"
                checked={settings.contextMenu}
                onChange={(event) => void toggleContextMenu(event.target.checked)}
                disabled={isLoading || !settings.enabled}
              />
            </S.Setting>
          </S.Section>
        </Card>

        <Card>
          <S.Section>
            <S.SectionTitle>Automation Preferences</S.SectionTitle>
            <S.Setting disabled={!settings.enabled}>
              <S.SettingCopy>
                <S.SettingLabel>Auto-detect forms</S.SettingLabel>
                <S.SettingDescription>Inspect supported pages as soon as they finish loading.</S.SettingDescription>
              </S.SettingCopy>
              <S.Toggle
                type="checkbox"
                checked={settings.autoDetect}
                onChange={(event) => void toggleAutoDetect(event.target.checked)}
                disabled={isLoading || !settings.enabled}
              />
            </S.Setting>
            <S.Setting disabled={!settings.enabled}>
              <S.SettingCopy>
                <S.SettingLabel>Floating button preference</S.SettingLabel>
                <S.SettingDescription>Persist whether page-level entry points are shown when available.</S.SettingDescription>
              </S.SettingCopy>
              <S.Toggle
                type="checkbox"
                checked={settings.showFloatingButton}
                onChange={(event) => void toggleFloatingButton(event.target.checked)}
                disabled={isLoading || !settings.enabled}
              />
            </S.Setting>
          </S.Section>
        </Card>

        <Card>
          <S.Section>
            <S.SectionTitle>Account</S.SectionTitle>
            <S.AccountRow>
              <S.AccountLabel>Signed in as</S.AccountLabel>
              <S.AccountValue>{user?.id || 'Unknown client'}</S.AccountValue>
            </S.AccountRow>
            <S.Actions>
              <Button variant="secondary" onClick={() => void refresh()} disabled={isLoading}>
                Refresh Settings
              </Button>
              <Button variant="ghost" onClick={() => void logout()}>
                Sign Out
              </Button>
            </S.Actions>
          </S.Section>
        </Card>
      </S.SectionGroup>

      {error ? <S.ErrorText>{error}</S.ErrorText> : null}
    </S.Container>
  );
};

export default Settings;
