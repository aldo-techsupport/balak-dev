'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore, BoardPlacedTile, DominoTile } from '@/stores/gameStore';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { DominoPiece } from './DominoPiece';
import {
  Trophy,
  Clock,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Send,
  Eye,
  LogOut,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { sound } from '@/lib/audio';

// Presets for quick chat
const QUICK_EMOTES = ['🤣', '🔥', '👏', '🏆', '😱', '🎲'];
const QUICK_CHATS = [
  'Balak Enam keluar!',
  'Lewat lagi...',
  'Santai dulu bos!',
  'Buntu nih kayanya...',
  'GG WP!',
  'Ayo cepat jalan!',
];

// Helper: Calculate 3D pip positions for a half-domino (0 to 6)
// Relative to half-center (centerX, centerZ)
function getHalfPipCoords(val: number, centerX: number, centerZ: number): [number, number][] {
  const d = 0.38; // Distance from center
  switch (val) {
    case 1:
      return [[centerX, centerZ]];
    case 2:
      return [
        [centerX - d, centerZ - d],
        [centerX + d, centerZ + d],
      ];
    case 3:
      return [
        [centerX - d, centerZ - d],
        [centerX, centerZ],
        [centerX + d, centerZ + d],
      ];
    case 4:
      return [
        [centerX - d, centerZ - d],
        [centerX + d, centerZ - d],
        [centerX - d, centerZ + d],
        [centerX + d, centerZ + d],
      ];
    case 5:
      return [
        [centerX - d, centerZ - d],
        [centerX + d, centerZ - d],
        [centerX, centerZ],
        [centerX - d, centerZ + d],
        [centerX + d, centerZ + d],
      ];
    case 6:
      return [
        [centerX - d, centerZ - d],
        [centerX - d, centerZ],
        [centerX - d, centerZ + d],
        [centerX + d, centerZ - d],
        [centerX + d, centerZ],
        [centerX + d, centerZ + d],
      ];
    default:
      return [];
  }
}

// Helper: Real 3D Domino Chain positioning & auto-centering algorithm
interface ChainTransform {
  x: number;
  z: number;
  rotY: number;
}

function calculateDominoChainTransforms(
  board: BoardPlacedTile[],
  tileWidth: number = 1.4,
  tileLength: number = 2.8,
  gap: number = 0.04
): ChainTransform[] {
  if (board.length === 0) return [];

  const MAX_SPAN_X = 10.0; // Comfortable horizontal span before snake curve
  const ROW_STEP_Z = tileLength + 0.35; // Row step for turns

  const transforms: ChainTransform[] = [];
  let currX = 0;
  let currZ = 0;
  let dirX: 1 | -1 = 1;

  for (let i = 0; i < board.length; i++) {
    const placed = board[i];
    const isDouble = placed.isDouble;
    const halfDimAlongX = isDouble ? tileWidth / 2 : tileLength / 2;

    // Check if adding this tile exceeds horizontal boundary
    const projectedFront = currX + dirX * (halfDimAlongX * 2);
    if ((dirX === 1 && projectedFront > MAX_SPAN_X) || (dirX === -1 && projectedFront < -MAX_SPAN_X)) {
      currZ += ROW_STEP_Z;
      dirX = (dirX === 1 ? -1 : 1) as 1 | -1;
    }

    const posX = currX + dirX * halfDimAlongX;
    const posZ = currZ;

    let rotY = 0;
    if (!isDouble) {
      rotY = dirX === 1 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      rotY = 0;
    }

    transforms.push({ x: posX, z: posZ, rotY });

    // Advance currX for next tile
    currX = posX + dirX * (halfDimAlongX + gap);
  }

  // Auto-center the entire chain at (0, 0) on the table
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  transforms.forEach((t) => {
    if (t.x < minX) minX = t.x;
    if (t.x > maxX) maxX = t.x;
    if (t.z < minZ) minZ = t.z;
    if (t.z > maxZ) maxZ = t.z;
  });

  const centerOffsetX = (minX + maxX) / 2;
  const centerOffsetZ = (minZ + maxZ) / 2;

  return transforms.map((t) => ({
    x: t.x - centerOffsetX,
    z: t.z - centerOffsetZ,
    rotY: t.rotY,
  }));
}

export const GameTable3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { currentRoom, sendChat, chatMessages, leaveRoom } = useRoomStore();
  const {
    gameState,
    selectedTileId,
    needsSideSelection,
    isActionInProgress,
    errorMessage,
    selectTile,
    clearSelection,
    playTile,
    passTurn,
    initGameSocketListeners,
  } = useGameStore();

  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<'3D' | 'TOP'>('3D');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dominoMeshesRef = useRef<THREE.Object3D[]>([]);

  // Initialize socket listeners for this user & sync state
  useEffect(() => {
    if (user?.id) {
      initGameSocketListeners(user.id);
      if (!gameState) {
        useRoomStore.getState().syncState();
      }
    }
  }, [user?.id, initGameSocketListeners, gameState]);

  // Turn timer countdown effect
  useEffect(() => {
    if (!gameState || gameState.isFinished) return;

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, gameState.turnDeadline - Date.now());
      setTimeLeft(Math.ceil(remainingMs / 1000));
    }, 200);

    return () => clearInterval(interval);
  }, [gameState?.turnDeadline, gameState?.isFinished]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
  };

  // Three.js 3D Scene Initialization
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b13);
    sceneRef.current = scene;

    // 2. Camera: Adjust FOV and distance based on aspect ratio
    const isMobileAspect = width < height || height < 500;
    const fov = isMobileAspect ? 55 : 45;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.set(0, isMobileAspect ? 22 : 18, isMobileAspect ? 16 : 16);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights: Rich, vibrant illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffdf0, 1.6);
    dirLight.position.set(10, 35, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const spotLight = new THREE.SpotLight(0x34d399, 1.2, 60, Math.PI / 3, 0.3);
    spotLight.position.set(0, 24, 0);
    scene.add(spotLight);

    // 5. Felt Domino Table: Lush Tournament Green Felt & Mahogany Rim
    const tableGroup = new THREE.Group();

    // Tournament Emerald Felt
    const feltGeo = new THREE.CylinderGeometry(16, 16, 0.5, 64);
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x097954, // Vibrant emerald green felt
      roughness: 0.65,
      metalness: 0.05,
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.receiveShadow = true;
    feltMesh.position.y = -0.25;
    tableGroup.add(feltMesh);

    // Mahogany Wood Rim
    const rimGeo = new THREE.TorusGeometry(16.2, 0.8, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x451a03, // Rich warm mahogany wood
      roughness: 0.35,
      metalness: 0.25,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.15;
    tableGroup.add(rimMesh);

    scene.add(tableGroup);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.fov = h < 500 ? 55 : (w < h ? 55 : 45);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Camera Mode
  useEffect(() => {
    if (!cameraRef.current || !mountRef.current) return;
    const isMobile = mountRef.current.clientWidth < mountRef.current.clientHeight;
    const camera = cameraRef.current;
    if (cameraMode === 'TOP') {
      camera.position.set(0, isMobile ? 30 : 25, 0.01);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, isMobile ? 22 : 18, isMobile ? 16 : 16);
      camera.lookAt(0, 0, 0);
    }
  }, [cameraMode]);

  // Update 3D Domino Meshes on the table with REAL 3D PIPS (DOTS)
  useEffect(() => {
    if (!sceneRef.current || !gameState) return;
    const scene = sceneRef.current;

    // Clean old meshes
    dominoMeshesRef.current.forEach((mesh) => scene.remove(mesh));
    dominoMeshesRef.current = [];

    const board = gameState.board || [];

    // CASE 1: If board is empty at start of game, show glowing center guide
    if (board.length === 0) {
      const guideGroup = new THREE.Group();

      const outlineGeo = new THREE.RingGeometry(1.8, 2.1, 32);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(outlineGeo, outlineMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.05;
      guideGroup.add(ringMesh);

      const boxOutline = new THREE.BoxGeometry(1.6, 0.05, 3.2);
      const boxMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const ghostMesh = new THREE.Mesh(boxOutline, boxMat);
      ghostMesh.position.y = 0.08;
      guideGroup.add(ghostMesh);

      scene.add(guideGroup);
      dominoMeshesRef.current.push(guideGroup);
      return;
    }

    // CASE 2: Build each 3D domino with REAL 3D PIPS (DOTS)
    const tileWidth = 1.4;
    const tileHeight = 0.35;
    const tileLength = 2.8;

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfbf7ed, // Bone ivory
      roughness: 0.25,
      metalness: 0.05,
    });

    const dividerMat = new THREE.MeshStandardMaterial({
      color: 0xb5a382,
      metalness: 0.6,
      roughness: 0.3,
    });

    const rivetMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
    });

    const blackPipMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.1,
    });

    const redPipMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.35,
      metalness: 0.1,
    });

    const pipGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16);
    const bodyGeo = new THREE.BoxGeometry(tileWidth, tileHeight, tileLength);
    const divGeo = new THREE.BoxGeometry(tileWidth + 0.02, 0.02, 0.08);
    const rivetGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);

    const transforms = calculateDominoChainTransforms(board, tileWidth, tileLength, 0.04);

    board.forEach((placed, idx) => {
      const group = new THREE.Group();

      // 1. Tile Base Body
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // 2. Center Dividing Line
      const divMesh = new THREE.Mesh(divGeo, dividerMat);
      divMesh.position.y = tileHeight / 2 + 0.005;
      group.add(divMesh);

      // 3. Brass Spinner Rivet in Center
      const rivetMesh = new THREE.Mesh(rivetGeo, rivetMat);
      rivetMesh.position.y = tileHeight / 2 + 0.02;
      group.add(rivetMesh);

      // 4. REAL 3D PIPS (DOTS) on Top Half and Bottom Half
      const isBalak = placed.isDouble;

      // Top Half pips (placedLeft) centered at Z = -0.7
      const topPipMat = (isBalak || placed.placedLeft === 1) ? redPipMat : blackPipMat;
      const topPipCoords = getHalfPipCoords(placed.placedLeft, 0, -0.7);
      topPipCoords.forEach(([px, pz]) => {
        const pipMesh = new THREE.Mesh(pipGeo, topPipMat);
        pipMesh.position.set(px, tileHeight / 2 + 0.025, pz);
        group.add(pipMesh);
      });

      // Bottom Half pips (placedRight) centered at Z = +0.7
      const bottomPipMat = (isBalak || placed.placedRight === 1) ? redPipMat : blackPipMat;
      const bottomPipCoords = getHalfPipCoords(placed.placedRight, 0, 0.7);
      bottomPipCoords.forEach(([px, pz]) => {
        const pipMesh = new THREE.Mesh(pipGeo, bottomPipMat);
        pipMesh.position.set(px, tileHeight / 2 + 0.025, pz);
        group.add(pipMesh);
      });

      // Authentic Domino Chain Positioning (Head-to-tail connected & auto-centered)
      const transform = transforms[idx] || { x: 0, z: 0, rotY: 0 };
      group.position.set(transform.x, tileHeight / 2, transform.z);
      group.rotation.y = transform.rotY;

      scene.add(group);
      dominoMeshesRef.current.push(group);
    });
  }, [gameState?.board]);

  // Player Hand Sorting Mode (Balak Duluan, Nilai Besar, Nilai Kecil)
  type SortMode = 'BALAK_FIRST' | 'SUM_DESC' | 'SUM_ASC';
  const [sortMode, setSortMode] = useState<SortMode>('BALAK_FIRST');

  const isMyTurn = gameState?.currentTurnUserId === user?.id;
  const myHand = gameState?.myHand || [];
  const playableIds = gameState?.playableTileIds || [];
  const opponents = currentRoom?.players?.filter((p) => p.userId !== user?.id) || [];
  const canPass = isMyTurn && playableIds.length === 0 && !isActionInProgress;

  // Compute sorted player hand
  const sortedHand = useMemo(() => {
    const hand = [...myHand];
    return hand.sort((a, b) => {
      const aBalak = a.left === a.right;
      const bBalak = b.left === b.right;

      if (sortMode === 'BALAK_FIRST') {
        if (aBalak && !bBalak) return -1;
        if (!aBalak && bBalak) return 1;
        if (aBalak && bBalak) return b.left - a.left; // 6-6, 5-5, 4-4...
        // Non-balaks: sort by max pip descending, then min pip descending
        const aMax = Math.max(a.left, a.right);
        const bMax = Math.max(b.left, b.right);
        if (aMax !== bMax) return bMax - aMax;
        return Math.min(b.left, b.right) - Math.min(a.left, a.right);
      }

      if (sortMode === 'SUM_DESC') {
        const sumA = a.left + a.right;
        const sumB = b.left + b.right;
        if (sumA !== sumB) return sumB - sumA;
        return Math.max(b.left, b.right) - Math.max(a.left, a.right);
      }

      if (sortMode === 'SUM_ASC') {
        const sumA = a.left + a.right;
        const sumB = b.left + b.right;
        if (sumA !== sumB) return sumA - sumB;
        return Math.max(a.left, a.right) - Math.max(b.left, b.right);
      }

      return 0;
    });
  }, [myHand, sortMode]);

  const handleTileClick = (tile: DominoTile) => {
    if (!isMyTurn || isActionInProgress || !gameState || !currentRoom) return;
    if (!playableIds.includes(tile.id)) return;

    // Check if playable on both ends
    const matchesLeft = tile.left === gameState.leftEnd || tile.right === gameState.leftEnd;
    const matchesRight = tile.left === gameState.rightEnd || tile.right === gameState.rightEnd;

    if (
      gameState.leftEnd !== null &&
      gameState.rightEnd !== null &&
      matchesLeft &&
      matchesRight &&
      gameState.leftEnd !== gameState.rightEnd
    ) {
      selectTile(tile.id);
    } else {
      const end = matchesLeft ? 'LEFT' : 'RIGHT';
      playTile(currentRoom.code, tile.id, end);
    }
  };

  const handleChooseSide = (end: 'LEFT' | 'RIGHT') => {
    if (!selectedTileId || !currentRoom) return;
    playTile(currentRoom.code, selectedTileId, end);
  };

  const handleSendChatMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const handleSendEmote = (emote: string) => {
    sendChat(emote, true);
  };

  return (
    <div className="fixed inset-0 z-30 bg-slate-950 overflow-hidden select-none flex flex-col">
      {/* 3D WebGL Canvas Viewport (Fills entire background - ALWAYS MOUNTED ON FRAME 1) */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {(!gameState || !currentRoom) ? (
        <div className="relative z-50 flex-1 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-400 mb-4" />
          <p className="text-slate-300 font-medium text-sm">Menyiapkan meja pertandingan...</p>
        </div>
      ) : (
        <>
          {/* TOP HEADER HUD */}
          <div className="relative z-20 flex items-center justify-between p-2 sm:p-3 pointer-events-none">
            {/* Left: Room Badge */}
            <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-lg">
              <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[140px] sm:max-w-none">
                {currentRoom.name}
              </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {currentRoom.mode === 'TEAM_BATTLE' ? '2v2' : 'Solo'}
          </span>
          <span className="text-[10px] text-amber-400 font-mono font-bold hidden sm:inline">
            #{currentRoom.code}
          </span>
        </div>

        {/* Center: Chain Ends Indicator & Turn Timer */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-700/70 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Ujung:</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono">
              {gameState.leftEnd !== null ? gameState.leftEnd : '-'}
            </span>
            <span className="text-slate-500 text-xs">◀▶</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono">
              {gameState.rightEnd !== null ? gameState.rightEnd : '-'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Turn timer */}
          <div className="flex items-center gap-1">
            <Clock
              className={`w-3.5 h-3.5 ${
                timeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-emerald-400'
              }`}
            />
            <span
              className={`font-mono font-black text-xs ${
                timeLeft <= 5 ? 'text-red-400' : 'text-slate-200'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={() => setCameraMode(cameraMode === '3D' ? 'TOP' : '3D')}
            title="Sudut Kamera"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-300 hover:text-white"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={toggleSound}
            title="Suara"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            title="Chat"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-300 hover:text-white"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={leaveRoom}
            title="Keluar Meja"
            className="p-1.5 sm:p-2 rounded-xl bg-red-950/80 border border-red-800/50 text-red-300 hover:bg-red-900"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* OPPONENTS STATUS (Top of Table) */}
      <div className="relative z-10 flex justify-center gap-3 px-2 pointer-events-none">
        {opponents.map((opp, idx) => (
          <div
            key={opp.userId}
            className={`flex items-center gap-2 px-3 py-1 rounded-xl backdrop-blur-md border text-xs ${
              gameState.currentTurnUserId === opp.userId
                ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 text-amber-200 shadow-lg'
                : 'bg-slate-900/80 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-base">{idx === 0 ? '🦁' : idx === 1 ? '🐯' : '🦅'}</span>
            <div>
              <span className="font-bold block truncate max-w-[90px]">{opp.nickname}</span>
              <span className="text-[10px] text-slate-400 block">
                {gameState.opponentTileCounts[opp.userId] ?? 0} kartu
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CENTER NOTICE (If board empty at start) */}
      {gameState.board.length === 0 && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center px-4 w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/50 shadow-xl">
            <p className="text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Meja Terbuka! Pasang kartu pertama Anda.
            </p>
          </div>
        </div>
      )}

      {/* FLOATING SIDE SELECTION PROMPT */}
      {needsSideSelection && selectedTileId && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center animate-bounce">
          <div className="bg-slate-900/95 backdrop-blur-lg border border-amber-400 rounded-2xl px-4 py-2.5 shadow-2xl text-center">
            <p className="text-amber-300 font-bold text-xs mb-1.5">Pilih sisi penempatan:</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleChooseSide('LEFT')}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                ◀ Kiri ({gameState.leftEnd})
              </button>
              <button
                onClick={() => handleChooseSide('RIGHT')}
                className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Kanan ({gameState.rightEnd}) ▶
              </button>
              <button onClick={clearSelection} className="text-xs text-slate-400 underline ml-1">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-red-950/90 border border-red-500 text-red-200 px-4 py-1.5 rounded-xl text-xs shadow-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* BOTTOM FIXED HUD: ALWAYS VISIBLE PLAYER HAND RACK */}
      <div className="mt-auto relative z-20 flex flex-col items-center pb-2 px-2 pointer-events-none">
        {/* Turn Status Alert */}
        <div className="mb-1">
          {isMyTurn ? (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 px-4 py-0.5 rounded-full font-black text-[11px] sm:text-xs shadow-[0_0_20px_rgba(251,191,36,0.7)] animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GILIRAN ANDA! KLIK KARTU UNTUK MEMASANG</span>
            </div>
          ) : (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-slate-300 px-3 py-0.5 rounded-full text-[11px] font-medium shadow-md">
              Menunggu giliran{' '}
              <span className="text-amber-400 font-bold">
                {currentRoom.players.find((p) => p.userId === gameState.currentTurnUserId)?.nickname || 'lawan'}
              </span>
              ...
            </div>
          )}
        </div>

        {/* Hand Rack Container (Fits on all screens) */}
        <div className="pointer-events-auto flex items-center justify-center gap-1.5 sm:gap-2.5 bg-slate-900/95 backdrop-blur-2xl border-2 border-slate-700/80 rounded-3xl p-2 sm:p-2.5 shadow-[0_15px_40px_rgba(0,0,0,0.9)] max-w-full overflow-x-auto">
          {/* Action Button: Pass */}
          <button
            onClick={() => passTurn(currentRoom.code)}
            disabled={!canPass}
            className={`
              flex flex-col items-center justify-center px-2.5 sm:px-3 py-2 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shrink-0
              ${
                canPass
                  ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95'
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'
              }
            `}
          >
            <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
            <span>Lewat</span>
          </button>

          {/* Action Button: Sort Cards (Urutkan) */}
          <button
            onClick={() => {
              const modes: SortMode[] = ['BALAK_FIRST', 'SUM_DESC', 'SUM_ASC'];
              const next = modes[(modes.indexOf(sortMode) + 1) % modes.length];
              setSortMode(next);
            }}
            title="Urutkan kartu tangan"
            className="flex flex-col items-center justify-center px-2 sm:px-2.5 py-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-amber-300 font-bold text-[9px] sm:text-[10px] tracking-wide transition shrink-0 active:scale-95"
          >
            <ArrowUpDown className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
            <span>{sortMode === 'BALAK_FIRST' ? 'Balak' : sortMode === 'SUM_DESC' ? 'Besar' : 'Kecil'}</span>
          </button>

          {/* Player Domino Tiles Hand: Perfectly aligned & sorted */}
          <div className="flex items-end gap-1 sm:gap-2 py-1 overflow-x-auto max-w-[calc(100vw-135px)] sm:max-w-none px-1">
            {sortedHand.length === 0 ? (
              <span className="text-xs text-slate-400 py-3 px-4 font-semibold">
                Kartu Anda telah habis!
              </span>
            ) : (
              sortedHand.map((tile) => {
                const isPlayable = isMyTurn && playableIds.includes(tile.id);
                const isSelected = selectedTileId === tile.id;

                return (
                  <div key={tile.id} className="relative group shrink-0">
                    <DominoPiece
                      left={tile.left}
                      right={tile.right}
                      size="sm"
                      isPlayable={isPlayable}
                      isSelected={isSelected}
                      onClick={() => handleTileClick(tile)}
                    />
                    {isPlayable && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-md pointer-events-none whitespace-nowrap">
                        Pasang
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CHAT PANEL */}
      {chatOpen && (
        <div className="absolute right-3 bottom-24 z-40 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col h-72 sm:h-80 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Chat Meja
            </span>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2 text-xs">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500 text-center py-6">Belum ada obrolan.</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/40">
                  <span className="font-bold text-amber-400 text-[10px] block">{msg.nickname}</span>
                  <p className="text-slate-200 mt-0.5">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChatMsg} className="p-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pesan..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
            />
            <button type="submit" className="p-1 rounded-xl bg-emerald-600 text-white">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState.isFinished && gameState.winnerResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg mb-2">
              <Trophy className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-black text-amber-300">
              {gameState.winnerResult.endReason === 'NORMAL_WIN' ? 'GAPLE SELESAI!' : 'BUNTU (DEADLOCK)!'}
            </h2>

            <p className="text-emerald-400 font-bold text-xs mt-1">
              Pemenang: {gameState.winnerResult.winnerNickname}
            </p>

            <button
              onClick={leaveRoom}
              className="mt-5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow-lg"
            >
              Kembali ke Lobby
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
