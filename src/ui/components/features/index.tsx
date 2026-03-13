import { Card } from '../shared/Card';

export { WebsiteManager } from './WebsiteManager';
export { Settings } from './Settings';

const PlaceholderFeature: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => {
  return (
    <Card>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>{title}</h2>
        <p style={{ color: '#718096', margin: 0 }}>{description}</p>
      </div>
    </Card>
  );
};

export const BatchSubmit: React.FC = () => (
  <PlaceholderFeature
    title="📋 Batch Submit"
    description="Queue multi-site submissions. This workflow still needs task orchestration and retry handling."
  />
);

export const TaskManager: React.FC = () => {
  return (
    <PlaceholderFeature
      title="📝 Task Manager"
      description="Execution history is not wired yet. The next step is persisting job state from discovery and submit flows."
    />
  );
};
