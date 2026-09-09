import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check, Plus, AlertCircle, Trash2, Loader2, PenLine, Search, ListChecks, Lightbulb, Square, RotateCcw, FileText, X } from 'lucide-react';
import { marked } from 'marked';
import { useAppStore } from '../../store/useAppStore';
import { streamAI, isAbortError } from '../../services/aiService';
import { runAgent, AgentStepEvent } from '../../services/agentService';
import { trimHistory } from '../../services/budget';
import { keyService } from '../../services/keyService';

import { PERSONA_LABELS, PERSONA_DEFAULTS, composeSystemPrompt, resolveTier } from '../../services/personas';
import { AIPersona } from '../../types/ai';
import agentLogo from '../../assets/agent_logo.png';

export const ChatPanel: React.FC = () => {
  const {
    chatMessages,
    addChatMessage,
    clearChatMessages,
    activeProvider,
    activePersona,
    setActivePersona,
    aiConfigs,
    documents,
    tabs,
    activeTabId,
    queueInsert,
    popLastAssistant,
    logUsage,
    sessionUsage,
    addUsage,
    isAILoading,
    setAILoading,
    pendingInlinePrompt,
    setPendingInlinePrompt,
    toggleSidebar,
    setLeftPanel,
    agentMode,
    setAgentMode,
    selectedText,
    customInstructions,
    workspaceRules
  } = useAppStore();

  const [input, setInput] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [trimNote, setTrimNote] = useState<number>(0);
  const [agentSteps, setAgentSteps] = useState<AgentStepEvent[]>([]);
  const [dismissedChips, setDismissedChips] = useState<string[]>([]);
  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAILoading, streaming]);

  // Auto-send prompts queued by the inline selection toolbar
  useEffect(() => {
    if (pendingInlinePrompt) {
      const prompt = pendingInlinePrompt;
      setPendingInlinePrompt(null);
      handleSend(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInlinePrompt]);

  const canUseTools =
    (aiConfigs[activeProvider].id !== 'custom' || !!aiConfigs[activeProvider].toolsBeta) &&
    PERSONA_DEFAULTS[activePersona].tools.length > 0;

  const handlePersonaChange = (p: AIPersona) => {
    if (p === activePersona) return;
    if (PERSONA_DEFAULTS[p].tools.length === 0) setAgentMode(false);
    if (chatMessages.length > 0) {
      addChatMessage({
        role: 'system',
        content: `— Switched to ${PERSONA_LABELS[p]} —`,
        kind: 'divider'
      });
    }
    setActivePersona(p);
  };

  // Approximate selection line range for the grounding chip
  const selRange = (): string | null => {
    const sel = selectedText.trim();
    if (!sel || !activeDoc) return null;
    const idx = activeDoc.content.indexOf(sel.slice(0, 120));
    if (idx < 0) return null;
    const startLine = activeDoc.content.slice(0, idx).split('\n').length;
    const endLine = startLine + sel.split('\n').length - 1;
    return `~L${startLine}–${endLine}`;
  };

  const openDocs = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ id: string; name: string }> = [];
    for (const t of tabs) {
      const d = documents[t.documentId];
      if (d && !seen.has(d.id)) {
        seen.add(d.id);
        list.push({ id: d.id, name: d.name });
      }
    }
    return list;
  }, [tabs, documents]);

  const mentionCandidates = React.useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return openDocs
      .filter((d) => d.id !== activeDoc?.id && !attachedIds.includes(d.id))
      .filter((d) => d.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mention, openDocs, activeDoc, attachedIds]);

  const checkMention = (value: string, cursor: number) => {
    const before = value.slice(0, cursor);
    const m = before.match(/@([\w.\-]*)$/);
    if (m) {
      setMention({ query: m[1], start: cursor - m[0].length });
      setMentionIndex(0);
    } else {
      setMention(null);
    }
  };

  const attachDoc = (docId: string) => {
    const d = documents[docId];
    if (!d || d.id === activeDoc?.id || attachedIds.includes(docId) || attachedIds.length >= 2) {
      setMention(null);
      return;
    }
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? input.length;
    const start = mention ? mention.start : cursor;
    const next = input.slice(0, start) + `@${d.name} ` + input.slice(cursor);
    setInput(next);
    setAttachedIds((prev) => [...prev, docId]);
    setMention(null);
    setTimeout(() => {
      el?.focus();
      const pos = start + d.name.length + 2;
      el?.setSelectionRange(pos, pos);
    }, 0);
  };

  /** Document context honoring dismissed chips + attached files. */
  const buildDocContext = () => {
    const extras = attachedIds
      .map((id) => documents[id])
      .filter((d) => d && d.id !== activeDoc?.id)
      .slice(0, 2);
    const extraText = extras
      .map((d) => `\n\n[ATTACHED DOCUMENT "${d.name}"]\n"""\n${d.content.slice(0, 6000)}\n"""`)
      .join('');
    if (!activeDoc) {
      if (extras.length === 0) return undefined;
      return { name: 'attached files', format: 'text', content: extraText };
    }
    const showDoc = !dismissedChips.includes('doc');
    const showSel = !dismissedChips.includes('sel') && selectedText.trim() ? selectedText : undefined;
    const base = showDoc ? activeDoc.content : '';
    if (!base && !extraText) return undefined;
    return {
      name: activeDoc.name,
      format: activeDoc.format,
      content: base + extraText,
      ...(showSel ? { selectedText: showSel } : {})
    };
  };

  const handleAgentSend = async (base: typeof chatMessages) => {
    if (isAILoading) return;
    setErrorBanner(null);
    setAILoading(true);
    setAgentSteps([]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const config = aiConfigs[activeProvider];
      const apiKey = (await keyService.get(activeProvider as any)) || '';

      if (!apiKey && activeProvider !== 'custom') {
        throw new Error(
          `API Key for ${config.name} is not set. Please click Settings to configure your key.`
        );
      }

      const documentContext = buildDocContext();

      const full = base.map((m) => ({ ...m }));
      const { kept, trimmed } = trimHistory(full);
      setTrimNote(trimmed);

      const { text, usage } = await runAgent({
        task: kept[kept.length - 1].content,
        history: kept.slice(0, -1),
        config,
        apiKey,
        persona: activePersona,
        documentContext,
        tools: {
          getActiveDoc: () => activeDoc,
          getSelection: () => selectedText,
          queueInsert
        },
        maxSteps: 6,
        signal: ctrl.signal,
        customInstructions: customInstructions || undefined,
        onStep: (s) => setAgentSteps((prev) => [...prev, s])
      });

      if (usage) {
        addUsage(usage);
        logUsage({ provider: activeProvider, model: aiConfigs[activeProvider].model, inTok: usage.in || 0, outTok: usage.out || 0 });
      }
      addChatMessage({ role: 'assistant', content: text });
    } catch (err: any) {
      const stopped = isAbortError(err) || ctrl.signal.aborted;
      if (!stopped) {
        console.error('Agent run failed:', err);
        setErrorBanner(err.message || 'Agent run failed.');
        addChatMessage({
          role: 'assistant',
          content: `Error: ${err.message || 'Agent run failed.'}`
        });
      }
    } finally {
      abortRef.current = null;
      setAILoading(false);
    }
  };

  const sendMessages = async (base: typeof chatMessages) => {
    if (isAILoading) return;
    setErrorBanner(null);
    setAILoading(true);
    setStreaming('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = '';

    try {
      const config = aiConfigs[activeProvider];
      const apiKey = (await keyService.get(activeProvider as any)) || '';

      if (!apiKey && activeProvider !== 'custom') {
        throw new Error(
          `API Key for ${config.name} is not set. Please click Settings to configure your key.`
        );
      }

      const documentContext = buildDocContext();

      // Trim history to budget (latest turn always kept)
      const full = base.map((m) => ({ ...m }));
      const { kept, trimmed } = trimHistory(full);
      setTrimNote(trimmed);

      const { text, usage } = await streamAI({
        messages: kept,
        config,
        apiKey,
        persona: activePersona,
        documentContext,
        signal: ctrl.signal,
        customInstructions: customInstructions || undefined,
        workspaceRules,
        onToken: (t) => {
          acc += t;
          setStreaming(acc);
        }
      });

      setStreaming(null);
      if (usage) {
        addUsage(usage);
        logUsage({ provider: activeProvider, model: aiConfigs[activeProvider].model, inTok: usage.in || 0, outTok: usage.out || 0 });
      }
      addChatMessage({ role: 'assistant', content: text });
    } catch (err: any) {
      const stopped = isAbortError(err) || ctrl.signal.aborted;
      setStreaming(null);
      if (stopped) {
        // User-pressed Stop is not an error: keep what streamed so far.
        setErrorBanner(null);
        if (acc.trim()) {
          addChatMessage({ role: 'assistant', content: `${acc}\n\n· stopped` });
        }
      } else {
        console.error('Chat AI call failed:', err);
        setErrorBanner(err.message || 'Failed to generate response from AI provider.');
        addChatMessage({
          role: 'assistant',
          content: `Error: ${err.message || 'Failed to communicate with the AI provider.'}`
        });
      }
    } finally {
      abortRef.current = null;
      setAILoading(false);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isAILoading) return;

    const userMsg = {
      role: 'user' as const,
      content: textToSend.trim()
    };
    const base = [
      ...chatMessages,
      { ...userMsg, id: `temp-${Date.now()}`, timestamp: Date.now() }
    ];
    addChatMessage(userMsg);
    if (!customPrompt) setInput('');
    setDismissedChips([]);
    setMention(null);
    if (agentMode && canUseTools) {
      await handleAgentSend(base);
    } else {
      await sendMessages(base);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleRegenerate = async () => {
    if (isAILoading || streaming !== null) return;
    const hist = [...chatMessages];
    if (hist.length === 0 || hist[hist.length - 1].role !== 'assistant') return;
    const last = hist[hist.length - 1];
    if (last.content.startsWith('Error:')) return;
    popLastAssistant();
    const base = hist.slice(0, -1);
    if (agentMode && canUseTools) {
      // Re-run the agent on the same history (last user turn is base tail)
      const userMsg = {
        role: 'user' as const,
        content: 'Please try that again with a fresh attempt.',
        id: `temp-${Date.now()}`,
        timestamp: Date.now()
      };
      addChatMessage({ role: 'user', content: userMsg.content });
      await handleAgentSend([...base, userMsg]);
    } else {
      await sendMessages(base);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertIntoDoc = (text: string) => {
    if (!activeDoc) return;
    if (activeDoc.format !== 'markdown' && activeDoc.format !== 'text' && activeDoc.format !== 'code') return;
    queueInsert(activeDoc.id, text, 'AI chat');
  };

  const personas: Array<{ id: AIPersona; label: string; icon: React.ReactNode }> = [
    { id: 'friend', label: 'Co-writer', icon: <PenLine size={12} /> },
    { id: 'researcher', label: 'Researcher', icon: <Search size={12} /> },
    { id: 'proofreader', label: 'Proofreader', icon: <ListChecks size={12} /> },
    { id: 'brainstormer', label: 'Brainstorm', icon: <Lightbulb size={12} /> }
  ];

  const METER_MAX = 24000 + 15000 + 12000;
  const budgetChars = React.useMemo(() => {
    const hist = trimHistory(chatMessages.map((m) => ({ ...m }))).kept.reduce(
      (a, m) => a + m.content.length,
      0
    );
    const docChars =
      activeDoc && !dismissedChips.includes('doc') ? Math.min(activeDoc.content.length, 15000) : 0;
    const attChars = attachedIds.reduce((a, id) => {
      const d = documents[id];
      if (!d || d.id === activeDoc?.id || dismissedChips.includes(`file:${id}`)) return a;
      return a + Math.min(d.content.length, 6000);
    }, 0);
    return hist + docChars + attChars;
  }, [chatMessages, activeDoc, attachedIds, dismissedChips, documents]);

  const ContextBudgetBar: React.FC = () => {
    if (budgetChars === 0) return null;
    const pct = Math.min(100, (budgetChars / METER_MAX) * 100);
    const color = pct < 70 ? 'bg-sky-500' : pct < 100 ? 'bg-amber-400' : 'bg-red-400';
    return (
      <div
        className="h-0.5 rounded bg-white/5 mt-1.5 overflow-hidden"
        title={`~${budgetChars.toLocaleString()} / ${METER_MAX.toLocaleString()} context chars (history + doc + attached)`}
      >
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-dark-surface)] select-none">
      {/* Persona Pills Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-zinc-400">
            AI Persona Mode
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canUseTools && setAgentMode(!agentMode)}
              disabled={!canUseTools}
              title={
                PERSONA_DEFAULTS[activePersona].tools.length === 0
                  ? 'The Brainstorm persona answers directly — no tools, no agent loop'
                  : canUseTools
                    ? 'Agent mode: model can search, read and propose edits'
                    : 'Tools unavailable for this provider (enable tools beta in Settings for local models)'
              }
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                agentMode
                  ? 'bg-[var(--accent-primary)] border-transparent text-[var(--text-on-accent)] font-semibold'
                  : canUseTools
                    ? 'text-zinc-400 border-white/10 hover:text-zinc-200 hover:bg-white/5'
                    : 'text-zinc-600 border-white/5 cursor-not-allowed'
              }`}
            >
              <Bot size={11} />
              <span>Agent</span>
            </button>
            <button
              onClick={clearChatMessages}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              title="Clear Chat History"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePersonaChange(p.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activePersona === p.id
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
              }`}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error alert banner if key missing */}
      {errorBanner && (
        <div className="mx-3 mt-3 p-2.5 bg-red-950/40 border border-red-500/30 rounded flex items-start gap-2 text-xs text-red-200">
          <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{errorBanner}</span>
            <button
              onClick={() => {
                toggleSidebar(true);
                setLeftPanel('settings');
              }}
              className="block mt-1 font-semibold text-red-300 underline hover:text-white"
            >
              Open Provider Settings
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {trimNote > 0 && (
          <div className="text-center text-[10px] text-zinc-600 font-mono select-none">
            — {trimNote} earlier message{trimNote === 1 ? '' : 's'} trimmed to save context —
          </div>
        )}
        {chatMessages.map((msg, msgIdx) =>
          msg.kind === 'divider' ? (
            <div key={msg.id} className="text-center text-[10px] font-mono text-zinc-600 select-none py-1">
              {msg.content}
            </div>
          ) : (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            } space-y-1`}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 px-1 select-none">
              {msg.role === 'user' ? (
                <>
                  <span>You</span>
                  <User size={12} />
                </>
              ) : (
                <>
                  <img src={agentLogo} alt="Omni" className="w-3.5 h-3.5 rounded-full object-cover" draggable={false} />
                  <span className="text-sky-300 font-medium">Omni</span>
                </>
              )}
            </div>

            <div
              className={`p-3.5 rounded-md max-w-[90%] text-xs leading-relaxed transition-all ${
                msg.role === 'user'
                  ? 'bg-sky-600/30 text-zinc-100 border border-sky-500/30 rounded-tr-sm'
                  : 'bg-[var(--bg-dark-surface)] text-zinc-200 border border-white/10 shadow-lg rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="doc-prose text-xs [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>pre]:bg-black/50 [&>pre]:p-2.5 [&>pre]:rounded [&>code]:bg-white/10 [&>code]:px-1 [&>code]:rounded overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                />
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}

              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 select-none">
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedId === msg.id ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} />
                    )}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  {msgIdx === chatMessages.length - 1 &&
                    !msg.content.startsWith('Error:') &&
                    !isAILoading &&
                    streaming === null && (
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors"
                      title="Regenerate response"
                    >
                      <RotateCcw size={11} />
                      <span>Regenerate</span>
                    </button>
                  )}

                  {activeDoc &&
                    (activeDoc.format === 'markdown' ||
                      activeDoc.format === 'text' ||
                      activeDoc.format === 'code') && (
                    <button
                      onClick={() => handleInsertIntoDoc(msg.content)}
                      className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors ml-auto"
                      title="Queue for review before inserting"
                    >
                      <Plus size={11} />
                      <span>Insert in Doc</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {streaming !== null && (
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 px-1 select-none">
              <img src={agentLogo} alt="Omni" className="w-3.5 h-3.5 rounded-full object-cover" draggable={false} />
              <span className="text-sky-300 font-medium">Omni</span>
            </div>
            <div className="p-3.5 rounded-md max-w-[90%] text-xs leading-relaxed bg-[var(--bg-dark-surface)] text-zinc-200 border border-white/10 shadow-lg rounded-tl-sm">
              {streaming === '' ? (
                <span className="text-zinc-500">…</span>
              ) : (
                <div
                  className="doc-prose text-xs [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>pre]:bg-black/50 [&>pre]:p-2.5 [&>pre]:rounded [&>code]:bg-white/10 [&>code]:px-1 [&>code]:rounded overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: (() => { try { return marked.parse(streaming) as string; } catch { return streaming; } })() }}
                />
              )}
            </div>
          </div>
        )}

        {isAILoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
            {streaming === null && <Loader2 size={16} className="animate-spin text-sky-400" />}
            <span>{streaming === null ? 'Working…' : 'Streaming…'}</span>
            <button
              onClick={handleStop}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-zinc-200 text-[11px] transition-colors ml-1"
            >
              <Square size={10} />
              <span>Stop</span>
            </button>
          </div>
        )}

        {agentSteps.length > 0 && (
          <div className="rounded border border-white/10 bg-black/20 p-2 space-y-1 select-none">
            <div className="text-[10px] font-semibold text-zinc-500 font-mono px-1">
              agent steps ({agentSteps.length})
            </div>
            {agentSteps.map((s, i) => (
              <div key={i} className="text-[10px] font-mono text-zinc-400 px-1 truncate" title={s.result}>
                <span className="text-sky-300">#{s.n} {s.tool}</span>
                <span className="text-zinc-600"> {s.args}</span>
                <span className="text-zinc-500"> → {s.result}</span>
                <span className="text-zinc-600"> · {s.ms}ms</span>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Prompts */}
      <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto border-t border-white/5 bg-black/20 text-[11px] text-zinc-400">
        <button
          onClick={() => handleSend('Please summarize the key takeaways of the current document.')}
          className="whitespace-nowrap px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-zinc-200 transition-colors"
        >
          Summarize doc
        </button>
        <button
          onClick={() =>
            handleSend('Proofread the document and suggest improvements for clarity and tone.')
          }
          className="whitespace-nowrap px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-zinc-200 transition-colors"
        >
          Proofread
        </button>
        <button
          onClick={() => handleSend('What are 3 interesting counter-arguments or missing angles here?')}
          className="whitespace-nowrap px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-zinc-200 transition-colors"
        >
          Brainstorm angles
        </button>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)] relative">
        {/* Grounding chips */}
        {(activeDoc && !dismissedChips.includes('doc')) ||
        (selRange() && !dismissedChips.includes('sel')) ||
        attachedIds.some((id) => documents[id] && !dismissedChips.includes(`file:${id}`)) ? (
          <div className="flex flex-wrap gap-1.5 mb-2 select-none">
            {activeDoc && !dismissedChips.includes('doc') && (
              <button
                onClick={() => setDismissedChips((p) => [...p, 'doc'])}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
                title="Exclude this document from the next request"
              >
                <FileText size={10} />
                <span className="max-w-[140px] truncate">{activeDoc.name}</span>
                <X size={10} className="text-zinc-500" />
              </button>
            )}
            {selRange() && !dismissedChips.includes('sel') && (
              <button
                onClick={() => setDismissedChips((p) => [...p, 'sel'])}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-[10px] text-sky-300 hover:text-white transition-colors"
                title="Exclude the selection from the next request"
              >
                <span className="font-mono">{selRange()}</span>
                <X size={10} className="text-zinc-500" />
              </button>
            )}
            {attachedIds.map((id) => {
              const d = documents[id];
              if (!d || dismissedChips.includes(`file:${id}`)) return null;
              return (
                <button
                  key={id}
                  onClick={() => setDismissedChips((p) => [...p, `file:${id}`])}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-colors"
                  title="Exclude this file from the next request"
                >
                  <span className="text-zinc-500 font-mono">@</span>
                  <span className="max-w-[140px] truncate">{d.name}</span>
                  <X size={10} className="text-zinc-500" />
                </button>
              );
            })}
          </div>
        ) : null}

        {/* @file mention dropdown */}
        {mention && mentionCandidates.length > 0 && (
          <div className="absolute left-3 right-3 bottom-full mb-1 bg-[var(--bg-dark-elevated)] border border-[var(--border-subtle)] rounded-md shadow-2xl py-1 z-30 animate-modal max-h-44 overflow-y-auto">
            {mentionCandidates.map((d, idx) => (
              <button
                key={d.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  attachDoc(d.id);
                }}
                onMouseEnter={() => setMentionIndex(idx)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  mentionIndex === idx ? 'bg-sky-500/15 text-white' : 'text-zinc-300'
                }`}
              >
                <span className="text-zinc-500 font-mono">@</span>
                <span className="ml-1">{d.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-[var(--bg-dark-surface)] border border-white/10 rounded-md p-2 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              checkMention(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={(e) => {
              if (mention && mentionCandidates.length > 0) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  setMentionIndex((i) =>
                    e.key === 'ArrowDown'
                      ? (i + 1) % mentionCandidates.length
                      : (i - 1 + mentionCandidates.length) % mentionCandidates.length
                  );
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  attachDoc(mentionCandidates[mentionIndex]?.id || mentionCandidates[0].id);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setMention(null);
                  return;
                }
              }
              if (e.key === 'Backspace' && input === '' && attachedIds.length > 0) {
                e.preventDefault();
                setAttachedIds((prev) => prev.slice(0, -1));
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Omni or request writing help..."
            rows={2}
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 resize-none outline-none leading-relaxed"
          />
          {isAILoading ? (
            <button
              onClick={handleStop}
              className="p-2 rounded bg-white/10 hover:bg-white/15 text-zinc-200 transition-all shrink-0"
              title="Stop generating"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-2 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-30 text-[var(--text-on-accent)] transition-all shrink-0"
            >
              <Send size={14} />
            </button>
          )}
        </div>
        {sessionUsage.in + sessionUsage.out > 0 && (
          <div className="mt-1.5 text-[10px] font-mono text-zinc-600 text-right select-none">
            ~{(sessionUsage.in / 1000).toFixed(1)}k in / ~{(sessionUsage.out / 1000).toFixed(1)}k out this chat
          </div>
        )}
        <ContextBudgetBar />
      </div>
    </div>
  );
};
