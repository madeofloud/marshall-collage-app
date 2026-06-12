export type Alignment = {
  // Logo center point, normalized 0..1 of image dimensions.
  cx: number;
  cy: number;
  aspect: number;       // image natural width / height
  angle?: number;       // degrees the Marshall script tilts from horizontal
                        // (positive = clockwise). Used to rotate image so logo
                        // is always horizontal on canvas.
  logoWidth?: number;   // width of the "Marshall" script as fraction of image
                        // width. Used to normalize size across all images.

  // Legacy bounding-box fields — kept for backward compat, not used in rendering.
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export type StopMotionProps = {
  images: string[];
  alignments: Record<string, Alignment>;
  framesPerImage: number;
  transition: 'cut' | 'crossfade';
  targetSize: number; // desired logo width as a fraction of canvas width.
                      // Combined with each image's logoWidth this normalizes the
                      // logo to the same pixel width on every frame.
                      // (Legacy: image-height fraction when logoWidth unknown.)
  background: string;
  backgroundImage?: string; // optional full-bleed background image URL
  showCenter?: boolean;
};

export const STOP_MOTION_FPS = 25;

export function getStopMotionDuration(imageCount: number, framesPerImage: number): number {
  return Math.max(1, imageCount * framesPerImage);
}
