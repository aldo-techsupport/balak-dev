import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'BALAK 3D — Game Gaple Domino Online',
  description:
    'Game Gaple Domino Balak 3D Online. Mode Solo dan Team Battle 2 vs 2 dengan meja turnamen 3D, fitur voice ON MIC, dan sistem rank kompetitif.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className="bg-[#070b12] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-amber-500 selection:text-black overflow-x-hidden">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
