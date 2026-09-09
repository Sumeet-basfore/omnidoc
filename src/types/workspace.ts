export type EditorialTone = 'academic' | 'technical' | 'casual' | 'executive';
export type CitationStyle = 'inline_url' | 'ieee' | 'apa' | 'chicago';
export type ReadingLevel = 'middle_school' | 'high_school' | 'undergraduate' | 'graduate';

export interface WorkspaceRules {
  teamName: string;
  editorialTone: EditorialTone;
  prohibitedTerms: string[];
  citationStyle: CitationStyle;
  targetReadingLevel: ReadingLevel;
  customDirectives: string;
  enforceInAllPersonas: boolean;
}

export const DEFAULT_WORKSPACE_RULES: WorkspaceRules = {
  teamName: 'My Team Workspace',
  editorialTone: 'technical',
  prohibitedTerms: ['delve', 'testament', 'spearhead', 'furthermore', 'leverage', 'in conclusion', 'synergy'],
  citationStyle: 'inline_url',
  targetReadingLevel: 'high_school',
  customDirectives: 'Maintain clean, concise prose. Eliminate conversational padding. Prefer concrete examples over abstract definitions.',
  enforceInAllPersonas: true
};
