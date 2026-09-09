import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ArrowUpDown, Search, Download, Table, Code2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { csvToJSON, jsonToCSV, downloadBlob } from '../../services/exportService';

interface DataGridEditorProps {
  documentId: string;
  name: string;
  format: 'csv' | 'json';
  content: string;
}

export const DataGridEditor: React.FC<DataGridEditorProps> = ({
  documentId,
  name,
  format,
  content
}) => {
  const { updateDocumentContent } = useAppStore();
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'raw'>('grid');
  const [rawText, setRawText] = useState<string>(content);

  // Parse CSV or JSON content
  useEffect(() => {
    try {
      if (format === 'csv') {
        const parsed = csvToJSON(content);
        setData(parsed);
        if (parsed.length > 0) {
          setColumns(Object.keys(parsed[0]));
        } else {
          setColumns(['Column 1', 'Column 2', 'Column 3']);
        }
      } else {
        const parsed = JSON.parse(content || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(parsed);
          setColumns(Object.keys(parsed[0]));
        } else {
          setData(Array.isArray(parsed) ? parsed : [parsed]);
          setColumns(typeof parsed === 'object' && parsed ? Object.keys(parsed) : ['Key', 'Value']);
        }
      }
    } catch (e) {
      console.warn('Unable to parse tabular data, defaulting to raw mode:', e);
      setViewMode('raw');
    }
    setRawText(content);
  }, [content, format]);

  // Sync back changes to store
  const syncChanges = (updatedData: any[]) => {
    setData(updatedData);
    let serialized = '';
    if (format === 'csv') {
      serialized = jsonToCSV(updatedData);
    } else {
      serialized = JSON.stringify(updatedData, null, 2);
    }
    setRawText(serialized);
    updateDocumentContent(documentId, serialized);
  };

  const handleCellChange = (rowIndex: number, col: string, value: string) => {
    const updated = [...data];
    const num = Number(value);
    updated[rowIndex] = {
      ...updated[rowIndex],
      [col]: !isNaN(num) && value.trim() !== '' ? num : value
    };
    syncChanges(updated);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    columns.forEach((c) => {
      newRow[c] = '';
    });
    syncChanges([...data, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    const updated = data.filter((_, idx) => idx !== index);
    syncChanges(updated);
  };

  const handleAddColumn = () => {
    const colName = prompt('Enter new column name:');
    if (!colName || columns.includes(colName)) return;

    const newCols = [...columns, colName];
    setColumns(newCols);
    const updated = data.map((row) => ({ ...row, [colName]: '' }));
    syncChanges(updated);
  };

  const handleDeleteColumn = (colName: string) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((c) => c !== colName);
    setColumns(newCols);
    const updated = data.map((row) => {
      const copy = { ...row };
      delete copy[colName];
      return copy;
    });
    syncChanges(updated);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const filteredData = useMemo(() => {
    let list = [...data];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    if (sortCol) {
      list.sort((a, b) => {
        const valA = a[sortCol] ?? '';
        const valB = b[sortCol] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [data, searchQuery, sortCol, sortAsc]);

  const handleRawChange = (val: string) => {
    setRawText(val);
    updateDocumentContent(documentId, val);
  };

  const handleExport = () => {
    let blob: Blob;
    let filename = name;
    if (format === 'csv') {
      const csv = jsonToCSV(data);
      blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      if (!filename.endsWith('.csv')) filename += '.csv';
    } else {
      const json = JSON.stringify(data, null, 2);
      blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      if (!filename.endsWith('.json')) filename += '.json';
    }
    downloadBlob(blob, filename);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0c12] overflow-hidden select-none">
      {/* Sub-Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] text-xs">
        <div className="flex items-center gap-3">
          {/* Mode switch */}
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 px-2.5 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-[var(--accent-primary)] text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Table size={13} />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`p-1 px-2.5 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'raw' ? 'bg-[var(--accent-primary)] text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code2 size={13} />
              <span>Raw Text</span>
            </button>
          </div>

          {viewMode === 'grid' && (
            <>
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2 py-1 bg-black/30 border border-white/10 rounded-md text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-44"
                />
              </div>

              <button
                onClick={handleAddRow}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors"
                title="Add New Row"
              >
                <Plus size={13} />
                <span>Add Row</span>
              </button>

              <button
                onClick={handleAddColumn}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors"
                title="Add New Column"
              >
                <Plus size={13} />
                <span>Add Column</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[var(--text-dim)] text-[11px]">
            {filteredData.length} rows &times; {columns.length} columns
          </span>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 hover:text-white hover:bg-emerald-600/50 transition-all font-medium text-xs"
          >
            <Download size={13} />
            <span>Export {format.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Grid or Raw View */}
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-auto bg-[#0d1017] p-4">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#121622] sticky top-0 z-10">
                <th className="p-2 w-10 text-center text-zinc-500 font-mono text-[10px] border-r border-white/5">#</th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="p-2.5 text-zinc-300 font-medium border-r border-white/10 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        onClick={() => handleSort(col)}
                        className="cursor-pointer flex items-center gap-1 select-none flex-1 truncate"
                      >
                        {col}
                        <ArrowUpDown size={11} className="text-zinc-500 group-hover:text-indigo-400" />
                      </span>
                      <button
                        onClick={() => handleDeleteColumn(col)}
                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title="Delete Column"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="p-2 w-10 text-center text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="p-2 text-center text-zinc-600 font-mono text-[10px] border-r border-white/5 bg-[#0f121b]">
                    {rIdx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="p-0 border-r border-white/5">
                      <input
                        type="text"
                        value={row[col] ?? ''}
                        onChange={(e) => handleCellChange(rIdx, col, e.target.value)}
                        className="w-full h-full px-2.5 py-1.5 bg-transparent text-zinc-200 outline-none focus:bg-indigo-950/40 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center">
                    <button
                      onClick={() => handleDeleteRow(rIdx)}
                      className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Delete Row"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-4 bg-[#0d1017]">
          <textarea
            value={rawText}
            onChange={(e) => handleRawChange(e.target.value)}
            className="w-full h-full p-4 bg-[#121622] border border-white/10 rounded-lg font-mono text-xs text-zinc-200 resize-none outline-none focus:border-indigo-500"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
