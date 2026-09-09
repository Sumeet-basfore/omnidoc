import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  UnderlineType
} from 'docx';

export function csvToJSON(csv: string): any[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0 || !lines[0].trim()) return [];

  // Parse header
  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseRow(lines[0]);
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const val = values[idx] ?? '';
      // Try to cast numbers
      if (!isNaN(Number(val)) && val !== '') {
        obj[h] = Number(val);
      } else if (val.toLowerCase() === 'true') {
        obj[h] = true;
      } else if (val.toLowerCase() === 'false') {
        obj[h] = false;
      } else {
        obj[h] = val;
      }
    });
    rows.push(obj);
  }

  return rows;
}

export function jsonToCSV(jsonData: any[]): string {
  if (!Array.isArray(jsonData) || jsonData.length === 0) return '';

  // Get all unique keys
  const keys = Array.from(
    new Set(jsonData.flatMap((item) => (typeof item === 'object' && item ? Object.keys(item) : [])))
  );
  if (keys.length === 0) return '';

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = keys.map(escapeCell).join(',');
  const rows = jsonData.map((item) => keys.map((k) => escapeCell(item[k])).join(','));

  return [headerRow, ...rows].join('\n');
}

/**
 * Parse markdown inline formatting (*italic*, **bold**, ***both***, `code`, ~~strike~~) into TextRuns
 */
export function parseMarkdownInline(text: string): TextRun[] {
  if (!text) return [];

  const runs: TextRun[] = [];
  const regex = /(\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|~~([^~]+)~~)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.substring(lastIndex, match.index) }));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('***') || fullMatch.startsWith('___')) {
      runs.push(new TextRun({ text: match[2] || match[3], bold: true, italics: true }));
    } else if (fullMatch.startsWith('**') || fullMatch.startsWith('__')) {
      runs.push(new TextRun({ text: match[4] || match[5], bold: true }));
    } else if (fullMatch.startsWith('*') || fullMatch.startsWith('_')) {
      runs.push(new TextRun({ text: match[6] || match[7], italics: true }));
    } else if (fullMatch.startsWith('`')) {
      runs.push(new TextRun({ text: match[8], font: { name: 'Courier New' } }));
    } else if (fullMatch.startsWith('~~')) {
      runs.push(new TextRun({ text: match[9], strike: true }));
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.substring(lastIndex) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

/**
 * Converts Markdown text to DOCX Blob preserving headings, bold, italic, code, lists, blockquotes, and tables
 */
export async function markdownToDocxBlob(markdown: string): Promise<Blob> {
  const rawLines = markdown.split(/\r?\n/);
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(new Paragraph({ text: '' }));
      i++;
      continue;
    }

    // Check for GFM table start
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      // Parse table
      const rows: TableRow[] = [];
      for (const tLine of tableLines) {
        // Skip separator row |---|---|
        if (/^\|[\s:-|]+\|$/.test(tLine)) {
          continue;
        }

        const cellContents = tLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        const cells: TableCell[] = cellContents.map(
          (c) =>
            new TableCell({
              children: [new Paragraph({ children: parseMarkdownInline(c) })]
            })
        );

        rows.push(new TableRow({ children: cells }));
      }

      if (rows.length > 0) {
        children.push(
          new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        );
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: parseMarkdownInline(trimmed.slice(2))
        })
      );
    } else if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: parseMarkdownInline(trimmed.slice(3))
        })
      );
    } else if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: parseMarkdownInline(trimmed.slice(4))
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet list
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseMarkdownInline(trimmed.slice(2))
        })
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      // Numbered list
      const contentText = trimmed.replace(/^\d+\.\s+/, '');
      children.push(
        new Paragraph({
          numbering: { reference: 'list-numbering', level: 0 },
          children: parseMarkdownInline(contentText)
        })
      );
    } else if (trimmed.startsWith('>')) {
      // Blockquote
      const quoteText = trimmed.replace(/^>\s*/, '');
      children.push(
        new Paragraph({
          indent: { left: 720 },
          border: {
            left: {
              color: '6366f1',
              space: 10,
              style: BorderStyle.SINGLE,
              size: 24
            }
          },
          children: parseMarkdownInline(quoteText)
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: parseMarkdownInline(line)
        })
      );
    }

    i++;
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'list-numbering',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }]
        }
      ]
    },
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Converts Tiptap JSON document tree directly to docx nodes, preserving all formatting
 */
export async function tiptapToDocxBlob(docJson: any): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  const parseInlineNodes = (content?: any[]): TextRun[] => {
    if (!Array.isArray(content)) return [];
    const runs: TextRun[] = [];

    for (const node of content) {
      if (node.type === 'text') {
        const marks = node.marks || [];
        const isBold = marks.some((m: any) => m.type === 'bold');
        const isItalic = marks.some((m: any) => m.type === 'italic');
        const isUnderline = marks.some((m: any) => m.type === 'underline');
        const isStrike = marks.some((m: any) => m.type === 'strike');
        const isCode = marks.some((m: any) => m.type === 'code');

        runs.push(
          new TextRun({
            text: node.text || '',
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
            strike: isStrike,
            font: isCode ? { name: 'Courier New' } : undefined
          })
        );
      } else if (node.type === 'hardBreak') {
        runs.push(new TextRun({ break: 1 }));
      }
    }

    return runs;
  };

  const walkNodes = (nodes?: any[]) => {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      if (node.type === 'paragraph') {
        children.push(
          new Paragraph({
            children: parseInlineNodes(node.content)
          })
        );
      } else if (node.type === 'heading') {
        const level = node.attrs?.level ?? 1;
        const headingLevel =
          level === 1
            ? HeadingLevel.HEADING_1
            : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;

        children.push(
          new Paragraph({
            heading: headingLevel,
            children: parseInlineNodes(node.content)
          })
        );
      } else if (node.type === 'bulletList') {
        for (const listItem of node.content || []) {
          for (const itemChild of listItem.content || []) {
            if (itemChild.type === 'paragraph') {
              children.push(
                new Paragraph({
                  bullet: { level: 0 },
                  children: parseInlineNodes(itemChild.content)
                })
              );
            }
          }
        }
      } else if (node.type === 'orderedList') {
        for (const listItem of node.content || []) {
          for (const itemChild of listItem.content || []) {
            if (itemChild.type === 'paragraph') {
              children.push(
                new Paragraph({
                  numbering: { reference: 'default-numbering', level: 0 },
                  children: parseInlineNodes(itemChild.content)
                })
              );
            }
          }
        }
      } else if (node.type === 'blockquote') {
        for (const itemChild of node.content || []) {
          children.push(
            new Paragraph({
              indent: { left: 720 },
              border: {
                left: {
                  color: '6366f1',
                  space: 10,
                  style: BorderStyle.SINGLE,
                  size: 24
                }
              },
              children: parseInlineNodes(itemChild.content)
            })
          );
        }
      } else if (node.type === 'table') {
        const tableRows: TableRow[] = [];
        for (const rowNode of node.content || []) {
          if (rowNode.type === 'tableRow') {
            const cells: TableCell[] = [];
            for (const cellNode of rowNode.content || []) {
              const cellParagraphs: Paragraph[] = [];
              for (const p of cellNode.content || []) {
                cellParagraphs.push(
                  new Paragraph({
                    children: parseInlineNodes(p.content)
                  })
                );
              }
              if (cellParagraphs.length === 0) {
                cellParagraphs.push(new Paragraph({ text: '' }));
              }
              cells.push(new TableCell({ children: cellParagraphs }));
            }
            tableRows.push(new TableRow({ children: cells }));
          }
        }
        if (tableRows.length > 0) {
          children.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          );
        }
      }
    }
  };

  walkNodes(docJson?.content);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }]
        }
      ]
    },
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return await Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
