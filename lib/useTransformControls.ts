'use client';

import { useEffect, useRef, useState } from 'react';
import type { PanelOverrides, PanelOverride } from '@/remotion/src/types';

export type TransformMode = 'idle' | 'translate' | 'rotate';

const TRANSLATE_SENSITIVITY = 1;   // 1px mouse = 1 unit
const ROTATE_SENSITIVITY = 0.5;    // 1px mouse = 0.5 degrees
const DRAG_THRESHOLD = 3;          // px before mousedown becomes drag

type Args = {
  selectedPanelId: string | null;
  panelOverrides: PanelOverrides;
  setPanelOverrides: (o: PanelOverrides) => void;
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  onDeleteSelected?: () => void;
};

export function useTransformControls({
  selectedPanelId,
  panelOverrides,
  setPanelOverrides,
  containerRef,
  enabled = true,
  onDeleteSelected,
}: Args) {
  const [mode, setModeState] = useState<TransformMode>('idle');
  const [shiftHeld, setShiftHeldState] = useState(false);

  // Refs for sync access inside event handlers (avoids stale closures)
  const overridesRef = useRef(panelOverrides);
  const selectedRef = useRef(selectedPanelId);
  const modeRef = useRef<TransformMode>('idle');
  const shiftRef = useRef(false);
  const startOverrideRef = useRef<PanelOverride | null>(null);
  const onDeleteRef = useRef(onDeleteSelected);

  useEffect(() => { overridesRef.current = panelOverrides; }, [panelOverrides]);
  useEffect(() => { selectedRef.current = selectedPanelId; }, [selectedPanelId]);
  useEffect(() => { onDeleteRef.current = onDeleteSelected; }, [onDeleteSelected]);

  // Synchronous setters that update both ref and state
  const setMode = (m: TransformMode) => {
    modeRef.current = m;
    setModeState(m);
  };
  const setShiftHeld = (s: boolean) => {
    shiftRef.current = s;
    setShiftHeldState(s);
  };

  // Helper: write changes to currently selected panel
  const updateSelected = (changes: Partial<PanelOverride>) => {
    const id = selectedRef.current;
    if (!id) return;
    const current = overridesRef.current[id];
    if (!current) return;
    const updated = { ...current, ...changes };
    setPanelOverrides({ ...overridesRef.current, [id]: updated });
  };

  // Keyboard: Shift, Space (translate), Esc (cancel), Backspace/Delete
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keys while typing in inputs
      const target = e.target as HTMLElement | null;
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )) {
        return;
      }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setShiftHeld(true);
        return;
      }

      if (!selectedRef.current) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (modeRef.current !== 'translate') {
          startOverrideRef.current = overridesRef.current[selectedRef.current] ?? null;
          setMode('translate');
        }
      } else if (e.code === 'Escape' && modeRef.current !== 'idle') {
        if (startOverrideRef.current && selectedRef.current) {
          setPanelOverrides({
            ...overridesRef.current,
            [selectedRef.current]: startOverrideRef.current,
          });
        }
        setMode('idle');
        startOverrideRef.current = null;
      } else if (
        (e.code === 'Backspace' || e.code === 'Delete') &&
        modeRef.current === 'idle'
      ) {
        e.preventDefault();
        onDeleteRef.current?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setShiftHeld(false);
        return;
      }

      if (e.code === 'Space' && modeRef.current === 'translate') {
        setMode('idle');
        startOverrideRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, setPanelOverrides]);

  // Mouse: drag for rotate, move for both modes
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    let isMouseDown = false;
    let dragInitX = 0;
    let dragInitY = 0;
    let dragMovedEnough = false;

    const handleMouseDown = (e: MouseEvent) => {
      if (!selectedRef.current) return;
      if (modeRef.current === 'translate') return;
      if (e.button !== 0) return;

      isMouseDown = true;
      dragInitX = e.clientX;
      dragInitY = e.clientY;
      dragMovedEnough = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (modeRef.current === 'translate') {
        const dx = e.movementX * TRANSLATE_SENSITIVITY;
        const dy = e.movementY * TRANSLATE_SENSITIVITY;
        const id = selectedRef.current;
        if (!id) return;
        const current = overridesRef.current[id];
        if (!current) return;

        if (shiftRef.current) {
          updateSelected({ worldZ: current.worldZ - dy });
        } else {
          updateSelected({
            worldX: current.worldX + dx,
            worldY: current.worldY + dy,
          });
        }
        return;
      }

      if (!isMouseDown) return;

      if (!dragMovedEnough) {
        const totalDx = Math.abs(e.clientX - dragInitX);
        const totalDy = Math.abs(e.clientY - dragInitY);
        if (totalDx + totalDy >= DRAG_THRESHOLD) {
          dragMovedEnough = true;
          startOverrideRef.current =
            overridesRef.current[selectedRef.current!] ?? null;
          setMode('rotate');
        } else {
          return;
        }
      }

      const dx = e.movementX * ROTATE_SENSITIVITY;
      const dy = e.movementY * ROTATE_SENSITIVITY;
      const id = selectedRef.current;
      if (!id) return;
      const current = overridesRef.current[id];
      if (!current) return;

      if (shiftRef.current) {
        updateSelected({ tiltZ: current.tiltZ + dx });
      } else {
        updateSelected({
          facingAngle: current.facingAngle + dx,
          tiltX: current.tiltX + dy,
        });
      }
    };

    const handleMouseUp = () => {
      const wasRotating = dragMovedEnough && modeRef.current === 'rotate';
      isMouseDown = false;

      if (wasRotating) {
        setMode('idle');
        startOverrideRef.current = null;

        const captureNextClick = (ev: MouseEvent) => {
          ev.stopImmediatePropagation();
          window.removeEventListener('click', captureNextClick, true);
        };
        window.addEventListener('click', captureNextClick, true);
      }
      dragMovedEnough = false;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, containerRef, setPanelOverrides]);

  return { mode, shiftHeld };
}
