import type {
  LLMFieldMappingRequest,
  LLMFieldMappingResult,
  LLMObservedOptionMatchRequest,
  LLMObservedOptionMatchResult,
  LLMPageAutofillPlanRequest,
  LLMPageAutofillPlanResult,
} from './types';

interface AIFieldMappingResponse {
  success?: boolean;
  result?: LLMFieldMappingResult;
  error?: string;
}

interface AIPageAutofillResponse {
  success?: boolean;
  result?: LLMPageAutofillPlanResult;
  error?: string;
}

interface AIObservedOptionMatchResponse {
  success?: boolean;
  result?: LLMObservedOptionMatchResult;
  error?: string;
}

export async function requestLLMFieldMapping(
  request: LLMFieldMappingRequest
): Promise<LLMFieldMappingResult> {
  const response = (await chrome.runtime.sendMessage({
    type: 'ai:autofill-plan',
    payload: request,
  })) as AIFieldMappingResponse;

  if (!response?.success || !response.result) {
    throw new Error(response?.error || 'No AI autofill plan was returned.');
  }

  return response.result;
}

export async function requestLLMPageAutofillPlan(
  request: LLMPageAutofillPlanRequest
): Promise<LLMPageAutofillPlanResult> {
  const response = (await chrome.runtime.sendMessage({
    type: 'ai:page-autofill-actions',
    payload: request,
  })) as AIPageAutofillResponse;

  if (!response?.success || !response.result) {
    throw new Error(response?.error || 'No AI page action plan was returned.');
  }

  return response.result;
}

export async function requestLLMObservedOptionMatch(
  request: LLMObservedOptionMatchRequest
): Promise<LLMObservedOptionMatchResult> {
  const response = (await chrome.runtime.sendMessage({
    type: 'ai:observed-option-match',
    payload: request,
  })) as AIObservedOptionMatchResponse;

  if (!response?.success || !response.result) {
    throw new Error(response?.error || 'No constrained option match was returned.');
  }

  return response.result;
}
