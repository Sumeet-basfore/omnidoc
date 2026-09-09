import React, { useState, useEffect } from 'react';
import { ChevronLeft, Key, ShieldCheck, ShieldAlert, Check, Loader2, Cpu, Globe } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { keyService, KeyProvider } from '../../services/keyService';
import { AIProviderId } from '../../types/ai';
import { callAI } from '../../services/aiService';

export const ProviderSettings: React.FC = () => {
  const {
    setLeftPanel,
    activeProvider,
    setActiveProvider,
    aiConfigs,
    updateAIConfig
  } = useAppStore();

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [isEncrypted, setIsEncrypted] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
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
  }, []);

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
    setTestError((prev) => ({ ...prev, [providerId]: '' }));
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
    } catch (err: any) {
      console.error('Test key failed:', err);
      setTestStatus((prev) => ({ ...prev, [providerId]: 'failed' }));
      setTestError((prev) => ({ ...prev, [providerId]: err?.message || 'Connection failed' }));
    }
  };

  const currentConfig = aiConfigs[activeProvider];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-dark-surface)] text-xs">
      {/* Panel header */}
      <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2 shrink-0">
        <button
          onClick={() => setLeftPanel('files')}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Back to files"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
          <Key size={13} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-white leading-tight">Settings</h2>
          <p className="text-[10px] text-zinc-500 truncate">Providers & keys · BYOK</p>
        </div>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Keychain status */}
        <div
          className={`p-2.5 rounded border flex items-start gap-2 ${
            isEncrypted
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}
        >
          {isEncrypted ? (
            <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert size={15} className="text-amber-400 shrink-0 mt-0.5" />
          )}
          <p className="text-[10px] leading-snug">
            {isEncrypted
              ? 'Keys encrypted via OS keychain.'
              : 'Keychain unavailable — keys stored in app data.'}
          </p>
        </div>

        {/* Provider switcher */}
        <div>
          <label className="block font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Cpu size={13} className="text-sky-400" />
            <span>Active provider</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['gemini', 'openai', 'anthropic', 'openrouter', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActiveProvider(p)}
                className={`p-2 rounded border text-left transition-all capitalize ${
                  activeProvider === p
                    ? 'bg-sky-500/15 border-sky-500/50 text-white font-medium'
                    : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <div className="text-[11px] truncate">{aiConfigs[p].name}</div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">{aiConfigs[p].model}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Active provider config */}
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white text-[11px] truncate">{currentConfig.name}</span>
            <button
              onClick={() => handleTestKey(activeProvider)}
              disabled={testStatus[activeProvider] === 'testing'}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] shrink-0"
            >
              {testStatus[activeProvider] === 'testing' ? (
                <Loader2 size={12} className="animate-spin text-sky-400" />
              ) : testStatus[activeProvider] === 'success' ? (
                <Check size={12} className="text-emerald-400" />
              ) : null}
              <span>{testStatus[activeProvider] === 'success' ? 'Connected' : 'Test'}</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              API key{activeProvider === 'custom' ? ' (optional for local servers)' : ''}
            </label>
            <input
              type="password"
              value={keys[activeProvider] || ''}
              onChange={(e) => handleKeyChange(activeProvider, e.target.value)}
              placeholder={activeProvider === 'custom' ? 'Blank for default Ollama' : `Paste key…`}
              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
            {testError[activeProvider] && (
              <p className="mt-1.5 text-[11px] text-red-300 leading-snug">{testError[activeProvider]}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Model</label>
            <input
              type="text"
              value={currentConfig.model}
              onChange={(e) => updateAIConfig(activeProvider, { model: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1 flex items-center justify-between">
              <span>Temperature</span>
              <span className="text-sky-300 font-mono">{currentConfig.temperature}</span>
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
              className="w-full accent-sky-500"
            />
          </div>

          {activeProvider === 'custom' && (
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Base URL (Ollama / LM Studio)</label>
              <input
                type="text"
                value={currentConfig.baseUrl || ''}
                onChange={(e) => updateAIConfig(activeProvider, { baseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Search keys */}
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded space-y-2.5">
          <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-[11px]">
            <Globe size={13} />
            <span>Deep research keys</span>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Tavily</label>
            <input
              type="password"
              value={keys.tavily || ''}
              onChange={(e) => handleKeyChange('tavily', e.target.value)}
              placeholder="tvly-..."
              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Exa AI</label>
            <input
              type="password"
              value={keys.exa || ''}
              onChange={(e) => handleKeyChange('exa', e.target.value)}
              placeholder="exa-..."
              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Panel footer */}
      <div className="p-3 border-t border-[var(--border-subtle)] shrink-0">
        {saveSuccess ? (
          <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px] mb-2">
            <Check size={13} />
            <span>Keys encrypted & saved</span>
          </span>
        ) : null}
        <button
          onClick={handleSaveKeys}
          className="w-full py-1.5 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-semibold text-xs transition-all cursor-pointer"
        >
          Save credentials
        </button>
      </div>
    </div>
  );
};
