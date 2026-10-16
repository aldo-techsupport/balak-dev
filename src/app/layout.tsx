import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'BALAK 3D — Game Gaple Real-Time Multiplayer Online',
  description:
    'Game Gaple Domino 3D Real-time online multiplayer authoritative dengan PostgreSQL, Next.js, dan Socket.IO. Dilengkapi sistem room, mode Solo & Team Battle 2 vs 2, serta riwayat pertandingan.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-[#070b12] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-amber-500 selection:text-black">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
