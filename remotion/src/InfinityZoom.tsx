import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, Easing, interpolate } from 'remotion';

export type InfinityZoomItem = { url: string; type: 'image' | 'video' };

export type InfinityZoomProps = {
  items: InfinityZoomItem[];
  zoomFactor: number;        // magnification per step (e.g. 2.5 = each image grows 2.5× before handoff)
  secondsPerImage: number;   // duration of each zoom step
  dissolve: number;          // 0–1: fraction of a step over which the outgoing image cross-fades
  motion: 'linear' | 'eased';
  backgroundColor: string;
};

export const INFINITY_ZOOM_FPS = 30;

export const defaultInfinityZoomProps: InfinityZoomProps = {
  items: [],
  zoomFactor: 2.5,
  secondsPerImage: 4,
  dissolve: 0.6,
  motion: 'linear',
  backgroundColor: '#000000',
};

export const InfinityZoom: React.FC<InfinityZoomProps> = ({
  items, zoomFactor, secondsPerImage, dissolve, motion, backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (items.length === 0) {
    return <AbsoluteFill style={{ background: backgroundColor }} />;
  }

  const N = items.length;
  const Z = Math.max(1.01, zoomFactor);
  const stepFrames = Math.max(1, secondsPerImage * fps);
  const totalFrames = stepFrames * N;

  // Continuous progress measured in "steps". Wraps every N steps so the
  // sequence loops forever with no seam.
  const tf = ((frame % totalFrames) + totalFrames) % totalFrames;
  const p = tf / stepFrames;        // [0, N)
  const step = Math.floor(p);
  const rawFrac = p - step;         // [0, 1) progress within the current step

  // Eased motion would make each image pulse (slow at edges); the reference is a
  // constant-velocity zoom, so 'linear' keeps speed continuous across handoffs.
  const frac = motion === 'eased' ? Easing.inOut(Easing.cubic)(rawFrac) : rawFrac;

  // Two layers are visible at any moment:
  //  - main (incoming): the image that started filling the screen this step.
  //    Scales Z^frac (1 → Z), always fully opaque, always ≥ full-screen.
  //  - front (outgoing): the previous image, still zooming away on top.
  //    Scales Z^(1+frac) (Z → Z²) and cross-fades out, revealing main behind it.
  // At the step boundary, main reaches scale Z (exactly where front started) and
  // becomes the next front — identical frame, so the transition is seamless.
  const mainIndex = step % N;
  const frontIndex = (step - 1 + N) % N;

  const mainScale = Math.pow(Z, frac);
  const frontScale = Math.pow(Z, 1 + frac);

  // Outgoing fades over the last `dissolve` fraction of the step, hitting 0 at
  // frac = 1 so it lines up with the boundary.
  const cf = Math.min(0.999, Math.max(0.05, dissolve));
  const frontOpacity = interpolate(frac, [1 - cf, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const renderItem = (item: InfinityZoomItem) => {
    const style: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
    return item.type === 'video'
      ? <Video src={item.url} style={style} pauseWhenBuffering loop />
      : <Img src={item.url} style={style} />;
  };

  return (
    <AbsoluteFill style={{ background: backgroundColor, overflow: 'hidden' }}>
      {/* Incoming image — behind, fully opaque */}
      <AbsoluteFill style={{ transform: `scale(${mainScale})`, transformOrigin: '50% 50%' }}>
        {renderItem(items[mainIndex])}
      </AbsoluteFill>
      {/* Outgoing image — on top, zooming away and dissolving */}
      <AbsoluteFill style={{ transform: `scale(${frontScale})`, transformOrigin: '50% 50%', opacity: frontOpacity }}>
        {renderItem(items[frontIndex])}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
