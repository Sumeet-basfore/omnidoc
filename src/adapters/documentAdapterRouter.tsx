import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { MarkdownEditor } from '../components/Viewers/MarkdownEditor';
import { PdfViewer } from '../components/Viewers/PdfViewer';
import { DocxEditor } from '../components/Viewers/DocxEditor';
import { DataGridEditor } from '../components/Viewers/DataGridEditor';
import { CodeViewer } from '../components/Viewers/CodeViewer';
import { EmptyState } from '../components/Layout/EmptyState';

export const DocumentAdapterRouter: React.FC = () => {
  const { documents, tabs, activeTabId } = useAppStore();

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const currentDoc = currentTab ? documents[currentTab.documentId] : null;

  if (!currentDoc || tabs.length === 0) {
    return <EmptyState />;
  }

  switch (currentDoc.format) {
    case 'markdown':
      return <MarkdownEditor documentId={currentDoc.id} content={currentDoc.content} />;
    case 'pdf':
      return <PdfViewer documentId={currentDoc.id} content={currentDoc.content} />;
    case 'docx':
      return <DocxEditor documentId={currentDoc.id} name={currentDoc.name} content={currentDoc.content} />;
    case 'csv':
    case 'json':
      return (
        <DataGridEditor
          documentId={currentDoc.id}
          name={currentDoc.name}
          format={currentDoc.format}
          content={currentDoc.content}
        />
      );
    case 'code':
    case 'text':
    default:
      return <CodeViewer documentId={currentDoc.id} name={currentDoc.name} content={currentDoc.content} />;
  }
};
