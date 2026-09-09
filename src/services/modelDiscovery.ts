import { AIProviderConfig } from '../types/ai';
import { linkedSignal } from './aiService';

const DISCOVERY_TIMEOUT_MS = 15000;

function stripBase(raw: string): string {
  return (raw || '').trim().replace(/\/+$/, '');
}

async function getJSON(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<any> {
  const link = linkedSignal(signal, DISCOVERY_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: link.signal });
    if (!res.ok) throw new Error(`Server replied ${res.status}`);
    return await res.json();
  } finally {
    link.done();
  }
}

/**
 * List model ids available for a provider/endpoint. Custom endpoints try
 * Ollama's native /api/tags first, then OpenAI-compat /v1/models.
 * Anthropic has no list API — callers should hide discovery for it.
 */
export async function listModels(config: AIProviderConfig, apiKey: string): Promise<string[]> {
  switch (config.id) {
    case 'custom': {
      const raw = stripBase(config.baseUrl || 'http://localhost:11434/v1');
      const nativeBase = raw.replace(/\/v1$/, '');
      const compatBase = /\/v1$/.test(raw) ? raw : `${raw}/v1`;
      // Ollama native
      try {
        const data = await getJSON(`${nativeBase}/api/tags`, {});
        const names: string[] = (data.models || []).map((m: any) => m.name).filter(Boolean);
        if (names.length > 0) return [...new Set(names)].sort().slice(0, 100);
      } catch {
        // fall through to OpenAI-compat shape
      }
      try {
        const data = await getJSON(
          `${compatBase}/models`,
          apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
        );
        const ids: string[] = (data.data || []).map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) return [...new Set(ids)].sort().slice(0, 100);
        throw new Error('Server returned no models.');
      } catch (err: any) {
        if (/Server replied|returned no models/.test(err?.message || '')) throw err;
        throw new Error(
          `Cannot reach ${nativeBase}. Is the server running? (tried /api/tags and /v1/models)`
        );
      }
    }
    case 'openai': {
      if (!apiKey) throw new Error('Add your OpenAI key first, then refresh.');
      const data = await getJSON('https://api.openai.com/v1/models', {
        Authorization: `Bearer ${apiKey}`
      });
      const ids: string[] = [...new Set<string>((data.data || []).map((m: any) => m.id).filter(Boolean))];
      return ids.sort().slice(0, 100);
    }
    case 'gemini': {
      if (!apiKey) throw new Error('Add your Gemini key first, then refresh.');
      const data = await getJSON(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {}
      );
      return (data.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m: any) => String(m.name || '').replace(/^models\//, ''))
        .filter(Boolean)
        .sort()
        .slice(0, 100);
    }
    case 'openrouter': {
      const data = await getJSON('https://openrouter.ai/api/v1/models', {});
      const ids: string[] = [...new Set<string>((data.data || []).map((m: any) => m.id).filter(Boolean))];
      return ids.sort().slice(0, 100);
    }
    default:
      throw new Error('This provider has no model-list API — type the model name.');
  }
}
