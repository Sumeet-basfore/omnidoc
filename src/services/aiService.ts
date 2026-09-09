import { AIMessage, AIProviderConfig, AIPersona } from '../types/ai';

const PERSONA_SYSTEM_PROMPTS: Record<AIPersona, string> = {
  friend: `You are "OmniDoc Friend", a warm, highly skilled, and encouraging AI co-writer and research partner inside OmniDoc Studio.
Your style is constructive, clear, collaborative, and friendly. You provide insightful suggestions, help polish prose, brainstorm directions, and adapt to the author's tone while maintaining high quality standards. Keep responses focused, structured, and easy to apply directly to the document.`,

  researcher: `You are a Senior Research Analyst inside OmniDoc Studio.
Your style is objective, rigorous, analytical, and structured. You synthesize complex concepts clearly, structure data with headings and bullet points, call out key facts and technical specifications, and provide citations whenever references or sources are provided.`,

  proofreader: `You are an expert Copyeditor and Proofreader inside OmniDoc Studio.
Your focus is grammatical correctness, conciseness, flow, precision of terminology, and tone consistency. Highlight improvements cleanly, explain reasons for significant edits when helpful, and provide ready-to-paste revised text.`,

  brainstormer: `You are a Creative Ideation & Strategy Partner inside OmniDoc Studio.
Your focus is offering diverse angles, fresh outlines, alternative perspectives, counter-arguments, and creative variations to enrich the user's ideas.`
};

export async function callAI(
  messages: AIMessage[],
  config: AIProviderConfig,
  apiKey: string,
  persona: AIPersona = 'friend',
  documentContext?: { name: string; format: string; content: string; selectedText?: string }
): Promise<string> {
  const systemPrompt = PERSONA_SYSTEM_PROMPTS[persona];

  // Inject system prompt and document context
  const fullMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  if (documentContext) {
    let ctx = `[ACTIVE DOCUMENT CONTEXT]\nDocument: "${documentContext.name}" (${documentContext.format.toUpperCase()})\n`;
    if (documentContext.selectedText) {
      ctx += `Currently Selected Text in Editor:\n"""\n${documentContext.selectedText}\n"""\n`;
    }
    // Include snippet of document if not too massive
    const truncatedContent = documentContext.content.slice(0, 15000);
    ctx += `Document Content Preview (first 15k chars):\n"""\n${truncatedContent}\n"""`;
    fullMessages.push({ role: 'system', content: ctx });
  }

  for (const m of messages) {
    fullMessages.push({
      role: m.role,
      content: m.content
    });
  }

  switch (config.id) {
    case 'gemini':
      return await callGemini(fullMessages, config, apiKey);
    case 'anthropic':
      return await callAnthropic(fullMessages, config, apiKey);
    case 'openai':
    case 'openrouter':
    case 'custom':
      return await callOpenAICompat(fullMessages, config, apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${config.id}`);
  }
}

async function callGemini(
  messages: Array<{ role: string; content: string }>,
  config: AIProviderConfig,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error('Gemini API key is not configured. Please add it in Settings.');

  const model = config.model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemini expects contents format: role 'user' or 'model'
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.role === 'system' ? `[System Instructions / Context]\n${m.content}` : m.content }]
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.7
      }
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error (${res.status}): ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Received empty response from Gemini');
  return text;
}

async function callAnthropic(
  messages: Array<{ role: string; content: string }>,
  config: AIProviderConfig,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error('Anthropic API key is not configured. Please add it in Settings.');

  const systemMessage = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
      temperature: config.temperature ?? 0.7
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Anthropic API error (${res.status}): ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callOpenAICompat(
  messages: Array<{ role: string; content: string }>,
  config: AIProviderConfig,
  apiKey: string
): Promise<string> {
  let baseUrl = 'https://api.openai.com/v1';
  let defaultModel = 'gpt-4o-mini';

  if (config.id === 'openrouter') {
    baseUrl = 'https://openrouter.ai/api/v1';
    defaultModel = 'anthropic/claude-3.5-sonnet';
  } else if (config.id === 'custom') {
    // Normalize Ollama / LM Studio base URL: accept `http://localhost:11434`
    // or `.../v1`, with or without trailing slash.
    let raw = (config.baseUrl || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
    if (!/\/v1$/.test(raw)) raw += '/v1';
    baseUrl = raw;
    defaultModel = config.model || 'llama3';
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model || defaultModel,
        messages,
        temperature: config.temperature ?? 0.7
      }),
      signal: ctrl.signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('AI request timed out after 90s.');
    if (config.id === 'custom')
      throw new Error(
        `Cannot reach local model at ${baseUrl}. Is Ollama running? Try: \`ollama serve\` then \`ollama pull ${config.model || defaultModel}\`. (${err?.message || 'network error'})`
      );
    throw new Error(`Network error reaching ${baseUrl}: ${err?.message || err}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const detail = errorData.error?.message || (typeof errorData.error === 'string' ? errorData.error : '') || res.statusText;
    if (config.id === 'custom' && res.status === 404)
      throw new Error(`Local model "${config.model || defaultModel}" not found at ${baseUrl}. Run: \`ollama pull ${config.model || defaultModel}\`. (${detail})`);
    throw new Error(`AI API error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (text === undefined) throw new Error('Received empty response from provider');
  return text;
}
