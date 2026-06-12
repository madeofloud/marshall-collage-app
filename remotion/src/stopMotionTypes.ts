export type Alignment = {
  // Product center point, normalized 0..1 of image dimensions.
  // This is the ONLY thing that matters for centering: the point the user
  // clicks on the product is locked to the canvas center in the animation.
  cx: number;
  cy: number;
  aspect: number; // image natural width / height

  // Legacy bounding-box fields kept for backward compat with saved sessions.
  // Not used for rendering — only cx/cy drive position.
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export type StopMotionProps = {
  images: string[];
  alignments: Record<string, Alignment>; // keyed by image URL
  framesPerImage: number;
  transition: 'cut' | 'crossfade';
  targetSize: number; // displayed image height as fraction of canvas height
  background: string;
  showCenter?: boolean;
};

export const STOP_MOTION_FPS = 25;

export function getStopMotionDuration(imageCount: number, framesPerImage: number): number {
  return Math.max(1, imageCount * framesPerImage);
}
