import React, { useState, useRef } from 'react';
import {
  Users,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Plus,
  X,
  Check,
  BookOpen,
  FileCheck,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { downloadBlob } from '../../services/exportService';
import type {
  EditorialTone,
  CitationStyle,
  ReadingLevel
} from '../../types/workspace';

export const WorkspaceRulesSettings: React.FC = () => {
  const {
    workspaceRules,
    updateWorkspaceRules,
    resetWorkspaceRules,
    loadWorkspaceRulesFromJson
  } = useAppStore();

  const [newTerm, setNewTerm] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTerm = () => {
    const trimmed = newTerm.trim().toLowerCase();
    if (!trimmed) return;
    if (!workspaceRules.prohibitedTerms.includes(trimmed)) {
      updateWorkspaceRules({
        prohibitedTerms: [...workspaceRules.prohibitedTerms, trimmed]
      });
    }
    setNewTerm('');
  };

  const handleRemoveTerm = (term: string) => {
    updateWorkspaceRules({
      prohibitedTerms: workspaceRules.prohibitedTerms.filter((t) => t !== term)
    });
  };

  const handleExportTeamJson = () => {
    const jsonStr = JSON.stringify(workspaceRules, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, 'team.json');
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = loadWorkspaceRulesFromJson(content);
        if (success) {
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 2000);
        } else {
          alert('Invalid team.json file format.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5 text-xs text-zinc-300 select-none">
      {/* Header Info */}
      <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
        <div className="flex items-center gap-2 text-indigo-300 font-semibold">
          <Users size={15} />
          <span>Shared Team Style & Rules</span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Define editorial standards, prohibited cliches, and tone for your team. Omni enforces these rules automatically across all personas.
        </p>
      </div>

      {/* Team / Workspace Name */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
          Workspace / Team Name
        </label>
        <input
          type="text"
          value={workspaceRules.teamName}
          onChange={(e) => updateWorkspaceRules({ teamName: e.target.value })}
          placeholder="e.g. Core Engineering, Research Lab"
          className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Editorial Tone */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">
          <span>Editorial Tone</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'technical', label: 'Technical', desc: 'Precise & code-aware' },
              { id: 'academic', label: 'Academic', desc: 'Rigorous & epistemic' },
              { id: 'executive', label: 'Executive', desc: 'Dense & actionable' },
              { id: 'casual', label: 'Conversational', desc: 'Engaging & warm' }
            ] as Array<{ id: EditorialTone; label: string; desc: string }>
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => updateWorkspaceRules({ editorialTone: t.id })}
              className={`p-2 rounded border text-left transition-all cursor-pointer ${
                workspaceRules.editorialTone === t.id
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-black/30 border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-semibold text-xs">{t.label}</div>
              <div className="text-[10px] text-zinc-500">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Target Reading Complexity */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
          Target Reading Complexity
        </label>
        <select
          value={workspaceRules.targetReadingLevel}
          onChange={(e) =>
            updateWorkspaceRules({ targetReadingLevel: e.target.value as ReadingLevel })
          }
          className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
        >
          <option value="middle_school">Middle School (Plain English, Grade 6-8)</option>
          <option value="high_school">High School (Standard Publications, Grade 9-12)</option>
          <option value="undergraduate">Undergraduate (Technical & Analytical)</option>
          <option value="graduate">Graduate (Dense Academic / Research)</option>
        </select>
      </div>

      {/* Citation Standard */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
          Citation Standard
        </label>
        <select
          value={workspaceRules.citationStyle}
          onChange={(e) =>
            updateWorkspaceRules({ citationStyle: e.target.value as CitationStyle })
          }
          className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
        >
          <option value="inline_url">Inline Hyperlink Markdown [Title](url)</option>
          <option value="ieee">IEEE Style ([1], [2] with bibliography)</option>
          <option value="apa">APA Style (Author, Year)</option>
          <option value="chicago">Chicago Manual of Style</option>
        </select>
      </div>

      {/* Prohibited Buzzwords & Clichés */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
            Prohibited Terms & AI Clichés
          </label>
          <span className="text-[10px] text-zinc-500 font-mono">
            {workspaceRules.prohibitedTerms.length} terms
          </span>
        </div>

        <div className="p-2.5 rounded bg-black/40 border border-white/10 space-y-2">
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {workspaceRules.prohibitedTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-mono"
              >
                <span>{term}</span>
                <button
                  onClick={() => handleRemoveTerm(term)}
                  className="hover:text-white p-0.5 transition-colors cursor-pointer"
                  title="Remove term"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTerm();
                }
              }}
              placeholder="Add word to ban (e.g. 'moreover')..."
              className="flex-1 px-2 py-1 rounded bg-black/60 border border-white/10 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddTerm}
              disabled={!newTerm.trim()}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 disabled:opacity-30 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Team Directives */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
          Custom Directives (Injected into all prompts)
        </label>
        <textarea
          value={workspaceRules.customDirectives}
          onChange={(e) => updateWorkspaceRules({ customDirectives: e.target.value })}
          placeholder="e.g. Always write code with strict types. Use Oxford comma. Avoid conversational greetings."
          className="w-full h-20 p-2 rounded bg-black/40 border border-white/10 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none font-sans"
        />
      </div>

      {/* Enforce in all personas toggle */}
      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={workspaceRules.enforceInAllPersonas}
          onChange={(e) =>
            updateWorkspaceRules({ enforceInAllPersonas: e.target.checked })
          }
          className="rounded bg-black/40 border-white/10 text-indigo-600 focus:ring-0"
        />
        <span>Enforce guidelines in all 4 personas</span>
      </label>

      {/* Export / Import .omnidoc/team.json */}
      <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportTeamJson}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
            title="Export configuration as team.json"
          >
            <Download size={13} />
            <span>Export team.json</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-white/10 hover:bg-white/15 text-zinc-200 font-medium text-xs transition-colors cursor-pointer"
            title="Load existing team.json"
          >
            <Upload size={13} />
            <span>Import team.json</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {copiedNotification && (
          <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-medium animate-fade-in">
            <Check size={12} />
            <span>Workspace rules updated successfully</span>
          </div>
        )}

        <button
          onClick={() => {
            if (window.confirm('Reset workspace rules to defaults?')) {
              resetWorkspaceRules();
            }
          }}
          className="self-center flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer pt-1"
        >
          <RotateCcw size={10} />
          <span>Reset to Defaults</span>
        </button>
      </div>
    </div>
  );
};
