import type { LLMFieldMappingRequest, LLMFieldMappingResult } from './types';

interface AIFieldMappingResponse {
  success?: boolean;
  result?: LLMFieldMappingResult;
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
