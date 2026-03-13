import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { useExtensionSettings } from '../../hooks/useExtensionSettings';
import * as S from './QuickFill.styles';

export const QuickFill: React.FC = () => {
  const {
    settings,
    isLoading,
    error,
    refresh,
    togglePlugin,
    toggleAutoDetect,
    toggleFloatingButton,
  } = useExtensionSettings();

  return (
    <S.Container>
      <S.Header>
        <S.Title>⚡ Quick Fill</S.Title>
        <S.Description>Automatically fill forms with AI-powered suggestions</S.Description>
      </S.Header>
      <Card>
        <S.Section>
          <S.SectionTitle>Automation Status</S.SectionTitle>
          <S.StatusRow>
            <S.StatusBadge active={settings.enabled}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </S.StatusBadge>
            <S.StatusText>
              {settings.enabled
                ? 'Quick Fill can inspect supported pages and keep your preferences synchronized.'
                : 'The extension is paused across supported tabs until you turn it back on.'}
            </S.StatusText>
          </S.StatusRow>
        </S.Section>
        <S.Section>
          <S.SectionTitle>How it works</S.SectionTitle>
          <S.List>
            <S.ListItem>
              <S.ListIcon>1️⃣</S.ListIcon>
              <S.ListText>Open a page with a submission or contact form</S.ListText>
            </S.ListItem>
            <S.ListItem>
              <S.ListIcon>2️⃣</S.ListIcon>
              <S.ListText>Keep detection enabled so the extension can inspect the page structure</S.ListText>
            </S.ListItem>
            <S.ListItem>
              <S.ListIcon>3️⃣</S.ListIcon>
              <S.ListText>Use Quick Discover to review detected fields before deeper automation</S.ListText>
            </S.ListItem>
          </S.List>
        </S.Section>
        <S.Section>
          <S.SectionTitle>Quick Fill Controls</S.SectionTitle>
          <S.Setting>
            <S.SettingCopy>
              <S.SettingLabel>Enable autofill</S.SettingLabel>
              <S.SettingDescription>Turn the extension on or off in every supported tab.</S.SettingDescription>
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
              <S.SettingLabel>Auto-detect forms</S.SettingLabel>
              <S.SettingDescription>
                Scan the current page for eligible inputs when the extension is active.
              </S.SettingDescription>
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
              <S.SettingLabel>Show floating button</S.SettingLabel>
              <S.SettingDescription>
                Save whether page-level entry points should be visible on supported pages.
              </S.SettingDescription>
            </S.SettingCopy>
            <S.Toggle
              type="checkbox"
              checked={settings.showFloatingButton}
              onChange={(event) => void toggleFloatingButton(event.target.checked)}
              disabled={isLoading || !settings.enabled}
            />
          </S.Setting>
        </S.Section>
        {isLoading ? <S.LoadingText>Loading current extension preferences...</S.LoadingText> : null}
        {error ? <S.ErrorText>{error}</S.ErrorText> : null}
        <S.Actions>
          <Button fullWidth variant="secondary" onClick={() => void refresh()} disabled={isLoading}>
            Refresh State
          </Button>
        </S.Actions>
      </Card>
    </S.Container>
  );
};

export default QuickFill;
