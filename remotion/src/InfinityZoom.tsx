import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, Easing } from 'remotion';

export type InfinityZoomItem = { url: string; type: 'image' | 'video' };

export type InfinityZoomProps = {
  items: InfinityZoomItem[];
  zoomFactor: number;       // scale per segment, e.g. 3 = 3×
  secondsPerImage: number;  // duration of each zoom step
  easingType: 'inout' | 'in' | 'out';
  backgroundColor: string;
};

export const INFINITY_ZOOM_FPS = 30;

export const defaultInfinityZoomProps: InfinityZoomProps = {
  items: [],
  zoomFactor: 3,
  secondsPerImage: 4,
  easingType: 'inout',
  backgroundColor: '#000000',
};

function applyEasing(t: number, type: InfinityZoomProps['easingType']): number {
  if (type === 'in') return Easing.in(Easing.cubic)(t);
  if (type === 'out') return Easing.out(Easing.cubic)(t);
  return Easing.inOut(Easing.cubic)(t);
}

export const InfinityZoom: React.FC<InfinityZoomProps> = ({
  items, zoomFactor, secondsPerImage, easingType, backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (items.length === 0) {
    return <AbsoluteFill style={{ background: backgroundColor }} />;
  }

  const segmentFrames = Math.max(1, Math.round(secondsPerImage * fps));
  const segmentIndex = Math.floor(frame / segmentFrames) % items.length;
  const rawProgress = Math.min((frame % segmentFrames) / segmentFrames, 1);
  const p = applyEasing(rawProgress, easingType);

  const current = items[segmentIndex];
  const next = items[(segmentIndex + 1) % items.length];

  // Current zooms out of frame (1 → zoomFactor), revealing next (1/zoomFactor → 1)
  const currentScale = 1 + p * (zoomFactor - 1);
  const nextScale = 1 / zoomFactor + p * (1 - 1 / zoomFactor);

  const renderItem = (item: InfinityZoomItem) => {
    const style: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
    return item.type === 'video'
      ? <Video src={item.url} style={style} pauseWhenBuffering />
      : <Img src={item.url} style={style} />;
  };

  return (
    <AbsoluteFill style={{ background: backgroundColor, overflow: 'hidden' }}>
      {/* Next item underneath, scaling into view */}
      <AbsoluteFill style={{ transform: `scale(${nextScale})`, transformOrigin: '50% 50%' }}>
        {renderItem(next)}
      </AbsoluteFill>
      {/* Current item on top, zooming away */}
      <AbsoluteFill style={{ transform: `scale(${currentScale})`, transformOrigin: '50% 50%' }}>
        {renderItem(current)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
