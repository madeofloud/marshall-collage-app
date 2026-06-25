import React from 'react';
import { Img } from 'remotion';
import type { Panel } from './types';

type Props = {
  panel: Panel;
  isSelected?: boolean;
  showOutline?: boolean;
  onSelect?: (id: string) => void;
};

const SIDE_COLOR = '#1c1c1c';
const SIDE_HIGHLIGHT = '#2e2e2e'; // top/bottom slightly lighter

export const PanelComponent: React.FC<Props> = ({ panel, isSelected, showOutline, onSelect }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (!onSelect) return;
    e.stopPropagation();
    onSelect(panel.id);
  };

  const t = panel.thickness ?? 0;

  return (
    <div
      onClick={onSelect ? handleClick : undefined}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: panel.width,
        transformStyle: 'preserve-3d',
        transform: `
          translate(-50%, -50%)
          translate3d(${panel.worldX}px, ${panel.worldY}px, ${panel.worldZ}px)
          rotateY(${panel.facingAngle}deg)
          rotateX(${panel.tiltX}deg)
          rotateZ(${panel.tiltZ}deg)
        `,
        cursor: onSelect ? 'pointer' : 'default',
        outline: isSelected && showOutline ? '3px solid #4af' : 'none',
        outlineOffset: '2px',
      }}
    >
      {/* Front face — the image */}
      <Img
        src={panel.image}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          pointerEvents: 'none',
          position: 'relative',
          // Push the front face forward by half the thickness so sides are centred
          transform: t > 0 ? `translateZ(${t / 2}px)` : undefined,
        }}
      />

      {/* Side faces — only rendered when thickness > 0 */}
      {t > 0 && (
        <>
          {/* Left face */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: t, height: '100%',
            background: SIDE_COLOR,
            transformOrigin: 'left center',
            transform: `rotateY(-90deg)`,
            backfaceVisibility: 'hidden',
          }} />

          {/* Right face */}
          <div style={{
            position: 'absolute',
            top: 0, right: 0,
            width: t, height: '100%',
            background: SIDE_COLOR,
            transformOrigin: 'right center',
            transform: `rotateY(90deg)`,
            backfaceVisibility: 'hidden',
          }} />

          {/* Top face */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: t,
            background: SIDE_HIGHLIGHT,
            transformOrigin: 'top center',
            transform: `rotateX(-90deg)`,
            backfaceVisibility: 'hidden',
          }} />

          {/* Bottom face */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0,
            width: '100%', height: t,
            background: SIDE_COLOR,
            transformOrigin: 'bottom center',
            transform: `rotateX(90deg)`,
            backfaceVisibility: 'hidden',
          }} />

          {/* Back face */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            background: '#111',
            transform: `translateZ(${-t / 2}px)`,
            backfaceVisibility: 'hidden',
          }} />
        </>
      )}
    </div>
  );
};
