'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Check, Sparkles, Loader2, AlertCircle, ImagePlus, X, Eye, EyeOff } from 'lucide-react';
import { Player, type PlayerRef } from '@remotion/player';
import { ImageUploader } from './ImageUploader';
import { StopMotion } from '@/remotion/src/StopMotion';
import {
  type Alignment,
  STOP_MOTION_FPS,
  getStopMotionDuration,
} from '@/remotion/src/stopMotionTypes';
import {
  type AspectFormat,
  type SizeTier,
  ALL_FORMATS,
  ALL_SIZES,
  FORMAT_LABELS,
  SIZE_LABELS,
  getFormatDimensions,
} from '@/remotion/src/types';

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
  backgroundImage: string | null;
  setBackgroundImage: React.Dispatch<React.SetStateAction<string | null>>;
  format: AspectFormat;
  setFormat: React.Dispatch<React.SetStateAction<AspectFormat>>;
  hiddenImages: string[];
  setHiddenImages: React.Dispatch<React.SetStateAction<string[]>>;
  sizeTier: SizeTier;
  setSizeTier: React.Dispatch<React.SetStateAction<SizeTier>>;
  codec: 'h264' | 'prores';
  setCodec: React.Dispatch<React.SetStateAction<'h264' | 'prores'>>;
  onExport: () => void;
  isExporting: boolean;
  exportProgress?: number;
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
  backgroundImage,
  setBackgroundImage,
  format,
  setFormat,
  hiddenImages,
  setHiddenImages,
  sizeTier,
  setSizeTier,
  codec,
  setCodec,
  onExport,
  isExporting,
  exportProgress,
}) => {
  const [activeAlignImage, setActiveAlignImage] = useState<string | null>(null);
  const [detectStatus, setDetectStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [showCenter, setShowCenter] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  // Images shown in the animation (hidden ones are excluded).
  const visibleImages = images.filter((url) => !hiddenImages.includes(url));
  const previewDims = getFormatDimensions(format, 'medium');

  const toggleHidden = (url: string) => {
    setHiddenImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (data.url) setBackgroundImage(data.url);
    e.target.value = '';
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeAlignImage) return; // don't intercept while editing alignment
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        playerRef.current?.toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeAlignImage]);

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
      let cx: number;
      let cy: number;
      if (typeof data.cx === 'number' && typeof data.cy === 'number') {
        cx = Math.max(0, Math.min(1, data.cx));
        cy = Math.max(0, Math.min(1, data.cy));
      } else {
        setAlignments((prev) => {
          if (prev[url]) return prev;
          return { ...prev, [url]: { cx: 0.5, cy: 0.5, aspect } };
        });
        setDetectStatus((s) => ({ ...s, [url]: 'error' }));
        return false;
      }
      const angle = typeof data.angle === 'number' ? data.angle : undefined;
      const logoWidth = typeof data.logoWidth === 'number' ? data.logoWidth : undefined;
      setAlignments((prev) => ({ ...prev, [url]: { cx, cy, aspect, angle, logoWidth } }));
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
          ...existing,
          cx: Math.max(0, Math.min(1, cx)),
          cy: Math.max(0, Math.min(1, cy)),
          aspect: existing?.aspect ?? natW / natH,
        },
      };
    });
  };

  // Patch one field of the active alignment (manual fine-tuning).
  const patchActiveAlignment = (patch: Partial<Alignment>) => {
    if (!activeAlignImage) return;
    setAlignments((prev) => {
      const existing = prev[activeAlignImage];
      if (!existing) return prev;
      return { ...prev, [activeAlignImage]: { ...existing, ...patch } };
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
                {/* Logo-width guide bar — shows the detected angle + width laid
                    over the actual logo. Drag the fine-tune sliders until the
                    bar covers the "Marshall" script exactly. */}
                {activeAlignment && activeAlignment.logoWidth != null && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${activeAlignment.cx * 100}%`,
                      top: `${activeAlignment.cy * 100}%`,
                      width: `${activeAlignment.logoWidth * 100}%`,
                      height: 0,
                      transform: `translate(-50%, -50%) rotate(${activeAlignment.angle ?? 0}deg)`,
                      transformOrigin: 'center',
                    }}
                  >
                    {/* width line */}
                    <div style={{ position: 'absolute', left: 0, right: 0, top: -1, height: 2, background: 'rgba(0,200,255,0.85)' }} />
                    {/* end ticks */}
                    <div style={{ position: 'absolute', left: 0, top: -7, width: 2, height: 14, background: 'rgba(0,200,255,0.85)' }} />
                    <div style={{ position: 'absolute', right: 0, top: -7, width: 2, height: 14, background: 'rgba(0,200,255,0.85)' }} />
                  </div>
                )}
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
            <p className="text-xs text-white/50 text-center max-w-md">
              Klicka på loggans mitt för att sätta <span className="text-marshall-gold">centerpunkt</span>.
              Justera <span style={{ color: 'rgb(0,200,255)' }}>vinkel &amp; bredd</span> så det blå fältet
              täcker &quot;Marshall&quot;-texten exakt.
            </p>
            {activeAlignment && (
              <div className="w-full max-w-md space-y-3 bg-white/5 rounded-lg p-3">
                <SliderRow
                  label="Vinkel (°)"
                  value={activeAlignment.angle ?? 0}
                  min={-30}
                  max={30}
                  step={0.5}
                  onChange={(v) => patchActiveAlignment({ angle: v })}
                />
                <SliderRow
                  label="Loggbredd (% av bild)"
                  value={(activeAlignment.logoWidth ?? 0.15) * 100}
                  min={2}
                  max={60}
                  step={0.5}
                  onChange={(v) => patchActiveAlignment({ logoWidth: v / 100 })}
                />
                <div className="text-[10px] tabular-nums text-center text-white/40">
                  cx {activeAlignment.cx.toFixed(3)} · cy {activeAlignment.cy.toFixed(3)}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveAlignImage(null)}
              className="px-4 py-2 bg-marshall-gold text-black font-semibold rounded hover:bg-marshall-gold/90 transition"
            >
              Done
            </button>
          </div>
        ) : visibleImages.length > 0 ? (
          <div
            className="max-w-full max-h-full relative flex items-center justify-center"
            style={{
              aspectRatio: `${previewDims.width} / ${previewDims.height}`,
              height: '100%',
              ...(background === 'transparent' ? {
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#fff',
              } : {}),
            }}
          >
            <Player
              ref={playerRef}
              component={StopMotion}
              durationInFrames={getStopMotionDuration(visibleImages.length, framesPerImage)}
              fps={STOP_MOTION_FPS}
              compositionWidth={previewDims.width}
              compositionHeight={previewDims.height}
              style={{ width: '100%', height: '100%' }}
              controls
              loop
              autoPlay
              inputProps={{
                images: visibleImages,
                alignments,
                framesPerImage,
                transition,
                targetSize,
                background,
                backgroundImage: backgroundImage ?? undefined,
                showCenter,
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
            <SectionTitle>Format</SectionTitle>
            <div className="grid grid-cols-5 gap-1">
              {ALL_FORMATS.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2 rounded text-xs font-medium transition ${
                    format === f
                      ? 'bg-marshall-gold text-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Images</SectionTitle>
            <ImageUploader images={images} onChange={setImages} hiddenImageUrls={hiddenImages} />
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
              <div className="space-y-1">
                {images.map((url) => {
                  const alignment = alignments[url];
                  const isActive = url === activeAlignImage;
                  const status = detectStatus[url];
                  const r = alignment?.aspect ?? 1;
                  const fw = r >= 1 ? 1 : r;
                  const fh = r >= 1 ? 1 / r : 1;
                  const ox = (1 - fw) / 2;
                  const oy = (1 - fh) / 2;
                  const dotLeft = alignment ? (ox + (alignment.cx ?? 0.5) * fw) * 100 : 50;
                  const dotTop  = alignment ? (oy + (alignment.cy ?? 0.5) * fh) * 100 : 50;
                  const isHidden = hiddenImages.includes(url);
                  return (
                    <div key={url} className="flex items-center gap-2">
                      {/* Thumbnail */}
                      <div
                        className={`relative flex-shrink-0 w-12 h-12 bg-white/5 rounded overflow-hidden cursor-pointer ${
                          isActive ? 'ring-2 ring-marshall-gold' : alignment ? 'ring-1 ring-marshall-gold/40' : ''
                        }`}
                        onClick={() => setActiveAlignImage(url)}
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-contain"
                          style={{ opacity: isHidden ? 0.3 : 1 }}
                        />
                        {alignment && status !== 'error' && !isHidden && (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: `${dotLeft}%`,
                              top: `${dotTop}%`,
                              transform: 'translate(-50%, -50%)',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#FFC800',
                              boxShadow: '0 0 0 1.5px rgba(0,0,0,0.7)',
                            }}
                          />
                        )}
                        {status === 'loading' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Debug info + controls */}
                      <div className="flex-1 min-w-0">
                        {alignment ? (
                          <div className="text-[10px] tabular-nums leading-tight space-y-0.5">
                            <div className="text-white/60">
                              cx <span className="text-white/90">{alignment.cx.toFixed(3)}</span>
                              {' '}cy <span className="text-white/90">{alignment.cy.toFixed(3)}</span>
                            </div>
                            <div className="text-white/40">
                              {alignment.angle != null
                                ? <>angle <span className="text-white/70">{alignment.angle.toFixed(1)}°</span> </>
                                : <span className="text-red-400/70">no angle </span>}
                              {alignment.logoWidth != null
                                ? <>lw <span className="text-white/70">{(alignment.logoWidth * 100).toFixed(1)}%</span></>
                                : <span className="text-red-400/70">no lw</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/30">Not detected</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          title="Re-detect logo"
                          onClick={() => detectOne(url)}
                          disabled={status === 'loading'}
                          className="p-1 rounded bg-white/5 hover:bg-marshall-gold/20 text-white/50 hover:text-marshall-gold disabled:opacity-30 transition"
                        >
                          {status === 'loading' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : status === 'done' ? (
                            <Check className="w-3 h-3 text-marshall-gold" />
                          ) : status === 'error' ? (
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          title={isHidden ? 'Show' : 'Hide'}
                          onClick={() => toggleHidden(url)}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition"
                        >
                          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/30 mt-2">
                Klicka ✦ på en bild för att köra om detektionen. Klicka på thumbnails för att justera manuellt.
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
            <SliderRow label="Logo size (% av canvas)" value={targetSize} min={0.05} max={0.4} step={0.01} onChange={setTargetSize} />
            <p className="text-[10px] text-white/40 -mt-1">
              Loggan normaliseras till denna bredd på alla bilder.
            </p>
            <button
              type="button"
              onClick={() => setShowCenter((v) => !v)}
              className="flex items-center gap-1.5 w-full px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition"
            >
              {showCenter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showCenter ? 'Göm guidekryss' : 'Visa guidekryss'}
            </button>
          </section>

          <section>
            <SectionTitle>Background</SectionTitle>
            {/* Transparent toggle */}
            <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
              <div
                className={`w-8 h-4 rounded-full transition-colors ${
                  background === 'transparent' ? 'bg-marshall-gold' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 mt-0.25 rounded-full bg-white shadow transition-transform ${
                    background === 'transparent' ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={background === 'transparent'}
                onChange={(e) => {
                  if (e.target.checked) setBackground('transparent');
                  else setBackground('#121212');
                }}
              />
              <span className="text-xs text-white/70">Transparent bakgrund</span>
              {background === 'transparent' && (
                <span className="text-[10px] text-white/40 ml-auto">Kräver ProRes vid export</span>
              )}
            </label>
            {background !== 'transparent' && (
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
            )}
            <div className="mt-2 space-y-2">
              <input
                ref={bgImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={handleBgImageUpload}
              />
              <button
                type="button"
                onClick={() => bgImageInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload background image
              </button>
              {backgroundImage && (
                <div className="relative w-full h-16 rounded overflow-hidden bg-white/5">
                  <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBackgroundImage(null)}
                    className="absolute top-1 right-1 p-0.5 bg-black/70 rounded"
                    aria-label="Remove background image"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Export */}
          <section className="space-y-3 pt-4 border-t border-white/10">
            <SectionTitle>Export</SectionTitle>
            <div className="space-y-2">
              <div className="flex gap-1">
                {ALL_SIZES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSizeTier(s)}
                    className={`flex-1 py-1.5 rounded text-xs ${
                      sizeTier === s
                        ? 'bg-marshall-gold text-black font-semibold'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {SIZE_LABELS[s]}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-white/40 text-center tabular-nums">
                {getFormatDimensions(format, sizeTier).width} × {getFormatDimensions(format, sizeTier).height}
              </div>
              <div className="flex gap-1">
                {(['h264', 'prores'] as const).map((c) => {
                  const isForced = background === 'transparent' && c === 'prores';
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCodec(c)}
                      disabled={background === 'transparent' && c === 'h264'}
                      className={`flex-1 py-1.5 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed ${
                        codec === c || isForced
                          ? 'bg-marshall-gold text-black font-semibold'
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {c.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            {isExporting && exportProgress !== undefined ? (
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-marshall-gold transition-all duration-500"
                    style={{ width: `${Math.round(exportProgress * 100)}%` }}
                  />
                </div>
                <p className="text-center text-xs text-white/50">
                  Rendering… {Math.round(exportProgress * 100)}%
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onExport}
                disabled={isExporting || visibleImages.length === 0}
                className="w-full py-2.5 bg-marshall-gold text-black font-semibold rounded hover:bg-marshall-gold/90 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {isExporting ? 'Rendering…' : 'Export Video'}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
