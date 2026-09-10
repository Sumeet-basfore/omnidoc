import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Key,
  ShieldCheck,
  ShieldAlert,
  Check,
  Loader2,
  Cpu,
  Globe,
  RefreshCw,
  BarChart3,
  Users,
  BookOpen,
  ChevronDown,
  Search,
  X
} from 'lucide-react';
import { listModels } from '../../services/modelDiscovery';
import { useAppStore } from '../../store/useAppStore';
import { keyService, KeyProvider } from '../../services/keyService';
import { AIProviderId } from '../../types/ai';
import { callAI } from '../../services/aiService';
import { WorkspaceRulesSettings } from './WorkspaceRulesSettings';

const PROVIDER_PRESET_MODELS: Record<AIProviderId, string[]> = {
  gemini: [
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-2.0-pro-exp-02-05',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b'
  ],
  openai: [
    'gpt-4o-mini',
    'gpt-4o',
    'o1-mini',
    'o1',
    'o3-mini',
    'gpt-4-turbo'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307'
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-r1',
    'openai/gpt-4o-mini',
    'mistralai/mistral-large-2407'
  ],
  custom: [
    'local-model',
    'llama3.2',
    'qwen2.5-coder:7b',
    'qwen2.5-coder-7b-instruct',
    'deepseek-r1:8b',
    'deepseek-r1-distill-qwen-7b',
    'mistral',
    'mistral-7b-instruct-v0.3',
    'llama3.1',
    'phi3',
    'gemma2:9b'
  ]
};

interface LocalEnginePreset {
  id: 'lmstudio' | 'ollama' | 'llamacpp';
  name: string;
  badge: string;
  port: string;
  url: string;
  defaultModel: string;
}

const LOCAL_ENGINE_PRESETS: LocalEnginePreset[] = [
  {
    id: 'lmstudio',
    name: 'LM Studio',
    badge: ':1234',
    port: '1234',
    url: 'http://localhost:1234/v1',
    defaultModel: 'local-model'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    badge: ':11434',
    port: '11434',
    url: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2'
  },
  {
    id: 'llamacpp',
    name: 'llama.cpp',
    badge: ':8080',
    port: '8080',
    url: 'http://localhost:8080/v1',
    defaultModel: 'default-model'
  }
];

export const ProviderSettings: React.FC = () => {
  const {
    setLeftPanel,
    activeProvider,
    setActiveProvider,
    aiConfigs,
    updateAIConfig,
    usageLog,
    dailyTokenAlert,
    setDailyTokenAlert,
    setUserGuideOpen
  } = useAppStore();

  const [settingsTab, setSettingsTab] = useState<'keys' | 'rules'>('keys');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [isEncrypted, setIsEncrypted] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [knownModelsByProvider, setKnownModelsByProvider] = useState<Record<string, string[]>>({});
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [modelSearch, setModelSearch] = useState<string>('');
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoverError, setDiscoverError] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModelDropdownOpen]);

  // Reset dropdown search when switching providers
  useEffect(() => {
    setIsModelDropdownOpen(false);
    setModelSearch('');
    setDiscoverError('');
  }, [activeProvider]);

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
  const canDiscover = activeProvider !== 'anthropic';

  const handleRefreshModels = async () => {
    setDiscovering(true);
    setDiscoverError('');
    try {
      const apiKey = keys[activeProvider] || '';
      const models = await listModels(currentConfig, apiKey);
      setKnownModelsByProvider((prev) => ({ ...prev, [activeProvider]: models }));
      if (models.length === 0) {
        setDiscoverError('No models returned by the provider.');
      } else {
        setIsModelDropdownOpen(true);
      }
    } catch (err: any) {
      setDiscoverError(err?.message || 'Discovery failed.');
    } finally {
      setDiscovering(false);
    }
  };

  // Auto-discover in background if we have a key (or local endpoint) and haven't discovered yet
  useEffect(() => {
    const currentKey = keys[activeProvider];
    const canProbe = (Boolean(currentKey) || activeProvider === 'custom') && canDiscover;
    if (canProbe && !knownModelsByProvider[activeProvider] && !discovering) {
      listModels(currentConfig, currentKey || '')
        .then((models) => {
          if (models.length > 0) {
            setKnownModelsByProvider((prev) => ({ ...prev, [activeProvider]: models }));
          }
        })
        .catch(() => {});
    }
  }, [activeProvider, keys[activeProvider], currentConfig.baseUrl]);

  const fmtTok = (n: number): string =>
    n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`;

  const dayStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const weekStart = dayStart - 6 * 24 * 3600 * 1000;
  const tokOf = (e: { inTok: number; outTok: number }) => e.inTok + e.outTok;
  const todayTok = usageLog.filter((e) => e.t >= dayStart).reduce((a, e) => a + tokOf(e), 0);
  const weekTok = usageLog.filter((e) => e.t >= weekStart).reduce((a, e) => a + tokOf(e), 0);
  const byProvider = (() => {
    const m = new Map<string, number>();
    for (const e of usageLog) {
      if (e.t < dayStart) continue;
      m.set(e.provider, (m.get(e.provider) || 0) + tokOf(e));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();
  const alertOn = dailyTokenAlert > 0;
  const alertHit = alertOn && todayTok >= dailyTokenAlert;

  const knownModels = knownModelsByProvider[activeProvider] || [];
  const presets = PROVIDER_PRESET_MODELS[activeProvider] || [];
  const nonDuplicatePresets = presets.filter((p) => !knownModels.includes(p));
  const query = modelSearch.toLowerCase().trim();
  const filteredDetected = knownModels.filter((m) => m.toLowerCase().includes(query));
  const filteredPresets = nonDuplicatePresets.filter((m) => m.toLowerCase().includes(query));

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
          <p className="text-[10px] text-zinc-500 truncate">Providers, keys & team rules</p>
        </div>
      </div>

      {/* Sub-Tabs: Providers & Keys vs Team Rules */}
      <div className="px-3 pt-1 border-b border-[var(--border-subtle)] flex items-center gap-1 bg-black/20 shrink-0">
        <button
          onClick={() => setSettingsTab('keys')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b-2 text-xs font-medium transition-colors cursor-pointer ${
            settingsTab === 'keys'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Key size={12} />
          <span>API Keys</span>
        </button>
        <button
          onClick={() => setSettingsTab('rules')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b-2 text-xs font-medium transition-colors cursor-pointer ${
            settingsTab === 'rules'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users size={12} />
          <span>Team Rules</span>
        </button>
      </div>

      {settingsTab === 'rules' ? (
        <WorkspaceRulesSettings />
      ) : (
        <>
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

        {/* Setup guide banner */}
        <div className="p-2.5 rounded border border-indigo-500/30 bg-indigo-950/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-indigo-200 min-w-0">
            <BookOpen size={14} className="text-indigo-400 shrink-0" />
            <span className="text-[11px] font-medium truncate">Need keys or free local AI?</span>
          </div>
          <button
            onClick={() => setUserGuideOpen(true)}
            className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] cursor-pointer transition-colors shrink-0"
          >
            Setup Guide
          </button>
        </div>

        {/* Provider switcher */}
        <div>
          <label className="block font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Cpu size={13} className="text-sky-400" />
            <span>Active provider</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['gemini', 'openai', 'anthropic', 'openrouter', 'custom'] as const).map((p) => {
              const isCustom = p === 'custom';
              const cfg = aiConfigs[p];
              let customSubtitle = 'Ollama / Local';
              if (isCustom) {
                const url = (cfg?.baseUrl || '').toLowerCase();
                if (url.includes(':1234')) customSubtitle = 'LM Studio (:1234)';
                else if (url.includes(':8080')) customSubtitle = 'llama.cpp (:8080)';
                else if (url.includes(':11434')) customSubtitle = 'Ollama (:11434)';
                else customSubtitle = 'Local / OpenAI-compat';
              }
              return (
                <button
                  key={p}
                  onClick={() => {
                    setActiveProvider(p);
                    setIsModelDropdownOpen(false);
                    setModelSearch('');
                    setDiscoverError('');
                  }}
                  className={`p-2 rounded border text-left transition-all ${
                    activeProvider === p
                      ? 'bg-sky-500/15 border-sky-500/50 text-white font-medium'
                      : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  } ${isCustom ? 'col-span-2' : ''}`}
                >
                  <div className="text-[11px] truncate flex items-center justify-between">
                    <span>{isCustom ? 'Local AI (LM Studio, Ollama, llama.cpp)' : cfg.name}</span>
                    {isCustom && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-medium">
                        Offline
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">
                    {isCustom ? `${customSubtitle} · ${cfg.model}` : cfg.model}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active provider config */}
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white text-[11px] truncate">
              {activeProvider === 'custom' ? 'Local AI Server Config' : currentConfig.name}
            </span>
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
              placeholder={
                activeProvider === 'custom'
                  ? 'Blank for LM Studio / Ollama / llama.cpp'
                  : `Paste key…`
              }
              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
            {testError[activeProvider] && (
              <p className="mt-1.5 text-[11px] text-red-300 leading-snug">{testError[activeProvider]}</p>
            )}
          </div>

          {/* Custom Model Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] text-zinc-400 mb-1 flex items-center justify-between">
              <span>Model</span>
              {knownModels.length > 0 && (
                <span className="text-[10px] text-sky-400 font-mono">
                  {knownModels.length} detected
                </span>
              )}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-sky-500/50 rounded text-xs text-white focus:outline-none transition-colors cursor-pointer text-left"
              >
                <span className="font-mono truncate">{currentConfig.model || 'Select model...'}</span>
                <ChevronDown
                  size={14}
                  className={`text-zinc-400 shrink-0 ml-1.5 transition-transform duration-150 ${
                    isModelDropdownOpen ? 'rotate-180 text-sky-400' : ''
                  }`}
                />
              </button>

              {canDiscover && (
                <button
                  type="button"
                  onClick={handleRefreshModels}
                  disabled={discovering}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
                  title="Detect available models from the endpoint"
                >
                  <RefreshCw size={13} className={discovering ? 'animate-spin text-sky-400' : ''} />
                </button>
              )}
            </div>

            {/* Dropdown Menu Popup */}
            {isModelDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#121622] border border-white/10 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-72">
                {/* Search & Custom Input Bar */}
                <div className="p-2 border-b border-white/10 bg-black/40">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-black/50 border border-white/10 rounded text-xs text-white">
                    <Search size={12} className="text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search models or type custom..."
                      className="w-full bg-transparent text-xs text-white focus:outline-none font-mono placeholder:text-zinc-500"
                    />
                    {modelSearch && (
                      <button
                        type="button"
                        onClick={() => setModelSearch('')}
                        className="text-zinc-400 hover:text-white p-0.5"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  {/* Quick Custom Model Entry */}
                  {modelSearch.trim() && modelSearch.trim() !== currentConfig.model && (
                    <button
                      type="button"
                      onClick={() => {
                        updateAIConfig(activeProvider, { model: modelSearch.trim() });
                        setIsModelDropdownOpen(false);
                        setModelSearch('');
                        setTestError((prev) => ({ ...prev, [activeProvider]: '' }));
                      }}
                      className="w-full mt-1.5 px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-mono text-left transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">Use custom: &quot;{modelSearch.trim()}&quot;</span>
                      <Check size={11} className="shrink-0 ml-1 text-sky-400" />
                    </button>
                  )}
                </div>

                {/* Models List */}
                <div className="flex-1 overflow-y-auto p-1 divide-y divide-white/5 max-h-56">
                  {/* Detected models from endpoint */}
                  {filteredDetected.length > 0 && (
                    <div className="py-1">
                      <div className="px-2 py-0.5 text-[9px] font-semibold text-sky-400 uppercase tracking-wider">
                        Detected via API ({filteredDetected.length})
                      </div>
                      {filteredDetected.map((m) => {
                        const isSelected = m === currentConfig.model;
                        return (
                          <button
                            key={`detected-${m}`}
                            type="button"
                            onClick={() => {
                              updateAIConfig(activeProvider, { model: m });
                              setIsModelDropdownOpen(false);
                              setModelSearch('');
                              setTestError((prev) => ({ ...prev, [activeProvider]: '' }));
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/20 text-white font-medium'
                                : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="font-mono text-xs truncate">{m}</span>
                            {isSelected && <Check size={12} className="text-sky-400 shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Curated Preset models */}
                  {filteredPresets.length > 0 && (
                    <div className="py-1">
                      <div className="px-2 py-0.5 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Recommended Presets
                      </div>
                      {filteredPresets.map((m) => {
                        const isSelected = m === currentConfig.model;
                        return (
                          <button
                            key={`preset-${m}`}
                            type="button"
                            onClick={() => {
                              updateAIConfig(activeProvider, { model: m });
                              setIsModelDropdownOpen(false);
                              setModelSearch('');
                              setTestError((prev) => ({ ...prev, [activeProvider]: '' }));
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/20 text-white font-medium'
                                : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="font-mono text-xs truncate">{m}</span>
                            {isSelected && <Check size={12} className="text-sky-400 shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredDetected.length === 0 && filteredPresets.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-zinc-500">
                      No matching models. Type above to use a custom model.
                    </div>
                  )}
                </div>
              </div>
            )}

            {discoverError && (
              <p className="mt-1.5 text-[11px] text-red-300 leading-snug">{discoverError}</p>
            )}
            {knownModels.length > 0 && !discoverError && (
              <p className="mt-1.5 text-[10px] font-mono text-zinc-500">
                {knownModels.length} models detected via API — click above to change
              </p>
            )}
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
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div>
                <label className="block text-[11px] text-zinc-300 mb-1.5 font-medium flex items-center justify-between">
                  <span>Local Inference Engine</span>
                  <span className="text-[10px] text-sky-400 font-mono">1-Click Presets</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {LOCAL_ENGINE_PRESETS.map((engine) => {
                    const isSelected = (currentConfig.baseUrl || '').includes(engine.port);
                    return (
                      <button
                        key={engine.id}
                        type="button"
                        onClick={() => {
                          const updated = {
                            baseUrl: engine.url,
                            model: currentConfig.model || engine.defaultModel
                          };
                          updateAIConfig('custom', updated);
                          setDiscoverError('');
                          listModels({ ...currentConfig, ...updated }, keys.custom || '')
                            .then((models) => {
                              if (models.length > 0) {
                                setKnownModelsByProvider((prev) => ({ ...prev, custom: models }));
                                if (
                                  models[0] &&
                                  (!currentConfig.model ||
                                    currentConfig.model === 'llama3' ||
                                    currentConfig.model === 'local-model' ||
                                    currentConfig.model === 'default-model')
                                ) {
                                  updateAIConfig('custom', { model: models[0] });
                                }
                              }
                            })
                            .catch((err) => {
                              setDiscoverError(err?.message || '');
                            });
                        }}
                        className={`px-2 py-1.5 rounded border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-500/60 text-white shadow-sm'
                            : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="text-[11px] font-semibold flex items-center justify-between">
                          <span>{engine.name}</span>
                          {isSelected && <Check size={11} className="text-sky-400" />}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{engine.badge}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Endpoint URL</span>
                  <span className="text-[10px] text-zinc-500 font-mono">OpenAI-compat /v1</span>
                </label>
                <input
                  type="text"
                  value={currentConfig.baseUrl || ''}
                  onChange={(e) => updateAIConfig(activeProvider, { baseUrl: e.target.value })}
                  placeholder="http://localhost:1234/v1"
                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="mt-1.5 text-[10px] text-zinc-400 leading-relaxed bg-black/30 p-2 rounded border border-white/5">
                  {(() => {
                    const url = (currentConfig.baseUrl || '').toLowerCase();
                    if (url.includes(':1234')) {
                      return '🧪 LM Studio: Click Local Server tab (↔) in LM Studio and click "Start Server" (port 1234). Load any GGUF model.';
                    }
                    if (url.includes(':8080')) {
                      return '⚡ llama.cpp: Run "llama-server -m your_model.gguf --port 8080" in your terminal.';
                    }
                    if (url.includes(':11434')) {
                      return '🦙 Ollama: Run "ollama serve" or "ollama run llama3.2" in your terminal.';
                    }
                    return '⚙️ Custom Endpoint: OpenAI-compatible API running locally or on LAN.';
                  })()}
                </p>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-zinc-300 text-[11px] leading-snug">
                <input
                  type="checkbox"
                  checked={!!currentConfig.toolsBeta}
                  onChange={(e) => updateAIConfig(activeProvider, { toolsBeta: e.target.checked })}
                  className="rounded bg-zinc-800 border-zinc-700 text-sky-600 focus:ring-0 mt-0.5"
                />
                <span>Enable agent tools (beta, JSON fallback — needs a capable model)</span>
              </label>
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

        {/* Usage tracking + daily alert */}
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded space-y-2.5">
          <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-[11px]">
            <BarChart3 size={13} className="text-sky-400" />
            <span>Usage</span>
          </div>

          {alertHit && (
            <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200">
              Daily budget reached ({fmtTok(todayTok)} / {fmtTok(dailyTokenAlert)} tokens).
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <div className="text-sm font-semibold text-white font-mono">{fmtTok(todayTok)}</div>
              <div className="text-[10px] text-zinc-500">today</div>
            </div>
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <div className="text-sm font-semibold text-white font-mono">{fmtTok(weekTok)}</div>
              <div className="text-[10px] text-zinc-500">last 7 days</div>
            </div>
          </div>

          {byProvider.length > 0 && (
            <div className="space-y-1">
              {byProvider.map(([p, n]) => (
                <div key={p} className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 capitalize">{p}</span>
                  <span className="font-mono text-zinc-300">{fmtTok(n)}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Daily alert budget (tokens, 0 = off)</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={dailyTokenAlert || ''}
              onChange={(e) => setDailyTokenAlert(Number(e.target.value))}
              placeholder="e.g. 500000"
              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {alertOn && (
            <div
              className="h-1 rounded bg-white/5 overflow-hidden"
              title={`${fmtTok(todayTok)} of ${fmtTok(dailyTokenAlert)} tokens used today`}
            >
              <div
                className={`h-full ${alertHit ? 'bg-amber-400' : 'bg-sky-500'} transition-all`}
                style={{ width: `${Math.min(100, (todayTok / dailyTokenAlert) * 100)}%` }}
              />
            </div>
          )}

          {usageLog.length === 0 && (
            <p className="text-[10px] text-zinc-600">No usage recorded yet — chat, agents and research log here.</p>
          )}
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
        </>
      )}
    </div>
  );
};
