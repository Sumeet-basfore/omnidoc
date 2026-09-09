import type { WorkspaceRules } from './workspace';
import type { KanbanBoard } from './kanban';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
  isCurrentUser?: boolean;
}

export type TeamHubSubTab = 'planning' | 'reviews' | 'guidelines' | 'roster';

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];

export interface TeamManifest {
  $schema?: string;
  version: number;
  exportedAt: string;
  teamName: string;
  members: TeamMember[];
  workspaceRules: WorkspaceRules;
  kanbanBoard: KanbanBoard;
}

export interface TeamSyncResult {
  success: boolean;
  message: string;
  stats?: {
    membersCount: number;
    tasksCount: number;
    hasRules: boolean;
  };
  error?: string;
}

export interface TeamWorkspace {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  members: TeamMember[];
  workspaceRules: WorkspaceRules;
  kanbanBoard: KanbanBoard;
}

export interface WorkspaceInvitePayload {
  version: number;
  workspaceId: string;
  name: string;
  code: string;
  description?: string;
  members: TeamMember[];
  workspaceRules: WorkspaceRules;
  kanbanBoard: KanbanBoard;
  exportedAt: string;
}
