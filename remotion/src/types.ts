export type Panel = {
  id: string;
  image: string;
  worldX: number;
  worldY: number;
  worldZ: number;
  facingAngle: number;
  tiltX: number;
  tiltZ: number;
  width: number;
};

export type PanelOverride = {
  worldX: number;
  worldY: number;
  worldZ: number;
  facingAngle: number;
  tiltX: number;
  tiltZ: number;
  width: number;
};

export type PanelOverrides = Record<string, PanelOverride>;

export type CollageProps = {
  images: string[];
  background: string;
  rotationSpeed: number;
  grainAmount: number;
  panelOverrides: PanelOverrides;
};

// ----------------------------------------
// Format & resolution
// ----------------------------------------

export type AspectFormat = '1x1' | '16x9' | '9x16' | '4x5' | '5x4';
export type SizeTier = 'low' | 'medium' | 'high';

export type FormatDimensions = {
  width: number;
  height: number;
};

// Base width per format at "medium" tier; "low" is /2, "high" is *1.5
const FORMAT_BASE: Record<AspectFormat, FormatDimensions> = {
  '1x1':  { width: 900,  height: 900  },
  '16x9': { width: 1280, height: 720  },
  '9x16': { width: 720,  height: 1280 },
  '4x5':  { width: 720,  height: 900  },
  '5x4':  { width: 900,  height: 720  },
};

const SIZE_MULTIPLIER: Record<SizeTier, number> = {
  low:    0.5,
  medium: 1,
  high:   1.5,
};

export function getFormatDimensions(format: AspectFormat, size: SizeTier): FormatDimensions {
  const base = FORMAT_BASE[format];
  const m = SIZE_MULTIPLIER[size];
  return {
    width:  Math.round(base.width  * m),
    height: Math.round(base.height * m),
  };
}

export function getCompositionId(format: AspectFormat, size: SizeTier): string {
  return `Collage-${format}-${size}`;
}

export const ALL_FORMATS: AspectFormat[] = ['1x1', '16x9', '9x16', '4x5', '5x4'];
export const ALL_SIZES: SizeTier[] = ['low', 'medium', 'high'];

export const FORMAT_LABELS: Record<AspectFormat, string> = {
  '1x1':  '1:1',
  '16x9': '16:9',
  '9x16': '9:16',
  '4x5':  '4:5',
  '5x4':  '5:4',
};

export const SIZE_LABELS: Record<SizeTier, string> = {
  low:    'Low',
  medium: 'Medium',
  high:   'High',
};

// ----------------------------------------
// Seamless loop helpers
// ----------------------------------------

/**
 * Default target length (in seconds) for the timeline. The actual duration
 * is snapped to whatever length lets the rotation complete a whole number
 * of full turns, so the animation always loops seamlessly.
 */
export const TARGET_LOOP_SECONDS = 6;

/**
 * Returns a duration (in frames) that is as close to TARGET_LOOP_SECONDS
 * as possible while letting `rotationSpeed` complete an integer number
 * of full 360° turns. Guarantees `>= 1` frame.
 */
export function getSeamlessLoopFrames(
  rotationSpeed: number,
  fps: number,
  targetSeconds: number = TARGET_LOOP_SECONDS
): number {
  const speed = Math.abs(rotationSpeed);
  if (speed < 0.0001) {
    // No rotation → any duration loops; just use the target.
    return Math.max(1, Math.round(targetSeconds * fps));
  }
  const oneRevolutionSec = 360 / speed;
  // Pick the integer number of revolutions that brings total length closest to target.
  const turns = Math.max(1, Math.round(targetSeconds / oneRevolutionSec));
  return Math.max(1, Math.round(turns * oneRevolutionSec * fps));
}
