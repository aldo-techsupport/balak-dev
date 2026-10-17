import { create } from 'zustand';
import { getSocket } from '@/lib/socket';

interface VoiceState {
  isMicOn: boolean;
  isSpeaking: boolean;
  isSimulating: boolean;
  isAudioBlocked: boolean;
  isLoopbackTesting: boolean;
  speakingUsers: Record<string, boolean>; // userId -> isSpeaking
  mutedUsers: Record<string, boolean>;    // userId -> isMuted
  micVolume: number; // 0 to 100
  threshold: number; // sensitivity threshold (default 15)
  hasPermission: boolean;
  errorMessage: string | null;
  currentRoomCode: string | null;

  // Actions
  joinVoiceRoom: (roomCode: string) => Promise<void>;
  leaveVoiceRoom: () => void;
  removePeerBySocketId: (socketId: string) => void;
  removePeerByUserId: (userId: string) => void;
  toggleMic: (roomCode?: string) => Promise<boolean>;
  setMicOn: (on: boolean, roomCode?: string) => Promise<boolean>;
  unlockAudio: () => Promise<void>;
  toggleLoopbackTest: () => Promise<boolean>;
  setThreshold: (val: number) => void;
  startSimulation: (roomCode?: string) => void;
  stopSimulation: (roomCode?: string) => void;
  initSocketListeners: () => () => void;
}

// Global WebRTC and Audio objects
let localMediaStream: MediaStream | null = null;
let localAnalyser: AnalyserNode | null = null;
let audioStreamProcessor: ScriptProcessorNode | null = null;
let animFrameId: number | null = null;
let speakingTimeout: NodeJS.Timeout | null = null;
let loopbackAudioEl: HTMLAudioElement | null = null;
let sharedAudioContext: AudioContext | null = null;
let silentMediaTrack: MediaStreamTrack | null = null;
let nextAudioPlayTime = 0;
let isSocketListenersAttached = false;

// Peer connection maps (socketId -> RTCPeerConnection)
const peerConnections = new Map<string, RTCPeerConnection>();
// Peer audio elements (socketId -> HTMLAudioElement)
const peerAudioElements = new Map<string, HTMLAudioElement>();
// Peer socketId to userId mapping
const peerUsers = new Map<string, string>();
// Queue for ICE candidates received before remoteDescription is ready
const pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
  ],
};

// Helper: Safely get or initialize AudioContext
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  return sharedAudioContext;
}

// Helper: Generate an in-memory silent audio track
function getOrCreateSilentTrack(): MediaStreamTrack | null {
  if (silentMediaTrack && silentMediaTrack.readyState === 'live') {
    return silentMediaTrack;
  }
  try {
    const ctx = getAudioContext();
    if (!ctx) return null;
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(dst);
    osc.start();
    silentMediaTrack = dst.stream.getAudioTracks()[0] || null;
    return silentMediaTrack;
  } catch (err) {
    return null;
  }
}

// Function to unlock all audio elements and AudioContext on user interaction
export const unlockAllAudio = async () => {
  try {
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }
  } catch {}

  let allPlayed = true;
  peerAudioElements.forEach((audio) => {
    if (audio && audio.srcObject && audio.paused) {
      audio.play().catch(() => {
        allPlayed = false;
      });
    }
  });

  if (allPlayed) {
    useVoiceStore.setState({ isAudioBlocked: false });
  }
};

// Register capture-phase listeners on window so ANY touch or click anywhere unlocks audio
if (typeof window !== 'undefined') {
  const events = ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'];
  events.forEach((ev) => {
    window.addEventListener(ev, () => {
      unlockAllAudio();
    }, { capture: true, passive: true });
  });
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isMicOn: false,
  isSpeaking: false,
  isSimulating: false,
  isAudioBlocked: false,
  isLoopbackTesting: false,
  speakingUsers: {},
  mutedUsers: {},
  micVolume: 0,
  threshold: 15,
  hasPermission: false,
  errorMessage: null,
  currentRoomCode: null,

  setThreshold: (val) => set({ threshold: val }),

  unlockAudio: async () => {
    await unlockAllAudio();
  },

  removePeerBySocketId: (socketId: string) => {
    const pc = peerConnections.get(socketId);
    if (pc) {
      try {
        pc.close();
      } catch {}
      peerConnections.delete(socketId);
    }

    const audio = peerAudioElements.get(socketId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      } catch {}
      peerAudioElements.delete(socketId);
    }

    pendingCandidates.delete(socketId);

    const userId = peerUsers.get(socketId);
    peerUsers.delete(socketId);

    if (userId) {
      set((state) => ({
        speakingUsers: { ...state.speakingUsers, [userId]: false },
        mutedUsers: { ...state.mutedUsers, [userId]: true },
      }));
    }
  },

  removePeerByUserId: (userId: string) => {
    let foundSocketId: string | null = null;
    peerUsers.forEach((uId, sId) => {
      if (uId === userId) {
        foundSocketId = sId;
      }
    });

    if (foundSocketId) {
      get().removePeerBySocketId(foundSocketId);
    } else {
      set((state) => ({
        speakingUsers: { ...state.speakingUsers, [userId]: false },
      }));
    }
  },

  toggleLoopbackTest: async () => {
    const isTesting = get().isLoopbackTesting;
    if (isTesting) {
      if (loopbackAudioEl) {
        loopbackAudioEl.pause();
        loopbackAudioEl.srcObject = null;
      }
      set({ isLoopbackTesting: false });
      return false;
    }

    if (!get().isMicOn) {
      const ok = await get().setMicOn(true);
      if (!ok) return false;
    }

    if (localMediaStream) {
      if (!loopbackAudioEl) {
        loopbackAudioEl = document.createElement('audio');
        loopbackAudioEl.id = 'voice-loopback-test';
        loopbackAudioEl.style.display = 'none';
        document.body.appendChild(loopbackAudioEl);
      }
      loopbackAudioEl.srcObject = localMediaStream;
      loopbackAudioEl.volume = 1.0;
      loopbackAudioEl.play().catch(() => {});
      set({ isLoopbackTesting: true });
      return true;
    }
    return false;
  },

  initSocketListeners: () => {
    const socket = getSocket();

    if (isSocketListenersAttached) {
      return () => {};
    }
    isSocketListenersAttached = true;

    const onMicStatus = (data: { userId: string; isMuted: boolean }) => {
      if (!data?.userId) return;
      set((state) => ({
        mutedUsers: {
          ...state.mutedUsers,
          [data.userId]: data.isMuted,
        },
        speakingUsers: data.isMuted
          ? { ...state.speakingUsers, [data.userId]: false }
          : state.speakingUsers,
      }));
    };

    const onMicSpeaking = (data: { userId: string; speaking: boolean }) => {
      if (!data?.userId) return;
      set((state) => ({
        speakingUsers: {
          ...state.speakingUsers,
          [data.userId]: data.speaking,
        },
      }));
    };

    // Live binary WebSocket audio stream receiver
    const onVoiceStream = (data: { fromUserId: string; fromNickname: string; buffer: ArrayBuffer }) => {
      const { fromUserId, buffer } = data || {};
      if (!buffer || !fromUserId) return;

      // Mark speaking
      set((state) => ({
        speakingUsers: { ...state.speakingUsers, [fromUserId]: true },
      }));

      // Play buffer via Web Audio API destination
      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        if (ctx.state === 'suspended') {
          set({ isAudioBlocked: true });
          return;
        }

        const int16 = new Int16Array(buffer);
        const audioBuf = ctx.createBuffer(1, int16.length, ctx.sampleRate);
        const channelData = audioBuf.getChannelData(0);
        for (let i = 0; i < int16.length; i++) {
          channelData[i] = int16[i] / 32768.0;
        }

        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(ctx.destination);

        const cur = ctx.currentTime;
        if (nextAudioPlayTime < cur) {
          nextAudioPlayTime = cur + 0.02;
        }
        src.start(nextAudioPlayTime);
        nextAudioPlayTime += audioBuf.duration;
      } catch (err) {}
    };

    // WebRTC: Existing peers in the voice channel
    const onVoicePeers = async (data: { peers: Array<{ socketId: string; userId: string; nickname: string }> }) => {
      const { peers } = data || {};
      if (!Array.isArray(peers)) return;

      for (const peer of peers) {
        peerUsers.set(peer.socketId, peer.userId);
        await createPeerOffer(peer.socketId, peer.userId);
      }
    };

    // WebRTC: New peer joined voice channel
    const onVoicePeerJoined = async (data: { socketId: string; userId: string; nickname: string }) => {
      const { socketId, userId } = data || {};
      if (!socketId) return;

      peerUsers.set(socketId, userId);

      if (peerConnections.has(socketId)) {
        try {
          peerConnections.get(socketId)?.close();
        } catch {}
        peerConnections.delete(socketId);
      }
    };

    // WebRTC: Signal (Offer / Answer / Candidate) received from peer
    const onVoiceSignal = async (data: { fromSocketId: string; fromUserId: string; signal: any }) => {
      const { fromSocketId, fromUserId, signal } = data || {};
      if (!fromSocketId || !signal) return;

      peerUsers.set(fromSocketId, fromUserId);

      if (signal.type === 'offer') {
        await handleReceiveOffer(fromSocketId, fromUserId, signal.sdp);
      } else if (signal.type === 'answer') {
        const pc = peerConnections.get(fromSocketId);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

            const pending = pendingCandidates.get(fromSocketId);
            if (pending && pending.length > 0) {
              for (const cand of pending) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {}
              }
              pendingCandidates.delete(fromSocketId);
            }
          } catch (err) {
            console.warn('[WebRTC] Set remote answer error:', err);
          }
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        const pc = peerConnections.get(fromSocketId);
        if (!pc || !pc.remoteDescription) {
          if (!pendingCandidates.has(fromSocketId)) {
            pendingCandidates.set(fromSocketId, []);
          }
          pendingCandidates.get(fromSocketId)!.push(signal.candidate);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.warn('[WebRTC] Add ICE candidate error:', err);
          }
        }
      }
    };

    // WebRTC: Peer left voice channel
    const onVoicePeerLeft = (data: { socketId: string; userId: string }) => {
      const { socketId } = data || {};
      if (socketId) {
        get().removePeerBySocketId(socketId);
      }
    };

    socket.on('mic:status-updated', onMicStatus);
    socket.on('mic:speaking-updated', onMicSpeaking);
    socket.on('voice:stream', onVoiceStream);
    socket.on('voice:peers', onVoicePeers);
    socket.on('voice:peer-joined', onVoicePeerJoined);
    socket.on('voice:signal', onVoiceSignal);
    socket.on('voice:peer-left', onVoicePeerLeft);

    return () => {};
  },

  joinVoiceRoom: async (roomCode: string) => {
    if (!roomCode) return;
    const current = get().currentRoomCode;
    if (current && current !== roomCode) {
      get().leaveVoiceRoom();
    }
    set({ currentRoomCode: roomCode });

    get().initSocketListeners();

    const socket = getSocket();
    socket.emit('voice:join', { roomCode });
  },

  leaveVoiceRoom: () => {
    const roomCode = get().currentRoomCode;
    const socket = getSocket();

    if (roomCode) {
      socket.emit('voice:leave', { roomCode });
    }

    // Stop binary audio stream processor
    if (audioStreamProcessor) {
      try {
        audioStreamProcessor.disconnect();
      } catch {}
      audioStreamProcessor = null;
    }

    // Close all WebRTC peer connections
    peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peerConnections.clear();

    // Pause, unhook and remove all remote audio elements from DOM
    peerAudioElements.forEach((audio) => {
      try {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      } catch {}
    });
    peerAudioElements.clear();
    pendingCandidates.clear();
    peerUsers.clear();

    if (loopbackAudioEl) {
      try {
        loopbackAudioEl.pause();
        loopbackAudioEl.srcObject = null;
      } catch {}
    }

    // Disable microphone tracks when leaving the room
    if (localMediaStream) {
      localMediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (speakingTimeout) {
      clearTimeout(speakingTimeout);
      speakingTimeout = null;
    }

    set({
      currentRoomCode: null,
      isMicOn: false,
      isSpeaking: false,
      isLoopbackTesting: false,
      isAudioBlocked: false,
      micVolume: 0,
      speakingUsers: {},
      mutedUsers: {},
    });
  },

  toggleMic: async (roomCode?: string) => {
    const current = get().isMicOn;
    return get().setMicOn(!current, roomCode);
  },

  setMicOn: async (on: boolean, roomCode?: string) => {
    const socket = getSocket();
    const effectiveRoomCode = roomCode || get().currentRoomCode;

    if (!on) {
      // Disconnect live audio stream processor
      if (audioStreamProcessor) {
        try {
          audioStreamProcessor.disconnect();
        } catch {}
        audioStreamProcessor = null;
      }

      // Mute microphone: swap peer senders to silent track
      const silent = getOrCreateSilentTrack();
      peerConnections.forEach((pc) => {
        const transceivers = pc.getTransceivers();
        const audioTransceiver = transceivers.find((t) => t.receiver.track.kind === 'audio');
        if (audioTransceiver && silent) {
          audioTransceiver.sender.replaceTrack(silent).catch(() => {});
        } else {
          const senders = pc.getSenders();
          const audioSender = senders.find((s) => s.track?.kind === 'audio');
          if (audioSender && silent) {
            audioSender.replaceTrack(silent).catch(() => {});
          }
        }
      });

      if (localMediaStream) {
        localMediaStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
        speakingTimeout = null;
      }

      set({ isMicOn: false, isSpeaking: false, micVolume: 0 });

      if (effectiveRoomCode) {
        socket.emit('mic:toggle', { roomCode: effectiveRoomCode, isMuted: true });
        socket.emit('mic:speaking', { roomCode: effectiveRoomCode, speaking: false });
      }
      return false;
    }

    // Unmute / Turn ON Mic
    try {
      if (!localMediaStream || localMediaStream.getAudioTracks().every((t) => t.readyState === 'ended')) {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Browser tidak mendukung perekaman suara mikrofon.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localMediaStream = stream;
      } else {
        localMediaStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }

      const micTrack = localMediaStream.getAudioTracks()[0];
      if (micTrack) {
        // Swap local audio track on all established WebRTC connections
        peerConnections.forEach((pc) => {
          const transceivers = pc.getTransceivers();
          const audioTransceiver = transceivers.find((t) => t.receiver.track.kind === 'audio');
          if (audioTransceiver) {
            audioTransceiver.sender.replaceTrack(micTrack).catch((e) => {
              console.warn('[WebRTC] replaceTrack error:', e);
            });
            audioTransceiver.direction = 'sendrecv';
          } else {
            const senders = pc.getSenders();
            const audioSender = senders.find((s) => s.track?.kind === 'audio' || s.track === null);
            if (audioSender) {
              audioSender.replaceTrack(micTrack).catch((e) => {
                console.warn('[WebRTC] replaceTrack error:', e);
              });
            } else {
              try {
                pc.addTrack(micTrack, localMediaStream!);
              } catch (e) {}
            }
          }
        });
      }

      // Setup local audio analyser for volume & speaking detection
      const ctx = getAudioContext();
      if (ctx && localMediaStream) {
        if (!localAnalyser) {
          localAnalyser = ctx.createAnalyser();
          localAnalyser.fftSize = 256;
          const source = ctx.createMediaStreamSource(localMediaStream);
          source.connect(localAnalyser);
        }

        // Live binary audio streamer node (Direct WebSocket Voice Relay)
        try {
          if (audioStreamProcessor) {
            try { audioStreamProcessor.disconnect(); } catch {}
          }
          const processor = ctx.createScriptProcessor(2048, 1, 1);
          const streamSource = ctx.createMediaStreamSource(localMediaStream);
          streamSource.connect(processor);

          // Zero-gain output keeps ScriptProcessor running without loopback
          const silentGain = ctx.createGain();
          silentGain.gain.value = 0;
          processor.connect(silentGain);
          silentGain.connect(ctx.destination);

          processor.onaudioprocess = (e) => {
            if (!get().isMicOn) return;
            const rCode = get().currentRoomCode || effectiveRoomCode;
            if (!rCode) return;

            // Only stream when mic is active and volume > threshold
            if (get().micVolume < get().threshold && !get().isSpeaking) return;

            const input = e.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]));
              pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            socket.emit('voice:stream', {
              roomCode: rCode,
              buffer: pcm.buffer,
            });
          };

          audioStreamProcessor = processor;
        } catch (procErr) {
          console.warn('ScriptProcessor setup error:', procErr);
        }
      }

      set({ isMicOn: true, hasPermission: true, errorMessage: null });

      if (effectiveRoomCode) {
        socket.emit('mic:toggle', { roomCode: effectiveRoomCode, isMuted: false });
      }

      // Volume monitoring loop
      const bufferLength = localAnalyser ? localAnalyser.frequencyBinCount : 0;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!get().isMicOn || !localAnalyser) return;

        localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = bufferLength > 0 ? sum / bufferLength : 0;
        const normalizedVol = Math.min(100, Math.round((avg / 128) * 100));

        set({ micVolume: normalizedVol });

        const isNowSpeaking = normalizedVol >= get().threshold;
        const wasSpeaking = get().isSpeaking;

        if (isNowSpeaking) {
          if (!wasSpeaking) {
            set({ isSpeaking: true });
            if (effectiveRoomCode) {
              socket.emit('mic:speaking', { roomCode: effectiveRoomCode, speaking: true });
            }
          }
          if (speakingTimeout) {
            clearTimeout(speakingTimeout);
            speakingTimeout = null;
          }
          speakingTimeout = setTimeout(() => {
            if (get().isMicOn) {
              set({ isSpeaking: false });
              if (effectiveRoomCode) {
                socket.emit('mic:speaking', { roomCode: effectiveRoomCode, speaking: false });
              }
            }
          }, 400);
        }

        animFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
      return true;
    } catch (err: any) {
      console.warn('Gagal mengaktifkan mikrofon fisik:', err);
      set({
        isMicOn: true,
        errorMessage: 'Izin mic ditolak/tidak tersedia di perangkat ini.',
      });
      if (effectiveRoomCode) {
        socket.emit('mic:toggle', { roomCode: effectiveRoomCode, isMuted: false });
      }
      return true;
    }
  },

  startSimulation: (roomCode?: string) => {
    const socket = getSocket();
    const effectiveRoomCode = roomCode || get().currentRoomCode;
    set({ isSimulating: true, isSpeaking: true, micVolume: 85 });
    if (effectiveRoomCode) {
      socket.emit('mic:speaking', { roomCode: effectiveRoomCode, speaking: true });
    }
  },

  stopSimulation: (roomCode?: string) => {
    const socket = getSocket();
    const effectiveRoomCode = roomCode || get().currentRoomCode;
    set({ isSimulating: false, isSpeaking: false, micVolume: 0 });
    if (effectiveRoomCode) {
      socket.emit('mic:speaking', { roomCode: effectiveRoomCode, speaking: false });
    }
  },
}));

// WebRTC Peer connection creation helper (Caller side: new joiner)
async function createPeerOffer(peerSocketId: string, peerUserId: string) {
  try {
    const socket = getSocket();
    let pc = peerConnections.get(peerSocketId);

    if (!pc) {
      pc = setupPeerConnection(peerSocketId, peerUserId);
      peerConnections.set(peerSocketId, pc);
    }

    const trackToSend = (localMediaStream && localMediaStream.getAudioTracks().find((t) => t.readyState === 'live')) || getOrCreateSilentTrack();
    if (trackToSend) {
      const existingSenders = pc.getSenders();
      const audioSender = existingSenders.find((s) => s.track === null || s.track?.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(trackToSend);
      } else {
        pc.addTrack(trackToSend, new MediaStream([trackToSend]));
      }
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
    });
    await pc.setLocalDescription(offer);

    socket.emit('voice:signal', {
      targetSocketId: peerSocketId,
      signal: { type: 'offer', sdp: offer },
    });
  } catch (err) {
    console.warn('[WebRTC] Create peer offer error:', err);
  }
}

// WebRTC Handle incoming offer helper (Receiver side: existing member)
async function handleReceiveOffer(fromSocketId: string, fromUserId: string, sdp: RTCSessionDescriptionInit) {
  try {
    const socket = getSocket();
    let pc = peerConnections.get(fromSocketId);

    if (pc) {
      if (pc.signalingState !== 'stable') {
        pc.close();
        pc = setupPeerConnection(fromSocketId, fromUserId);
        peerConnections.set(fromSocketId, pc);
      }
    } else {
      pc = setupPeerConnection(fromSocketId, fromUserId);
      peerConnections.set(fromSocketId, pc);
    }

    // 1. Set remote description from offer first
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    // 2. Drain any pending ICE candidates received before remoteDescription
    const pending = pendingCandidates.get(fromSocketId);
    if (pending && pending.length > 0) {
      for (const cand of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {}
      }
      pendingCandidates.delete(fromSocketId);
    }

    // 3. Attach local track: real mic or silent track
    const trackToSend = (localMediaStream && localMediaStream.getAudioTracks().find((t) => t.readyState === 'live')) || getOrCreateSilentTrack();
    if (trackToSend) {
      const transceivers = pc.getTransceivers();
      const audioTransceiver = transceivers.find((t) => t.receiver.track.kind === 'audio');
      if (audioTransceiver) {
        await audioTransceiver.sender.replaceTrack(trackToSend);
        audioTransceiver.direction = 'sendrecv';
      } else {
        const audioSender = pc.getSenders().find((s) => s.track === null || s.track?.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(trackToSend);
        } else {
          pc.addTrack(trackToSend, new MediaStream([trackToSend]));
        }
      }
    }

    // 4. Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('voice:signal', {
      targetSocketId: fromSocketId,
      signal: { type: 'answer', sdp: answer },
    });
  } catch (err) {
    console.warn('[WebRTC] Handle receive offer error:', err);
  }
}

// Helper: Setup Peer Connection with tracks, ontrack audio player, and onicecandidate
function setupPeerConnection(peerSocketId: string, peerUserId: string): RTCPeerConnection {
  const socket = getSocket();
  const pc = new RTCPeerConnection(ICE_SERVERS);

  // Connection state monitoring
  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] Peer ${peerSocketId} connectionState:`, pc.connectionState);
    if (pc.connectionState === 'failed') {
      try {
        pc.restartIce();
      } catch {}
    }
  };

  // ICE Candidate exchange
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice:signal', {
        targetSocketId: peerSocketId,
        signal: { type: 'candidate', candidate: event.candidate.toJSON() },
      });
    }
  };

  // Incoming remote audio stream!
  pc.ontrack = (event) => {
    try {
      console.log(`[WebRTC] Incoming track from peer ${peerSocketId}`, event.track.kind);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      if (!remoteStream) return;

      let audioEl = peerAudioElements.get(peerSocketId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `peer-audio-${peerSocketId}`;
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        audioEl.volume = 1.0;
        audioEl.style.position = 'fixed';
        audioEl.style.top = '-9999px';
        audioEl.style.left = '-9999px';
        audioEl.style.width = '1px';
        audioEl.style.height = '1px';
        audioEl.style.opacity = '0.001';
        audioEl.style.pointerEvents = 'none';
        document.body.appendChild(audioEl);
        peerAudioElements.set(peerSocketId, audioEl);
      }

      audioEl.srcObject = remoteStream;

      const p = audioEl.play();
      if (p !== undefined) {
        p.then(() => {
          useVoiceStore.setState({ isAudioBlocked: false });
        }).catch((playErr) => {
          console.warn('[WebRTC Audio] Autoplay blocked, waiting for user gesture:', playErr);
          useVoiceStore.setState({ isAudioBlocked: true });
        });
      }
    } catch (err) {
      console.warn('[WebRTC] ontrack handler error:', err);
    }
  };

  return pc;
}
