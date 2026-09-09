import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DocumentFormat, DocumentItem, WorkspaceTab } from '../types/document';
import { AIProviderId, AIPersona, AIMessage, AIProviderConfig } from '../types/ai';

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
}

const DEFAULT_AI_CONFIGS: Record<AIProviderId, AIProviderConfig> = {
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
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      documents: {},
      tabs: [],
      activeTabId: null,

      isSidebarOpen: true,
      leftPanel: 'files',
      sidebarWidth: 260,
      drawerWidth: 380,
      isAIDrawerOpen: false,
      isCommandPaletteOpen: false,
      isExportModalOpen: false,
      isShortcutsModalOpen: false,
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
        })
    }),
    {
      name: 'omnidoc-storage',
      partialize: (s) => ({
        recentFiles: s.recentFiles,
        activeProvider: s.activeProvider,
        activePersona: s.activePersona,
        aiConfigs: s.aiConfigs,
        sidebarWidth: s.sidebarWidth,
        drawerWidth: s.drawerWidth,
        usageLog: s.usageLog,
        dailyTokenAlert: s.dailyTokenAlert,
        customInstructions: s.customInstructions
      })
    }
  )
);
