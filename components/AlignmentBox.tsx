'use client';

import React, { useCallback, useRef } from 'react';

type Box = { x: number; y: number; w: number; h: number };

type Props = {
  value: Box;
  onChange: (v: Box) => void;
};

const MIN_SIZE = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const AlignmentBox: React.FC<Props> = ({ value, onChange }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback(
    (mode: 'move' | 'resize') => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = parentRef.current;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const start = { ...value };

      const onMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startX) / rect.width;
        const dy = (ev.clientY - startY) / rect.height;

        if (mode === 'move') {
          const x = clamp(start.x + dx, 0, 1 - start.w);
          const y = clamp(start.y + dy, 0, 1 - start.h);
          onChange({ ...start, x, y });
        } else {
          const w = clamp(start.w + dx, MIN_SIZE, 1 - start.x);
          const h = clamp(start.h + dy, MIN_SIZE, 1 - start.y);
          onChange({ ...start, w, h });
        }
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [value, onChange]
  );

  return (
    <div ref={parentRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
      <div
        className="absolute border-2 border-marshall-gold bg-marshall-gold/10 cursor-move"
        style={{
          left: `${value.x * 100}%`,
          top: `${value.y * 100}%`,
          width: `${value.w * 100}%`,
          height: `${value.h * 100}%`,
        }}
        onMouseDown={startDrag('move')}
      >
        {/* Center dot — aligns with the canvas crosshair */}
        <div
          className="absolute rounded-full bg-marshall-gold pointer-events-none"
          style={{ width: 8, height: 8, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <div
          className="absolute w-3 h-3 bg-marshall-gold cursor-nwse-resize"
          style={{ right: -6, bottom: -6 }}
          onMouseDown={startDrag('resize')}
        />
      </div>
    </div>
  );
};
