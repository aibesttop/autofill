/**
 * Dashboard Component
 * Main interface showing tabs for different AI features
 */

import { useState } from 'react';
import { QuickFill } from '../features/QuickFill';
import { QuickDiscover } from '../features/QuickDiscover';
import { BatchSubmit, TaskManager, WebsiteManager, Settings } from '../features';
import * as S from './Dashboard.styles';

type Tab = 'quick-fill' | 'quick-discover' | 'batch-submit' | 'tasks' | 'websites' | 'settings';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('quick-fill');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'quick-fill', label: 'Quick Fill', icon: '⚡' },
    { id: 'quick-discover', label: 'Quick Discover', icon: '🔍' },
    { id: 'batch-submit', label: 'Batch Submit', icon: '📋' },
    { id: 'tasks', label: 'Tasks', icon: '📝' },
    { id: 'websites', label: 'Websites', icon: '🌐' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'quick-fill':
        return <QuickFill />;
      case 'quick-discover':
        return <QuickDiscover />;
      case 'batch-submit':
        return <BatchSubmit />;
      case 'tasks':
        return <TaskManager />;
      case 'websites':
        return <WebsiteManager />;
      case 'settings':
        return <Settings />;
      default:
        return <QuickFill />;
    }
  };

  return (
    <S.Container>
      <S.Header>
        <S.Logo src="icons/48.png" alt="autofill" />
        <S.Title>autofill</S.Title>
        <S.Version>v2.1.0</S.Version>
      </S.Header>

      <S.Tabs>
        {tabs.map((tab) => (
          <S.Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <S.TabIcon>{tab.icon}</S.TabIcon>
            <S.TabLabel>{tab.label}</S.TabLabel>
          </S.Tab>
        ))}
      </S.Tabs>

      <S.Content>{renderContent()}</S.Content>
    </S.Container>
  );
};

export default Dashboard;
