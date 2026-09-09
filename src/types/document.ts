export type DocumentFormat =
  | 'markdown'
  | 'pdf'
  | 'docx'
  | 'csv'
  | 'json'
  | 'code'
  | 'text';

export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  sizeBytes?: number;
  lastModified?: number;
  language?: string; // for code files
}

export interface DocumentItem {
  id: string;
  name: string;
  format: DocumentFormat;
  /** Raw text content, or Base64-encoded binary for PDF/DOCX */
  content: string;
  /** Absolute path on disk (undefined for untitled/new docs) */
  filePath?: string;
  isDirty?: boolean;
  metadata?: DocumentMetadata;
}

export interface WorkspaceTab {
  id: string;
  documentId: string;
  activeView: 'editor' | 'preview' | 'split' | 'grid';
  scrollPosition?: number;
}
