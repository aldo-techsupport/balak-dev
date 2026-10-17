'use client';

import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Palette,
  Sliders,
  Sparkles,
  Smartphone,
  X,
  Activity,
  Check,
} from 'lucide-react';
import { useVoiceStore } from '@/stores/voiceStore';
import { sound } from '@/lib/audio';

interface OptionModalProps {
  onClose: () => void;
  roomCode?: string;
  tableTheme?: 'EMERALD' | 'SAPPHIRE' | 'CRIMSON';
  onThemeChange?: (theme: 'EMERALD' | 'SAPPHIRE' | 'CRIMSON') => void;
}

export const OptionModal: React.FC<OptionModalProps> = ({
  onClose,
  roomCode,
  tableTheme = 'EMERALD',
  onThemeChange,
}) => {
  const {
    isMicOn,
    isSpeaking,
    isLoopbackTesting,
    micVolume,
    threshold,
    setThreshold,
    toggleMic,
    toggleLoopbackTest,
    startSimulation,
    stopSimulation,
    errorMessage,
  } = useVoiceStore();

  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [currentTheme, setCurrentTheme] = useState<'EMERALD' | 'SAPPHIRE' | 'CRIMSON'>(tableTheme);
  const [graphicsQuality, setGraphicsQuality] = useState<'HIGH' | 'LOW'>('HIGH');
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);

  const handleToggleSound = () => {
    sound.enabled = !sound.enabled;
    setSoundEnabled(sound.enabled);
  };

  const handleSelectTheme = (t: 'EMERALD' | 'SAPPHIRE' | 'CRIMSON') => {
    setCurrentTheme(t);
    if (onThemeChange) {
      onThemeChange(t);
    }
  };

  const handleToggleTestSpeech = () => {
    if (isTestingSpeech) {
      setIsTestingSpeech(false);
      stopSimulation(roomCode);
    } else {
      setIsTestingSpeech(true);
      sound.playTurnAlert();
      startSimulation(roomCode);
      setTimeout(() => {
        setIsTestingSpeech(false);
        stopSimulation(roomCode);
      }, 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/40 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Pengaturan Game</h3>
              <p className="text-[11px] text-slate-400">Audio, Mikrofon ON MIC, dan Tampilan Meja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          {/* SECTION: AUDIO & SOUND EFFECTS */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
              Efek Suara Domino
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <p className="text-xs font-bold text-white">Suara Domino & Notifikasi</p>
                  <p className="text-[10px] text-slate-400">Ketukan kartu, giliran, dan kemenangan</p>
                </div>
              </div>
              <button
                onClick={handleToggleSound}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  soundEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {soundEnabled ? 'Aktif' : 'Mati'}
              </button>
            </div>
          </div>

          {/* SECTION: ON MIC & VOICE SETTINGS */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                Fitur ON MIC (Voice Chat)
              </span>
              {isMicOn && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  MIC ONLINE
                </span>
              )}
            </div>

            {/* Toggle Mic Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                    isMicOn
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Status Mikrofon Anda</p>
                  <p className="text-[10px] text-slate-400">
                    {isMicOn ? 'Mikrofon aktif — bicara langsung terdeteksi' : 'Mikrofon dibisukan (Mute)'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggleMic(roomCode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition active:scale-95 shadow-md ${
                  isMicOn
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {isMicOn ? 'ON MIC' : 'MUTE'}
              </button>
            </div>

            {/* Speaking Live Indicator & Test Button */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Indikator Bicara:
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black transition ${
                      isSpeaking
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse'
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}
                  >
                    <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                    <span>{isSpeaking ? 'SEDANG NGOMONG' : 'DIAM'}</span>
                  </div>

                  <button
                    onClick={handleToggleTestSpeech}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition"
                  >
                    {isTestingSpeech ? 'Tes Berjalan...' : 'Uji Bicara'}
                  </button>
                </div>
              </div>

              {/* Volume Level Meter Bar */}
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full transition-all duration-75"
                  style={{ width: `${Math.min(100, isSpeaking ? Math.max(micVolume, 75) : micVolume)}%` }}
                />
              </div>
              {/* Tes Dengar Suara Sendiri (Loopback) */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] text-slate-300 font-medium">Tes Dengar di Headset:</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleLoopbackTest()}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition ${
                    isLoopbackTesting
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {isLoopbackTesting ? 'Sedang Mendengar (Klik Stop)' : 'Dengar Suara Sendiri'}
                </button>
              </div>

              <p className="text-[10px] text-slate-500">
                Saat berbicara, mic dan avatar di meja akan berkedip dan bersinar hijau.
              </p>
            </div>
          </div>

          {/* SECTION: DOMINO TABLE THEME */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
              Tema Kain Meja Domino
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectTheme('EMERALD')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                  currentTheme === 'EMERALD'
                    ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 border border-emerald-400 shadow-sm" />
                <span className="text-[10px] font-bold text-white">Hijau Turnamen</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme('SAPPHIRE')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                  currentTheme === 'SAPPHIRE'
                    ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-400/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 border border-blue-400 shadow-sm" />
                <span className="text-[10px] font-bold text-white">Biru Safir</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme('CRIMSON')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                  currentTheme === 'CRIMSON'
                    ? 'bg-red-950/80 border-red-400 ring-2 ring-red-400/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-rose-700 border border-rose-400 shadow-sm" />
                <span className="text-[10px] font-bold text-white">Merah Kasino</span>
              </button>
            </div>
          </div>

          {/* SECTION: RESPONSIVE & GRAFIK */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
              Pengaturan Tampilan HP & Layar
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-white">Optimalisasi Layar Mobile</p>
                  <p className="text-[10px] text-slate-400">Responsif tanpa offset pada semua orientasi HP</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                AKTIF
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg active:scale-95"
          >
            Simpan & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
