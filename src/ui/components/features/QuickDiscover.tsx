import { useState } from 'react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { useActiveTab } from '../../hooks/useActiveTab';
import type { FormDetectionResult } from '@content/types';
import * as S from './QuickDiscover.styles';

function canAnalyzeUrl(url?: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDomainLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const QuickDiscover: React.FC = () => {
  const { tab, isLoading: isTabLoading, error: tabError, refresh } = useActiveTab();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FormDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = !!tab?.id && canAnalyzeUrl(tab.url);

  const handleAnalyze = async () => {
    if (!tab?.id || !canAnalyze) {
      setError('Open a regular http/https page before running Quick Discover.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'form:detect' });

      if (!response?.success || !response.result) {
        throw new Error(response?.error || 'No analysis result returned');
      }

      setAnalysis(response.result);
    } catch (nextError) {
      setAnalysis(null);
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to analyze the current page'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <S.Container>
      <S.Header>
        <S.Title>🔍 Quick Discover</S.Title>
        <S.Description>Inspect the active tab and surface the fields needed for submission</S.Description>
      </S.Header>
      <Card>
        <S.Content>
          <S.FieldLabel>Current tab</S.FieldLabel>
          <S.Input
            type="url"
            value={tab?.url || ''}
            readOnly
            placeholder={isTabLoading ? 'Reading active tab...' : 'Open a website to analyze'}
            fullWidth
          />
          {tab?.title ? <S.TabTitle>{tab.title}</S.TabTitle> : null}
          {tab?.url ? <S.TabDomain>{getDomainLabel(tab.url)}</S.TabDomain> : null}
          <S.Actions>
            <Button variant="secondary" fullWidth onClick={() => void refresh()} disabled={isTabLoading}>
              Refresh Tab
            </Button>
            <Button
              fullWidth
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
              disabled={!canAnalyze || isTabLoading}
            >
              Analyze Current Page
            </Button>
          </S.Actions>
          {tabError ? <S.ErrorText>{tabError}</S.ErrorText> : null}
          {error ? <S.ErrorText>{error}</S.ErrorText> : null}
          {!canAnalyze && tab?.url && !isTabLoading ? (
            <S.HelperText>Quick Discover only works on regular website pages.</S.HelperText>
          ) : null}
        </S.Content>
      </Card>
      {analysis ? (
        <S.Results>
          <S.SummaryGrid>
            <S.SummaryCard>
              <S.SummaryValue>{analysis.fieldCount}</S.SummaryValue>
              <S.SummaryLabel>Fields</S.SummaryLabel>
            </S.SummaryCard>
            <S.SummaryCard>
              <S.SummaryValue>{analysis.formCount}</S.SummaryValue>
              <S.SummaryLabel>Forms</S.SummaryLabel>
            </S.SummaryCard>
            <S.SummaryCard>
              <S.SummaryValue>{analysis.submitButtonCount}</S.SummaryValue>
              <S.SummaryLabel>Submit Controls</S.SummaryLabel>
            </S.SummaryCard>
          </S.SummaryGrid>
          <Card>
            <S.ResultsHeader>
              <S.ResultsTitle>Detected Fields</S.ResultsTitle>
              <S.ResultsMeta>{analysis.pageTitle || analysis.pageUrl}</S.ResultsMeta>
            </S.ResultsHeader>
            <S.FieldList>
              {analysis.fields.length > 0 ? (
                analysis.fields.map((field, index) => (
                  <S.FieldItem key={`${field.name || field.label || field.type}-${index}`}>
                    <S.FieldTopRow>
                      <S.FieldName>{field.label || field.name || `Field ${index + 1}`}</S.FieldName>
                      <S.FieldType>{field.type}</S.FieldType>
                    </S.FieldTopRow>
                    <S.FieldMeta>
                      {[
                        field.name ? `name: ${field.name}` : null,
                        field.placeholder ? `placeholder: ${field.placeholder}` : null,
                        field.autocompleteType ? `autocomplete: ${field.autocompleteType}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No extra metadata'}
                    </S.FieldMeta>
                  </S.FieldItem>
                ))
              ) : (
                <S.EmptyState>No visible form fields were detected on this page.</S.EmptyState>
              )}
            </S.FieldList>
          </Card>
        </S.Results>
      ) : null}
    </S.Container>
  );
};
