export type P2PConnectionState = 'disconnected' | 'creating_room' | 'joining_room' | 'connected' | 'failed';

export interface P2PVoiceNote {
  id: string;
  senderName: string;
  senderColor: string;
  audioBase64: string;
  durationSec: number;
  timestamp: number;
  docTitle?: string;
}

export interface P2PPresence {
  peerId: string;
  name: string;
  role: string;
  color: string;
  activeDocId?: string;
  activeDocName?: string;
  lastSeen: number;
}

export interface P2PChatMessage {
  id: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
}

export type P2PPayload =
  | { type: 'presence'; data: P2PPresence }
  | { type: 'voice_note'; data: P2PVoiceNote }
  | { type: 'chat'; data: P2PChatMessage }
  | { type: 'task_sync'; data: { card: any } }
  | { type: 'comment_sync'; data: { docId: string; comment: any } };
