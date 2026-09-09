import React, { useState, useEffect } from 'react';
import { ChevronLeft, Key, ShieldCheck, ShieldAlert, Check, Loader2, Cpu, Globe, RefreshCw, BarChart3, Users } from 'lucide-react';
import { listModels } from '../../services/modelDiscovery';
import { useAppStore } from '../../store/useAppStore';
import { keyService, KeyProvider } from '../../services/keyService';
import { AIProviderId } from '../../types/ai';
import { callAI } from '../../services/aiService';
import { WorkspaceRulesSettings } from './WorkspaceRulesSettings';

export const ProviderSettings: React.FC = () => {
  const {
    setLeftPanel,
    activeProvider,
    setActiveProvider,
    aiConfigs,
    updateAIConfig,
    usageLog,
    dailyTokenAlert,
    setDailyTokenAlert
  } = useAppStore();

  const [settingsTab, setSettingsTab] = useState<'keys' | 'rules'>('keys');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [isEncrypted, setIsEncrypted] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [knownModels, setKnownModels] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoverError, setDiscoverError] = useState<string>('');

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
  const canDiscover = activeProvider !== 'anthropic';

  const handleRefreshModels = async () => {
    setDiscovering(true);
    setDiscoverError('');
    try {
      const apiKey = keys[activeProvider] || '';
      const models = await listModels(currentConfig, apiKey);
      setKnownModels(models);
      if (models.length === 0) setDiscoverError('No models found.');
    } catch (err: any) {
      setKnownModels([]);
      setDiscoverError(err?.message || 'Discovery failed.');
    } finally {
      setDiscovering(false);
    }
  };

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
                onClick={() => {
                  setActiveProvider(p);
                  setKnownModels([]);
                  setDiscoverError('');
                }}
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
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={currentConfig.model}
                onChange={(e) => updateAIConfig(activeProvider, { model: e.target.value })}
                list="discovered-models"
                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              {canDiscover && (
                <button
                  onClick={handleRefreshModels}
                  disabled={discovering}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors shrink-0"
                  title="Detect available models from the endpoint"
                >
                  <RefreshCw size={13} className={discovering ? 'animate-spin text-sky-400' : ''} />
                </button>
              )}
            </div>
            <datalist id="discovered-models">
              {knownModels.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {discoverError && (
              <p className="mt-1.5 text-[11px] text-red-300 leading-snug">{discoverError}</p>
            )}
            {knownModels.length > 0 && !discoverError && (
              <p className="mt-1.5 text-[10px] font-mono text-zinc-500">
                {knownModels.length} models detected — pick from the list or keep typing
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
            <div className="space-y-2.5">
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
