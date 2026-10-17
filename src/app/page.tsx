'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { useGameStore } from '@/stores/gameStore';
import { useVoiceStore } from '@/stores/voiceStore';
import { LobbyView } from '@/components/LobbyView';
import { RoomLobby } from '@/components/RoomLobby';
import { GameTable3D } from '@/components/GameTable3D';

export default function HomePage() {
  const { user, isLoading, checkAuth } = useAuthStore();
  const { currentRoom, initSocketListeners, syncState } = useRoomStore();

  useEffect(() => {
    checkAuth();
    initSocketListeners();
  }, [checkAuth, initSocketListeners]);

  useEffect(() => {
    if (user?.id) {
      useGameStore.getState().initGameSocketListeners(user.id);
      syncState();
    }
  }, [user?.id, syncState]);

  // Synchronize Voice Room lifecycle strictly with currentRoom?.code:
  // Automatically joins voice when inside a room, stays seamlessly during WAITING -> PLAYING,
  // and automatically leaves & cleans up all audio/connections when exiting to lobby!
  useEffect(() => {
    const unsubVoice = useVoiceStore.getState().initSocketListeners();
    const roomCode = currentRoom?.code;

    if (roomCode) {
      useVoiceStore.getState().joinVoiceRoom(roomCode);
    } else {
      useVoiceStore.getState().leaveVoiceRoom();
    }

    return () => {
      unsubVoice();
      useVoiceStore.getState().leaveVoiceRoom();
    };
  }, [currentRoom?.code]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">
          Memuat BALAK 3D Domino...
        </p>
      </div>
    );
  }

  // Active Game State
  if (currentRoom && (currentRoom.status === 'PLAYING' || currentRoom.status === 'FINISHED')) {
    return <GameTable3D />;
  }

  // Room Lobby State (Waiting for players)
  if (currentRoom && currentRoom.status === 'WAITING') {
    return <RoomLobby />;
  }

  // Main Game Lobby
  return <LobbyView />;
}
