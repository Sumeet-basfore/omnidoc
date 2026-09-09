import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

class JsonFileStore {
  private name: string;
  private defaults: Record<string, any>;
  private data: Record<string, any> | null = null;

  constructor(name: string, defaults: Record<string, any> = {}) {
    this.name = name;
    this.defaults = defaults;
  }

  private getFilePath(): string {
    let baseDir = process.cwd();
    try {
      if (app && typeof app.getPath === 'function') {
        baseDir = app.getPath('userData');
      }
    } catch {
      baseDir = process.cwd();
    }
    return path.join(baseDir, `${this.name}.json`);
  }

  private ensureLoaded(): void {
    if (this.data !== null) return;
    this.data = { ...this.defaults };

    const filePath = this.getFilePath();
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = { ...this.data, ...parsed };
      }
    } catch (err) {
      console.warn(`[JsonFileStore] Could not read ${filePath}:`, err);
    }
  }

  private save(): void {
    const filePath = this.getFilePath();
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[JsonFileStore] Could not save ${filePath}:`, err);
    }
  }

  get(key: string): any {
    this.ensureLoaded();
    return this.data ? this.data[key] : undefined;
  }

  set(key: string, value: any): void {
    this.ensureLoaded();
    if (this.data) {
      this.data[key] = value;
      this.save();
    }
  }

  delete(key: string): void {
    this.ensureLoaded();
    if (this.data) {
      delete this.data[key];
      this.save();
    }
  }
}

// Non-sensitive config store
export const configStore = new JsonFileStore('omnidoc-config', {
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
});

// Secure key store (stores encrypted base64 payload from safeStorage)
export const keychainStore = new JsonFileStore('omnidoc-keychain');
