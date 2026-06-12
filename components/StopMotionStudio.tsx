'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Player } from '@remotion/player';
import { ImageUploader } from './ImageUploader';
import { StopMotion } from '@/remotion/src/StopMotion';
import {
  type Alignment,
  STOP_MOTION_FPS,
  getStopMotionDuration,
} from '@/remotion/src/stopMotionTypes';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">{children}</h3>
);

const SliderRow = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-white/70">{label}</span>
      <span className="text-white/50 tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
    <Slider.Root
      className="relative flex items-center select-none touch-none w-full h-5"
      value={[value]}
      onValueChange={(v) => onChange(v[0])}
      min={min}
      max={max}
      step={step}
    >
      <Slider.Track className="bg-white/10 relative grow rounded-full h-1">
        <Slider.Range className="absolute bg-marshall-gold rounded-full h-full" />
      </Slider.Track>
      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-marshall-gold transition" />
    </Slider.Root>
  </div>
);

type StopMotionStudioProps = {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  alignments: Record<string, Alignment>;
  setAlignments: React.Dispatch<React.SetStateAction<Record<string, Alignment>>>;
  framesPerImage: number;
  setFramesPerImage: React.Dispatch<React.SetStateAction<number>>;
  transition: 'cut' | 'crossfade';
  setTransition: React.Dispatch<React.SetStateAction<'cut' | 'crossfade'>>;
  targetSize: number;
  setTargetSize: React.Dispatch<React.SetStateAction<number>>;
  background: string;
  setBackground: React.Dispatch<React.SetStateAction<string>>;
};

export const StopMotionStudio: React.FC<StopMotionStudioProps> = ({
  images,
  setImages,
  alignments,
  setAlignments,
  framesPerImage,
  setFramesPerImage,
  transition,
  setTransition,
  targetSize,
  setTargetSize,
  background,
  setBackground,
}) => {
  const [activeAlignImage, setActiveAlignImage] = useState<string | null>(null);
  const [detectStatus, setDetectStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Auto-detect for newly added images.
  useEffect(() => {
    images.forEach((url) => {
      if (alignments[url] || detectStatus[url]) return;
      detectOne(url);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const loadAspect = (url: string): Promise<number> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(1);
      img.src = url;
    });

  const detectOne = async (url: string): Promise<boolean> => {
    setDetectStatus((s) => ({ ...s, [url]: 'loading' }));
    const aspect = await loadAspect(url);
    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.found) {
        setAlignments((prev) => {
          if (prev[url]) return prev;
          return { ...prev, [url]: { cx: 0.5, cy: 0.5, aspect } };
        });
        setDetectStatus((s) => ({ ...s, [url]: 'error' }));
        return false;
      }
      // API returns cx/cy directly (new format) or a box (old format).
      let cx: number;
      let cy: number;
      if (typeof data.cx === 'number' && typeof data.cy === 'number') {
        cx = Math.max(0, Math.min(1, data.cx));
        cy = Math.max(0, Math.min(1, data.cy));
      } else if (data.box) {
        const b = data.box as { x: number; y: number; w: number; h: number };
        cx = Math.max(0, Math.min(1, b.x + b.w / 2));
        cy = Math.max(0, Math.min(1, b.y + b.h / 2));
      } else {
        setAlignments((prev) => {
          if (prev[url]) return prev;
          return { ...prev, [url]: { cx: 0.5, cy: 0.5, aspect } };
        });
        setDetectStatus((s) => ({ ...s, [url]: 'error' }));
        return false;
      }
      setAlignments((prev) => ({ ...prev, [url]: { cx, cy, aspect } }));
      setDetectStatus((s) => ({ ...s, [url]: 'done' }));
      return true;
    } catch {
      setAlignments((prev) => {
        if (prev[url]) return prev;
        return { ...prev, [url]: { cx: 0.5, cy: 0.5, aspect } };
      });
      setDetectStatus((s) => ({ ...s, [url]: 'error' }));
      return false;
    }
  };

  const handleAutoDetectAll = async () => {
    if (isAutoDetecting || images.length === 0) return;
    setIsAutoDetecting(true);
    try {
      await Promise.all(images.map((url) => detectOne(url)));
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Click on the image to set the product center point.
  // Letterbox-aware: object-contain may leave margins, so map the click from the
  // element box onto the actual image content using its natural aspect ratio.
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!activeAlignImage) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;

    // Size of the rendered image content inside the element box (object-contain).
    const scale = Math.min(rect.width / natW, rect.height / natH);
    const contentW = natW * scale;
    const contentH = natH * scale;
    const offsetX = (rect.width - contentW) / 2;
    const offsetY = (rect.height - contentH) / 2;

    const px = e.clientX - rect.left - offsetX;
    const py = e.clientY - rect.top - offsetY;
    const cx = px / contentW;
    const cy = py / contentH;

    setAlignments((prev) => {
      const existing = prev[activeAlignImage];
      return {
        ...prev,
        [activeAlignImage]: {
          cx: Math.max(0, Math.min(1, cx)),
          cy: Math.max(0, Math.min(1, cy)),
          aspect: existing?.aspect ?? natW / natH,
        },
      };
    });
  };

  const activeAlignment = activeAlignImage ? alignments[activeAlignImage] : null;

  return (
    <div className="flex flex-1 h-full">
      {/* Preview / editor area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-900 overflow-hidden">
        {activeAlignImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="relative max-w-full max-h-[80%] flex items-center justify-center">
              <div
                className="relative cursor-crosshair max-w-full max-h-[70vh]"
                style={{ aspectRatio: String(activeAlignment?.aspect ?? 1) }}
              >
                <img
                  ref={imgRef}
                  src={activeAlignImage}
                  alt=""
                  className="w-full h-full object-contain block select-none"
                  draggable={false}
                  onClick={handleImageClick}
                />
                {/* Center point marker */}
                {activeAlignment && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${activeAlignment.cx * 100}%`,
                      top: `${activeAlignment.cy * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Crosshair lines */}
                    <div style={{ position: 'absolute', width: 28, height: 2, background: 'rgba(255,200,0,0.9)', top: -1, left: -14 }} />
                    <div style={{ position: 'absolute', width: 2, height: 28, background: 'rgba(255,200,0,0.9)', left: -1, top: -14 }} />
                    {/* Center dot */}
                    <div style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: '#FFC800', top: -4, left: -4 }} />
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-white/50">
              Click on the <span className="text-marshall-gold">product center</span> — that point will be locked to the canvas center in the animation
            </p>
            <button
              type="button"
              onClick={() => setActiveAlignImage(null)}
              className="px-4 py-2 bg-marshall-gold text-black font-semibold rounded hover:bg-marshall-gold/90 transition"
            >
              Done
            </button>
          </div>
        ) : images.length > 0 ? (
          <div
            className="w-full max-h-full relative flex items-center justify-center"
            style={{ aspectRatio: '1 / 1', maxWidth: '100%' }}
          >
            <Player
              component={StopMotion}
              durationInFrames={getStopMotionDuration(images.length, framesPerImage)}
              fps={STOP_MOTION_FPS}
              compositionWidth={900}
              compositionHeight={900}
              style={{ width: '100%', height: '100%' }}
              controls
              loop
              autoPlay
              inputProps={{
                images,
                alignments,
                framesPerImage,
                transition,
                targetSize,
                background,
                showCenter: true,
              }}
            />
          </div>
        ) : (
          <div className="text-center text-white/40">
            <p className="text-sm">Upload product photos to begin</p>
          </div>
        )}
      </div>

      {/* Control panel */}
      <div className="w-80 h-full bg-neutral-950 border-l border-white/10 overflow-y-auto">
        <div className="p-5 space-y-6">
          <section>
            <SectionTitle>Images</SectionTitle>
            <ImageUploader images={images} onChange={setImages} />
          </section>

          {images.length > 0 && (
            <section>
              <SectionTitle>Align product</SectionTitle>
              <button
                type="button"
                onClick={handleAutoDetectAll}
                disabled={isAutoDetecting}
                className="flex items-center justify-center gap-1.5 w-full mb-3 py-2 rounded bg-marshall-gold text-black text-xs font-semibold hover:bg-marshall-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isAutoDetecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isAutoDetecting ? 'Detecting…' : 'Auto-detect product'}
              </button>
              <div className="grid grid-cols-4 gap-2">
                {images.map((url) => {
                  const alignment = alignments[url];
                  const isActive = url === activeAlignImage;
                  const status = detectStatus[url];
                  // Center point mapped onto the letterboxed thumbnail
                  const r = alignment?.aspect ?? 1;
                  const fw = r >= 1 ? 1 : r;
                  const fh = r >= 1 ? 1 / r : 1;
                  const ox = (1 - fw) / 2;
                  const oy = (1 - fh) / 2;
                  const dotLeft = alignment ? (ox + (alignment.cx ?? 0.5) * fw) * 100 : 50;
                  const dotTop  = alignment ? (oy + (alignment.cy ?? 0.5) * fh) * 100 : 50;
                  return (
                    <div
                      key={url}
                      className={`relative aspect-square bg-white/5 rounded overflow-hidden cursor-pointer ${
                        isActive
                          ? 'ring-2 ring-marshall-gold'
                          : alignment
                          ? 'ring-1 ring-marshall-gold/60'
                          : ''
                      }`}
                      onClick={() => setActiveAlignImage(url)}
                    >
                      <img src={url} alt="" className="w-full h-full object-contain" />

                      {/* Center point dot on thumbnail */}
                      {alignment && status !== 'error' && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: `${dotLeft}%`,
                            top: `${dotTop}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#FFC800',
                            boxShadow: '0 0 0 2px rgba(0,0,0,0.6)',
                          }}
                        />
                      )}

                      {status === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                      {status === 'error' && (
                        <div className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5">
                          <AlertCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {status === 'done' && (
                        <div className="absolute top-0.5 right-0.5 bg-marshall-gold rounded-full p-0.5">
                          <Check className="w-2.5 h-2.5 text-black" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/40 mt-2">
                Auto-detect sets a center point on each photo. Click any photo to correct it manually.
              </p>
            </section>
          )}

          <section className="space-y-4">
            <SectionTitle>Animation</SectionTitle>
            <div className="flex gap-1">
              {(['cut', 'crossfade'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTransition(t)}
                  className={`flex-1 py-1.5 rounded text-xs ${
                    transition === t
                      ? 'bg-marshall-gold text-black font-semibold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {t === 'cut' ? 'Cut' : 'Crossfade'}
                </button>
              ))}
            </div>
            <SliderRow label="Frames per image" value={framesPerImage} min={2} max={50} onChange={setFramesPerImage} />
            <SliderRow label="Product size" value={targetSize} min={0.2} max={0.9} step={0.05} onChange={setTargetSize} />
          </section>

          <section>
            <SectionTitle>Background</SectionTitle>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                type="text"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
