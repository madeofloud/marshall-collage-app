import type { Panel } from './types';

function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Hash a string to a number (deterministic, for stable seeds based on URL)
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ARMS = [
  { dx: 1,  dz: 0,  facing: 90 },
  { dx: 0,  dz: -1, facing: 180 },
  { dx: -1, dz: 0,  facing: 270 },
  { dx: 0,  dz: 1,  facing: 0 },
];

export function generatePanels(imageUrls: string[]): Panel[] {
  if (imageUrls.length === 0) return [];

  const armBuckets: { url: string; idx: number }[][] = [[], [], [], []];
  imageUrls.forEach((url, i) => armBuckets[i % 4].push({ url, idx: i }));

  const panels: Panel[] = [];

  armBuckets.forEach((arm, armIdx) => {
    const armDir = ARMS[armIdx];
    arm.forEach((entry, panelIdx) => {
      const seed = armIdx * 100 + panelIdx * 13;
      const distance = 20 + panelIdx * 30;
      const worldY = (rand(seed) - 0.5) * 50;
      const worldX = armDir.dx * distance;
      const worldZ = armDir.dz * distance;
      const facingAngle = armDir.facing + (rand(seed + 1) - 0.5) * 8;
      const width = Math.round(110 + rand(seed + 2) * 50);
      const tiltZ = (rand(seed + 3) - 0.5) * 12;
      const tiltX = (rand(seed + 4) - 0.5) * 8;

      // Use a stable id derived from the URL so panels keep their identity
      // when other images are removed/reordered.
      const id = `panel-${hashStr(entry.url)}`;

      panels.push({
        id,
        image: entry.url,
        worldX, worldY, worldZ,
        facingAngle, tiltX, tiltZ, width,
      });
    });
  });

  return panels;
}
