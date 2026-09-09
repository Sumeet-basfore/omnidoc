import type { TeamMember } from '../types/team';
import type { WorkspaceRules } from '../types/workspace';
import type { KanbanBoard } from '../types/kanban';
import type { DocumentComment, CommentReply } from '../types/comment';
import type { DocumentItem } from '../types/document';
import { callAI } from './aiService';
import { keyService } from './keyService';
import type { AIProviderConfig, AIProviderId, AIPersona } from '../types/ai';

export interface BriefingData {
  workspaceRules: WorkspaceRules;
  teamMembers: TeamMember[];
  kanbanBoard: KanbanBoard;
  comments: Record<string, DocumentComment[]>;
  documents: Record<string, DocumentItem>;
  aiExecutiveSummary?: string;
}

/**
 * Generates an executive Markdown briefing summarizing team roster, sprint board, reviews, and guidelines.
 */
export function generateMarkdownBriefing(data: BriefingData): string {
  const { workspaceRules, teamMembers, kanbanBoard, comments, documents, aiExecutiveSummary } = data;
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const allComments = Object.entries(comments).flatMap(([docId, docComments]) =>
    docComments.map((c) => ({ ...c, docId }))
  );
  const openComments = allComments.filter((c) => c.status === 'open');
  const resolvedComments = allComments.filter((c) => c.status === 'resolved');

  const totalCards = Object.keys(kanbanBoard.cards).length;
  const urgentCards = Object.values(kanbanBoard.cards).filter((c) => c.priority === 'urgent');
  const highCards = Object.values(kanbanBoard.cards).filter((c) => c.priority === 'high');

  let md = `# Team Status & Workspace Briefing\n\n`;
  md += `**Workspace:** ${workspaceRules.teamName || 'OmniDoc Workspace'}  \n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Active Roster:** ${teamMembers.length} Members  \n`;
  md += `**Sprint Workload:** ${totalCards} Tasks (${urgentCards.length} Urgent, ${highCards.length} High)  \n`;
  md += `**Review Status:** ${openComments.length} Open Discussions (${resolvedComments.length} Resolved)  \n\n`;
  md += `---\n\n`;

  // 1. Executive Summary
  md += `## 1. Executive Summary\n\n`;
  if (aiExecutiveSummary) {
    md += `${aiExecutiveSummary.trim()}\n\n`;
  } else {
    md += `This briefing captures current sprint progress, cross-document review inquiries, and workspace quality guidelines.\n\n`;
    md += `- **Tasks Distribution:** ${kanbanBoard.columns.map((col) => `${col.title}: ${col.cardIds.length}`).join(' · ')}\n`;
    md += `- **Review Threads:** ${openComments.length} unresolved threads across ${Object.keys(comments).length} documents.\n`;
    md += `- **Editorial Tone:** ${workspaceRules.editorialTone} (${workspaceRules.targetReadingLevel} reading level).\n\n`;
  }

  // 2. Team Roster
  md += `## 2. Team Roster\n\n`;
  if (teamMembers.length === 0) {
    md += `*No team members registered yet in workspace roster.*\n\n`;
  } else {
    md += `| Member | Role | Responsibility |\n`;
    md += `| :--- | :--- | :--- |\n`;
    teamMembers.forEach((m) => {
      const isLead = m.isCurrentUser ? ' (Current User)' : '';
      md += `| **${m.name}**${isLead} | ${m.role} | Contributor |\n`;
    });
    md += `\n`;
  }

  // 3. Sprint Planning & Kanban Matrix
  md += `## 3. Sprint Planning & Task Matrix\n\n`;
  if (totalCards === 0) {
    md += `*Sprint backlog is currently empty. No active cards found.*\n\n`;
  } else {
    kanbanBoard.columns.forEach((col) => {
      md += `### ${col.title} (${col.cardIds.length})\n\n`;
      const colCards = col.cardIds.map((id) => kanbanBoard.cards[id]).filter(Boolean);
      if (colCards.length === 0) {
        md += `*No tasks in this stage.*\n\n`;
      } else {
        colCards.forEach((card) => {
          const assignee = card.assignee ? ` [@${card.assignee}]` : '';
          const priority = card.priority.toUpperCase();
          const docLink = card.linkedDocId && documents[card.linkedDocId]
            ? ` *(Linked: ${documents[card.linkedDocId].name})*`
            : '';
          md += `- **[${priority}]** ${card.title}${assignee}${docLink}\n`;
          if (card.description) {
            md += `  > ${card.description.replace(/\n/g, ' ')}\n`;
          }
        });
        md += `\n`;
      }
    });
  }

  // 4. Review & QA Matrix
  md += `## 4. Unresolved Document Reviews\n\n`;
  if (openComments.length === 0) {
    md += `*All document review threads are resolved. 0 open questions.*\n\n`;
  } else {
    openComments.forEach((comment, idx) => {
      const doc = documents[comment.docId];
      const docName = doc ? doc.name : 'Unknown Document';
      md += `### ${idx + 1}. Review on "${docName}"\n\n`;
      md += `- **Author:** ${comment.author || 'Reviewer'}  \n`;
      md += `- **Selected Passage:** *"${comment.highlightedText}"*  \n`;
      md += `- **Comment:** ${comment.content}  \n`;
      if (comment.replies && comment.replies.length > 0) {
        md += `- **Thread Replies (${comment.replies.length}):**\n`;
        comment.replies.forEach((r: CommentReply) => {
          const author = r.isAI ? 'Omni AI' : r.author;
          md += `  - **${author}:** ${r.content}\n`;
        });
      }
      md += `\n`;
    });
  }

  // 5. Workspace Guidelines & Style Guardrails
  md += `## 5. Workspace Style Guidelines\n\n`;
  md += `- **Editorial Tone:** ${workspaceRules.editorialTone}\n`;
  md += `- **Target Reading Level:** ${workspaceRules.targetReadingLevel}\n`;
  md += `- **Citation Style:** ${workspaceRules.citationStyle}\n`;
  if (workspaceRules.prohibitedTerms && workspaceRules.prohibitedTerms.length > 0) {
    md += `- **Forbidden Buzzwords / Terms:** ${workspaceRules.prohibitedTerms.join(', ')}\n`;
  }
  if (workspaceRules.customDirectives) {
    md += `- **Directives:** ${workspaceRules.customDirectives}\n`;
  }
  md += `\n`;

  md += `---\n*Generated automatically by OmniDoc Studio 2.0 Team Hub*\n`;

  return md;
}

/**
 * Uses Omni AI to synthesize an executive summary of current sprint health and blockers.
 */
export async function generateAiSprintBriefing(params: {
  workspaceRules: WorkspaceRules;
  teamMembers: TeamMember[];
  kanbanBoard: KanbanBoard;
  comments: Record<string, DocumentComment[]>;
  documents: Record<string, DocumentItem>;
  activeProvider: AIProviderId;
  activePersona: AIPersona;
  aiConfigs: Record<AIProviderId, AIProviderConfig>;
  customInstructions?: string;
}): Promise<string> {
  const {
    workspaceRules,
    teamMembers,
    kanbanBoard,
    comments,
    documents,
    activeProvider,
    activePersona,
    aiConfigs,
    customInstructions
  } = params;

  const config = aiConfigs[activeProvider];
  const key = (await keyService.get(activeProvider as any)) || '';

  const allComments = Object.entries(comments).flatMap(([docId, docComments]) =>
    docComments.map((c) => ({ ...c, docId }))
  );
  const openComments = allComments.filter((c) => c.status === 'open');

  const contextData = {
    workspace: workspaceRules.teamName,
    members: teamMembers.map((m) => `${m.name} (${m.role})`),
    columns: kanbanBoard.columns.map((c) => ({
      column: c.title,
      tasks: c.cardIds.map((id) => {
        const card = kanbanBoard.cards[id];
        return card ? `${card.title} [${card.priority}] (@${card.assignee || 'unassigned'})` : '';
      })
    })),
    openReviewsCount: openComments.length,
    sampleReviewIssues: openComments.slice(0, 5).map((c) => ({
      doc: documents[c.docId]?.name || 'Doc',
      highlight: c.highlightedText,
      comment: c.content
    }))
  };

  const prompt = `You are Omni, the AI Team Architect in OmniDoc Studio.
Analyze the following live sprint and workspace data and synthesize a high-impact, professional Executive Briefing in 2 to 3 structured paragraphs.

Team & Sprint Context:
${JSON.stringify(contextData, null, 2)}

Provide:
1. **Sprint Velocity & Progress Overview**: Status of work in progress, backlog volume, and completed items.
2. **Key Risks & Review Blockers**: Highlight any urgent unassigned tasks or unresolved document reviews.
3. **Recommended Next Steps**: 2-3 concrete recommendations for the team lead.

Tone: Professional, direct, actionable. Avoid buzzwords.`;

  const messages = [
    {
      id: `briefing-prompt-${Date.now()}`,
      role: 'user' as const,
      content: prompt,
      timestamp: Date.now()
    }
  ];

  const summary = await callAI(
    messages,
    config,
    key,
    activePersona,
    undefined,
    customInstructions,
    workspaceRules
  );

  return summary;
}
