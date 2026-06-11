export type Alignment = {
  x: number; // product box left, normalized 0..1 of image width
  y: number; // product box top, normalized 0..1 of image height
  w: number; // product box width, normalized 0..1
  h: number; // product box height, normalized 0..1
  aspect: number; // image natural width / height
};

export type StopMotionProps = {
  images: string[];
  alignments: Record<string, Alignment>; // keyed by image URL
  framesPerImage: number;
  transition: 'cut' | 'crossfade';
  targetSize: number; // product height as fraction of canvas height, e.g. 0.5
  background: string;
  showCenter?: boolean; // debug: render crosshair at canvas center
};

export const STOP_MOTION_FPS = 25;

export function getStopMotionDuration(imageCount: number, framesPerImage: number): number {
  return Math.max(1, imageCount * framesPerImage);
}
