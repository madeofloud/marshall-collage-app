'use client';

import React from 'react';
import { Move, RotateCw, Layers } from 'lucide-react';
import type { TransformMode } from '@/lib/useTransformControls';

type Props = {
  mode: TransformMode;
  shiftHeld: boolean;
  hasSelection: boolean;
};

export const TransformHUD: React.FC<Props> = ({ mode, shiftHeld, hasSelection }) => {
  if (!hasSelection) return null;

  return (
    <div className="absolute top-3 left-3 pointer-events-none z-20 space-y-2">
      {mode !== 'idle' && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-marshall-gold text-black rounded-full text-xs font-semibold shadow-lg">
          {mode === 'translate' ? (
            <>
              <Move className="w-3.5 h-3.5" />
              {shiftHeld ? 'Move Z (depth)' : 'Move X / Y'}
            </>
          ) : (
            <>
              <RotateCw className="w-3.5 h-3.5" />
              {shiftHeld ? 'Rotate Z (twist)' : 'Rotate X / Y'}
            </>
          )}
        </div>
      )}

      {mode === 'idle' && (
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 text-[10px] text-white/70 space-y-1 leading-snug max-w-[200px]">
          <div className="flex items-center gap-1.5 text-white/90">
            <Layers className="w-3 h-3" />
            <span className="font-semibold">Panel selected</span>
          </div>
          <div><kbd className="kbd">Space</kbd> + drag → move</div>
          <div><kbd className="kbd">Drag</kbd> → rotate</div>
          <div><kbd className="kbd">Shift</kbd> → Z axis</div>
          <div><kbd className="kbd">Backspace</kbd> → delete</div>
          <div><kbd className="kbd">Esc</kbd> → cancel</div>
        </div>
      )}
    </div>
  );
};
