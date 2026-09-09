export interface CommentReply {
  id: string;
  author: string;
  content: string;
  createdAt: number;
  isAI?: boolean;
}

export interface DocumentComment {
  id: string;
  docId: string;
  author: string;
  authorRole?: 'author' | 'reviewer' | 'ai';
  highlightedText: string;
  content: string;
  status: 'open' | 'resolved';
  createdAt: number;
  updatedAt: number;
  replies: CommentReply[];
}
