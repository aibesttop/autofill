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
