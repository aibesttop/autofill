import type { DetectedFormField } from '@content/types';

export type OrderedFieldPurpose =
  | 'url'
  | 'name'
  | 'description'
  | 'email'
  | 'category'
  | 'tags'
  | 'other';

export interface OrderedFormField {
  order: number;
  purpose: OrderedFieldPurpose;
  hint: string;
  type: string;
}

function normalizeText(value: string | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getFieldDescriptor(field: DetectedFormField): string {
  return [field.label, field.name, field.placeholder, field.autocompleteType, field.type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFieldHint(field: DetectedFormField): string {
  return [field.label, field.name, field.placeholder].find((value) => normalizeText(value).length > 0) || 'Unnamed field';
}

export function inferOrderedFieldPurpose(field: DetectedFormField): OrderedFieldPurpose {
  const descriptor = getFieldDescriptor(field);

  if (/categor|industr|niche|sector|type|platform/.test(descriptor)) {
    return 'category';
  }

  if (/tag|keyword|topic/.test(descriptor)) {
    return 'tags';
  }

  if (/website|homepage|domain|url|link/.test(descriptor)) {
    return 'url';
  }

  if (/name|title|company|business|project|brand|product/.test(descriptor)) {
    return 'name';
  }

  if (/description|about|summary|bio|details|message|overview|content/.test(descriptor)) {
    return 'description';
  }

  if (/email/.test(descriptor)) {
    return 'email';
  }

  return 'other';
}

export function getOrderedFormFields(fields: DetectedFormField[]): OrderedFormField[] {
  const seen = new Set<string>();
  const orderedFields: OrderedFormField[] = [];

  fields.forEach((field) => {
    const hint = getFieldHint(field);
    const purpose = inferOrderedFieldPurpose(field);
    const signature = `${normalizeText(hint)}|${purpose}|${normalizeText(field.type)}`;

    if (!normalizeText(hint) || seen.has(signature)) {
      return;
    }

    seen.add(signature);
    orderedFields.push({
      order: orderedFields.length + 1,
      purpose,
      hint,
      type: field.type || 'text',
    });
  });

  return orderedFields;
}

export function formatOrderedFormSequence(fields: DetectedFormField[]): string[] {
  return getOrderedFormFields(fields).map((field) => {
    const purposeLabel = field.purpose === 'other' ? field.type : field.purpose;
    return `${field.order}. ${field.hint} [${purposeLabel}/${field.type}]`;
  });
}
