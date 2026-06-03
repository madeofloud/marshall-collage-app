import React from 'react';
import type { Panel } from './types';

type Props = {
  panel: Panel;
  isSelected?: boolean;
  showOutline?: boolean;
  onSelect?: (id: string) => void;
};

export const PanelComponent: React.FC<Props> = ({ panel, isSelected, showOutline, onSelect }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (!onSelect) return;
    e.stopPropagation();
    onSelect(panel.id);
  };

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
      <img
        src={panel.image}
        crossOrigin="anonymous"
        style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
        alt=""
      />
    </div>
  );
};
