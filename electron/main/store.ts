import Store from 'electron-store';

// Non-sensitive config store
export const configStore = new Store({
  name: 'omnidoc-config',
  defaults: {
    theme: 'dark',
    recentFiles: [],
    activeProvider: 'gemini',
    aiConfigs: {
      gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        model: 'gemini-1.5-flash',
        temperature: 0.7
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        model: 'gpt-4o-mini',
        temperature: 0.7
      },
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic Claude',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7
      },
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.7
      },
      custom: {
        id: 'custom',
        name: 'Ollama / Local',
        model: 'llama3',
        baseUrl: 'http://localhost:11434/v1',
        temperature: 0.7
      }
    }
  }
});

// Secure key store (stores encrypted base64 payload from safeStorage)
export const keychainStore = new Store({
  name: 'omnidoc-keychain'
});
