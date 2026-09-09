export type KanbanPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority: KanbanPriority;
  assignee?: string;
  tags?: string[];
  linkedDocId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cardIds: string[];
}

export interface KanbanBoard {
  id: string;
  title: string;
  columns: KanbanColumn[];
  cards: Record<string, KanbanCard>;
}
