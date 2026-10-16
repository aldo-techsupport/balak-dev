'use client';

import React from 'react';

interface DominoPieceProps {
  left: number; // 0-6
  right: number; // 0-6
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isPlayable?: boolean;
  isSelected?: boolean;
  orientation?: 'vertical' | 'horizontal';
  onClick?: () => void;
  className?: string;
}

// 3x3 Grid indices (0..8):
// 0 1 2
// 3 4 5
// 6 7 8
const PIP_CONFIG: Record<number, number[]> = {
  0: [],
  1: [4], // Center
  2: [0, 8], // Top-Left, Bottom-Right
  3: [0, 4, 8], // Diagonal
  4: [0, 2, 6, 8], // 4 Corners
  5: [0, 2, 4, 6, 8], // 4 Corners + Center
  6: [0, 2, 3, 5, 6, 8], // 2 Columns of 3
};

function PipGrid({
  count,
  isBalak,
  size,
}: {
  count: number;
  isBalak: boolean;
  size: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const pips = PIP_CONFIG[count] || [];
  // In Indonesian Gaple: Single dot (1) is always RED ("Si Merah"), and Balak doubles are RED
  const isRedPip = isBalak || count === 1;
  const pipColor = isRedPip ? 'bg-red-600' : 'bg-slate-900';

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const dotSize = dotSizes[size];

  return (
    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-1 items-center justify-items-center">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
        <div key={index} className="flex items-center justify-center w-full h-full">
          {pips.includes(index) && (
            <span
              className={`rounded-full ${pipColor} ${dotSize} shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.8),0_0.5px_0.5px_rgba(255,255,255,0.7)]`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const DominoPiece: React.FC<DominoPieceProps> = ({
  left,
  right,
  size = 'md',
  isPlayable = false,
  isSelected = false,
  orientation = 'vertical',
  onClick,
  className = '',
}) => {
  const isBalak = left === right;

  // Use explicit pixel sizes with shrink-0 so flexbox NEVER collapses them
  const sizeStyles: Record<string, { v: string; h: string }> = {
    sm: { v: 'w-[36px] h-[72px]', h: 'w-[72px] h-[36px]' },
    md: { v: 'w-[48px] h-[96px]', h: 'w-[96px] h-[48px]' },
    lg: { v: 'w-[60px] h-[120px]', h: 'w-[120px] h-[60px]' },
    xl: { v: 'w-[72px] h-[144px]', h: 'w-[144px] h-[72px]' },
  };

  const currentSize =
    orientation === 'vertical' ? sizeStyles[size].v : sizeStyles[size].h;

  return (
    <div
      onClick={onClick}
      className={`
        relative select-none rounded-xl cursor-pointer transition-all duration-200 shrink-0
        bg-gradient-to-b from-[#fffff7] via-[#faf6ea] to-[#eee5ce]
        border-2 border-[#c5b593] shadow-[0_6px_16px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,1)]
        flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
        ${currentSize}
        ${
          isPlayable
            ? '-translate-y-2.5 ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950 shadow-[0_4px_16px_rgba(251,191,36,0.6)]'
            : ''
        }
        ${
          isSelected
            ? '-translate-y-4 ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-[0_8px_24px_rgba(16,185,129,0.8)] scale-105 z-10'
            : isPlayable
            ? 'hover:-translate-y-3.5 hover:shadow-[0_6px_20px_rgba(251,191,36,0.8)] hover:brightness-105'
            : 'hover:-translate-y-1 opacity-90'
        }
        ${className}
      `}
    >
      {/* Top / Left Half */}
      <div className="flex-1 flex items-center justify-center p-0.5 overflow-hidden">
        <PipGrid count={left} isBalak={isBalak} size={size} />
      </div>

      {/* Center Dividing Groove with Brass Spinner Rivet */}
      <div
        className={`
          relative bg-[#ab9875] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] shrink-0
          flex items-center justify-center
          ${orientation === 'vertical' ? 'w-full h-[3px]' : 'w-[3px] h-full'}
        `}
      >
        <div className="w-2 h-2 rounded-full bg-gradient-to-tr from-amber-700 via-amber-300 to-amber-500 shadow-sm border border-amber-900 shrink-0" />
      </div>

      {/* Bottom / Right Half */}
      <div className="flex-1 flex items-center justify-center p-0.5 overflow-hidden">
        <PipGrid count={right} isBalak={isBalak} size={size} />
      </div>
    </div>
  );
};
