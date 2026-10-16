# 🎲 BALAK 3D — Game Gaple Real-Time Multiplayer Online

Game Gaple Domino 3D Real-time Online Multiplayer Authoritative modern yang dibangun menggunakan **Next.js (React 18 & App Router)**, **PostgreSQL**, **Prisma ORM**, **Socket.IO**, **Three.js**, dan **Zustand**.

🌐 **Live URL Production**: [https://balakdev.digitaltekno.cloud](https://balakdev.digitaltekno.cloud)  
🔒 **Protokol**: HTTPS / WSS (SSL Let's Encrypt Aktif)

---

## 🚀 Fitur Utama & Spesifikasi

### 1. Sistem Akun Pengguna (PostgreSQL + Prisma)
- **Registrasi & Login**: Username unik, email valid, password di-hash secara aman menggunakan `bcryptjs` (salt 10).
- **Session Aman**: JWT disimpan di cookie `HttpOnly`, `SameSite=lax`, serta token handshake untuk WebSocket.
- **Proteksi Server**: Rate limiting proteksi brute-force login & register.
- **Data Profil & Statistik Lengkap**:
  - User ID permanen (UUID).
  - Username & Nickname terpisah (3–20 karakter).
  - 8 Avatar Master Gaple (🦁 Singa Emas, 🐯 Harimau Balak, 🦅 Rajawali Domino, 🐲 Naga Ceki, dll).
  - Statistik total main, kemenangan, kekalahan, serta breakdown **Mode Solo** vs **Team Battle**.
  - **Riwayat Pertandingan**: Snapshot nickname dan sisa balak saat pertandingan selesai disimpan secara konsisten.

### 2. Sistem Room Online
- **Mode Pertandingan**:
  - **Mode Solo**: 2–4 pemain bebas.
  - **Team Battle 2 vs 2**: Tepat 4 pemain dengan penataan kursi berhadapan:
    - Kursi 0 & 2: Tim Merah (Tim A)
    - Kursi 1 & 3: Tim Biru (Tim B)
    - Giliran bergantian antar tim secara otomatis.
- **Akses Meja**:
  - Publik: Ditampilkan di daftar meja publik.
  - Privat: Membutuhkan 6-karakter kode undangan unik.
- **Kontrol Host**: Mulai pertandingan ketika persyaratan terpenuhi, kick pemain di lobby, auto-clean room kosong/expired.

### 3. Engine Authoritative & Keamanan Multiplayer
- **Authoritative Server**: Server memverifikasi giliran pemain, kepemilikan kartu domino, dan legalitas penyambungan kartu pada ujung rantai (`LEFT` / `RIGHT`).
- **Sanitasi Data Tangan**: Klien lawan **TIDAK PERNAH** menerima daftar kartu pemain lain, hanya menerima jumlah sisa kartu (`opponentTileCounts`).
- **Validasi Langkah**: Langkah ilegal (di luar giliran, kartu tidak cocok, atau pura-pura lewat padahal memiliki kartu jalan) otomatis ditolak server.
- **Penentuan Pemenang**:
  - **Normal Win (Gaple)**: Pemain pertama yang menghabiskan 7 kartu.
  - **Deadlock (Buntu / Ceki)**: Jika semua pemain lewat berturut-turut, pemenang dihitung dari total pip (balak) terkecil. Di Team Battle, dihitung dari total akumulasi balak Tim A vs Tim B.
- **Auto Turn Timer**: Penghitung waktu giliran (15s / 20s / 30s) dengan auto-move jika waktu habis.
- **Reconnect & Grace Period**: Pemain yang terputus koneksi memiliki masa tenggang 60 detik untuk kembali tanpa kehilangan kartu atau kursi.

### 4. Visual 3D & Audio Interaktif
- **Meja Gaple 3D**: Three.js WebGL canvas dengan karpet beludru emerald tournament, list kayu mahoni, pencahayaan lembut, dan kamera perspektif yang dapat diubah ke top-down view.
- **Kartu Domino Gading**: Tekstur gading klasik, pips merah untuk balak, divider kuningan, dan paku pemutar (spinner rivet).
- **Audio Prosedural**: Efek suara benturan kartu domino, shuffle kartu, lewat, alert giliran, dan victory fanfare yang dihasilkan langsung melalui Web Audio API tanpa dependensi file eksternal.

---

## 🛠️ Arsitektur Server & Port

| Komponen | Layanan | Port Internal | Port Publik |
|---|---|---|---|
| **Web UI & Auth API** | Next.js 14 | `http://127.0.0.1:3005` | `https://balakdev.digitaltekno.cloud` |
| **Real-time Engine** | Node.js + Socket.IO | `http://127.0.0.1:4000` | `wss://balakdev.digitaltekno.cloud/socket.io/` |
| **Database** | PostgreSQL 16 (Docker) | `127.0.0.1:5432` | Internal |
| **Reverse Proxy & SSL**| Apache (httpd) | `80` & `443` | `80` (HTTP -> HTTPS) & `443` (HTTPS) |

---

## 🏃 Cara Menjalankan Secara Lokal / Development

### 1. Prasyarat
- Node.js v18+ (direkomendasikan Node.js v20/v24)
- Docker atau PostgreSQL lokal

### 2. Instalasi Dependensi & Setup Database
```bash
# Clone atau masuk ke direktori proyek
cd /www/wwwroot/balak-dev

# Install dependensi
npm install

# Push skema database ke PostgreSQL
npx prisma db push
```

### 3. Menjalankan Server Development
```bash
# Menjalankan Web Next.js dan Game Server Socket.IO secara bersamaan:
npm run dev

# Atau jalankan secara terpisah:
npm run dev:server   # Port 4000 (Game Engine & Socket.IO)
npm run dev:web      # Port 3005 (Next.js App)
```

---

## 🧪 Pengujian Multiplayer 4 Klien Otomatis

Proyek ini dilengkapi dengan test runner multi-client otomatis yang menguji seluruh 14 acceptance criteria secara langsung:

```bash
npx tsx tests/multiplayer.test.ts
```

Pengujian ini mencakup:
1. Registrasi 4 akun berbeda (`budi_master`, `siti_gaple`, `joko_balak`, `ratu_ceki`).
2. Login dan konfigurasi profil / nickname.
3. 4 koneksi Socket.IO independen via WSS / WebSocket.
4. Pembuatan room Team Battle 2 vs 2 oleh Host.
5. Bergabungnya 3 pemain lain dan validasi penataan kursi berhadapan.
6. Penyiapan status Ready dan start game.
7. Verifikasi sanitasi tangan kartu (tidak ada kebocoran kartu lawan).
8. Penolakan langkah ilegal di luar giliran.
9. Eksekusi langkah legal dan sinkronisasi rantai meja.
10. Simulasi disconnect dan pemulihan state saat reconnect.
11. Verifikasi integritas data akun di database PostgreSQL.

---

## 📂 Struktur Direktori Proyek

```
/www/wwwroot/balak-dev/
├── prisma/
│   └── schema.prisma         # Skema database User, MatchHistory, MatchParticipant
├── server/
│   ├── game/
│   │   ├── domino.ts         # Logika 28 kartu gaple, pips, dan penyambungan rantai
│   │   └── engine.ts         # Authoritative Game Engine & turn state machine
│   ├── roomManager.ts        # Manajemen room Solo & Team Battle 2v2, seating, reconnect
│   ├── socket.ts             # Socket.IO event handler & sanitized broadcasts
│   ├── types.ts              # Interface payload & state
│   └── index.ts              # HTTP & WebSocket server entrypoint (Port 4000)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # Endpoint login, register, logout, me
│   │   │   ├── user/         # Endpoint update profil & statistik pertandingan
│   │   │   └── rooms/        # Endpoint listing room publik
│   │   ├── globals.css       # Tailwind CSS & custom animations
│   │   ├── layout.tsx        # Root layout & SEO meta tags
│   │   └── page.tsx          # Main orchestrator (Lobby, Room, 3D Game)
│   ├── components/
│   │   ├── AuthModal.tsx     # Dialog Login & Registrasi
│   │   ├── DominoPiece.tsx   # Komponen visual kartu gading gaple
│   │   ├── GameTable3D.tsx   # Meja 3D Three.js, HUD, opponent cards, turn timer
│   │   ├── LobbyView.tsx     # Hero banner, buat room, browser meja publik
│   │   ├── Navbar.tsx        # Header, profil badge, tombol winrate
│   │   ├── ProfileModal.tsx  # Edit nickname, avatar picker, match history
│   │   └── RoomLobby.tsx     # Lobby room & visualisasi kursi Team Battle 2v2
│   ├── lib/
│   │   ├── audio.ts          # Web Audio API sound effects generator
│   │   ├── auth.ts           # Bcrypt & JWT verification helpers
│   │   ├── prisma.ts         # Prisma singleton client
│   │   └── socket.ts         # Socket.IO client manager
│   └── stores/
│       ├── authStore.ts      # Zustand store untuk autentikasi & profil
│       ├── gameStore.ts      # Zustand store untuk state meja & kartu di tangan
│       └── roomStore.ts      # Zustand store untuk room & chat
├── tests/
│   └── multiplayer.test.ts   # Automated multi-client test suite
├── .env                      # Konfigurasi environment (DB, JWT, Ports, Domain)
└── package.json
```
