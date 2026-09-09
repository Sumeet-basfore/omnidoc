import { AIMessage, AIProviderConfig, AIPersona } from '../types/ai';
import {
  buildFullMessages,
  fetchWithRetry,
  linkedSignal,
  streamAI,
  StreamUsage,
  WireMessage
} from './aiService';
import { AGENT_TOOLS, executeTool, ToolContext } from './tools';
import { PERSONA_DEFAULTS } from './personas';
import type { ToolDef } from './tools';

export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface AgentStepEvent {
  n: number;
  tool: string;
  args: string;
  result: string;
  ms: number;
}

interface NativeTranscript {
  kind: 'openai' | 'anthropic' | 'gemini';
  messages: any[];
  tools?: ToolDef[];
  system?: string;
}

interface Driver {
  init(
    history: AIMessage[],
    persona: AIPersona,
    docCtx: any,
    opts?: { customInstructions?: string }
  ): NativeTranscript | AIMessage[];
  step(
    t: any,
    allowTools: boolean,
    signal: AbortSignal
  ): Promise<{ t: any; text: string; calls: AgentToolCall[]; usage?: StreamUsage }>;
}

export function selectDriver(config: AIProviderConfig): 'openai' | 'anthropic' | 'gemini' | 'fallback' {
  if (config.id === 'anthropic') return 'anthropic';
  if (config.id === 'gemini') return 'gemini';
  if (config.id === 'openai' || config.id === 'openrouter') return 'openai';
  return 'fallback';
}

function openAIBase(config: AIProviderConfig): { baseUrl: string; model: string } {
  if (config.id === 'openrouter') {
    return { baseUrl: 'https://openrouter.ai/api/v1', model: config.model || 'anthropic/claude-3.5-sonnet' };
  }
  return { baseUrl: 'https://api.openai.com/v1', model: config.model || 'gpt-4o-mini' };
}

function openAIHeaders(config: AIProviderConfig, apiKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
  if (config.id === 'openrouter') {
    h['HTTP-Referer'] = 'https://github.com/omnidoc/omnidoc-studio';
    h['X-Title'] = 'OmniDoc Studio';
  }
  return h;
}

async function throwIfApiError(res: Response, prefix: string, custom404?: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  const detail =
    data.error?.message || (typeof data.error === 'string' ? data.error : '') || res.statusText;
  if (custom404 && res.status === 404) throw new Error(custom404);
  throw new Error(`${prefix} (${res.status}): ${detail}`);
}

const openAIDriver = (config: AIProviderConfig, apiKey: string): Driver => ({
  init(history, persona, docCtx, opts) {
    return {
      kind: 'openai',
      tools: AGENT_TOOLS.filter((t) => PERSONA_DEFAULTS[persona].tools.includes(t.name)),
      messages: buildFullMessages(history, persona, docCtx, opts).map((m) => ({
        role: m.role,
        content: m.content
      }))
    };
  },
  async step(t: NativeTranscript, allowTools, userSignal) {
    const { baseUrl, model } = openAIBase(config);
    const { signal, done } = linkedSignal(userSignal);
    try {
      const res = await fetchWithRetry(
        `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: openAIHeaders(config, apiKey),
          body: JSON.stringify({
            model,
            messages: t.messages,
            temperature: config.temperature ?? 0.7,
            ...(allowTools
              ? {
                  tools: (t.tools as ToolDef[]).map((tool) => ({
                    type: 'function',
                    function: {
                      name: tool.name,
                      description: tool.description,
                      parameters: tool.parameters
                    }
                  })),
                  tool_choice: 'auto'
                }
              : {})
          })
        },
        signal
      );
      await throwIfApiError(res, 'AI API error');
      const data = await res.json();
      const msg = data.choices?.[0]?.message || {};
      const text: string = msg.content || '';
      const calls: AgentToolCall[] = (msg.tool_calls || [])
        .filter((c: any) => c.type === 'function')
        .map((c: any, i: number) => {
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(c.function?.arguments || '{}');
          } catch {
            args = { __invalid: c.function?.arguments || '' };
          }
          return { id: c.id || `call-${Date.now()}-${i}`, name: c.function?.name || '', args };
        });
      t.messages.push({
        role: 'assistant',
        content: text || null,
        ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {})
      });
      const u = data.usage;
      const usage =
        u && (u.prompt_tokens || u.completion_tokens)
          ? { in: u.prompt_tokens || 0, out: u.completion_tokens || 0 }
          : undefined;
      return { t, text, calls, usage };
    } finally {
      done();
    }
  }
});

const anthropicDriver = (config: AIProviderConfig, apiKey: string): Driver => ({
  init(history, persona, docCtx, opts) {
    const full = buildFullMessages(history, persona, docCtx, opts);
    return {
      kind: 'anthropic',
      tools: AGENT_TOOLS.filter((t) => PERSONA_DEFAULTS[persona].tools.includes(t.name)),
      system: full
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n'),
      messages: full
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
    };
  },
  async step(t: any, allowTools, userSignal) {
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
            system: t.system,
            messages: t.messages,
            temperature: config.temperature ?? 0.7,
            ...(allowTools
              ? {
                  tools: (t.tools as ToolDef[]).map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.parameters
                  }))
                }
              : {})
          })
        },
        signal
      );
      await throwIfApiError(res, 'Anthropic API error');
      const data = await res.json();
      const blocks: any[] = data.content || [];
      let text = '';
      const calls: AgentToolCall[] = [];
      for (const b of blocks) {
        if (b.type === 'text' && typeof b.text === 'string') text += b.text;
        else if (b.type === 'tool_use') {
          let args: Record<string, any> = {};
          if (b.input && typeof b.input === 'object') args = b.input;
          calls.push({ id: b.id, name: b.name, args });
        }
      }
      t.messages.push({ role: 'assistant', content: blocks });
      const u = data.usage;
      const usage =
        u && (u.input_tokens || u.output_tokens)
          ? { in: u.input_tokens || 0, out: u.output_tokens || 0 }
          : undefined;
      return { t, text, calls, usage };
    } finally {
      done();
    }
  }
});

const geminiDriver = (config: AIProviderConfig, apiKey: string): Driver => ({
  init(history, persona, docCtx, opts) {
    const full = buildFullMessages(history, persona, docCtx, opts);
    return {
      kind: 'gemini',
      tools: AGENT_TOOLS.filter((t) => PERSONA_DEFAULTS[persona].tools.includes(t.name)),
      messages: full.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [
          { text: m.role === 'system' ? `[System Instructions / Context]\n${m.content}` : m.content }
        ]
      }))
    };
  },
  async step(t: any, allowTools, userSignal) {
    const model = config.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const { signal, done } = linkedSignal(userSignal);
    try {
      const res = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: t.messages,
            ...(allowTools
              ? {
                  tools: [
                    {
                      function_declarations: (t.tools as ToolDef[]).map((tool) => ({
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                      }))
                    }
                  ]
                }
              : {}),
            generationConfig: { temperature: config.temperature ?? 0.7 }
          })
        },
        signal
      );
      await throwIfApiError(res, 'Gemini API error');
      const data = await res.json();
      const parts: any[] = data.candidates?.[0]?.content?.parts || [];
      let text = '';
      const calls: AgentToolCall[] = [];
      parts.forEach((p, i) => {
        if (typeof p?.text === 'string') text += p.text;
        else if (p?.functionCall) {
          calls.push({
            id: `${p.functionCall.name}-${Date.now()}-${i}`,
            name: p.functionCall.name,
            args: p.functionCall.args || {}
          });
        }
      });
      t.messages.push({ role: 'model', parts });
      const meta = data.usageMetadata;
      const usage =
        meta && (meta.promptTokenCount || meta.candidatesTokenCount)
          ? { in: meta.promptTokenCount || 0, out: meta.candidatesTokenCount || 0 }
          : undefined;
      return { t, text, calls, usage };
    } finally {
      done();
    }
  }
});

const TOOL_FENCE = /```tool:([a-z_]+)\n([\s\S]*?)```/g;

function toolManifest(tools: ToolDef[]): string {
  const lines = tools.map((t) => {
    const props = (t.parameters as any)?.properties || {};
    const args = Object.keys(props).join(', ');
    return `- ${t.name}(${args}): ${t.description}`;
  }).join('\n');
  return `You can act with tools by emitting fenced blocks, one call per block (several allowed):\n\`\`\`tool:web_search\n{"query": "...", "count": 5}\n\`\`\`\nAvailable tools:\n${lines}\nRules: never invent tool results; after results arrive, continue or write the final answer with NO tool blocks. Unknown tool names and invalid JSON are reported back as errors — fix and retry.`;
}

// JSON-fallback driver for endpoints without function calling (Ollama etc.)
const fallbackDriver = (
  config: AIProviderConfig,
  apiKey: string,
  persona: AIPersona,
  docCtx: any,
  customInstructions?: string
): Driver => {
  const scoped = AGENT_TOOLS.filter((t) => PERSONA_DEFAULTS[persona].tools.includes(t.name));
  const withManifest = (history: AIMessage[]): AIMessage[] => [
    { id: 'agent-manifest', role: 'system', content: toolManifest(scoped), timestamp: 0 },
    ...history
  ];

  // Lazy delegate avoided: streamAI is imported statically (no cycle —
  // aiService never imports agentService).
  return {
    init(history) {
      return withManifest(history);
    },
    async step(t: AIMessage[], allowTools, userSignal) {
      const ctrl = new AbortController();
      const onAbort = () => ctrl.abort();
      userSignal.addEventListener('abort', onAbort, { once: true });
      const { signal, done } = linkedSignal(ctrl.signal);
      try {
        let text = '';
        const trimmed: AIMessage[] = allowTools ? t : t.filter((m) => m.id !== 'agent-manifest');
        const { text: full, usage } = await streamAI({
          messages: trimmed,
          config,
          apiKey,
          persona,
          documentContext: docCtx,
          signal,
          customInstructions,
          onToken: () => undefined
        });
        text = full;
        const calls: AgentToolCall[] = [];
        if (allowTools) {
          let m: RegExpExecArray | null;
          TOOL_FENCE.lastIndex = 0;
          while ((m = TOOL_FENCE.exec(text)) !== null) {
            const [, name, raw] = m;
            try {
              calls.push({ id: `fb-${Date.now()}-${calls.length}`, name, args: JSON.parse(raw) });
            } catch {
              calls.push({ id: `fb-${Date.now()}-${calls.length}`, name, args: { __invalid: raw } });
            }
          }
          text = text.replace(TOOL_FENCE, '').trim();
        }
        t.push({ id: `asst-${Date.now()}`, role: 'assistant', content: full, timestamp: Date.now() });
        return { t, text, calls, usage };
      } finally {
        userSignal.removeEventListener('abort', onAbort);
        ctrl.abort();
        done();
      }
    }
  };
};

function pushToolResults(driverKind: string, t: any, calls: AgentToolCall[], results: string[]): void {
  if (driverKind === 'openai') {
    calls.forEach((c, i) =>
      t.messages.push({ role: 'tool', tool_call_id: c.id, content: results[i] })
    );
  } else if (driverKind === 'anthropic') {
    t.messages.push({
      role: 'user',
      content: calls.map((c, i) => ({
        type: 'tool_result',
        tool_use_id: c.id,
        content: results[i]
      }))
    });
  } else if (driverKind === 'gemini') {
    calls.forEach((c, i) =>
      t.messages.push({
        role: 'user',
        parts: [{ functionResponse: { name: c.name, response: { content: results[i] } } }]
      })
    );
  } else {
    calls.forEach((c, i) =>
      (t as AIMessage[]).push({
        id: `tool-${Date.now()}-${i}`,
        role: 'user',
        content: `Tool ${c.name} result:\n${results[i]}`,
        timestamp: Date.now()
      })
    );
  }
}

function pushForceAnswer(driverKind: string, t: any): void {
  const msg = 'Using the tool results above, write your final answer now without calling more tools.';
  if (driverKind === 'openai') t.messages.push({ role: 'user', content: msg });
  else if (driverKind === 'anthropic') t.messages.push({ role: 'user', content: msg });
  else if (driverKind === 'gemini') t.messages.push({ role: 'user', parts: [{ text: msg }] });
  else (t as AIMessage[]).push({ id: `force-${Date.now()}`, role: 'user', content: msg, timestamp: Date.now() });
}

export interface RunAgentArgs {
  task: string;
  history: AIMessage[];
  config: AIProviderConfig;
  apiKey: string;
  persona: AIPersona;
  documentContext?: { name: string; format: string; content: string; selectedText?: string };
  tools: ToolContext;
  maxSteps?: number;
  signal: AbortSignal;
  onStep: (s: AgentStepEvent) => void;
  customInstructions?: string;
}

export async function runAgent(args: RunAgentArgs): Promise<{
  text: string;
  usage: StreamUsage;
  steps: number;
}> {
  const { task, history, config, apiKey, persona, documentContext, tools, signal, onStep } = args;
  const customInstructions = args.customInstructions;
  const maxSteps = args.maxSteps ?? 6;
  const usage: StreamUsage = { in: 0, out: 0 };
  const addUsage = (u?: StreamUsage) => {
    if (!u) return;
    usage.in += u.in || 0;
    usage.out += u.out || 0;
  };

  const kind = selectDriver(config);
  const withTask: AIMessage[] = [
    ...history,
    { id: `task-${Date.now()}`, role: 'user', content: task, timestamp: Date.now() }
  ];

  const driver: Driver =
    kind === 'openai'
      ? openAIDriver(config, apiKey)
      : kind === 'anthropic'
        ? anthropicDriver(config, apiKey)
        : kind === 'gemini'
          ? geminiDriver(config, apiKey)
          : fallbackDriver(config, apiKey, persona, documentContext, customInstructions);

  let t = driver.init(withTask, persona, documentContext, { customInstructions });
  const driverKind = kind === 'fallback' ? 'fallback' : kind;
  const seen = new Set<string>();
  let steps = 0;

  for (let n = 1; n <= maxSteps; n++) {
    if (signal.aborted) throw (signal as any).reason || new Error('Aborted');
    const started = Date.now();
    const res = await driver.step(t, true, signal);
    t = res.t;
    addUsage(res.usage);

    if (res.calls.length === 0) {
      return { text: res.text, usage, steps };
    }
    steps++;

    // No-repeat rule: same tool+args twice forces final answer
    const deduped: typeof res.calls = [];
    let repeated = false;
    for (const c of res.calls) {
      const sig = `${c.name}:${JSON.stringify(c.args)}`;
      if (seen.has(sig)) {
        repeated = true;
        continue;
      }
      seen.add(sig);
      deduped.push(c);
    }

    const execCalls = deduped.length > 0 ? deduped : res.calls.slice(0, 1);
    const results = await Promise.all(
      execCalls.map(async (c) => {
        if (c.args && typeof c.args.__invalid === 'string') {
          return `Error: arguments for ${c.name} were not valid JSON. Retry with a single JSON object.`;
        }
        return await executeTool(c.name, c.args, tools);
      })
    );

    execCalls.forEach((c, i) => {
      const ms = Date.now() - started;
      onStep({
        n,
        tool: c.name,
        args: JSON.stringify(c.args).slice(0, 80),
        result: results[i].slice(0, 120),
        ms
      });
    });

    pushToolResults(driverKind, t, execCalls, results);

    if (repeated && deduped.length === 0) break;
  }

  // Step cap: force a final no-tools answer
  pushForceAnswer(driverKind, t);
  const fin = await driver.step(t, false, signal);
  addUsage(fin.usage);
  return { text: fin.text || 'I ran out of steps before finishing. Here is what I gathered — ask me to continue.', usage, steps };
}

export type { WireMessage };
