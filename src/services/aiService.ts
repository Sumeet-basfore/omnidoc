import { AIMessage, AIProviderConfig, AIPersona } from '../types/ai';
import { composeSystemPrompt, resolveTier, effectiveTemperature } from './personas';
import { WorkspaceRules } from '../types/workspace';

export interface StreamUsage {
  in: number;
  out: number;
}

export interface DocumentContextInput {
  name: string;
  format: string;
  content: string;
  selectedText?: string;
}

export type WireMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export function buildFullMessages(
  messages: AIMessage[],
  persona: AIPersona,
  documentContext?: DocumentContextInput,
  opts: { config?: AIProviderConfig; customInstructions?: string; workspaceRules?: WorkspaceRules } = {}
): WireMessage[] {
  const smallModel =
    resolveTier(opts.config?.modelTier, opts.config?.model || '') === 'small';
  const system = composeSystemPrompt(persona, {
    smallModel,
    customInstructions: opts.customInstructions,
    workspaceRules: opts.workspaceRules
  });
  const full: WireMessage[] = [{ role: 'system', content: system }];

  if (documentContext) {
    let ctx = `[ACTIVE DOCUMENT CONTEXT]\nDocument: "${documentContext.name}" (${documentContext.format.toUpperCase()})\n`;
    if (documentContext.selectedText) {
      ctx += `Currently Selected Text in Editor:\n"""\n${documentContext.selectedText}\n"""\n`;
    }
    const truncatedContent = documentContext.content.slice(0, 15000);
    ctx += `Document Content Preview (first 15k chars):\n"""\n${truncatedContent}\n"""`;
    full.push({ role: 'system', content: ctx });
  }

  for (const m of messages) {
    if (m.kind === 'divider') continue;
    full.push({ role: m.role, content: m.content });
  }
  return full;
}

export function isAbortError(err: any): boolean {
  return (
    err?.name === 'AbortError' ||
    (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError')
  );
}

const TIMEOUT_MS = 90000;

export { TIMEOUT_MS };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Link a user signal with a timeout into one AbortSignal. */
export function linkedSignal(
  signal: AbortSignal | undefined,
  ms = TIMEOUT_MS
): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('AI request timed out after 90s.')), ms);
  const onAbort = () => {
    clearTimeout(timer);
    try {
      ctrl.abort((signal as any)?.reason);
    } catch {
      ctrl.abort();
    }
  };
  if (!signal) return { signal: ctrl.signal, done: () => clearTimeout(timer) };
  if (signal.aborted) {
    clearTimeout(timer);
    ctrl.abort((signal as any)?.reason);
  } else {
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    done: () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  };
}

const RETRY_DELAYS = [1000, 3000];

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** fetch with retry on 429/5xx + network errors (never on 4xx). */
export async function fetchWithRetry(url: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal });
      if (res.ok || !isRetryableStatus(res.status) || attempt === RETRY_DELAYS.length) return res;
      await sleep(RETRY_DELAYS[attempt]);
    } catch (err: any) {
      if (isAbortError(err) || signal.aborted) throw err;
      lastErr = err;
      if (attempt === RETRY_DELAYS.length) break;
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
  throw lastErr || new Error('Network request failed');
}

/** Yield parsed `data:` payloads from an SSE response body. */
async function* sseObjects(res: Response): AsyncGenerator<any> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n');
      buf = parts.pop()!;
      for (const line of parts) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          yield JSON.parse(payload);
        } catch {
          // Skip malformed chunks (partial JSON); stream continues
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface StreamArgs {
  messages: AIMessage[];
  config: AIProviderConfig;
  apiKey: string;
  persona?: AIPersona;
  documentContext?: DocumentContextInput;
  signal: AbortSignal;
  customInstructions?: string;
  workspaceRules?: WorkspaceRules;
  onToken: (t: string) => void;
}

export async function streamAI(args: StreamArgs): Promise<{ text: string; usage?: StreamUsage }> {
  const { messages, config, apiKey } = args;
  const persona = args.persona ?? 'friend';
  const fullMessages = buildFullMessages(messages, persona, args.documentContext, {
    config,
    customInstructions: args.customInstructions,
    workspaceRules: args.workspaceRules
  });

  switch (config.id) {
    case 'gemini':
      return await streamGemini(fullMessages, config, apiKey, persona, args.signal, args.onToken);
    case 'anthropic':
      return await streamAnthropic(fullMessages, config, apiKey, persona, args.signal, args.onToken);
    case 'openai':
    case 'openrouter':
    case 'custom':
      return await streamOpenAICompat(fullMessages, config, apiKey, persona, args.signal, args.onToken);
    default:
      throw new Error(`Unsupported AI provider: ${config.id}`);
  }
}

async function streamGemini(
  messages: WireMessage[],
  config: AIProviderConfig,
  apiKey: string,
  persona: AIPersona,
  userSignal: AbortSignal,
  onToken: (t: string) => void
): Promise<{ text: string; usage?: StreamUsage }> {
  if (!apiKey) throw new Error('Gemini API key is not configured. Please add it in Settings.');

  const rawModel = (config.model || 'gemini-2.0-flash').trim();
  const model = rawModel.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Separate system messages into systemInstruction
  const systemTexts: string[] = [];
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of messages) {
    if (m.role === 'system') {
      if (m.content.trim()) systemTexts.push(m.content.trim());
    } else {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const text = m.content;
      if (!text.trim()) continue;

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts.push({ text });
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }
  }

  // Gemini requires the conversation to start with a user message
  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Reply with the single word "READY".' }] });
  }

  const reqBody: any = {
    contents,
    generationConfig: { temperature: effectiveTemperature(config.temperature, persona) }
  };

  if (systemTexts.length > 0) {
    reqBody.systemInstruction = {
      parts: [{ text: systemTexts.join('\n\n') }]
    };
  }

  const { signal, done } = linkedSignal(userSignal);
  try {
    const res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      },
      signal
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.error?.message || res.statusText;
      if (res.status === 404) {
        throw new Error(
          `Gemini API error (404): '${model}' not found for v1beta. Please select 'gemini-2.0-flash' or 'gemini-1.5-flash-latest' from the Model dropdown in Settings.`
        );
      }
      throw new Error(`Gemini API error (${res.status}): ${msg}`);
    }

    let text = '';
    const usage: StreamUsage = { in: 0, out: 0 };
    for await (const data of sseObjects(res)) {
      const parts = data.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (typeof p?.text === 'string' && p.text) {
            text += p.text;
            onToken(p.text);
          }
        }
      }
      const meta = data.usageMetadata;
      if (meta) {
        if (typeof meta.promptTokenCount === 'number') usage.in = meta.promptTokenCount;
        if (typeof meta.candidatesTokenCount === 'number') usage.out = meta.candidatesTokenCount;
      }
    }
    if (!text) throw new Error('Received empty response from Gemini');
    return { text, usage: usage.in || usage.out ? usage : undefined };
  } catch (err: any) {
    if (isAbortError(err) || userSignal.aborted) throw err;
    if (argsIsTimeout(err)) throw err;
    if (err instanceof TypeError) throw new Error(`Network error reaching Gemini: ${err.message}`);
    throw err;
  } finally {
    done();
  }
}

function argsIsTimeout(err: any): boolean {
  return err instanceof Error && /timed out/.test(err.message);
}

async function streamAnthropic(
  messages: WireMessage[],
  config: AIProviderConfig,
  apiKey: string,
  persona: AIPersona,
  userSignal: AbortSignal,
  onToken: (t: string) => void
): Promise<{ text: string; usage?: StreamUsage }> {
  if (!apiKey) throw new Error('Anthropic API key is not configured. Please add it in Settings.');

  const systemMessage = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

  const { signal, done } = linkedSignal(userSignal);
  try {
    const res = await fetchWithRetry(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: systemMessage,
          messages: chatMessages,
          temperature: effectiveTemperature(config.temperature, persona),
          stream: true
        })
      },
      signal
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Anthropic API error (${res.status}): ${errorData.error?.message || res.statusText}`);
    }

    let text = '';
    const usage: StreamUsage = { in: 0, out: 0 };
    for await (const data of sseObjects(res)) {
      const type = data.type;
      if (type === 'message_start' && data.message?.usage) {
        if (typeof data.message.usage.input_tokens === 'number') usage.in = data.message.usage.input_tokens;
      } else if (type === 'content_block_delta' && typeof data.delta?.text === 'string') {
        text += data.delta.text;
        onToken(data.delta.text);
      } else if (type === 'message_delta' && data.usage) {
        if (typeof data.usage.output_tokens === 'number') usage.out = data.usage.output_tokens;
      }
    }
    return { text, usage: usage.in || usage.out ? usage : undefined };
  } catch (err: any) {
    if (isAbortError(err) || userSignal.aborted) throw err;
    if (argsIsTimeout(err)) throw err;
    if (err instanceof TypeError) throw new Error(`Network error reaching Anthropic: ${err.message}`);
    throw err;
  } finally {
    done();
  }
}

async function streamOpenAICompat(
  messages: WireMessage[],
  config: AIProviderConfig,
  apiKey: string,
  persona: AIPersona,
  userSignal: AbortSignal,
  onToken: (t: string) => void
): Promise<{ text: string; usage?: StreamUsage }> {
  let baseUrl = 'https://api.openai.com/v1';
  let defaultModel = 'gpt-4o-mini';

  if (config.id === 'openrouter') {
    baseUrl = 'https://openrouter.ai/api/v1';
    defaultModel = 'anthropic/claude-3.5-sonnet';
  } else if (config.id === 'custom') {
    // Normalize local base URL (LM Studio / Ollama / llama.cpp / custom)
    let raw = (config.baseUrl || 'http://localhost:1234/v1').trim().replace(/\/+$/, '');
    if (!/\/v1$/.test(raw)) raw += '/v1';
    baseUrl = raw;
    defaultModel =
      config.model ||
      (raw.includes(':1234') ? 'local-model' : raw.includes(':8080') ? 'default-model' : 'llama3.2');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (config.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/omnidoc/omnidoc-studio';
    headers['X-Title'] = 'OmniDoc Studio';
  }

  const url = `${baseUrl}/chat/completions`;
  const { signal, done } = linkedSignal(userSignal, 90000);
  const timerDone = done;
  try {
    let res: Response;
    try {
      res = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: config.model || defaultModel,
            messages,
            temperature: effectiveTemperature(config.temperature, persona),
            stream: true,
            // Usage reporting; only OpenAI-family APIs understand this —
            // Ollama / LM Studio / proxies may 400 on unknown fields.
            ...(config.id === 'openai' || config.id === 'openrouter'
              ? { stream_options: { include_usage: true } }
              : {})
          })
        },
        signal
      );
    } catch (err: any) {
      if (isAbortError(err) || userSignal.aborted) throw err;
      if (argsIsTimeout(err)) throw err;
      if (config.id === 'custom') {
        const clean = baseUrl.toLowerCase();
        if (clean.includes(':1234')) {
          throw new Error(
            `Cannot reach LM Studio at ${baseUrl}. Ensure the Local Server is started in LM Studio on port 1234 and a model is loaded. (${err?.message || 'connection failed'})`
          );
        }
        if (clean.includes(':8080')) {
          throw new Error(
            `Cannot reach llama.cpp server at ${baseUrl}. Ensure llama-server is running on port 8080 (e.g. \`llama-server -m <model.gguf> --port 8080\`). (${err?.message || 'connection failed'})`
          );
        }
        if (clean.includes(':11434')) {
          throw new Error(
            `Cannot reach Ollama at ${baseUrl}. Is Ollama running? Try: \`ollama serve\` then \`ollama pull ${config.model || defaultModel}\`. (${err?.message || 'connection failed'})`
          );
        }
        throw new Error(
          `Cannot reach local inference server at ${baseUrl}. Ensure your server (LM Studio, Ollama, or llama.cpp) is running. (${err?.message || 'connection failed'})`
        );
      }
      throw new Error(`Network error reaching ${baseUrl}: ${err?.message || err}`);
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const detail =
        errorData.error?.message ||
        (typeof errorData.error === 'string' ? errorData.error : '') ||
        res.statusText;
      if (config.id === 'custom' && res.status === 404) {
        const clean = baseUrl.toLowerCase();
        if (clean.includes(':1234')) {
          throw new Error(
            `Model "${config.model || defaultModel}" not found in LM Studio at ${baseUrl}. In LM Studio, load your model in the top bar or choose a detected model in Settings. (${detail})`
          );
        }
        if (clean.includes(':8080')) {
          throw new Error(
            `Model "${config.model || defaultModel}" not found at llama.cpp server (${baseUrl}). Ensure llama-server is running with this model. (${detail})`
          );
        }
        throw new Error(
          `Local model "${config.model || defaultModel}" not found at ${baseUrl}. Run: \`ollama pull ${config.model || defaultModel}\`. (${detail})`
        );
      }
      throw new Error(`AI API error (${res.status}): ${detail}`);
    }

    let text = '';
    const usage: StreamUsage = { in: 0, out: 0 };
    for await (const data of sseObjects(res)) {
      const delta = data.choices?.[0]?.delta;
      if (typeof delta?.content === 'string' && delta.content) {
        text += delta.content;
        onToken(delta.content);
      }
      // Ollama OpenAI-compat final chunk carries eval counts instead of usage
      if (typeof data.prompt_eval_count === 'number') usage.in = data.prompt_eval_count;
      if (typeof data.eval_count === 'number') usage.out = data.eval_count;
      if (data.usage) {
        if (typeof data.usage.prompt_tokens === 'number') usage.in = data.usage.prompt_tokens;
        if (typeof data.usage.completion_tokens === 'number') usage.out = data.usage.completion_tokens;
      }
    }
    if (text === '') throw new Error('Received empty response from provider');
    return { text, usage: usage.in || usage.out ? usage : undefined };
  } finally {
    timerDone();
  }
}

/** Non-streaming call (accumulates stream). Kept for research/key-test paths. */
export async function callAI(
  messages: AIMessage[],
  config: AIProviderConfig,
  apiKey: string,
  persona: AIPersona = 'friend',
  documentContext?: { name: string; format: string; content: string; selectedText?: string },
  customInstructions?: string,
  workspaceRules?: WorkspaceRules
): Promise<string> {
  const ctrl = new AbortController();
  const { text } = await streamAI({
    messages,
    config,
    apiKey,
    persona,
    documentContext,
    signal: ctrl.signal,
    customInstructions,
    workspaceRules,
    onToken: () => undefined
  });
  return text;
}
