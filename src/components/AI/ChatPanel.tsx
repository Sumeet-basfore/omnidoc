import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check, Plus, AlertCircle, Trash2, Loader2, PenLine, Search, ListChecks, Lightbulb } from 'lucide-react';
import { marked } from 'marked';
import { useAppStore } from '../../store/useAppStore';
import { callAI } from '../../services/aiService';
import { keyService } from '../../services/keyService';
import { AIPersona } from '../../types/ai';

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
    updateDocumentContent,
    setSettingsOpen,
    isAILoading,
    setAILoading,
    pendingInlinePrompt,
    setPendingInlinePrompt
  } = useAppStore();

  const [input, setInput] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAILoading]);

  // Auto-send prompts queued by the inline selection toolbar
  useEffect(() => {
    if (pendingInlinePrompt) {
      const prompt = pendingInlinePrompt;
      setPendingInlinePrompt(null);
      handleSend(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInlinePrompt]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isAILoading) return;

    setErrorBanner(null);
    const userMsg = {
      role: 'user' as const,
      content: textToSend.trim()
    };
    addChatMessage(userMsg);
    if (!customPrompt) setInput('');
    setAILoading(true);

    try {
      const config = aiConfigs[activeProvider];
      const apiKey = (await keyService.get(activeProvider as any)) || '';

      if (!apiKey && activeProvider !== 'custom') {
        throw new Error(
          `API Key for ${config.name} is not set. Please click Settings to configure your key.`
        );
      }

      const documentContext = activeDoc
        ? {
            name: activeDoc.name,
            format: activeDoc.format,
            content: activeDoc.content
          }
        : undefined;

      const aiResponse = await callAI(
        [...chatMessages, { ...userMsg, id: 'temp', timestamp: Date.now() }],
        config,
        apiKey,
        activePersona,
        documentContext
      );

      addChatMessage({
        role: 'assistant',
        content: aiResponse
      });
    } catch (err: any) {
      console.error('Chat AI call failed:', err);
      setErrorBanner(err.message || 'Failed to generate response from AI provider.');
      addChatMessage({
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to communicate with the AI provider.'}`
      });
    } finally {
      setAILoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertIntoDoc = (text: string) => {
    if (!activeDoc || activeDoc.format === 'pdf' || activeDoc.format === 'docx') return;
    const separator = activeDoc.content.trim() ? '\n\n' : '';
    updateDocumentContent(activeDoc.id, `${activeDoc.content}${separator}${text}`);
  };

  const personas: Array<{ id: AIPersona; label: string; icon: React.ReactNode }> = [
    { id: 'friend', label: 'Co-writer', icon: <PenLine size={12} /> },
    { id: 'researcher', label: 'Researcher', icon: <Search size={12} /> },
    { id: 'proofreader', label: 'Proofreader', icon: <ListChecks size={12} /> },
    { id: 'brainstormer', label: 'Brainstorm', icon: <Lightbulb size={12} /> }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-dark-surface)] select-none">
      {/* Persona Pills Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-zinc-400">
            AI Persona Mode
          </span>
          <button
            onClick={clearChatMessages}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePersona(p.id)}
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
              onClick={() => setSettingsOpen(true)}
              className="block mt-1 font-semibold text-red-300 underline hover:text-white"
            >
              Open Provider Settings
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {chatMessages.map((msg) => (
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
                  <Bot size={12} className="text-sky-400" />
                  <span className="text-sky-300 font-medium">AI Friend</span>
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

                  {activeDoc && (
                    <button
                      onClick={() => handleInsertIntoDoc(msg.content)}
                      className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors ml-auto"
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

        {isAILoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
            <Loader2 size={16} className="animate-spin text-sky-400" />
            <span>Working…</span>
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
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-glass)]">
        <div className="flex items-end gap-2 bg-[var(--bg-dark-surface)] border border-white/10 rounded-md p-2 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI Friend or request writing help..."
            rows={2}
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 resize-none outline-none leading-relaxed"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isAILoading}
            className="p-2 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-30 text-[var(--text-on-accent)] transition-all shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
