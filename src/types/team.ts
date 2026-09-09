export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
  isCurrentUser?: boolean;
}

export type TeamHubSubTab = 'planning' | 'reviews' | 'guidelines' | 'roster';

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: 'member-1', name: 'You', role: 'Author & Lead', color: '#6366f1', isCurrentUser: true },
  { id: 'member-2', name: 'Alex Rivera', role: 'Technical Reviewer', color: '#06b6d4' },
  { id: 'member-3', name: 'Morgan Chen', role: 'Research Analyst', color: '#10b981' },
  { id: 'member-4', name: 'Omni', role: 'AI Assistant', color: '#ec4899' }
];
