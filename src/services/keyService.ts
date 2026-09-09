export const KEY_MAP = {
  gemini: 'provider_gemini_key',
  openai: 'provider_openai_key',
  anthropic: 'provider_anthropic_key',
  openrouter: 'provider_openrouter_key',
  custom: 'provider_custom_key',
  tavily: 'search_tavily_key',
  exa: 'search_exa_key'
} as const;

export type KeyProvider = keyof typeof KEY_MAP;

export const keyService = {
  async set(provider: KeyProvider, value: string): Promise<boolean> {
    const keyName = KEY_MAP[provider];
    if (window.electronAPI?.setSecureKey) {
      return await window.electronAPI.setSecureKey(keyName, value);
    } else {
      // Browser fallback
      try {
        localStorage.setItem(`omnidoc_sec_${keyName}`, btoa(value));
        return true;
      } catch {
        return false;
      }
    }
  },

  async get(provider: KeyProvider): Promise<string | null> {
    const keyName = KEY_MAP[provider];
    if (window.electronAPI?.getSecureKey) {
      return await window.electronAPI.getSecureKey(keyName);
    } else {
      // Browser fallback
      try {
        const stored = localStorage.getItem(`omnidoc_sec_${keyName}`);
        return stored ? atob(stored) : null;
      } catch {
        return null;
      }
    }
  },

  async delete(provider: KeyProvider): Promise<boolean> {
    const keyName = KEY_MAP[provider];
    if (window.electronAPI?.deleteSecureKey) {
      return await window.electronAPI.deleteSecureKey(keyName);
    } else {
      localStorage.removeItem(`omnidoc_sec_${keyName}`);
      return true;
    }
  },

  async isSecureStorageAvailable(): Promise<boolean> {
    if (window.electronAPI?.isEncryptionAvailable) {
      return await window.electronAPI.isEncryptionAvailable();
    }
    return false;
  }
};
