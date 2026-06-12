'use client';

import React, { useEffect, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Player } from '@remotion/player';
import { ImageUploader } from './ImageUploader';
import { AlignmentBox } from './AlignmentBox';
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

  // Auto-detection state keyed by image URL: 'loading' | 'done' | 'error'
  const [detectStatus, setDetectStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // Auto-detect product for any newly-added image.
  useEffect(() => {
    images.forEach((url) => {
      if (alignments[url] || detectStatus[url]) return; // already done or running
      detectOne(url);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const activeAlignment = activeAlignImage ? alignments[activeAlignImage] : null;

  const handleBoxChange = (box: { x: number; y: number; w: number; h: number }) => {
    if (!activeAlignImage) return;
    setAlignments((prev) => {
      const existing = prev[activeAlignImage];
      if (!existing) return prev;
      return { ...prev, [activeAlignImage]: { ...existing, ...box } };
    });
  };

  // Load an image's natural aspect ratio (width / height).
  const loadAspect = (url: string): Promise<number> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(1);
      img.src = url;
    });

  // Ask the server (Claude Vision) for the product box, then store it.
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
      if (!res.ok || !data.found || !data.box) {
        // Fall back to centred default so the image renders
        setAlignments((prev) => {
          if (prev[url]) return prev;
          return { ...prev, [url]: { x: 0.25, y: 0.25, w: 0.5, h: 0.5, aspect } };
        });
        setDetectStatus((s) => ({ ...s, [url]: 'error' }));
        return false;
      }
      const { x, y, w, h } = data.box as { x: number; y: number; w: number; h: number };
      setAlignments((prev) => ({ ...prev, [url]: { x, y, w, h, aspect } }));
      setDetectStatus((s) => ({ ...s, [url]: 'done' }));
      return true;
    } catch {
      setAlignments((prev) => {
        if (prev[url]) return prev;
        return { ...prev, [url]: { x: 0.25, y: 0.25, w: 0.5, h: 0.5, aspect } };
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

  return (
    <div className="flex flex-1 h-full">
      {/* Preview area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-900 overflow-hidden">
        {activeAlignImage && activeAlignment ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="relative max-w-full max-h-[80%] flex items-center justify-center">
              <div className="relative inline-block">
                <img
                  src={activeAlignImage}
                  alt=""
                  className="max-w-full max-h-[70vh] object-contain block select-none"
                  draggable={false}
                />
                {/* Fixed crosshair at image center = canvas center */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div style={{ width: 32, height: 2, background: 'rgba(255,200,0,0.8)', position: 'absolute', top: -1, left: -16 }} />
                    <div style={{ width: 2, height: 32, background: 'rgba(255,200,0,0.8)', position: 'absolute', left: -1, top: -16 }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,200,0,0.9)', position: 'absolute', top: -3, left: -3 }} />
                  </div>
                </div>
                <AlignmentBox
                  value={{
                    x: activeAlignment.x,
                    y: activeAlignment.y,
                    w: activeAlignment.w,
                    h: activeAlignment.h,
                  }}
                  onChange={handleBoxChange}
                />
              </div>
            </div>
            <p className="text-xs text-white/40">
              Drag the box so its <span className="text-marshall-gold/70">center dot</span> aligns with the <span className="text-marshall-gold/70">crosshair</span> — that point lands at canvas center
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
          {/* Images */}
          <section>
            <SectionTitle>Images</SectionTitle>
            <ImageUploader images={images} onChange={setImages} />
          </section>

          {/* Align product */}
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

                      {/* Detected product box overlay — mapped onto the
                          object-contain (letterboxed) image inside the square cell */}
                      {alignment && status !== 'error' && (() => {
                        const r = alignment.aspect || 1;
                        // Fraction of the square cell the image occupies + its offset.
                        const fw = r >= 1 ? 1 : r;        // image width fraction
                        const fh = r >= 1 ? 1 / r : 1;    // image height fraction
                        const ox = (1 - fw) / 2;           // horizontal letterbox
                        const oy = (1 - fh) / 2;           // vertical letterbox
                        return (
                          <div
                            className="absolute border border-marshall-gold/80 pointer-events-none"
                            style={{
                              left: `${(ox + alignment.x * fw) * 100}%`,
                              top: `${(oy + alignment.y * fh) * 100}%`,
                              width: `${alignment.w * fw * 100}%`,
                              height: `${alignment.h * fh * 100}%`,
                            }}
                          />
                        );
                      })()}

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
                Auto-detect finds the product in every photo. Click a photo to
                fine-tune the box manually.
              </p>
            </section>
          )}

          {/* Animation */}
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
            <SliderRow
              label="Frames per image"
              value={framesPerImage}
              min={2}
              max={50}
              onChange={setFramesPerImage}
            />
            <SliderRow
              label="Product size"
              value={targetSize}
              min={0.2}
              max={0.9}
              step={0.05}
              onChange={setTargetSize}
            />
          </section>

          {/* Background */}
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
