import React from 'react';
import { Sparkles, Lightbulb, FileText, RefreshCw, Search, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const InlineSelectionToolbar: React.FC = () => {
  const {
    selectedText,
    selectionCoords,
    setSelectedText,
    setPendingInlinePrompt,
    toggleAIDrawer,
    toggleCommentsPanel
  } = useAppStore();

  if (!selectedText || !selectionCoords) return null;

  const handleAction = (action: string) => {
    let prompt = '';
    switch (action) {
      case 'polish':
        prompt = `Please polish and refine this selected text for optimal clarity, flow, and elegance while preserving its original meaning:\n\n"${selectedText}"`;
        break;
      case 'simplify':
        prompt = `Please rewrite this selected text to be clearer, simpler, and more concise:\n\n"${selectedText}"`;
        break;
      case 'expand':
        prompt = `Please expand on this selected text with additional details, reasoning, and context:\n\n"${selectedText}"`;
        break;
      case 'rephrase':
        prompt = `Please rephrase this selected text in a polished, professional executive tone:\n\n"${selectedText}"`;
        break;
      case 'research':
        prompt = `Please conduct a focused research synthesis on this topic:\n\n"${selectedText}"`;
        break;
      case 'ask':
      default:
        prompt = `I have selected this excerpt from the document:\n"${selectedText}"\n\nWhat can we improve or analyze here?`;
        break;
    }

    setPendingInlinePrompt(prompt);
    toggleAIDrawer(true);
    setSelectedText('', null);
  };

  return (
    <div
      style={{
        top: `${selectionCoords.top + 8}px`,
        left: `${selectionCoords.left}px`
      }}
      className="fixed z-50 flex items-center gap-1 p-1 bg-[var(--bg-dark-surface)]/95 border border-[var(--border-medium)] rounded-full shadow-2xl animate-modal select-none text-xs"
    >
      <button
        onClick={() => handleAction('polish')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-sky-300 hover:text-white transition-colors"
        title="Fix & Polish Writing"
      >
        <Sparkles size={12} className="text-sky-400" />
        <span>Polish</span>
      </button>

      <button
        onClick={() => handleAction('simplify')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
        title="Simplify and Clarify"
      >
        <Lightbulb size={12} className="text-amber-400" />
        <span>Simplify</span>
      </button>

      <button
        onClick={() => handleAction('expand')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
        title="Expand Details"
      >
        <FileText size={12} className="text-cyan-400" />
        <span>Expand</span>
      </button>

      <button
        onClick={() => handleAction('rephrase')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
        title="Professional Tone"
      >
        <RefreshCw size={12} className="text-emerald-400" />
        <span>Rephrase</span>
      </button>

      <div className="w-[1px] h-3 bg-white/15 mx-0.5" />

      <button
        onClick={() => handleAction('research')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-cyan-300 hover:text-white transition-colors"
        title="Research This Selection"
      >
        <Search size={12} />
        <span>Research</span>
      </button>

      <button
        onClick={() => {
          toggleCommentsPanel(true);
        }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-indigo-300 hover:text-white transition-colors"
        title="Add Review Comment to Selection (⌥C)"
      >
        <MessageSquarePlus size={12} className="text-indigo-400" />
        <span>Comment</span>
      </button>

      <button
        onClick={() => handleAction('ask')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
        title="Ask Omni"
      >
        <MessageSquare size={12} />
        <span>Ask Omni</span>
      </button>
    </div>
  );
};
