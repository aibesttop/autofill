import type { DetectedFormField } from '@content/types';

import { formatOrderedFormSequence } from './form-field-plan';

export interface AgentWebsiteProfileContext {
  id: string;
  name: string;
  url: string;
  category?: string;
  categories?: string[];
  description?: string;
  tags?: string[];
}

function formatList(values: string[] | undefined): string | null {
  if (!values || values.length === 0) {
    return null;
  }

  return values.filter(Boolean).join(', ');
}

export function buildQuickFillAgentTask(input?: {
  url?: string | null;
  title?: string | null;
  detectedFields?: DetectedFormField[];
}): string {
  const orderedFieldSequence = input?.detectedFields
    ? formatOrderedFormSequence(input.detectedFields)
    : [];
  const lines = [
    'You are running Quick Fill in full agent mode on the current tab.',
    '<quick_fill_agent_rules>',
    input?.url ? `- Current page URL: ${input.url}` : null,
    input?.title ? `- Current page title: ${input.title}` : null,
    '- Stay on the current tab. Do not open, switch to, or group other tabs unless the user explicitly asks for that.',
    '- Start by calling ordered_quick_fill_form exactly once.',
    '- ordered_quick_fill_form must perform the entire sequence: scan the page, generate field content, and fill fields one by one in page order.',
    '- Do not call quick_fill_form before ordered_quick_fill_form. Do not start manual clicks or low-level typing before ordered_quick_fill_form returns.',
    '- If ordered_quick_fill_form reports a blocker, stop immediately and summarize that blocker instead of improvising more interactions.',
    '- Follow the ordered fill sequence below in page order. Work on one numbered field at a time.',
    '- Do not jump ahead to a later numbered field while an earlier numbered field is still unresolved unless you have a concrete blocker you can explain.',
    '- After a field is updated, unchanged, or selected, treat it as complete and move to the next numbered field.',
    '- Do not reopen or revisit a completed numbered field unless the page visibly reset it or validation clearly shows it is still missing.',
    '- Preserve existing non-empty text values. Do not clear or overwrite text fields that already contain content unless the user explicitly asks for replacement.',
    '- Continue only while each numbered field is confirmed complete. If one field is not confirmed, do not move on to the next field.',
    '- Do not submit the final form unless the user explicitly instructs you to do so.',
    '- Finish with a concise summary of what you filled, what still needs manual work, and any blockers.',
    '</quick_fill_agent_rules>',
    orderedFieldSequence.length > 0 ? '<ordered_fill_sequence>' : null,
    ...orderedFieldSequence,
    orderedFieldSequence.length > 0 ? '</ordered_fill_sequence>' : null,
  ];

  return lines.filter(Boolean).join('\n');
}

export function buildAgentTaskWithProfileContext(
  task: string,
  profile: AgentWebsiteProfileContext | null | undefined
): string {
  const trimmedTask = task.trim();

  if (!profile) {
    return trimmedTask;
  }

  const lines = [
    '<website_profile_context>',
    'Use the selected website profile below as the source of truth for autofill, directory submission, and listing actions.',
    `- Profile ID: ${profile.id}`,
    `- Website name: ${profile.name}`,
    `- Website URL: ${profile.url}`,
  ];

  if (profile.category) {
    lines.push(`- Primary category: ${profile.category}`);
  }

  const categories = formatList(profile.categories);
  if (categories) {
    lines.push(`- Categories: ${categories}`);
  }

  const tags = formatList(profile.tags);
  if (tags) {
    lines.push(`- Tags: ${tags}`);
  }

  if (profile.description) {
    lines.push(`- Description: ${profile.description}`);
  }

  lines.push('- Prefer these values over guessing when filling fields or selecting categories/tags.');
  lines.push('- If a required field is missing, infer conservatively from this profile only.');
  lines.push('- Do not override explicit user instructions with profile defaults.');
  lines.push('</website_profile_context>');

  return `${trimmedTask}\n\n${lines.join('\n')}`;
}
