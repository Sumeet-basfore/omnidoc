import type {
  TeamMember,
  TeamManifest,
  TeamSyncResult,
  TeamWorkspace,
  WorkspaceInvitePayload
} from '../types/team';
import type { WorkspaceRules } from '../types/workspace';
import type { KanbanBoard } from '../types/kanban';
import { downloadBlob } from './exportService';

/**
 * Creates a structured team sync manifest compliant with .omnidoc/team.json schema
 */
export function createTeamManifest(params: {
  teamName?: string;
  members: TeamMember[];
  workspaceRules: WorkspaceRules;
  kanbanBoard: KanbanBoard;
}): TeamManifest {
  return {
    $schema: 'https://omnidoc.dev/schemas/team-v1.json',
    version: 1,
    exportedAt: new Date().toISOString(),
    teamName: params.teamName || params.workspaceRules.teamName || 'OmniDoc Team',
    members: params.members,
    workspaceRules: params.workspaceRules,
    kanbanBoard: params.kanbanBoard
  };
}

/**
 * Parses and validates raw JSON into a TeamManifest
 */
export function parseAndValidateTeamManifest(jsonString: string): {
  valid: boolean;
  manifest?: TeamManifest;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Manifest must be a valid JSON object' };
    }

    // Check for either a full manifest or a legacy workspaceRules / kanban object
    const members: TeamMember[] = Array.isArray(data.members) ? data.members : [];
    const workspaceRules: WorkspaceRules = data.workspaceRules || {
      teamName: data.teamName || 'Imported Team',
      editorialTone: 'technical',
      prohibitedTerms: [],
      citationStyle: 'inline_url',
      targetReadingLevel: 'high_school',
      customDirectives: '',
      enforceInAllPersonas: true
    };

    const kanbanBoard: KanbanBoard = data.kanbanBoard || {
      id: 'board-imported',
      title: 'Imported Board',
      columns: [
        { id: 'col-backlog', title: 'Backlog', cardIds: [] },
        { id: 'col-in-progress', title: 'In Progress', cardIds: [] },
        { id: 'col-review', title: 'Review & QA', cardIds: [] },
        { id: 'col-done', title: 'Done', cardIds: [] }
      ],
      cards: {}
    };

    const manifest: TeamManifest = {
      $schema: data.$schema || 'https://omnidoc.dev/schemas/team-v1.json',
      version: typeof data.version === 'number' ? data.version : 1,
      exportedAt: data.exportedAt || new Date().toISOString(),
      teamName: data.teamName || workspaceRules.teamName || 'Imported Team',
      members,
      workspaceRules,
      kanbanBoard
    };

    return { valid: true, manifest };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Failed to parse JSON file'
    };
  }
}

/**
 * Merges or replaces current state with incoming manifest
 */
export function mergeTeamManifest(
  current: {
    members: TeamMember[];
    workspaceRules: WorkspaceRules;
    kanbanBoard: KanbanBoard;
  },
  incoming: TeamManifest,
  strategy: 'merge' | 'replace' = 'merge'
): {
  members: TeamMember[];
  workspaceRules: WorkspaceRules;
  kanbanBoard: KanbanBoard;
  stats: {
    addedMembers: number;
    addedCards: number;
  };
} {
  if (strategy === 'replace') {
    return {
      members: incoming.members,
      workspaceRules: incoming.workspaceRules,
      kanbanBoard: incoming.kanbanBoard,
      stats: {
        addedMembers: incoming.members.length,
        addedCards: Object.keys(incoming.kanbanBoard.cards).length
      }
    };
  }

  // Merge strategy
  // 1. Members: merge unique by ID or Name
  const existingMemberNames = new Set(current.members.map((m) => m.name.toLowerCase()));
  const newMembers: TeamMember[] = [...current.members];
  let addedMembers = 0;

  for (const m of incoming.members) {
    if (!existingMemberNames.has(m.name.toLowerCase())) {
      newMembers.push(m);
      existingMemberNames.add(m.name.toLowerCase());
      addedMembers++;
    }
  }

  // 2. Rules: combine prohibited terms, update directives
  const combinedProhibited = Array.from(
    new Set([...current.workspaceRules.prohibitedTerms, ...incoming.workspaceRules.prohibitedTerms])
  );

  const mergedRules: WorkspaceRules = {
    ...current.workspaceRules,
    ...incoming.workspaceRules,
    prohibitedTerms: combinedProhibited
  };

  // 3. Kanban: merge cards and ensure they are assigned to a column
  const mergedCards = { ...current.kanbanBoard.cards };
  let addedCards = 0;

  const currentCardIds = new Set(Object.keys(current.kanbanBoard.cards));
  const incomingCardsToAdd: string[] = [];

  for (const [cardId, card] of Object.entries(incoming.kanbanBoard.cards)) {
    if (!currentCardIds.has(cardId)) {
      mergedCards[cardId] = card;
      incomingCardsToAdd.push(cardId);
      addedCards++;
    }
  }

  // Distribute any incoming cards into matching column or first column
  const mergedColumns = current.kanbanBoard.columns.map((col) => ({
    ...col,
    cardIds: [...col.cardIds]
  }));

  if (mergedColumns.length > 0 && incomingCardsToAdd.length > 0) {
    // If incoming has columns, try to place them in matching column by title
    for (const inCol of incoming.kanbanBoard.columns) {
      const match = mergedColumns.find(
        (c) => c.title.toLowerCase() === inCol.title.toLowerCase()
      );
      if (match) {
        for (const cardId of inCol.cardIds) {
          if (!match.cardIds.includes(cardId) && mergedCards[cardId]) {
            match.cardIds.push(cardId);
            // remove from incomingCardsToAdd
            const idx = incomingCardsToAdd.indexOf(cardId);
            if (idx !== -1) incomingCardsToAdd.splice(idx, 1);
          }
        }
      }
    }

    // Any remaining unassigned cards go to column 0 (Backlog)
    for (const cardId of incomingCardsToAdd) {
      if (!mergedColumns[0].cardIds.includes(cardId)) {
        mergedColumns[0].cardIds.push(cardId);
      }
    }
  }

  const mergedBoard: KanbanBoard = {
    ...current.kanbanBoard,
    columns: mergedColumns,
    cards: mergedCards
  };

  return {
    members: newMembers,
    workspaceRules: mergedRules,
    kanbanBoard: mergedBoard,
    stats: {
      addedMembers,
      addedCards
    }
  };
}

/**
 * Saves team manifest to disk via Electron API or browser download fallback
 */
export async function saveTeamToDisk(
  manifest: TeamManifest,
  suggestedFileName: string = 'team.json'
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const jsonContent = JSON.stringify(manifest, null, 2);

  if (window.electronAPI?.saveFileDialog && window.electronAPI?.writeFile) {
    try {
      const selectedPath = await window.electronAPI.saveFileDialog(suggestedFileName, [
        { name: 'OmniDoc Team Config', extensions: ['json'] }
      ]);
      if (!selectedPath) {
        return { success: false, error: 'Save canceled' };
      }
      const writeSuccess = await window.electronAPI.writeFile(selectedPath, jsonContent, false);
      return { success: writeSuccess, filePath: selectedPath };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to write file' };
    }
  }

  // Browser download fallback
  try {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, suggestedFileName);
    return { success: true, filePath: suggestedFileName };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Export failed' };
  }
}

/**
 * Prompts user to select team.json from disk and parses it
 */
export async function loadTeamFromDisk(): Promise<{
  success: boolean;
  manifest?: TeamManifest;
  filePath?: string;
  error?: string;
}> {
  if (window.electronAPI?.openFileDialog && window.electronAPI?.readFile) {
    try {
      const selectedPath = await window.electronAPI.openFileDialog([
        { name: 'OmniDoc Team Config', extensions: ['json'] }
      ]);
      if (!selectedPath) {
        return { success: false, error: 'Open canceled' };
      }
      const fileResult = await window.electronAPI.readFile(selectedPath);
      const parseResult = parseAndValidateTeamManifest(fileResult.data);
      if (!parseResult.valid || !parseResult.manifest) {
        return { success: false, error: parseResult.error || 'Invalid team config schema' };
      }
      return { success: true, manifest: parseResult.manifest, filePath: selectedPath };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to read file' };
    }
  }

  // Browser file input fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({ success: false, error: 'No file chosen' });
        return;
      }
      try {
        const text = await file.text();
        const parseResult = parseAndValidateTeamManifest(text);
        if (!parseResult.valid || !parseResult.manifest) {
          resolve({ success: false, error: parseResult.error || 'Invalid manifest JSON' });
        } else {
          resolve({ success: true, manifest: parseResult.manifest, filePath: file.name });
        }
      } catch (err) {
        resolve({
          success: false,
          error: err instanceof Error ? err.message : 'Error reading file'
        });
      }
    };
    input.click();
  });
}

/**
 * Generates a memorable alphanumeric workspace code (e.g. "DOCS-7X9A")
 */
export function generateWorkspaceCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
  const prefix = clean.length >= 3 ? clean : 'OMNI';
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${randomPart}`;
}

/**
 * Packs a full workspace snapshot into a self-contained Base64 invite token
 */
export function encodeWorkspaceInvite(workspace: TeamWorkspace): string {
  const payload: WorkspaceInvitePayload = {
    version: 1,
    workspaceId: workspace.id,
    name: workspace.name,
    code: workspace.code,
    description: workspace.description,
    members: workspace.members,
    workspaceRules: workspace.workspaceRules,
    kanbanBoard: workspace.kanbanBoard,
    exportedAt: new Date().toISOString()
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

/**
 * Decodes and validates a workspace invite token or JSON payload
 */
export function decodeWorkspaceInvite(inviteToken: string): {
  valid: boolean;
  payload?: WorkspaceInvitePayload;
  error?: string;
} {
  try {
    const trimmed = inviteToken.trim();
    let jsonStr = '';

    // Handle both raw JSON and Base64-encoded tickets
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      jsonStr = trimmed;
    } else {
      jsonStr = decodeURIComponent(atob(trimmed));
    }

    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object' || !data.name) {
      return { valid: false, error: 'Invalid workspace token format: missing workspace name' };
    }

    const payload: WorkspaceInvitePayload = {
      version: typeof data.version === 'number' ? data.version : 1,
      workspaceId: data.workspaceId || `ws-${Date.now()}`,
      name: data.name,
      code: data.code || generateWorkspaceCode(data.name),
      description: data.description || '',
      members: Array.isArray(data.members) ? data.members : [],
      workspaceRules: data.workspaceRules || {
        teamName: data.name,
        editorialTone: 'technical',
        prohibitedTerms: [],
        citationStyle: 'inline_url',
        targetReadingLevel: 'high_school',
        customDirectives: '',
        enforceInAllPersonas: true
      },
      kanbanBoard: data.kanbanBoard || {
        id: `board-${Date.now()}`,
        title: `${data.name} Planning Board`,
        columns: [
          { id: 'col-backlog', title: 'Backlog', cardIds: [] },
          { id: 'col-in-progress', title: 'In Progress', cardIds: [] },
          { id: 'col-review', title: 'Review & QA', cardIds: [] },
          { id: 'col-done', title: 'Done', cardIds: [] }
        ],
        cards: {}
      },
      exportedAt: data.exportedAt || new Date().toISOString()
    };

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Invalid workspace invite code. Please check and try again.' };
  }
}

