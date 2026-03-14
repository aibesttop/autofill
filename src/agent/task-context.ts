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
}): string {
  const lines = [
    'You are running Quick Fill in full agent mode on the current tab.',
    '<quick_fill_agent_rules>',
    input?.url ? `- Current page URL: ${input.url}` : null,
    input?.title ? `- Current page title: ${input.title}` : null,
    '- Stay on the current tab. Do not open, switch to, or group other tabs unless the user explicitly asks for that.',
    '- Start by observing the current page state before acting.',
    '- Prefer an iterative observe -> act -> observe loop. Re-check the page after every interaction that changes the UI.',
    '- You may use quick_discover_form for a fast structural scan.',
    '- You may use quick_fill_form as a first pass on standard fields, but you must immediately inspect the page again and continue handling any dynamic UI that remains.',
    '- Handle dynamic controls as a core requirement: dropdowns, comboboxes, autocomplete popovers, searchable category pickers, checkbox lists, token/tag inputs, modals, and multi-step form sections.',
    '- For categories and tags, type into picker search inputs when available, scroll option lists when needed, and select matching items one by one.',
    '- Continue until there are no obvious required or high-value fields left to fill, or you hit a concrete blocker that you can explain.',
    '- Do not submit the final form unless the user explicitly instructs you to do so.',
    '- Finish with a concise summary of what you filled, what still needs manual work, and any blockers.',
    '</quick_fill_agent_rules>',
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
