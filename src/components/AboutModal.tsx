'use client';

import React from 'react';
import {
  Info,
  BookOpen,
  Award,
  Crown,
  Users,
  Swords,
  X,
  Sparkles,
  Gamepad2,
  CheckCircle2,
} from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                Tentang BALAK 3D
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  v2.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Aturan Permainan Gaple Domino Tradisional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs">
          {/* Overview */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              BALAK Domino 3D
            </h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Game Gaple Domino dengan visual meja turnamen 3D, kontrol responsif, fitur voice ON MIC,
              dan sistem rank kompetitif. Dimainkan dengan set 28 kartu domino standar (0-0 hingga 6-6).
            </p>
          </div>

          {/* Aturan Main */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Aturan Dasar Permainan Gaple
            </h4>

            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">1. Pembukaan Meja:</strong>
                  Ronde pertama dibuka oleh pemegang kartu <strong>Balak Kosong (0-0)</strong>. Ronde berikutnya dibuka oleh pemenang ronde sebelumnya dengan balak miliknya.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">2. Sambung Kartu:</strong>
                  Pemain memasang kartu dengan mencocokkan jumlah mata domino pada ujung kiri atau kanan meja. Jika tidak ada kartu yang cocok, pemain harus menekan tombol <strong>Lewat (Pass)</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">3. Kondisi Menang (Gaple):</strong>
                  Pemain pertama yang berhasil menghabiskan seluruh kartu di tangannya dinyatakan sebagai pemenang!
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">4. Buntu (Deadlock):</strong>
                  Jika kedua ujung rantai tertutup dan tidak ada satupun pemain yang bisa jalan, maka meja dinyatakan Buntu. Pemenang ditentukan oleh pemain dengan jumlah biji tersisa paling sedikit.
                </div>
              </div>
            </div>
          </div>

          {/* Mode Pertandingan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
              <h5 className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5" />
                Mode Solo (2 - 4 Pemain)
              </h5>
              <p className="text-[10px] text-slate-300 mt-1">
                Setiap pemain bertanding mandiri memperebutkan kemenangan perorangan dan bintang rank.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30">
              <h5 className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                <Swords className="w-3.5 h-3.5" />
                Team Battle (2 vs 2)
              </h5>
              <p className="text-[10px] text-slate-300 mt-1">
                Dua tim (Tim Merah vs Tim Biru) saling bersaing. Kerja sama taktis untuk memblokir lawan!
              </p>
            </div>
          </div>

          {/* Developer / Credits */}
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              Dikembangkan oleh <strong className="text-amber-400">Aldo & Tech Support Team</strong>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Hak Cipta © 2026 BALAK Domino. All rights reserved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
