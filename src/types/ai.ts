export type AIProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'custom'; // Ollama / LM Studio

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  model: string;
  baseUrl?: string; // Custom endpoint override e.g. http://localhost:11434/v1
  temperature: number;
}

export type AIPersona =
  | 'friend'      // Friendly Co-Writer
  | 'researcher'  // Deep Researcher
  | 'proofreader' // Strict Proofreader
  | 'brainstormer'; // Creative Brainstormer

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: Array<{ title: string; url: string; snippet: string }>;
}

export interface DeepResearchQuery {
  topic: string;
  depth: 'quick' | 'standard' | 'deep';
  includeCitations: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface DeepResearchResult {
  title: string;
  markdownContent: string;
  sources: SearchResult[];
}
