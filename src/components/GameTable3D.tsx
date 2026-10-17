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
  Swords,
  Shield,
  Crown,
  Check,
  Mic,
  MicOff,
  Users,
  Pause,
  Play,
  Copy,
  Sliders,
  X,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { getRankInfo } from '@/lib/rank';
import { useVoiceStore } from '@/stores/voiceStore';
import { FriendModal } from './FriendModal';
import { OptionModal } from './OptionModal';

const AVATAR_ICONS: Record<string, string> = {
  avatar_1: '🦁',
  avatar_2: '🐯',
  avatar_3: '🦅',
  avatar_4: '🐲',
  avatar_5: '🐼',
  avatar_6: '🐺',
  avatar_7: '🦊',
  avatar_8: '👑',
};

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

type ChainDir = 'RIGHT' | 'DOWN' | 'LEFT';

function calculateDominoChainTransforms(
  board: BoardPlacedTile[],
  tileWidth: number = 1.4,
  tileLength: number = 2.8,
  gap: number = 0.04
): ChainTransform[] {
  if (board.length === 0) return [];

  // Comfortable horizontal span for domino row (~4 tiles across)
  const MAX_SPAN_X = 6.0;
  const transforms: ChainTransform[] = [];

  let dir: ChainDir = 'RIGHT';
  let anchorX = 0;
  let anchorZ = 0;
  let prevIsDouble = false;
  let tilesInDir = 0;

  for (let i = 0; i < board.length; i++) {
    const placed = board[i];
    const isDouble = placed.isDouble;

    // First tile (center tile): place at (0, 0)
    if (i === 0) {
      if (isDouble) {
        // Balak starts crosswise (vertical on screen)
        transforms.push({ x: 0, z: 0, rotY: 0 });
        anchorX = tileWidth / 2;
        anchorZ = 0;
      } else {
        // Normal tile starts horizontal (along +X)
        transforms.push({ x: 0, z: 0, rotY: Math.PI / 2 });
        anchorX = tileLength / 2;
        anchorZ = 0;
      }
      prevIsDouble = isDouble;
      tilesInDir = 1;
      continue;
    }

    const testLen = isDouble ? tileWidth : tileLength;
    let shouldTurn = false;
    if (dir === 'RIGHT' && anchorX + testLen > MAX_SPAN_X) shouldTurn = true;
    else if (dir === 'LEFT' && anchorX - testLen < -MAX_SPAN_X) shouldTurn = true;
    else if (dir === 'DOWN' && tilesInDir >= 2) shouldTurn = true;

    // Authentic L-shaped corner turn logic
    if (shouldTurn) {
      const oldDir: ChainDir = dir;
      if (oldDir === 'RIGHT') {
        dir = 'DOWN';
        // Connect directly under the right half of the previous tile
        anchorX = anchorX - tileWidth / 2;
        anchorZ = anchorZ + (prevIsDouble ? tileLength / 2 : tileWidth / 2);
      } else if (oldDir === 'LEFT') {
        dir = 'DOWN';
        // Connect directly under the left half of the previous tile
        anchorX = anchorX + tileWidth / 2;
        anchorZ = anchorZ + (prevIsDouble ? tileLength / 2 : tileWidth / 2);
      } else if (oldDir === 'DOWN') {
        const turnLeft = anchorX > 0;
        dir = turnLeft ? 'LEFT' : 'RIGHT';
        // Connect directly to the left/right edge of the bottom half of the previous tile
        anchorZ = anchorZ - tileWidth / 2;
        anchorX = turnLeft
          ? anchorX - (prevIsDouble ? tileLength / 2 : tileWidth / 2)
          : anchorX + (prevIsDouble ? tileLength / 2 : tileWidth / 2);
      }
      tilesInDir = 0;
    }

    let posX = 0;
    let posZ = 0;
    let rotY = 0;

    if (dir === 'RIGHT') {
      if (isDouble) {
        // Balak crosswise: vertical (rotY = 0)
        posX = anchorX + gap + tileWidth / 2;
        posZ = anchorZ;
        rotY = 0;
        anchorX = posX + tileWidth / 2;
        anchorZ = posZ;
      } else {
        // Normal horizontal: rotY = Math.PI / 2
        posX = anchorX + gap + tileLength / 2;
        posZ = anchorZ;
        rotY = Math.PI / 2;
        anchorX = posX + tileLength / 2;
        anchorZ = posZ;
      }
    } else if (dir === 'LEFT') {
      if (isDouble) {
        // Balak crosswise: vertical (rotY = 0)
        posX = anchorX - gap - tileWidth / 2;
        posZ = anchorZ;
        rotY = 0;
        anchorX = posX - tileWidth / 2;
        anchorZ = posZ;
      } else {
        // Normal horizontal: rotY = -Math.PI / 2
        posX = anchorX - gap - tileLength / 2;
        posZ = anchorZ;
        rotY = -Math.PI / 2;
        anchorX = posX - tileLength / 2;
        anchorZ = posZ;
      }
    } else if (dir === 'DOWN') {
      if (isDouble) {
        // Balak crosswise: horizontal (rotY = Math.PI / 2)
        posX = anchorX;
        posZ = anchorZ + gap + tileWidth / 2;
        rotY = Math.PI / 2;
        anchorX = posX;
        anchorZ = posZ + tileWidth / 2;
      } else {
        // Normal vertical: rotY = 0
        posX = anchorX;
        posZ = anchorZ + gap + tileLength / 2;
        rotY = 0;
        anchorX = posX;
        anchorZ = posZ + tileLength / 2;
      }
    }

    transforms.push({ x: posX, z: posZ, rotY });
    prevIsDouble = isDouble;
    tilesInDir++;
  }

  // Auto-center entire chain at (0, 0) on the table
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
  const { currentRoom, sendChat, chatMessages, leaveRoom, playAgain } = useRoomStore();
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

  const {
    isMicOn,
    isSpeaking,
    isAudioBlocked,
    unlockAudio,
    speakingUsers,
    mutedUsers,
    toggleMic,
  } = useVoiceStore();

  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<'3D' | 'TOP'>('3D');
  const [showFriendModal, setShowFriendModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [showOptionModal, setShowOptionModal] = useState<boolean>(false);
  const [tableTheme, setTableTheme] = useState<'EMERALD' | 'SAPPHIRE' | 'CRIMSON'>('EMERALD');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dominoMeshesRef = useRef<THREE.Object3D[]>([]);
  const feltMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const handleCopyCode = () => {
    if (!currentRoom?.code) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
    feltMatRef.current = feltMat;

    // Gold Outer Inlay Ring on Felt
    const goldRingGeo = new THREE.RingGeometry(14.8, 15.05, 64);
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.75,
      side: THREE.DoubleSide,
    });
    const goldRingMesh = new THREE.Mesh(goldRingGeo, goldRingMat);
    goldRingMesh.rotation.x = -Math.PI / 2;
    goldRingMesh.position.y = 0.01;
    tableGroup.add(goldRingMesh);

    // Inner Gold Accent Ring
    const innerRingGeo = new THREE.RingGeometry(9.5, 9.7, 64);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, goldRingMat);
    innerRingMesh.rotation.x = -Math.PI / 2;
    innerRingMesh.position.y = 0.01;
    tableGroup.add(innerRingMesh);

    // Mahogany Wood Outer Rim
    const rimGeo = new THREE.TorusGeometry(16.2, 0.85, 24, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x3d1706, // Rich warm mahogany wood
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
      if (w < h) {
        // Mobile portrait: widen FOV proportionally so domino chain is never cut off
        camera.fov = Math.max(54, Math.min(68, 52 * (h / w)));
      } else {
        camera.fov = 45;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Camera Mode
  useEffect(() => {
    if (!cameraRef.current || !mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;
    const isMobileAspect = w < h;
    const camera = cameraRef.current;
    if (cameraMode === 'TOP') {
      camera.position.set(0, isMobileAspect ? 32 : 25, 0.01);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, isMobileAspect ? 24 : 18, isMobileAspect ? 18 : 16);
      camera.lookAt(0, -0.5, 0);
    }
  }, [cameraMode]);

  // Update Table Felt Color based on selected theme
  useEffect(() => {
    if (!feltMatRef.current) return;
    if (tableTheme === 'SAPPHIRE') {
      feltMatRef.current.color.setHex(0x0f3460);
    } else if (tableTheme === 'CRIMSON') {
      feltMatRef.current.color.setHex(0x7f1d1d);
    } else {
      feltMatRef.current.color.setHex(0x097954);
    }
  }, [tableTheme]);

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

  // Turn Player Display Info for Top Header HUD
  const currentTurnPlayer = currentRoom?.players?.find((p) => p.userId === gameState?.currentTurnUserId);
  const isCurrentTurnMe = isMyTurn;
  const isCurrentTurnSpeaking = currentTurnPlayer ? Boolean(speakingUsers[currentTurnPlayer.userId]) : false;
  const currentTurnWins = currentTurnPlayer?.wins ?? (currentTurnPlayer?.userId === user?.id ? user?.wins ?? 0 : 0);

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
          {/* TOP HEADER HUD - CLEAN & MINIMALIST */}
          <div className="relative z-30 flex items-center justify-between px-2.5 sm:px-4 py-2 sm:py-3 pointer-events-none w-full">
            {/* Top-Left: Pause / Menu Button (Opens Sidebar) */}
            <div className="pointer-events-auto flex items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-400 hover:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center transition active:scale-95"
                title="Pause / Menu Meja"
              >
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400/20" />
              </button>
            </div>

            {/* Top-Center: Current Turn Player + Win Count + Turn Timer */}
            <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-amber-500/40 shadow-2xl">
              {/* Player Avatar */}
              <div className="relative shrink-0">
                <span className={`text-xl sm:text-2xl inline-block ${isCurrentTurnSpeaking ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`}>
                  {currentTurnPlayer?.avatar ? AVATAR_ICONS[currentTurnPlayer.avatar] : '🦁'}
                </span>
                {isCurrentTurnSpeaking && (
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow">
                    <Mic className="w-2 h-2 text-slate-950" />
                  </span>
                )}
              </div>

              {/* Name & Win Count */}
              <div className="text-left overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs sm:text-sm text-white truncate max-w-[85px] sm:max-w-[150px]">
                    {isCurrentTurnMe ? 'Giliran Anda' : (currentTurnPlayer?.nickname || 'Lawan')}
                  </span>
                  {currentTurnPlayer?.isBot && (
                    <span className="text-[7px] sm:text-[8px] px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold shrink-0">
                      BOT
                    </span>
                  )}
                  {currentRoom?.mode === 'TEAM_BATTLE' && (
                    <span
                      className={`text-[7px] sm:text-[8px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                        currentTurnPlayer?.team === 'TEAM_A'
                          ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                          : 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {currentTurnPlayer?.team === 'TEAM_A' ? 'MERAH' : 'BIRU'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-amber-300 font-bold mt-0.5">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                    {currentTurnWins}x Win
                  </span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-slate-400 font-normal hidden sm:inline">
                    {isCurrentTurnMe ? 'Pasang kartu' : 'Berpikir...'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-700/80 mx-0.5 shrink-0" />

              {/* Turn Timer Countdown */}
              <div className="flex items-center gap-1 shrink-0">
                <Clock
                  className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${
                    timeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-emerald-400'
                  }`}
                />
                <span
                  className={`font-mono font-black text-xs sm:text-sm ${
                    timeLeft <= 5 ? 'text-red-400' : 'text-slate-200'
                  }`}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Top-Right: ON MIC Toggle Button */}
            <div className="pointer-events-auto flex items-center">
              <button
                onClick={() => toggleMic(currentRoom?.code)}
                title={isMicOn ? 'Mikrofon Aktif (Klik untuk Mute)' : 'Mikrofon Mati (Klik untuk ON MIC)'}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl border transition flex items-center gap-1.5 shadow-lg active:scale-95 ${
                  isMicOn
                    ? isSpeaking
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse'
                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900/90 border-slate-700/70 text-slate-400 hover:text-white'
                }`}
              >
                {isMicOn ? (
                  <Mic className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${isSpeaking ? 'animate-bounce text-slate-950' : 'text-emerald-400'}`} />
                ) : (
                  <MicOff className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-red-400" />
                )}
                <span className="text-[10px] sm:text-xs font-black">
                  {isMicOn ? (isSpeaking ? 'BICARA' : 'ON MIC') : 'MIC OFF'}
                </span>
              </button>
            </div>
          </div>

      {/* OPPONENTS STATUS (Top of Table) */}
      <div className="relative z-10 flex justify-center gap-1.5 sm:gap-3 px-2 pointer-events-none max-w-full overflow-x-auto scrollbar-none">
        {opponents.map((opp, idx) => {
          const oppRank = getRankInfo(opp.rankTier, opp.rankDivision, opp.rankStars);
          const isOppRed = opp.team === 'TEAM_A';
          const isOppBlue = opp.team === 'TEAM_B';
          const isOppSpeaking = Boolean(speakingUsers[opp.userId]);
          const isOppMuted = Boolean(mutedUsers[opp.userId]);

          return (
            <div
              key={opp.userId}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl backdrop-blur-md border text-xs shadow-md transition-all ${
                isOppSpeaking
                  ? 'bg-slate-900/95 border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                  : gameState.currentTurnUserId === opp.userId
                  ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 text-amber-200'
                  : currentRoom?.mode === 'TEAM_BATTLE'
                  ? isOppRed
                    ? 'bg-red-950/80 border-red-700/60 text-red-200'
                    : 'bg-blue-950/80 border-blue-700/60 text-blue-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300'
              }`}
            >
              <div className="relative shrink-0">
                <span className={`text-xl sm:text-2xl inline-block ${isOppSpeaking ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`}>
                  {opp.avatar ? AVATAR_ICONS[opp.avatar] : (idx === 0 ? '🦁' : idx === 1 ? '🐯' : '🦅')}
                </span>
                {/* Speaking Mic Indicator */}
                <div className="absolute -bottom-1 -right-1">
                  {isOppSpeaking ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[8px] shadow animate-bounce">
                      <Mic className="w-2 h-2" />
                    </span>
                  ) : isOppMuted ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-red-950 border border-red-500 text-red-400 flex items-center justify-center text-[8px]">
                      <MicOff className="w-2 h-2" />
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-[8px]">
                      <Mic className="w-2 h-2" />
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-hidden">
                <div className="flex items-center gap-1">
                  <span className="font-bold block truncate max-w-[70px] sm:max-w-[95px] text-white text-[11px] sm:text-xs">
                    {opp.nickname}
                  </span>
                  {opp.isBot && (
                    <span className="text-[7px] px-1 py-0.2 rounded bg-rose-500/40 text-rose-200 border border-rose-500/50 font-black">
                      BOT
                    </span>
                  )}
                  {currentRoom?.mode === 'TEAM_BATTLE' && (
                    <span className={`text-[7px] sm:text-[8px] px-1 py-0.2 rounded font-black ${isOppRed ? 'bg-red-600/40 text-red-300' : 'bg-blue-600/40 text-blue-300'}`}>
                      {isOppRed ? 'MERAH' : 'BIRU'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[9px] mt-0.5">
                  <span title={oppRank.title}>{oppRank.icon}</span>
                  <span className="text-amber-400 font-mono font-bold">🏆 {opp.wins || 0}w</span>
                  <span className="text-slate-300 font-mono">• {gameState.opponentTileCounts[opp.userId] ?? 0} kartu</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTER NOTICE (If board empty at start) */}
      {gameState.board.length === 0 && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center px-4 w-full max-w-md">
          <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/50 shadow-2xl">
            <p className="text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {(!currentRoom?.roundNumber || currentRoom?.roundNumber === 1 || !currentRoom?.lastWinnerUserId)
                ? 'Ronde 1: Meja Dibuka dengan Balak 0 (0-0) oleh pemegang balak 0!'
                : `Ronde #${currentRoom?.roundNumber}: Meja Dibuka oleh Pemenang Ronde Sebelumnya dengan Balak miliknya!`}
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

      {/* AUDIO UNBLOCK BANNER (IF BROWSER BLOCKS AUTOPLAY) */}
      {isAudioBlocked && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <button
            onClick={() => unlockAudio()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 text-slate-950 font-black text-xs rounded-full shadow-[0_0_30px_rgba(245,158,11,0.6)] border border-yellow-200 active:scale-95 transition"
          >
            <Volume2 className="w-4 h-4 animate-pulse text-slate-950" />
            <span>🔊 Browser Menahan Suara Teman — Klik Di Sini untuk Mengaktifkan</span>
          </button>
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
      <div className="mt-auto relative z-20 flex flex-col items-center pb-2 px-1 sm:px-2 pointer-events-none w-full max-w-full">
        {/* Turn Status Alert & Speaking Indicator */}
        <div className="mb-1 flex items-center gap-2">
          {isMyTurn ? (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 px-3.5 py-0.5 rounded-full font-black text-[10px] sm:text-xs shadow-[0_0_20px_rgba(251,191,36,0.7)] animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GILIRAN ANDA! KLIK KARTU UNTUK MEMASANG</span>
            </div>
          ) : (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-slate-300 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium shadow-md">
              Menunggu giliran{' '}
              <span className="text-amber-400 font-bold">
                {currentRoom.players.find((p) => p.userId === gameState.currentTurnUserId)?.nickname || 'lawan'}
              </span>
              ...
            </div>
          )}

          {/* Quick Voice Indicator for current user */}
          {isMicOn && (
            <div
              className={`pointer-events-auto px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 transition ${
                isSpeaking
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-bounce'
                  : 'bg-slate-900/90 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              <Mic className="w-2.5 h-2.5" />
              <span>{isSpeaking ? 'BICARA' : 'MIC ON'}</span>
            </div>
          )}
        </div>

        {/* Hand Rack Container (Fits on all screens without offset) */}
        <div className="pointer-events-auto flex items-center justify-center gap-1 sm:gap-2 bg-slate-900/95 backdrop-blur-2xl border-2 border-slate-700/80 rounded-3xl p-1.5 sm:p-2.5 shadow-[0_15px_40px_rgba(0,0,0,0.9)] max-w-full overflow-hidden">
          {/* Action Button: Pass */}
          <button
            onClick={() => passTurn(currentRoom.code)}
            disabled={!canPass}
            className={`
              flex flex-col items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl font-black text-[9px] sm:text-xs uppercase tracking-wider transition-all shrink-0
              ${
                canPass
                  ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95'
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'
              }
            `}
          >
            <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5 mb-0.5" />
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
            className="flex flex-col items-center justify-center px-1.5 sm:px-2.5 py-1.5 sm:py-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 text-slate-300 hover:text-amber-300 font-bold text-[8px] sm:text-[10px] tracking-wide transition shrink-0 active:scale-95"
          >
            <ArrowUpDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 mb-0.5 text-amber-400" />
            <span>{sortMode === 'BALAK_FIRST' ? 'Balak' : sortMode === 'SUM_DESC' ? 'Besar' : 'Kecil'}</span>
          </button>

          {/* Player Domino Tiles Hand: Responsive and smooth */}
          <div className="flex items-end gap-1 sm:gap-1.5 py-1 overflow-x-auto max-w-[calc(100vw-110px)] sm:max-w-none px-1 scrollbar-none">
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

      {/* GAME OVER MODAL — RANK STYLE */}
      {gameState.isFinished && gameState.winnerResult && (() => {
        const result = gameState.winnerResult;
        const isTeamBattle = currentRoom?.mode === 'TEAM_BATTLE';
        const mySummary = result.pipsSummary?.find((p) => p.userId === user?.id);
        const amIWinner = mySummary?.isWinner ?? false;
        const myRank = getRankInfo(
          mySummary?.rankTier || user?.rankTier,
          mySummary?.rankDivision || user?.rankDivision,
          mySummary?.rankStars ?? user?.rankStars
        );
        const winningTeam = result.winningTeam;
        const isTeamA = winningTeam === 'TEAM_A';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
            <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center relative overflow-hidden">
              {/* Header Badge */}
              <div className="mb-4">
                <div
                  className={`inline-block px-6 py-1.5 rounded-full text-base font-black tracking-widest uppercase shadow-lg ${
                    amIWinner
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-amber-500/40 animate-pulse'
                      : 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-red-500/30'
                  }`}
                >
                  {amIWinner ? '🏆 VICTORY (MENANG)!' : '💀 DEFEAT (KALAH)'}
                </div>
                <h2 className="text-xl font-black text-white mt-2">
                  {result.endReason === 'NORMAL_WIN' ? 'GAPLE SELESAI!' : 'BUNTU (DEADLOCK)!'}
                </h2>

                {/* Team / Solo Winner Title */}
                {isTeamBattle ? (
                  <div className="mt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        isTeamA
                          ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                          : 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                      }`}
                    >
                      {isTeamA ? '🛡️ TIM MERAH (TIM A) MENANG!' : '⚔️ TIM BIRU (TIM B) MENANG!'}
                    </span>
                    {result.teamScores && (
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Skor Balak: <span className="text-red-400 font-bold">Tim Merah {result.teamScores.teamA}</span> vs{' '}
                        <span className="text-blue-400 font-bold">Tim Biru {result.teamScores.teamB}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-emerald-400 font-bold text-sm mt-1">
                    Juara: {result.winnerNickname}
                  </p>
                )}
              </div>

              {/* Rank Status Card */}
              <div
                className={`p-4 rounded-2xl border ${myRank.badgeBg} ${myRank.badgeBorder} my-4 shadow-inner text-left relative overflow-hidden`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{myRank.icon}</span>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Rank Anda
                      </span>
                      <span className={`text-base font-black tracking-tight ${myRank.badgeText}`}>
                        {myRank.title}
                      </span>
                    </div>
                  </div>

                  {/* Star Change Pill */}
                  <div>
                    {mySummary?.starChange && mySummary.starChange > 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        +1 Bintang ⭐
                      </span>
                    ) : mySummary?.starChange && mySummary.starChange < 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        -1 Bintang 💔
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        0 Bintang
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Bintang Saat Ini:</span>
                  <span className="text-sm font-mono tracking-widest text-amber-300 font-bold">
                    {myRank.starsDisplay}
                  </span>
                </div>
              </div>

              {/* Match Participants & Balak Summary */}
              <div className="my-3 space-y-1.5 text-left max-h-44 overflow-y-auto pr-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Detail Pemain & Sisa Balak:
                </span>
                {result.pipsSummary?.map((p) => {
                  const isRed = p.team === 'TEAM_A';
                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                        p.isWinner
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{AVATAR_ICONS[p.avatar] || '🦁'}</span>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white truncate max-w-[110px]">
                              {p.nickname}
                            </span>
                            {p.isBot && (
                              <span className="text-[7px] px-1 py-0.2 rounded bg-rose-500/40 text-rose-200 border border-rose-500/50 font-black">
                                MYTHIC 100★
                              </span>
                            )}
                            {isTeamBattle && (
                              <span
                                className={`text-[8px] px-1 py-0.2 rounded font-black ${
                                  isRed
                                    ? 'bg-red-500/30 text-red-300'
                                    : 'bg-blue-500/30 text-blue-300'
                                }`}
                              >
                                {isRed ? 'MERAH' : 'BIRU'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {p.rankFormatted || 'Warrior III'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-200 block text-xs">
                          {p.pips} Balak
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {p.tiles?.length ?? 0} kartu
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons: Stay in Room vs Exit */}
              <div className="mt-5 space-y-2">
                <button
                  onClick={async () => {
                    await playAgain();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  Lanjut Ronde Berikutnya (Stay di Room)
                </button>

                <button
                  onClick={leaveRoom}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar ke Lobby Utama
                </button>
              </div>
            </div>
          </div>
        );
      })()}
        </>
      )}

      {/* SIDEBAR DRAWER (PAUSE MENU) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex select-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Slide-out Drawer */}
          <div className="relative z-10 w-72 sm:w-80 bg-slate-950/95 backdrop-blur-2xl border-r border-amber-500/40 shadow-[15px_0_50px_rgba(0,0,0,0.9)] flex flex-col p-4 sm:p-5 h-full animate-slide-left overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
                  <Pause className="w-4 h-4 fill-amber-400/40" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Menu Meja
                  </h3>
                  <p className="text-[10px] text-slate-400">Pertandingan Berlangsung</p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                title="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Room Info Card */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs truncate max-w-[150px]">
                  {currentRoom?.name || 'Meja Domino'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {currentRoom?.mode === 'TEAM_BATTLE' ? '2v2 Team' : 'Solo'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                <span className="text-slate-400">Kode Room:</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 font-mono font-bold text-amber-400 hover:text-amber-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 transition active:scale-95"
                  title="Salin Kode Meja"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>#{currentRoom?.code}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Ronde:</span>
                <span className="font-bold text-slate-200">
                  Ronde #{currentRoom?.roundNumber || 1}
                </span>
              </div>

              {/* Chain Ends Status */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                <span className="text-slate-400">Ujung Meja:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {gameState?.leftEnd !== null ? gameState?.leftEnd : '-'}
                  </span>
                  <span className="text-slate-500">◀▶</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {gameState?.rightEnd !== null ? gameState?.rightEnd : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Items List */}
            <div className="mt-4 space-y-2 flex-1">
              {/* Camera Angle Toggle */}
              <button
                onClick={() => setCameraMode(cameraMode === '3D' ? 'TOP' : '3D')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Sudut Kamera</p>
                    <p className="text-[10px] text-slate-400">
                      {cameraMode === '3D' ? 'Perspektif 3D' : 'Pandangan Atas (2D Top)'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {cameraMode}
                </span>
              </button>

              {/* Sound SFX Toggle */}
              <button
                onClick={toggleSound}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-white">Efek Suara Domino</p>
                    <p className="text-[10px] text-slate-400">Ketukan balak & giliran</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    soundEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Friend List */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  setShowFriendModal(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Daftar & Ajak Teman</p>
                    <p className="text-[10px] text-slate-400">Lihat teman online & undang</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Buka ›</span>
              </button>

              {/* Chat Meja */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  setChatOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Obrolan Meja (Chat)</p>
                    <p className="text-[10px] text-slate-400">Pesan & emote pemain</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {chatMessages.length} pesan
                </span>
              </button>

              {/* Settings / OptionModal */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  setShowOptionModal(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-yellow-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Pengaturan Meja</p>
                    <p className="text-[10px] text-slate-400">Warna meja & tes suara mic</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Buka ›</span>
              </button>

              {/* Keluar Meja */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  leaveRoom();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-left transition group"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
                  <div>
                    <p className="text-xs font-bold text-red-200">Keluar Meja</p>
                    <p className="text-[10px] text-red-400/80">Tinggalkan permainan ke lobby</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-red-400">Keluar ›</span>
              </button>
            </div>

            {/* Footer Resume Button */}
            <div className="mt-4 pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Lanjut Bermain</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPTION / SETTINGS MODAL */}
      {showOptionModal && (
        <OptionModal
          onClose={() => setShowOptionModal(false)}
          roomCode={currentRoom?.code}
          tableTheme={tableTheme}
          onThemeChange={(t) => setTableTheme(t)}
        />
      )}

      {/* FRIEND LIST MODAL */}
      {showFriendModal && <FriendModal onClose={() => setShowFriendModal(false)} />}
    </div>
  );
};
