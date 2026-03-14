interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

interface OpenAIRequestMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  name?: string;
  tool_call_id?: string;
}

interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: unknown;
  };
}

interface OpenAIChatRequestBody {
  model: string;
  messages: OpenAIRequestMessage[];
  tools?: OpenAIToolDefinition[];
  tool_choice?:
    | 'required'
    | {
        type?: 'function' | 'tool' | 'any';
        function?: { name?: string };
        name?: string;
      };
}

interface ReplicatePredictionResponse {
  error?: string | null;
  output?: string[] | string;
  metrics?: {
    input_token_count?: number;
    output_token_count?: number;
  };
}

interface ReplicateToolSelection {
  toolName: string;
  arguments: Record<string, unknown>;
}

function isReplicateBaseURL(baseURL: string): boolean {
  try {
    return new URL(baseURL).hostname === 'api.replicate.com';
  } catch {
    return false;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildPredictionEndpoint(config: ProviderConfig): string {
  const [owner, name, ...rest] = config.model.split('/').filter(Boolean);

  if (!owner || !name || rest.length > 0) {
    throw new Error('Replicate model must use owner/name format, for example openai/gpt-4.1-mini.');
  }

  return `${trimTrailingSlash(config.baseURL)}/models/${owner}/${name}/predictions`;
}

function serializeMessages(messages: OpenAIRequestMessage[]): string {
  return messages
    .map((message, index) => {
      const header = `${index + 1}. [${message.role}]`;
      const detail = [message.name ? `name=${message.name}` : null, message.tool_call_id ? `tool_call_id=${message.tool_call_id}` : null]
        .filter(Boolean)
        .join(', ');
      return `${header}${detail ? ` (${detail})` : ''}\n${message.content || ''}`;
    })
    .join('\n\n');
}

function serializeTools(tools: OpenAIToolDefinition[]): string {
  return tools
    .map((tool) =>
      JSON.stringify(
        {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
        null,
        2
      )
    )
    .join('\n\n');
}

function buildToolSelectionPrompt(body: OpenAIChatRequestBody): string {
  const forcedToolName =
    typeof body.tool_choice === 'object'
      ? body.tool_choice.function?.name || body.tool_choice.name
      : undefined;

  return [
    'You are acting as a function-calling adapter for a browser automation agent.',
    'Choose exactly one tool from the provided tool list and return exactly one JSON object.',
    'JSON shape:',
    '{"toolName":"tool_name","arguments":{}}',
    'Rules:',
    '- Use only tools from the provided list.',
    '- Arguments must strictly match the selected tool schema.',
    '- Return JSON only. No markdown.',
    '- If a specific tool is required, you must use it.',
    forcedToolName ? `Required tool: ${forcedToolName}` : 'The model may choose the best tool.',
    '',
    'Conversation:',
    serializeMessages(body.messages),
    '',
    'Tools:',
    serializeTools(body.tools || []),
  ].join('\n');
}

function extractJSONObject(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf('{');

  if (firstBrace === -1) {
    throw new Error('Replicate did not return a JSON tool selection.');
  }

  let depth = 0;
  for (let index = firstBrace; index < candidate.length; index += 1) {
    const character = candidate[index];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(firstBrace, index + 1);
      }
    }
  }

  throw new Error('Replicate returned incomplete JSON for tool selection.');
}

function extractReplicateOutput(response: ReplicatePredictionResponse): string {
  if (typeof response.output === 'string') {
    return response.output.trim();
  }

  if (Array.isArray(response.output)) {
    return response.output.join('').trim();
  }

  return '';
}

function buildOpenAIStyleResponse(
  config: ProviderConfig,
  selection: ReplicateToolSelection,
  usage?: ReplicatePredictionResponse['metrics']
): Response {
  return new Response(
    JSON.stringify({
      id: `chatcmpl-replicate-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: config.model,
      choices: [
        {
          index: 0,
          finish_reason: 'tool_calls',
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: `call_replicate_${Date.now()}`,
                type: 'function',
                function: {
                  name: selection.toolName,
                  arguments: JSON.stringify(selection.arguments),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: usage?.input_token_count ?? 0,
        completion_tokens: usage?.output_token_count ?? 0,
        total_tokens: (usage?.input_token_count ?? 0) + (usage?.output_token_count ?? 0),
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

export function createProviderFetch(config: ProviderConfig): typeof fetch | undefined {
  if (!isReplicateBaseURL(config.baseURL)) {
    return undefined;
  }

  return async (_input, init) => {
    try {
      const body = JSON.parse(String(init?.body || '{}')) as OpenAIChatRequestBody;
      const endpoint = buildPredictionEndpoint(config);
      const predictionResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          Prefer: 'wait=60',
        },
        body: JSON.stringify({
          input: {
            system_prompt:
              'You are a reliable function-calling adapter. Return exactly one JSON object and no markdown.',
            prompt: buildToolSelectionPrompt(body),
            temperature: 0,
            max_completion_tokens: 1600,
          },
        }),
        signal: init?.signal,
      });

      const parsed = (await predictionResponse.json()) as ReplicatePredictionResponse;
      if (!predictionResponse.ok || parsed.error) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                parsed.error?.trim() ||
                `Replicate adapter failed with HTTP ${predictionResponse.status}.`,
            },
          }),
          {
            status: predictionResponse.status || 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const selection = JSON.parse(extractJSONObject(extractReplicateOutput(parsed))) as ReplicateToolSelection;
      return buildOpenAIStyleResponse(config, selection, parsed.metrics);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}
