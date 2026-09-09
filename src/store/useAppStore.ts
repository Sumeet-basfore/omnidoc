import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DocumentFormat, DocumentItem, WorkspaceTab } from '../types/document';
import { AIProviderId, AIPersona, AIMessage, AIProviderConfig } from '../types/ai';
import { DocumentComment, CommentReply } from '../types/comment';
import { KanbanBoard, KanbanCard, KanbanColumn } from '../types/kanban';
import { WorkspaceRules, DEFAULT_WORKSPACE_RULES } from '../types/workspace';
import {
  TeamMember,
  TeamHubSubTab,
  DEFAULT_TEAM_MEMBERS,
  TeamWorkspace,
  WorkspaceInvitePayload
} from '../types/team';
import { generateWorkspaceCode } from '../services/teamSyncService';

export type MainView = 'studio' | 'team' | 'editor' | 'kanban';

export interface PendingInsert {
  id: string;
  text: string;
  label: string;
  timestamp: number;
}

export interface UsageEntry {
  t: number;
  provider: string;
  model: string;
  inTok: number;
  outTok: number;
}

interface AppState {
  // Document workspace
  documents: Record<string, DocumentItem>;
  tabs: WorkspaceTab[];
  activeTabId: string | null;

  // UI state
  mainView: MainView;
  setMainView: (view: MainView) => void;
  teamHubSubTab: TeamHubSubTab;
  setTeamHubSubTab: (tab: TeamHubSubTab) => void;
  teamMembers: TeamMember[];
  setTeamMembers: (members: TeamMember[]) => void;
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  removeTeamMember: (id: string) => void;

  // Multiple Team Workspaces
  teamWorkspaces: Record<string, TeamWorkspace>;
  activeWorkspaceId: string;
  createTeamWorkspace: (name: string, description?: string, creator?: { name?: string; role?: string }) => string;
  switchTeamWorkspace: (id: string) => void;
  deleteTeamWorkspace: (id: string) => void;
  importTeamWorkspace: (payload: WorkspaceInvitePayload, joiningUser?: { name: string; role?: string }) => string;
  isSidebarOpen: boolean;
  leftPanel: 'files' | 'settings';
  setLeftPanel: (view: 'files' | 'settings') => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  drawerWidth: number;
  setDrawerWidth: (w: number) => void;
  isAIDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isExportModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  isUserGuideOpen: boolean;
  theme: 'dark';

  // AI companion state
  activeProvider: AIProviderId;
  activePersona: AIPersona;
  chatMessages: AIMessage[];
  isAILoading: boolean;
  aiConfigs: Record<AIProviderId, AIProviderConfig>;

  // Selection state for inline AI toolbar
  selectedText: string;
  selectionCoords: { top: number; left: number } | null;

  // Recent files
  recentFiles: string[];

  // Actions
  openDocument: (doc: DocumentItem) => void;
  createDocument: (format: DocumentFormat, name?: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateDocumentContent: (docId: string, content: string) => void;
  renameDocument: (docId: string, name: string) => void;
  setDocumentPath: (docId: string, filePath: string) => void;
  markDirty: (docId: string, dirty: boolean) => void;
  setTabActiveView: (tabId: string, view: 'editor' | 'preview' | 'split' | 'grid') => void;
  toggleSidebar: (force?: boolean) => void;
  toggleAIDrawer: (force?: boolean) => void;
  setAIDrawerOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setUserGuideOpen: (open: boolean) => void;
  setActiveProvider: (provider: AIProviderId) => void;
  setActivePersona: (persona: AIPersona) => void;
  updateAIConfig: (provider: AIProviderId, config: Partial<AIProviderConfig>) => void;
  addChatMessage: (msg: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  popLastAssistant: () => void;
  clearChatMessages: () => void;
  sessionUsage: { in: number; out: number };
  addUsage: (u: { in?: number; out?: number }) => void;
  usageLog: UsageEntry[];
  logUsage: (e: Omit<UsageEntry, 't'>) => void;
  dailyTokenAlert: number;
  setDailyTokenAlert: (n: number) => void;
  setAILoading: (loading: boolean) => void;
  setSelectedText: (text: string, coords: { top: number; left: number } | null) => void;
  addRecentFile: (filePath: string) => void;
  removeRecentFile: (filePath: string) => void;
  clearRecentFiles: () => void;
  pendingInlinePrompt: string | null;
  setPendingInlinePrompt: (prompt: string | null) => void;
  agentMode: boolean;
  setAgentMode: (on: boolean) => void;
  customInstructions: string;
  setCustomInstructions: (s: string) => void;
  lastSavedAt: number | null;
  setLastSavedAt: (t: number | null) => void;
  pendingInserts: Record<string, PendingInsert[]>;
  queueInsert: (docId: string, text: string, label: string) => void;
  resolveInsert: (docId: string, insertId: string, accept: boolean) => void;

  // Document comments & annotations
  comments: Record<string, DocumentComment[]>;
  activeCommentId: string | null;
  isCommentsPanelOpen: boolean;
  toggleCommentsPanel: (force?: boolean) => void;
  setActiveCommentId: (id: string | null) => void;
  addComment: (docId: string, highlightedText: string, content: string, author?: string) => string;
  addReply: (docId: string, commentId: string, content: string, author?: string, isAI?: boolean) => void;
  resolveComment: (docId: string, commentId: string, resolved?: boolean) => void;
  deleteComment: (docId: string, commentId: string) => void;
  deleteReply: (docId: string, commentId: string, replyId: string) => void;

  // Team Planning & Kanban
  kanbanBoard: KanbanBoard;
  setKanbanBoard: (board: KanbanBoard) => void;
  addKanbanCard: (columnId: string, card: Omit<KanbanCard, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateKanbanCard: (cardId: string, updates: Partial<KanbanCard>) => void;
  moveKanbanCard: (cardId: string, sourceColId: string, targetColId: string, targetIndex?: number) => void;
  deleteKanbanCard: (cardId: string) => void;
  addKanbanColumn: (title: string) => void;
  deleteKanbanColumn: (columnId: string) => void;

  // Workspace Team Rules & Style
  workspaceRules: WorkspaceRules;
  updateWorkspaceRules: (rules: Partial<WorkspaceRules>) => void;
  resetWorkspaceRules: () => void;
  loadWorkspaceRulesFromJson: (jsonStr: string) => boolean;
}

const DEFAULT_AI_CONFIGS: Record<AIProviderId, AIProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    model: 'gemini-2.0-flash',
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
};

const DEFAULT_KANBAN_BOARD: KanbanBoard = {
  id: 'board-default',
  title: 'Workspace Planning Board',
  columns: [
    { id: 'col-backlog', title: 'Backlog', cardIds: [] },
    { id: 'col-in-progress', title: 'In Progress', cardIds: [] },
    { id: 'col-review', title: 'Review & QA', cardIds: [] },
    { id: 'col-done', title: 'Done', cardIds: [] }
  ],
  cards: {}
};

const DEFAULT_WORKSPACE_ID = 'ws-default';
const DEFAULT_WORKSPACE: TeamWorkspace = {
  id: DEFAULT_WORKSPACE_ID,
  name: 'OmniDoc Core Team',
  code: 'OMNI-CORE',
  description: 'Primary team workspace for sprint planning, reviews, and documents.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  members: DEFAULT_TEAM_MEMBERS,
  workspaceRules: DEFAULT_WORKSPACE_RULES,
  kanbanBoard: DEFAULT_KANBAN_BOARD
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      documents: {},
      tabs: [],
      activeTabId: null,

      mainView: 'studio',
      setMainView: (view) => set({ mainView: view }),
      teamHubSubTab: 'planning',
      teamMembers: DEFAULT_TEAM_MEMBERS,
      kanbanBoard: DEFAULT_KANBAN_BOARD,
      workspaceRules: DEFAULT_WORKSPACE_RULES,

      teamWorkspaces: { [DEFAULT_WORKSPACE_ID]: DEFAULT_WORKSPACE },
      activeWorkspaceId: DEFAULT_WORKSPACE_ID,

      isSidebarOpen: true,
      leftPanel: 'files',
      sidebarWidth: 260,
      drawerWidth: 380,
      isAIDrawerOpen: false,
      isCommentsPanelOpen: false,
      activeCommentId: null,
      comments: {},
      isCommandPaletteOpen: false,
      isExportModalOpen: false,
      isShortcutsModalOpen: false,
      isUserGuideOpen: false,
      theme: 'dark',

      activeProvider: 'gemini',
      activePersona: 'friend',
      chatMessages: [
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: "Hello! I'm Omni, your research partner in OmniDoc Studio. How can I help with your document today? I can draft sections, summarize content, run deep research, or proofread your writing.",
          timestamp: Date.now()
        }
      ],
      isAILoading: false,
      aiConfigs: DEFAULT_AI_CONFIGS,

      selectedText: '',
      selectionCoords: null,
      recentFiles: [],

      openDocument: (doc) =>
        set((state) => {
          // Check if already open in tabs
          const existingTab = state.tabs.find((t) => state.documents[t.documentId]?.filePath && state.documents[t.documentId]?.filePath === doc.filePath);
          if (existingTab) {
            return {
              activeTabId: existingTab.id,
              documents: { ...state.documents, [doc.id]: doc }
            };
          }

          const tab: WorkspaceTab = {
            id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            documentId: doc.id,
            activeView: doc.format === 'markdown' ? 'split' : doc.format === 'csv' || doc.format === 'json' ? 'grid' : 'preview'
          };
          return {
            documents: { ...state.documents, [doc.id]: doc },
            tabs: [...state.tabs, tab],
            activeTabId: tab.id
          };
        }),

      createDocument: (format, name) => {
        const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const ext = format === 'markdown' ? 'md' : format === 'csv' ? 'csv' : format === 'json' ? 'json' : format === 'docx' ? 'docx' : 'txt';
        const docName = name || `Untitled.${ext}`;

        let initialContent = '';
        if (format === 'markdown') {
          initialContent = `# ${docName.replace('.md', '')}\n\nStart writing your document here...\n`;
        } else if (format === 'docx') {
          initialContent = '<p>Start typing your Word document content here...</p>';
        } else if (format === 'csv') {
          initialContent = 'ID,Name,Role,Status\n1,Alice,Engineer,Active\n2,Bob,Designer,Review';
        } else if (format === 'json') {
          initialContent = '[\n  {\n    "id": 1,\n    "name": "Project Alpha",\n    "status": "in_progress"\n  }\n]';
        }

        const newDoc: DocumentItem = {
          id,
          name: docName,
          format,
          content: initialContent,
          isDirty: false
        };

        const tab: WorkspaceTab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          documentId: id,
          activeView: format === 'markdown' ? 'split' : format === 'csv' || format === 'json' ? 'grid' : 'editor'
        };

        set((state) => ({
          documents: { ...state.documents, [id]: newDoc },
          tabs: [...state.tabs, tab],
          activeTabId: tab.id
        }));
      },

      closeTab: (tabId) =>
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          let newActiveId = state.activeTabId;
          if (state.activeTabId === tabId) {
            const index = state.tabs.findIndex((t) => t.id === tabId);
            if (newTabs.length === 0) {
              newActiveId = null;
            } else if (index >= newTabs.length) {
              newActiveId = newTabs[newTabs.length - 1].id;
            } else {
              newActiveId = newTabs[index].id;
            }
          }
          return {
            tabs: newTabs,
            activeTabId: newActiveId
          };
        }),

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      updateDocumentContent: (docId, content) =>
        set((state) => {
          const doc = state.documents[docId];
          if (!doc) return state;
          return {
            documents: {
              ...state.documents,
              [docId]: {
                ...doc,
                content,
                isDirty: true,
                metadata: {
                  ...doc.metadata,
                  wordCount: content.trim().split(/\s+/).filter(Boolean).length
                }
              }
            }
          };
        }),

      renameDocument: (docId, name) =>
        set((state) => {
          const doc = state.documents[docId];
          if (!doc) return state;
          return {
            documents: {
              ...state.documents,
              [docId]: { ...doc, name, isDirty: true }
            }
          };
        }),

      markDirty: (docId, dirty) =>
        set((state) => {
          const doc = state.documents[docId];
          if (!doc) return state;
          return {
            documents: {
              ...state.documents,
              [docId]: { ...doc, isDirty: dirty }
            }
          };
        }),

      setTabActiveView: (tabId, view) =>
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, activeView: view } : t))
        })),

      toggleSidebar: (force) =>
        set((state) => ({
          isSidebarOpen: force !== undefined ? force : !state.isSidebarOpen
        })),

      toggleAIDrawer: (force) =>
        set((state) => ({
          isAIDrawerOpen: force !== undefined ? force : !state.isAIDrawerOpen
        })),

      setAIDrawerOpen: (open) => set({ isAIDrawerOpen: open }),

      setLeftPanel: (view) => set({ leftPanel: view }),

      setSidebarWidth: (w) =>
        set({ sidebarWidth: Math.min(400, Math.max(200, Math.round(w))) }),
      setDrawerWidth: (w) =>
        set({ drawerWidth: Math.min(520, Math.max(320, Math.round(w))) }),

      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

      setExportModalOpen: (open) => set({ isExportModalOpen: open }),

      setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
      setUserGuideOpen: (open) => set({ isUserGuideOpen: open }),

      setActiveProvider: (provider) => set({ activeProvider: provider }),

      setActivePersona: (persona) => set({ activePersona: persona }),

      updateAIConfig: (provider, config) =>
        set((state) => ({
          aiConfigs: {
            ...state.aiConfigs,
            [provider]: {
              ...state.aiConfigs[provider],
              ...config
            }
          }
        })),

      addChatMessage: (msg) =>
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              ...msg,
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp: Date.now()
            }
          ]
        })),

      clearChatMessages: () => set({ chatMessages: [], sessionUsage: { in: 0, out: 0 } }),

      popLastAssistant: () =>
        set((state) => {
          const msgs = [...state.chatMessages];
          if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') msgs.pop();
          return { chatMessages: msgs };
        }),

      sessionUsage: { in: 0, out: 0 },
      addUsage: (u) =>
        set((state) => ({
          sessionUsage: {
            in: state.sessionUsage.in + (u.in || 0),
            out: state.sessionUsage.out + (u.out || 0)
          }
        })),

      usageLog: [],
      logUsage: (e) =>
        set((state) => ({
          usageLog: [...state.usageLog, { ...e, t: Date.now() }].slice(-500)
        })),
      dailyTokenAlert: 0,
      setDailyTokenAlert: (n) => set({ dailyTokenAlert: Math.max(0, Math.round(n) || 0) }),

      setAILoading: (loading) => set({ isAILoading: loading }),

      setSelectedText: (text, coords) =>
        set({
          selectedText: text,
          selectionCoords: coords
        }),

      pendingInlinePrompt: null,
      setPendingInlinePrompt: (prompt) => set({ pendingInlinePrompt: prompt }),

      agentMode: false,
      setAgentMode: (on) => set({ agentMode: on }),
      customInstructions: '',
      setCustomInstructions: (s) => set({ customInstructions: s }),

      lastSavedAt: null,
      setLastSavedAt: (t) => set({ lastSavedAt: t }),

      pendingInserts: {},
      queueInsert: (docId, text, label) =>
        set((state) => ({
          pendingInserts: {
            ...state.pendingInserts,
            [docId]: [
              ...(state.pendingInserts[docId] || []),
              {
                id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                text,
                label,
                timestamp: Date.now()
              }
            ]
          }
        })),

      resolveInsert: (docId, insertId, accept) =>
        set((state) => {
          const list = state.pendingInserts[docId] || [];
          const item = list.find((i) => i.id === insertId);
          const remaining = list.filter((i) => i.id !== insertId);
          let documents = state.documents;
          if (accept && item) {
            const doc = state.documents[docId];
            if (doc) {
              const separator = doc.content.trim() ? '\n\n' : '';
              documents = {
                ...state.documents,
                [docId]: {
                  ...doc,
                  content: `${doc.content}${separator}${item.text}`,
                  isDirty: true
                }
              };
            }
          }
          return {
            documents,
            pendingInserts: { ...state.pendingInserts, [docId]: remaining }
          };
        }),

      setDocumentPath: (docId, filePath) =>
        set((state) => {
          const doc = state.documents[docId];
          if (!doc) return state;
          return { documents: { ...state.documents, [docId]: { ...doc, filePath } } };
        }),

      addRecentFile: (filePath) =>
        set((state) => {
          const list = [filePath, ...state.recentFiles.filter((p) => p !== filePath)].slice(0, 20);
          return { recentFiles: list };
        }),

      removeRecentFile: (filePath) =>
        set((state) => ({
          recentFiles: state.recentFiles.filter((p) => p !== filePath)
        })),

      clearRecentFiles: () => set({ recentFiles: [] }),

      toggleCommentsPanel: (force) =>
        set((state) => ({
          isCommentsPanelOpen: force !== undefined ? force : !state.isCommentsPanelOpen
        })),

      setActiveCommentId: (id) => set({ activeCommentId: id }),

      addComment: (docId, highlightedText, content, author = 'You') => {
        const id = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newComment: DocumentComment = {
          id,
          docId,
          author,
          authorRole: 'author',
          highlightedText,
          content,
          status: 'open',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          replies: []
        };
        set((state) => ({
          comments: {
            ...state.comments,
            [docId]: [...(state.comments[docId] || []), newComment]
          },
          activeCommentId: id,
          isCommentsPanelOpen: true
        }));
        return id;
      },

      addReply: (docId, commentId, content, author = 'You', isAI = false) =>
        set((state) => {
          const docComments = state.comments[docId] || [];
          const updated = docComments.map((c) => {
            if (c.id !== commentId) return c;
            const reply: CommentReply = {
              id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              author,
              content,
              createdAt: Date.now(),
              isAI
            };
            return {
              ...c,
              updatedAt: Date.now(),
              replies: [...c.replies, reply]
            };
          });
          return {
            comments: {
              ...state.comments,
              [docId]: updated
            }
          };
        }),

      resolveComment: (docId, commentId, resolved = true) =>
        set((state) => {
          const docComments = state.comments[docId] || [];
          const updated = docComments.map((c) => {
            if (c.id !== commentId) return c;
            return {
              ...c,
              status: resolved ? ('resolved' as const) : ('open' as const),
              updatedAt: Date.now()
            };
          });
          return {
            comments: {
              ...state.comments,
              [docId]: updated
            }
          };
        }),

      deleteComment: (docId, commentId) =>
        set((state) => {
          const docComments = state.comments[docId] || [];
          return {
            comments: {
              ...state.comments,
              [docId]: docComments.filter((c) => c.id !== commentId)
            },
            activeCommentId: state.activeCommentId === commentId ? null : state.activeCommentId
          };
        }),

      deleteReply: (docId, commentId, replyId) =>
        set((state) => {
          const docComments = state.comments[docId] || [];
          const updated = docComments.map((c) => {
            if (c.id !== commentId) return c;
            return {
              ...c,
              replies: c.replies.filter((r) => r.id !== replyId)
            };
          });
          return {
            comments: {
              ...state.comments,
              [docId]: updated
            }
          };
        }),

      setKanbanBoard: (board) => set({ kanbanBoard: board }),

      addKanbanCard: (columnId, cardData) => {
        const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        const newCard: KanbanCard = {
          ...cardData,
          id,
          createdAt: now,
          updatedAt: now
        };
        set((state) => {
          const board = state.kanbanBoard;
          const columns = board.columns.map((col) => {
            if (col.id !== columnId) return col;
            return {
              ...col,
              cardIds: [id, ...col.cardIds]
            };
          });
          return {
            kanbanBoard: {
              ...board,
              columns,
              cards: {
                ...board.cards,
                [id]: newCard
              }
            }
          };
        });
        return id;
      },

      updateKanbanCard: (cardId, updates) =>
        set((state) => {
          const board = state.kanbanBoard;
          const existing = board.cards[cardId];
          if (!existing) return state;
          return {
            kanbanBoard: {
              ...board,
              cards: {
                ...board.cards,
                [cardId]: {
                  ...existing,
                  ...updates,
                  updatedAt: Date.now()
                }
              }
            }
          };
        }),

      moveKanbanCard: (cardId, sourceColId, targetColId, targetIndex) =>
        set((state) => {
          const board = state.kanbanBoard;
          const sourceCol = board.columns.find((c) => c.id === sourceColId);
          const targetCol = board.columns.find((c) => c.id === targetColId);
          if (!sourceCol || !targetCol) return state;

          const newSourceCardIds = sourceCol.cardIds.filter((id) => id !== cardId);
          const newTargetCardIds =
            sourceColId === targetColId
              ? [...newSourceCardIds]
              : targetCol.cardIds.filter((id) => id !== cardId);

          const insertIdx =
            targetIndex !== undefined
              ? Math.max(0, Math.min(targetIndex, newTargetCardIds.length))
              : newTargetCardIds.length;

          newTargetCardIds.splice(insertIdx, 0, cardId);

          const updatedColumns = board.columns.map((col) => {
            if (col.id === sourceColId && sourceColId === targetColId) {
              return { ...col, cardIds: newTargetCardIds };
            }
            if (col.id === sourceColId) {
              return { ...col, cardIds: newSourceCardIds };
            }
            if (col.id === targetColId) {
              return { ...col, cardIds: newTargetCardIds };
            }
            return col;
          });

          return {
            kanbanBoard: {
              ...board,
              columns: updatedColumns,
              cards: {
                ...board.cards,
                [cardId]: {
                  ...board.cards[cardId],
                  updatedAt: Date.now()
                }
              }
            }
          };
        }),

      deleteKanbanCard: (cardId) =>
        set((state) => {
          const board = state.kanbanBoard;
          const columns = board.columns.map((col) => ({
            ...col,
            cardIds: col.cardIds.filter((id) => id !== cardId)
          }));
          const remainingCards = { ...board.cards };
          delete remainingCards[cardId];
          return {
            kanbanBoard: {
              ...board,
              columns,
              cards: remainingCards
            }
          };
        }),

      addKanbanColumn: (title) =>
        set((state) => {
          const id = `col-${Date.now()}`;
          const newCol: KanbanColumn = { id, title: title.trim(), cardIds: [] };
          return {
            kanbanBoard: {
              ...state.kanbanBoard,
              columns: [...state.kanbanBoard.columns, newCol]
            }
          };
        }),

      deleteKanbanColumn: (columnId) =>
        set((state) => {
          const board = state.kanbanBoard;
          const colToDelete = board.columns.find((c) => c.id === columnId);
          if (!colToDelete) return state;
          const remainingColumns = board.columns.filter((c) => c.id !== columnId);
          const remainingCards = { ...board.cards };
          colToDelete.cardIds.forEach((id) => delete remainingCards[id]);
          return {
            kanbanBoard: {
              ...board,
              columns: remainingColumns,
              cards: remainingCards
            }
          };
        }),

      updateWorkspaceRules: (rules) =>
        set((state) => ({
          workspaceRules: { ...state.workspaceRules, ...rules }
        })),

      resetWorkspaceRules: () => set({ workspaceRules: DEFAULT_WORKSPACE_RULES }),

      loadWorkspaceRulesFromJson: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed === 'object') {
            set((state) => ({
              workspaceRules: {
                ...state.workspaceRules,
                ...parsed
              }
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      setTeamHubSubTab: (tab) => set({ teamHubSubTab: tab }),

      setTeamMembers: (members) =>
        set((state) => {
          const currentWs = state.teamWorkspaces[state.activeWorkspaceId];
          return {
            teamMembers: members,
            ...(currentWs
              ? {
                  teamWorkspaces: {
                    ...state.teamWorkspaces,
                    [currentWs.id]: {
                      ...currentWs,
                      members,
                      updatedAt: Date.now()
                    }
                  }
                }
              : {})
          };
        }),

      addTeamMember: (member) =>
        set((state) => {
          const newMember: TeamMember = {
            ...member,
            id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          };
          const updatedMembers = [...state.teamMembers, newMember];
          const currentWs = state.teamWorkspaces[state.activeWorkspaceId];
          return {
            teamMembers: updatedMembers,
            ...(currentWs
              ? {
                  teamWorkspaces: {
                    ...state.teamWorkspaces,
                    [currentWs.id]: {
                      ...currentWs,
                      members: updatedMembers,
                      updatedAt: Date.now()
                    }
                  }
                }
              : {})
          };
        }),

      updateTeamMember: (id, updates) =>
        set((state) => {
          const updatedMembers = state.teamMembers.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          );
          const currentWs = state.teamWorkspaces[state.activeWorkspaceId];
          return {
            teamMembers: updatedMembers,
            ...(currentWs
              ? {
                  teamWorkspaces: {
                    ...state.teamWorkspaces,
                    [currentWs.id]: {
                      ...currentWs,
                      members: updatedMembers,
                      updatedAt: Date.now()
                    }
                  }
                }
              : {})
          };
        }),

      removeTeamMember: (id) =>
        set((state) => {
          const updatedMembers = state.teamMembers.filter((m) => m.id !== id);
          const currentWs = state.teamWorkspaces[state.activeWorkspaceId];
          return {
            teamMembers: updatedMembers,
            ...(currentWs
              ? {
                  teamWorkspaces: {
                    ...state.teamWorkspaces,
                    [currentWs.id]: {
                      ...currentWs,
                      members: updatedMembers,
                      updatedAt: Date.now()
                    }
                  }
                }
              : {})
          };
        }),

      createTeamWorkspace: (name, description, creator) => {
        const id = `ws-${Date.now()}`;
        const code = generateWorkspaceCode(name);
        const creatorMember: TeamMember = {
          id: `member-creator-${Date.now()}`,
          name: creator?.name?.trim() || 'You',
          role: creator?.role?.trim() || 'Workspace Lead',
          color: '#0ea5e9',
          isCurrentUser: true
        };
        const newWs: TeamWorkspace = {
          id,
          name,
          code,
          description: description || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          members: [creatorMember],
          workspaceRules: {
            ...DEFAULT_WORKSPACE_RULES,
            teamName: name
          },
          kanbanBoard: {
            id: `board-${id}`,
            title: `${name} Planning Board`,
            columns: [
              { id: 'col-backlog', title: 'Backlog', cardIds: [] },
              { id: 'col-in-progress', title: 'In Progress', cardIds: [] },
              { id: 'col-review', title: 'Review & QA', cardIds: [] },
              { id: 'col-done', title: 'Done', cardIds: [] }
            ],
            cards: {}
          }
        };

        const state = get();
        const currentWs = state.teamWorkspaces[state.activeWorkspaceId];
        const updatedWorkspaces = {
          ...state.teamWorkspaces,
          ...(currentWs
            ? {
                [currentWs.id]: {
                  ...currentWs,
                  updatedAt: Date.now(),
                  members: state.teamMembers,
                  workspaceRules: state.workspaceRules,
                  kanbanBoard: state.kanbanBoard
                }
              }
            : {}),
          [id]: newWs
        };

        set({
          teamWorkspaces: updatedWorkspaces,
          activeWorkspaceId: id,
          teamMembers: newWs.members,
          workspaceRules: newWs.workspaceRules,
          kanbanBoard: newWs.kanbanBoard
        });
        return id;
      },

      switchTeamWorkspace: (id) => {
        const state = get();
        const currentWs = state.teamWorkspaces[state.activeWorkspaceId];
        const targetWs = state.teamWorkspaces[id];
        if (!targetWs) return;

        const updatedWorkspaces = {
          ...state.teamWorkspaces,
          ...(currentWs
            ? {
                [currentWs.id]: {
                  ...currentWs,
                  updatedAt: Date.now(),
                  members: state.teamMembers,
                  workspaceRules: state.workspaceRules,
                  kanbanBoard: state.kanbanBoard
                }
              }
            : {})
        };

        set({
          teamWorkspaces: updatedWorkspaces,
          activeWorkspaceId: id,
          teamMembers: targetWs.members,
          workspaceRules: targetWs.workspaceRules,
          kanbanBoard: targetWs.kanbanBoard
        });
      },

      deleteTeamWorkspace: (id) => {
        set((state) => {
          const remaining = { ...state.teamWorkspaces };
          delete remaining[id];
          const remainingIds = Object.keys(remaining);
          if (remainingIds.length === 0) {
            const defId = 'ws-default';
            const defWs: TeamWorkspace = {
              id: defId,
              name: 'OmniDoc Core Team',
              code: 'OMNI-CORE',
              description: 'Primary workspace',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              members: [],
              workspaceRules: DEFAULT_WORKSPACE_RULES,
              kanbanBoard: DEFAULT_KANBAN_BOARD
            };
            return {
              teamWorkspaces: { [defId]: defWs },
              activeWorkspaceId: defId,
              teamMembers: defWs.members,
              workspaceRules: defWs.workspaceRules,
              kanbanBoard: defWs.kanbanBoard
            };
          }
          const nextId = state.activeWorkspaceId === id ? remainingIds[0] : state.activeWorkspaceId;
          const nextWs = remaining[nextId];
          return {
            teamWorkspaces: remaining,
            activeWorkspaceId: nextId,
            teamMembers: nextWs.members,
            workspaceRules: nextWs.workspaceRules,
            kanbanBoard: nextWs.kanbanBoard
          };
        });
      },

      importTeamWorkspace: (payload, joiningUser) => {
        const id = payload.workspaceId || `ws-${Date.now()}`;
        const sanitizedMembers: TeamMember[] = (payload.members || []).map((m) => ({
          ...m,
          isCurrentUser: false
        }));

        let finalMembers = sanitizedMembers;
        if (joiningUser && joiningUser.name.trim()) {
          const userMember: TeamMember = {
            id: `member-join-${Date.now()}`,
            name: joiningUser.name.trim(),
            role: joiningUser.role?.trim() || 'Teammate',
            color: '#10b981',
            isCurrentUser: true
          };
          const existingIdx = finalMembers.findIndex(
            (m) => m.name.toLowerCase() === userMember.name.toLowerCase()
          );
          if (existingIdx >= 0) {
            finalMembers = finalMembers.map((m, idx) =>
              idx === existingIdx ? { ...m, ...userMember } : m
            );
          } else {
            finalMembers = [...finalMembers, userMember];
          }
        }

        const ws: TeamWorkspace = {
          id,
          name: payload.name,
          code: payload.code || generateWorkspaceCode(payload.name),
          description: payload.description || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          members: finalMembers,
          workspaceRules: payload.workspaceRules || {
            ...DEFAULT_WORKSPACE_RULES,
            teamName: payload.name
          },
          kanbanBoard: payload.kanbanBoard || {
            id: `board-${id}`,
            title: `${payload.name} Planning Board`,
            columns: [
              { id: 'col-backlog', title: 'Backlog', cardIds: [] },
              { id: 'col-in-progress', title: 'In Progress', cardIds: [] },
              { id: 'col-review', title: 'Review & QA', cardIds: [] },
              { id: 'col-done', title: 'Done', cardIds: [] }
            ],
            cards: {}
          }
        };

        const state = get();
        const currentWs = state.teamWorkspaces[state.activeWorkspaceId];
        const updatedWorkspaces = {
          ...state.teamWorkspaces,
          ...(currentWs
            ? {
                [currentWs.id]: {
                  ...currentWs,
                  updatedAt: Date.now(),
                  members: state.teamMembers,
                  workspaceRules: state.workspaceRules,
                  kanbanBoard: state.kanbanBoard
                }
              }
            : {}),
          [id]: ws
        };

        set({
          teamWorkspaces: updatedWorkspaces,
          activeWorkspaceId: id,
          teamMembers: ws.members,
          workspaceRules: ws.workspaceRules,
          kanbanBoard: ws.kanbanBoard
        });
        return id;
      }
    }),
    {
      name: 'omnidoc-storage',
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState) {
          const demoMemberIds = ['member-1', 'member-2', 'member-3', 'member-4'];
          if (Array.isArray(persistedState.teamMembers)) {
            persistedState.teamMembers = persistedState.teamMembers.filter(
              (m: any) => !demoMemberIds.includes(m.id)
            );
          }
          if (persistedState.kanbanBoard?.cards) {
            const demoCardIds = ['card-1', 'card-2', 'card-3'];
            for (const id of demoCardIds) {
              delete persistedState.kanbanBoard.cards[id];
            }
            if (Array.isArray(persistedState.kanbanBoard.columns)) {
              persistedState.kanbanBoard.columns = persistedState.kanbanBoard.columns.map((col: any) => ({
                ...col,
                cardIds: (col.cardIds || []).filter((id: string) => !demoCardIds.includes(id))
              }));
            }
          }
        }
        if (version < 3 && persistedState) {
          if (!persistedState.teamWorkspaces || Object.keys(persistedState.teamWorkspaces).length === 0) {
            const id = 'ws-default';
            const initialWs: TeamWorkspace = {
              id,
              name: persistedState.workspaceRules?.teamName || 'OmniDoc Core Team',
              code: 'OMNI-CORE',
              description: 'Primary team workspace for sprint planning and reviews.',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              members: Array.isArray(persistedState.teamMembers) ? persistedState.teamMembers : [],
              workspaceRules: persistedState.workspaceRules || DEFAULT_WORKSPACE_RULES,
              kanbanBoard: persistedState.kanbanBoard || DEFAULT_KANBAN_BOARD
            };
            persistedState.teamWorkspaces = { [id]: initialWs };
            persistedState.activeWorkspaceId = id;
          }
        }
        if (version < 4 && persistedState) {
          if (persistedState.aiConfigs?.gemini?.model === 'gemini-1.5-flash') {
            persistedState.aiConfigs.gemini.model = 'gemini-2.0-flash';
          }
        }
        return persistedState;
      },
      partialize: (s) => ({
        recentFiles: s.recentFiles,
        activeProvider: s.activeProvider,
        activePersona: s.activePersona,
        aiConfigs: s.aiConfigs,
        sidebarWidth: s.sidebarWidth,
        drawerWidth: s.drawerWidth,
        usageLog: s.usageLog,
        dailyTokenAlert: s.dailyTokenAlert,
        customInstructions: s.customInstructions,
        comments: s.comments,
        kanbanBoard: s.kanbanBoard,
        workspaceRules: s.workspaceRules,
        teamMembers: s.teamMembers,
        teamWorkspaces: s.teamWorkspaces,
        activeWorkspaceId: s.activeWorkspaceId
      })
    }
  )
);
