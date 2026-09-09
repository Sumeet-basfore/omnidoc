import React, { useState } from 'react';
import {
  Kanban as KanbanIcon,
  Plus,
  Search,
  Sparkles,
  Download,
  Trash2,
  FileText,
  User,
  Tag,
  Clock,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { callAI } from '../../services/aiService';
import { keyService } from '../../services/keyService';
import { downloadBlob } from '../../services/exportService';
import type { KanbanCard, KanbanPriority } from '../../types/kanban';

export const KanbanBoardView: React.FC = () => {
  const {
    kanbanBoard,
    addKanbanCard,
    updateKanbanCard,
    moveKanbanCard,
    deleteKanbanCard,
    addKanbanColumn,
    deleteKanbanColumn,
    documents,
    tabs,
    activeTabId,
    setActiveTab,
    setMainView,
    activeProvider,
    activePersona,
    aiConfigs,
    customInstructions,
    teamMembers
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeNewCardColId, setActiveNewCardColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardPriority, setNewCardPriority] = useState<KanbanPriority>('medium');
  const [newCardAssignee, setNewCardAssignee] = useState('');
  const [newCardLinkDoc, setNewCardLinkDoc] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string, sourceColId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ cardId, sourceColId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data && data.cardId && data.sourceColId) {
        moveKanbanCard(data.cardId, data.sourceColId, targetColId);
      }
    } catch (err) {
      console.error('Drag and drop error:', err);
    }
  };

  const handleCreateCard = (colId: string) => {
    if (!newCardTitle.trim()) return;
    addKanbanCard(colId, {
      title: newCardTitle.trim(),
      description: newCardDesc.trim() || undefined,
      priority: newCardPriority,
      assignee: newCardAssignee.trim() || undefined,
      linkedDocId: newCardLinkDoc && activeDoc ? activeDoc.id : undefined,
      tags: []
    });
    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardAssignee('');
    setNewCardLinkDoc(false);
    setActiveNewCardColId(null);
  };

  const handleExportBoard = () => {
    const data = {
      board: kanbanBoard.title,
      exportedAt: new Date().toISOString(),
      columns: kanbanBoard.columns.map((c) => ({
        title: c.title,
        cards: c.cardIds.map((id) => kanbanBoard.cards[id]).filter(Boolean)
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'workspace-planning.json');
  };

  const handleGenerateTasksWithOmni = async () => {
    if (!activeDoc || isAiGenerating) return;
    const config = aiConfigs[activeProvider];
    const key = (await keyService.get(activeProvider as any)) || '';

    setIsAiGenerating(true);
    try {
      const prompt = `Analyze the provided document and extract 3 to 5 clear, concrete engineering or research tasks for a Kanban planning board.

Return ONLY a valid JSON array of objects with the following structure:
[
  {
    "title": "Task title (concise, actionable)",
    "description": "Short explanation of what needs to be done",
    "priority": "low" | "medium" | "high" | "urgent",
    "assignee": "Role or Name"
  }
]

Do not include any conversational preamble or markdown code fencing other than pure JSON.`;

      const response = await callAI(
        [{ id: `task-gen-${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }],
        config,
        key,
        activePersona,
        {
          name: activeDoc.name,
          format: activeDoc.format,
          content: activeDoc.content
        },
        customInstructions
      );

      // Clean JSON string
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tasks = JSON.parse(jsonMatch[0]);
        if (Array.isArray(tasks) && kanbanBoard.columns.length > 0) {
          const backlogCol = kanbanBoard.columns[0].id;
          tasks.forEach((t: any) => {
            if (t.title) {
              addKanbanCard(backlogCol, {
                title: String(t.title),
                description: t.description ? String(t.description) : undefined,
                priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority)
                  ? t.priority
                  : 'medium',
                assignee: t.assignee ? String(t.assignee) : undefined,
                linkedDocId: activeDoc.id,
                tags: ['AI-Generated']
              });
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to generate tasks with Omni:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const getPriorityBadge = (p: KanbanPriority) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'medium':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'low':
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark-base)] text-zinc-200 overflow-hidden select-none">
      {/* Board Top Toolbar */}
      <div className="h-12 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <KanbanIcon size={16} />
          </div>
          <div>
            <h1 className="text-xs font-semibold text-white leading-none">Team Planning & Task Matrix</h1>
            <span className="text-[10px] text-zinc-500 font-mono">
              {Object.keys(kanbanBoard.cards).length} total cards · {kanbanBoard.columns.length} stages
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search cards */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-40 pl-7 pr-2 py-1 rounded bg-black/40 border border-[var(--border-subtle)] text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* AI Task Extraction */}
          {activeDoc && (
            <button
              onClick={handleGenerateTasksWithOmni}
              disabled={isAiGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-40 shadow-sm"
              title={`Extract actionable tasks from "${activeDoc.name}"`}
            >
              {isAiGenerating ? (
                <>
                  <Loader2 size={12} className="animate-spin text-sky-400" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="text-amber-400" />
                  <span className="hidden sm:inline">Tasks from Doc</span>
                </>
              )}
            </button>
          )}

          {/* Export JSON */}
          <button
            onClick={handleExportBoard}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer border border-white/5"
            title="Export planning board (.json)"
          >
            <Download size={14} />
          </button>

          {/* Return to Editor */}
          <button
            onClick={() => setMainView('editor')}
            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
          >
            Back to Editor
          </button>
        </div>
      </div>

      {/* Board Columns Viewport */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start">
        {kanbanBoard.columns.map((col) => {
          const colCards = col.cardIds
            .map((id) => kanbanBoard.cards[id])
            .filter(Boolean)
            .filter((card) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                card.title.toLowerCase().includes(q) ||
                (card.description && card.description.toLowerCase().includes(q)) ||
                (card.assignee && card.assignee.toLowerCase().includes(q))
              );
            });

          const isComposingHere = activeNewCardColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="w-72 max-h-full flex flex-col bg-[var(--bg-dark-surface)] rounded border border-[var(--border-subtle)] shrink-0 shadow-sm"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-dark-surface)]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-zinc-200">{col.title}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono text-zinc-400 border border-white/5">
                    {colCards.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveNewCardColId(isComposingHere ? null : col.id)}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Add task card"
                  >
                    <Plus size={13} />
                  </button>
                  {kanbanBoard.columns.length > 1 && (
                    <button
                      onClick={() => deleteKanbanColumn(col.id)}
                      className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete column"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Card Composer */}
              {isComposingHere && (
                <div className="p-2.5 border-b border-sky-500/30 bg-sky-500/10 shrink-0 space-y-2">
                  <input
                    type="text"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="Task title..."
                    className="w-full px-2 py-1 rounded bg-black/40 border border-[var(--border-subtle)] text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                    autoFocus
                  />
                  <textarea
                    value={newCardDesc}
                    onChange={(e) => setNewCardDesc(e.target.value)}
                    placeholder="Details or checklist (optional)..."
                    className="w-full h-12 p-2 rounded bg-black/40 border border-[var(--border-subtle)] text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
                  />
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <select
                      value={newCardPriority}
                      onChange={(e) => setNewCardPriority(e.target.value as KanbanPriority)}
                      className="bg-black/40 border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-zinc-300 text-[10px]"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <input
                      type="text"
                      list="kanban-team-assignees"
                      value={newCardAssignee}
                      onChange={(e) => setNewCardAssignee(e.target.value)}
                      placeholder="Assignee"
                      className="w-24 px-1.5 py-0.5 rounded bg-black/40 border border-[var(--border-subtle)] text-[10px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                    />
                    <datalist id="kanban-team-assignees">
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.name} />
                      ))}
                    </datalist>
                  </div>

                  {activeDoc && (
                    <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newCardLinkDoc}
                        onChange={(e) => setNewCardLinkDoc(e.target.checked)}
                        className="rounded bg-black/40 border-white/10 text-sky-500 focus:ring-0"
                      />
                      <span>Link to "{activeDoc.name}"</span>
                    </label>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => setActiveNewCardColId(null)}
                      className="px-2 py-0.5 rounded hover:bg-white/10 text-zinc-400 text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleCreateCard(col.id)}
                      disabled={!newCardTitle.trim()}
                      className="px-2.5 py-0.5 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 text-[var(--text-on-accent)] font-semibold text-[10px] cursor-pointer"
                    >
                      Add Card
                    </button>
                  </div>
                </div>
              )}

              {/* Cards List in Column */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {colCards.length === 0 && !isComposingHere && (
                  <div className="py-8 text-center text-zinc-600 text-xs select-none">
                    No tasks
                  </div>
                )}
                {colCards.map((card) => {
                  const linkedDoc = card.linkedDocId ? documents[card.linkedDocId] : null;

                  return (
                    <div
                      key={card.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, card.id, col.id)}
                      className="group p-2.5 rounded bg-[var(--bg-dark-elevated)] hover:bg-[var(--bg-dark-elevated)]/90 border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all shadow-sm cursor-grab active:cursor-grabbing space-y-2"
                    >
                      {/* Top row: Priority & Delete */}
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`px-1.5 py-0.2 rounded border text-[9px] font-semibold uppercase tracking-wider ${getPriorityBadge(
                            card.priority
                          )}`}
                        >
                          {card.priority}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteKanbanCard(card.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-red-400 transition-opacity cursor-pointer"
                          title="Delete card"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>

                      {/* Card Title */}
                      <h4 className="text-xs font-medium text-zinc-200 leading-snug">
                        {card.title}
                      </h4>

                      {/* Description */}
                      {card.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      )}

                      {/* Linked Document Pill */}
                      {linkedDoc && (
                        <button
                          onClick={() => {
                            const targetTab = tabs.find((t) => t.documentId === linkedDoc.id);
                            if (targetTab) {
                              setActiveTab(targetTab.id);
                            }
                            setMainView('editor');
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-300 hover:text-white transition-colors cursor-pointer truncate max-w-full"
                          title={`Open ${linkedDoc.name}`}
                        >
                          <FileText size={10} className="shrink-0 text-sky-400" />
                          <span className="truncate">{linkedDoc.name}</span>
                        </button>
                      )}

                      {/* Footer: Assignee & Date */}
                      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        {card.assignee ? (
                          <div className="flex items-center gap-1 text-zinc-400">
                            <User size={10} />
                            <span>{card.assignee}</span>
                          </div>
                        ) : (
                          <span />
                        )}

                        <span>
                          {new Date(card.createdAt).toLocaleDateString([], {
                            month: 'numeric',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {colCards.length === 0 && !isComposingHere && (
                  <div className="py-8 text-center text-zinc-600 text-[11px]">
                    Empty column
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Column Button */}
        <button
          onClick={() => {
            const title = window.prompt('Enter new column title:');
            if (title && title.trim()) {
              addKanbanColumn(title.trim());
            }
          }}
          className="w-64 h-12 rounded border border-dashed border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-sky-500/5 text-zinc-400 hover:text-sky-300 flex items-center justify-center gap-1.5 transition-all text-xs font-medium cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Add Stage Column</span>
        </button>
      </div>
    </div>
  );
};
