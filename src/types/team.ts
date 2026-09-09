export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
  isCurrentUser?: boolean;
}

export type TeamHubSubTab = 'planning' | 'reviews' | 'guidelines' | 'roster';

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];
