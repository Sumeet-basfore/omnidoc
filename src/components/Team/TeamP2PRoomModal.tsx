import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Copy,
  Check,
  Mic,
  Square,
  Send,
  Loader2,
  Users,
  ShieldCheck,
  Volume2,
  Play,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { p2pService } from '../../services/p2pService';
import type {
  P2PConnectionState,
  P2PPayload,
  P2PPresence,
  P2PVoiceNote,
  P2PChatMessage
} from '../../types/p2p';

interface TeamP2PRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamP2PRoomModal: React.FC<TeamP2PRoomModalProps> = ({ isOpen, onClose }) => {
  const { teamMembers, tabs, activeTabId, documents } = useAppStore();

  const [connState, setConnState] = useState<P2PConnectionState>(p2pService.getState());
  const [roleMode, setRoleMode] = useState<'choose' | 'host' | 'join'>('choose');

  // Host state
  const [hostOfferTicket, setHostOfferTicket] = useState<string>('');
  const [joinerAnswerInput, setJoinerAnswerInput] = useState<string>('');
  const [isGeneratingHost, setIsGeneratingHost] = useState<boolean>(false);

  // Joiner state
  const [hostOfferInput, setHostOfferInput] = useState<string>('');
  const [joinerAnswerTicket, setJoinerAnswerTicket] = useState<string>('');
  const [isGeneratingJoiner, setIsGeneratingJoiner] = useState<boolean>(false);

  // In-session state
  const [peerPresence, setPeerPresence] = useState<P2PPresence | null>(null);
  const [chatMessages, setChatMessages] = useState<P2PChatMessage[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<P2PVoiceNote[]>([]);
  const [textInput, setTextInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState<boolean>(false);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const recorderStopRef = useRef<(() => Promise<{ base64: string; durationSec: number } | null>) | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const currentUser = teamMembers.find((m) => m.isCurrentUser) || teamMembers[0] || {
    id: 'user-me',
    name: 'You',
    role: 'Lead',
    color: '#6366f1'
  };

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  // Listen to P2P connection and messages
  useEffect(() => {
    const unsubState = p2pService.onStateChange((state) => {
      setConnState(state);
      if (state === 'connected') {
        // Broadcast presence
        p2pService.send({
          type: 'presence',
          data: {
            peerId: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            color: currentUser.color,
            activeDocId: activeDoc?.id,
            activeDocName: activeDoc?.name,
            lastSeen: Date.now()
          }
        });
      }
    });

    const unsubMsg = p2pService.onMessage((payload: P2PPayload) => {
      if (payload.type === 'presence') {
        setPeerPresence(payload.data);
      } else if (payload.type === 'chat') {
        setChatMessages((prev) => [...prev, payload.data]);
      } else if (payload.type === 'voice_note') {
        setVoiceNotes((prev) => [...prev, payload.data]);
      }
    });

    return () => {
      unsubState();
      unsubMsg();
    };
  }, [currentUser, activeDoc]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, voiceNotes]);

  if (!isOpen) return null;

  const handleStartHost = async () => {
    setIsGeneratingHost(true);
    setErrorMsg(null);
    try {
      const ticket = await p2pService.createHostOfferTicket();
      setHostOfferTicket(ticket);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create host room');
    } finally {
      setIsGeneratingHost(false);
    }
  };

  const handleFinalizeHost = async () => {
    if (!joinerAnswerInput.trim()) return;
    setErrorMsg(null);
    try {
      await p2pService.finalizeHostConnection(joinerAnswerInput.trim());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect with joiner ticket');
    }
  };

  const handleJoinOffer = async () => {
    if (!hostOfferInput.trim()) return;
    setIsGeneratingJoiner(true);
    setErrorMsg(null);
    try {
      const answer = await p2pService.acceptOfferAndCreateAnswer(hostOfferInput.trim());
      setJoinerAnswerTicket(answer);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to join room ticket');
    } finally {
      setIsGeneratingJoiner(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || connState !== 'connected') return;

    const msg: P2PChatMessage = {
      id: `chat-${Date.now()}`,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      text: textInput.trim(),
      timestamp: Date.now()
    };

    p2pService.send({ type: 'chat', data: msg });
    setChatMessages((prev) => [...prev, msg]);
    setTextInput('');
  };

  const handleToggleVoiceRecord = async () => {
    if (isRecordingVoice) {
      // Stop recording
      if (recorderStopRef.current) {
        const res = await recorderStopRef.current();
        setIsRecordingVoice(false);
        recorderStopRef.current = null;
        if (res) {
          const note: P2PVoiceNote = {
            id: `voice-${Date.now()}`,
            senderName: currentUser.name,
            senderColor: currentUser.color,
            audioBase64: res.base64,
            durationSec: res.durationSec,
            timestamp: Date.now(),
            docTitle: activeDoc?.name
          };
          p2pService.send({ type: 'voice_note', data: note });
          setVoiceNotes((prev) => [...prev, note]);
        }
      }
    } else {
      // Start recording
      try {
        const { stop } = await p2pService.recordVoiceNote(30);
        recorderStopRef.current = stop;
        setIsRecordingVoice(true);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Microphone access denied');
      }
    }
  };

  const handleDisconnect = () => {
    p2pService.disconnect();
    setRoleMode('choose');
    setHostOfferTicket('');
    setJoinerAnswerTicket('');
    setPeerPresence(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl h-[80vh] bg-[#121622] rounded-lg border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-indigo-500/20 text-indigo-400">
              <Radio size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Direct P2P Room & Voice</h3>
                {connState === 'connected' ? (
                  <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                    Zero-Server WebRTC
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                End-to-end encrypted direct pairing for live discussions, cursor presence, and voice clips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connState === 'connected' && (
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Disconnect
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#0a0c12]">
          {connState !== 'connected' ? (
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Zero server privacy badge */}
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 flex items-center gap-3 text-xs text-indigo-200">
                <ShieldCheck size={18} className="text-indigo-400 shrink-0" />
                <p className="leading-snug">
                  OmniDoc P2P pairs directly between your browser and your teammate's device via WebRTC DataChannels. No data passes through a centralized server or cloud database.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Mode Selection */}
              {roleMode === 'choose' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-lg bg-[#121622] border border-white/10 hover:border-indigo-500/40 flex flex-col justify-between space-y-3 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <Radio size={16} />
                        <h4 className="text-xs font-semibold text-white">Create Host Room</h4>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Start a room and generate a pairing ticket to share with your teammate.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setRoleMode('host');
                        handleStartHost();
                      }}
                      className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      Host a Room
                    </button>
                  </div>

                  <div className="p-4 rounded-lg bg-[#121622] border border-white/10 hover:border-emerald-500/40 flex flex-col justify-between space-y-3 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Users size={16} />
                        <h4 className="text-xs font-semibold text-white">Join Existing Room</h4>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Enter a pairing ticket generated by your teammate to connect immediately.
                      </p>
                    </div>
                    <button
                      onClick={() => setRoleMode('join')}
                      className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      Join Room
                    </button>
                  </div>
                </div>
              )}

              {/* Host Workflow */}
              {roleMode === 'host' && (
                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      1. Share Host Ticket
                    </h4>
                    <button
                      onClick={() => {
                        setRoleMode('choose');
                        p2pService.disconnect();
                      }}
                      className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Back to options
                    </button>
                  </div>

                  {isGeneratingHost ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                      <span>Generating secure ICE pairing ticket...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Copy and send this ticket to your teammate:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(hostOfferTicket);
                            setCopiedHost(true);
                            setTimeout(() => setCopiedHost(false), 2000);
                          }}
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          {copiedHost ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedHost ? 'Copied' : 'Copy Ticket'}</span>
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={hostOfferTicket}
                        rows={3}
                        className="w-full p-2 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-zinc-300 focus:outline-none select-all"
                      />
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      2. Paste Teammate's Joiner Ticket
                    </h4>
                    <textarea
                      value={joinerAnswerInput}
                      onChange={(e) => setJoinerAnswerInput(e.target.value)}
                      placeholder="Paste the response ticket sent back by your teammate here..."
                      rows={3}
                      className="w-full p-2 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleFinalizeHost}
                      disabled={!joinerAnswerInput.trim()}
                      className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      Connect & Open Room
                    </button>
                  </div>
                </div>
              )}

              {/* Joiner Workflow */}
              {roleMode === 'join' && (
                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      1. Enter Host's Ticket
                    </h4>
                    <button
                      onClick={() => {
                        setRoleMode('choose');
                        p2pService.disconnect();
                      }}
                      className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Back to options
                    </button>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={hostOfferInput}
                      onChange={(e) => setHostOfferInput(e.target.value)}
                      placeholder="Paste the ticket provided by the room host..."
                      rows={3}
                      className="w-full p-2 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleJoinOffer}
                      disabled={!hostOfferInput.trim() || isGeneratingJoiner}
                      className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      {isGeneratingJoiner && <Loader2 size={13} className="animate-spin" />}
                      <span>Generate Response Ticket</span>
                    </button>
                  </div>

                  {joinerAnswerTicket && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-semibold text-emerald-400">
                          2. Send this ticket back to the Host:
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(joinerAnswerTicket);
                            setCopiedAnswer(true);
                            setTimeout(() => setCopiedAnswer(false), 2000);
                          }}
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                        >
                          {copiedAnswer ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedAnswer ? 'Copied' : 'Copy Response'}</span>
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={joinerAnswerTicket}
                        rows={3}
                        className="w-full p-2 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-zinc-300 focus:outline-none select-all"
                      />
                      <p className="text-[11px] text-zinc-500 italic">
                        Once the host enters this response, your room will open automatically!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Active Connected Session Viewport */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Active Peer Presence Bar */}
              {peerPresence && (
                <div className="px-4 py-2 bg-[#121622] border-b border-white/10 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ backgroundColor: peerPresence.color }}
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                    >
                      {peerPresence.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{peerPresence.name}</span>
                        <span className="text-[10px] text-zinc-400">{peerPresence.role}</span>
                      </div>
                      {peerPresence.activeDocName && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-300">
                          <FileText size={10} />
                          <span>Viewing: {peerPresence.activeDocName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live DataChannel
                  </span>
                </div>
              )}

              {/* Chat & Voice Notes Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && voiceNotes.length === 0 && (
                  <div className="py-16 text-center text-zinc-500 text-xs">
                    <p>Connected with your teammate!</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Send messages, record short voice notes, or coordinate reviews in real-time.
                    </p>
                  </div>
                )}

                {/* Voice Notes */}
                {voiceNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-[#161a26] border border-indigo-500/30 max-w-sm space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Volume2 size={13} className="text-indigo-400" />
                        <span className="font-semibold text-white">{note.senderName}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {note.durationSec}s voice note
                      </span>
                    </div>
                    {note.docTitle && (
                      <div className="text-[10px] text-zinc-400">
                        Ref: <span className="text-indigo-300">{note.docTitle}</span>
                      </div>
                    )}
                    <audio src={note.audioBase64} controls className="w-full h-7 rounded" />
                  </div>
                ))}

                {/* Chat Messages */}
                {chatMessages.map((msg) => {
                  const isMine = msg.senderName === currentUser.name;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-zinc-500">
                        <span className="font-medium text-zinc-300">{msg.senderName}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-lg text-xs max-w-md ${
                          isMine
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[#1a2030] text-zinc-200 border border-white/5'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Composer: Text Chat + Mic Button */}
              <div className="p-3 border-t border-white/10 bg-[#121622] flex items-center gap-2 shrink-0">
                {/* Voice Note Button */}
                <button
                  type="button"
                  onClick={handleToggleVoiceRecord}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    isRecordingVoice
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10'
                  }`}
                  title={isRecordingVoice ? 'Stop and send voice note' : 'Record short voice note (up to 30s)'}
                >
                  {isRecordingVoice ? <Square size={15} /> : <Mic size={15} />}
                </button>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={
                      isRecordingVoice
                        ? 'Recording voice note... Click red button to send.'
                        : 'Send real-time peer message...'
                    }
                    disabled={isRecordingVoice}
                    className="flex-1 px-3 py-1.5 rounded bg-black/40 border border-white/10 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim() || isRecordingVoice}
                    className="p-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
                    title="Send message"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
