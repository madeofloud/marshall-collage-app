import React from 'react';
import { AbsoluteFill, Img, Video, useCurrentFrame, useVideoConfig, Easing, interpolate } from 'remotion';

export type InfinityZoomItem = { url: string; type: 'image' | 'video' };

export type InfinityZoomProps = {
  items: InfinityZoomItem[];
  zoomFactor: number;        // magnification gained per step (each nested image grows by this before handoff)
  secondsPerImage: number;   // duration of each step
  feather: number;           // 0–1: softness of each layer's edge so nested images blend
  depthBlur: number;         // 0–1: defocus the outgoing image as it zooms past (depth-of-field)
  motion: 'linear' | 'eased';
  backgroundColor: string;
};

export const INFINITY_ZOOM_FPS = 30;

export const defaultInfinityZoomProps: InfinityZoomProps = {
  items: [],
  zoomFactor: 2,
  secondsPerImage: 1.8,
  feather: 0.18,
  depthBlur: 0.45,
  motion: 'linear',
  backgroundColor: '#000000',
};

export const InfinityZoom: React.FC<InfinityZoomProps> = ({
  items, zoomFactor, secondsPerImage, feather, depthBlur, motion, backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (items.length === 0) {
    return <AbsoluteFill style={{ background: backgroundColor }} />;
  }

  const N = items.length;
  const Z = Math.max(1.05, zoomFactor);
  const stepFrames = Math.max(1, secondsPerImage * fps);
  const totalFrames = stepFrames * N;

  // Continuous zoom phase, in "steps". Wraps every N steps for a seamless loop.
  const tf = ((frame % totalFrames) + totalFrames) % totalFrames;
  const phi = tf / stepFrames;
  const step = Math.floor(phi);
  const rawFrac = phi - step;
  // Linear keeps a constant zoom velocity (the reference look); eased pulses per image.
  const frac = motion === 'eased' ? Easing.inOut(Easing.cubic)(rawFrac) : rawFrac;

  // Recursive / Droste zoom (matches the reference): a stack of nested images,
  // each a power of Z smaller than the previous, all growing outward together.
  //   layer o (o = 0,1,2,…) shows image (step + o) at scale Z^(frac - o)
  //   o = 0 fills the screen (scale 1 → Z) — the image we are currently inside;
  //         as it grows past full-screen it goes OUT OF FOCUS (depth blur).
  //   o = 1 is the NEXT image, nested in the centre, sharp, growing 1/Z → 1 ON TOP.
  //   deeper layers are progressively smaller, sharp points in the centre.
  // The next image animates IN by growing out from the centre and occluding the
  // current one — no cross-fade. At each step boundary the o=1 image reaches
  // scale 1 and becomes o=0; indices shift by one for an identical frame, so the
  // zoom is perfectly continuous and loops after N images.

  const MIN_SCALE = 0.008;
  const depth = Math.min(14, Math.ceil(Math.log(1 / MIN_SCALE) / Math.log(Z)) + 1);

  // Feathered edge mask so each nested image melts into the one behind it.
  const stop = interpolate(feather, [0, 1], [99.5, 45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const maskImage = feather > 0
    ? `radial-gradient(ellipse at center, black ${stop}%, transparent 100%)`
    : undefined;

  const renderItem = (item: InfinityZoomItem) => {
    const style: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
    return item.type === 'video'
      ? <Video src={item.url} style={style} pauseWhenBuffering loop />
      : <Img src={item.url} style={style} />;
  };

  const layers: { o: number; scale: number; opacity: number; blur: number; idx: number }[] = [];
  for (let o = 0; o <= depth; o++) {
    const scale = Math.pow(Z, frac - o);
    if (scale < MIN_SCALE * 0.5) continue;
    // Fade the newest layer in as it emerges from the centre so it never pops.
    const opacity = interpolate(scale, [MIN_SCALE, MIN_SCALE * 6], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    if (opacity <= 0.001) continue;
    // Depth of field: layers larger than full-screen drift out of focus, like the
    // foreground photo blurring as the camera pushes through it toward the next.
    // Divide by scale so the post-scale on-screen blur stays controlled.
    const blur = scale > 1
      ? (depthBlur * 26 * (1 - 1 / scale)) / scale
      : 0;
    const idx = (((step + o) % N) + N) % N;
    layers.push({ o, scale, opacity, blur, idx });
  }

  return (
    <AbsoluteFill style={{ background: backgroundColor, overflow: 'hidden' }}>
      {/* Largest (o=0) at the back, smallest nested image sharp on top. */}
      {layers.map(({ o, scale, opacity, blur, idx }) => (
        <AbsoluteFill
          key={o}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: '50% 50%',
            opacity,
            filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
            WebkitMaskImage: maskImage,
            maskImage,
          }}
        >
          {renderItem(items[idx])}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
