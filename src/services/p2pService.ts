import type { P2PConnectionState, P2PPayload, P2PPresence, P2PVoiceNote, P2PChatMessage } from '../types/p2p';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function encodeTicket(data: any): string {
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json));
}

function decodeTicket(ticket: string): any {
  const json = decodeURIComponent(atob(ticket.trim()));
  return JSON.parse(json);
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs: number = 2000): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let timer: any = null;

    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        if (timer) clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };

    pc.addEventListener('icegatheringstatechange', checkState);
    timer = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    }, timeoutMs);
  });
}

class P2PService {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private stateListeners: Set<(state: P2PConnectionState) => void> = new Set();
  private messageListeners: Set<(payload: P2PPayload) => void> = new Set();
  private currentState: P2PConnectionState = 'disconnected';

  public getState(): P2PConnectionState {
    return this.currentState;
  }

  public onStateChange(listener: (state: P2PConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.currentState);
    return () => this.stateListeners.delete(listener);
  }

  public onMessage(listener: (payload: P2PPayload) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private setState(state: P2PConnectionState) {
    this.currentState = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.channel = channel;

    channel.onopen = () => {
      this.setState('connected');
    };

    channel.onclose = () => {
      this.setState('disconnected');
    };

    channel.onerror = () => {
      this.setState('failed');
    };

    channel.onmessage = (event) => {
      try {
        const payload: P2PPayload = JSON.parse(event.data);
        this.messageListeners.forEach((fn) => fn(payload));
      } catch (err) {
        console.error('Failed to parse incoming P2P payload:', err);
      }
    };
  }

  /**
   * HOST: Creates an Offer Ticket for peer to join
   */
  public async createHostOfferTicket(): Promise<string> {
    this.disconnect();
    this.setState('creating_room');

    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'connected') {
        this.setState('connected');
      } else if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'closed') {
        this.setState('disconnected');
      } else if (this.pc?.connectionState === 'failed') {
        this.setState('failed');
      }
    };

    const channel = this.pc.createDataChannel('omnidoc-sync', { ordered: true });
    this.setupDataChannel(channel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    await waitForIceGathering(this.pc);

    if (!this.pc.localDescription) {
      throw new Error('Failed to create local description with ICE candidates');
    }

    return encodeTicket(this.pc.localDescription);
  }

  /**
   * PEER: Accepts Host's Offer Ticket and creates an Answer Ticket
   */
  public async acceptOfferAndCreateAnswer(offerTicket: string): Promise<string> {
    this.disconnect();
    this.setState('joining_room');

    const offerDesc = decodeTicket(offerTicket);
    if (!offerDesc || offerDesc.type !== 'offer') {
      throw new Error('Invalid Offer Ticket. Please verify the host room code.');
    }

    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel);
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'connected') {
        this.setState('connected');
      } else if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'closed') {
        this.setState('disconnected');
      } else if (this.pc?.connectionState === 'failed') {
        this.setState('failed');
      }
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await waitForIceGathering(this.pc);

    if (!this.pc.localDescription) {
      throw new Error('Failed to create answer description');
    }

    return encodeTicket(this.pc.localDescription);
  }

  /**
   * HOST: Finalizes connection by accepting Peer's Answer Ticket
   */
  public async finalizeHostConnection(answerTicket: string): Promise<void> {
    if (!this.pc) {
      throw new Error('No active host session found');
    }

    const answerDesc = decodeTicket(answerTicket);
    if (!answerDesc || answerDesc.type !== 'answer') {
      throw new Error('Invalid Answer Ticket. Please verify the joiner response code.');
    }

    await this.pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
  }

  /**
   * Sends arbitrary payload through open P2P DataChannel
   */
  public send(payload: P2PPayload): boolean {
    if (!this.channel || this.channel.readyState !== 'open') {
      return false;
    }
    this.channel.send(JSON.stringify(payload));
    return true;
  }

  /**
   * Disconnects active session and closes channels
   */
  public disconnect() {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {}
      this.channel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
    this.setState('disconnected');
  }

  /**
   * Records a lightweight voice note using microphone and encodes to Base64
   */
  public async recordVoiceNote(maxDurationSec: number = 30): Promise<{
    stop: () => Promise<{ base64: string; durationSec: number } | null>;
  }> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported in this environment');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : '';
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    const startTime = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.start();

    return {
      stop: () => {
        return new Promise((resolve) => {
          recorder.onstop = async () => {
            stream.getTracks().forEach((track) => track.stop());
            const durationSec = Math.round((Date.now() - startTime) / 1000);
            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });

            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve({ base64, durationSec });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          };
          recorder.stop();
        });
      }
    };
  }
}

export const p2pService = new P2PService();
