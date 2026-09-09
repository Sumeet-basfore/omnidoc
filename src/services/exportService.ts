import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

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
  const keys = Array.from(new Set(jsonData.flatMap((item) => (typeof item === 'object' && item ? Object.keys(item) : []))));
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

export async function markdownToDocxBlob(markdown: string): Promise<Blob> {
  const lines = markdown.split(/\r?\n/);
  const children: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: '' }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(2),
          heading: HeadingLevel.HEADING_1
        })
      );
    } else if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(3),
          heading: HeadingLevel.HEADING_2
        })
      );
    } else if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(4),
          heading: HeadingLevel.HEADING_3
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun(trimmed.slice(2))]
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun(line)]
        })
      );
    }
  }

  const doc = new Document({
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
