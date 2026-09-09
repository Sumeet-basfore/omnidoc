import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ShieldAlert, Check, Loader2, Cpu, Globe, Sliders } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { keyService, KeyProvider } from '../../services/keyService';
import { AIProviderId } from '../../types/ai';
import { callAI } from '../../services/aiService';

export const ProviderSettings: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    activeProvider,
    setActiveProvider,
    aiConfigs,
    updateAIConfig
  } = useAppStore();

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [isEncrypted, setIsEncrypted] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const loadSettings = async () => {
      const secureAvailable = await keyService.isSecureStorageAvailable();
      setIsEncrypted(secureAvailable);

      const loadedKeys: Record<string, string> = {};
      const providers: KeyProvider[] = ['gemini', 'openai', 'anthropic', 'openrouter', 'custom', 'tavily', 'exa'];
      for (const p of providers) {
        const val = await keyService.get(p);
        if (val) loadedKeys[p] = val;
      }
      setKeys(loadedKeys);
    };

    loadSettings();
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleKeyChange = (provider: string, value: string) => {
    setKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleSaveKeys = async () => {
    for (const [provider, val] of Object.entries(keys)) {
      await keyService.set(provider as KeyProvider, val);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestKey = async (providerId: AIProviderId) => {
    setTestStatus((prev) => ({ ...prev, [providerId]: 'testing' }));
    try {
      const apiKey = keys[providerId] || '';
      const config = aiConfigs[providerId];
      const res = await callAI(
        [{ id: 'test', role: 'user', content: 'Reply with the single word "READY".', timestamp: Date.now() }],
        config,
        apiKey,
        'friend'
      );
      if (res) {
        setTestStatus((prev) => ({ ...prev, [providerId]: 'success' }));
      } else {
        setTestStatus((prev) => ({ ...prev, [providerId]: 'failed' }));
      }
    } catch (err) {
      console.error('Test key failed:', err);
      setTestStatus((prev) => ({ ...prev, [providerId]: 'failed' }));
    }
  };

  const currentConfig = aiConfigs[activeProvider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#121622] border border-[var(--border-medium)] rounded-2xl max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl animate-modal overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Key size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Provider & API Key Settings</h2>
              <p className="text-[11px] text-zinc-400">Bring Your Own Key (BYOK) — encrypted via OS Keychain</p>
            </div>
          </div>

          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Keychain Security Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              isEncrypted
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}
          >
            {isEncrypted ? (
              <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert size={20} className="text-amber-400 shrink-0" />
            )}
            <div className="text-[11px]">
              <span className="font-semibold">
                {isEncrypted ? 'OS Keychain Encryption Active' : 'Fallback Key Storage'}
              </span>
              <p className="opacity-80 mt-0.5">
                {isEncrypted
                  ? 'Your API keys are encrypted at rest using electron.safeStorage (macOS Keychain, Windows DPAPI, or Linux secret service).'
                  : 'OS Keychain is unavailable on this environment. Keys are stored locally in application data.'}
              </p>
            </div>
          </div>

          {/* Active AI Provider Switcher */}
          <div>
            <label className="block font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-400" />
              <span>Active AI Companion Provider</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['gemini', 'openai', 'anthropic', 'openrouter', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveProvider(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all capitalize ${
                    activeProvider === p
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-medium shadow-md glow-accent'
                      : 'bg-[#151928] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <div className="text-xs">{aiConfigs[p].name}</div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{aiConfigs[p].model}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Provider Configuration */}
          <div className="p-4 bg-[#161a29] border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Config: {currentConfig.name}</span>
              <button
                onClick={() => handleTestKey(activeProvider)}
                disabled={testStatus[activeProvider] === 'testing'}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-[11px]"
              >
                {testStatus[activeProvider] === 'testing' ? (
                  <Loader2 size={12} className="animate-spin text-indigo-400" />
                ) : testStatus[activeProvider] === 'success' ? (
                  <Check size={12} className="text-emerald-400" />
                ) : null}
                <span>{testStatus[activeProvider] === 'success' ? 'Connected!' : 'Test Connection'}</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">API Key</label>
              <input
                type="password"
                value={keys[activeProvider] || ''}
                onChange={(e) => handleKeyChange(activeProvider, e.target.value)}
                placeholder={`Paste your ${currentConfig.name} API key...`}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Model Name</label>
                <input
                  type="text"
                  value={currentConfig.model}
                  onChange={(e) => updateAIConfig(activeProvider, { model: e.target.value })}
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Temperature</span>
                  <span className="text-indigo-400 font-mono">{currentConfig.temperature}</span>
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={currentConfig.temperature}
                  onChange={(e) =>
                    updateAIConfig(activeProvider, { temperature: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            {activeProvider === 'custom' && (
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Base URL (Ollama / LM Studio)</label>
                <input
                  type="text"
                  value={currentConfig.baseUrl || ''}
                  onChange={(e) => updateAIConfig(activeProvider, { baseUrl: e.target.value })}
                  placeholder="http://localhost:11434/v1"
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Deep Web Research Search Keys */}
          <div className="p-4 bg-[#161a29] border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <Globe size={15} />
              <span>Deep Research Search Engines (Optional BYOK)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Tavily Search API Key</label>
                <input
                  type="password"
                  value={keys.tavily || ''}
                  onChange={(e) => handleKeyChange('tavily', e.target.value)}
                  placeholder="tvly-..."
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Exa AI Neural Search API Key</label>
                <input
                  type="password"
                  value={keys.exa || ''}
                  onChange={(e) => handleKeyChange('exa', e.target.value)}
                  placeholder="exa-..."
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">
              Free tiers available on Tavily and Exa AI. Enables real-time web crawler and neural fact synthesis.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)]">
          {saveSuccess ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium text-xs">
              <Check size={14} />
              <span>Keys Encrypted & Saved</span>
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              Done
            </button>
            <button
              onClick={handleSaveKeys}
              className="px-4 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium shadow-md transition-all cursor-pointer"
            >
              Save Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
