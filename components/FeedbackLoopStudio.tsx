'use client';

import React, { useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Player, type PlayerRef } from '@remotion/player';
import { FeedbackLoop, FEEDBACK_FPS, defaultFeedbackProps } from '@/remotion/src/FeedbackLoop';
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

export type FeedbackLoopStudioProps = {
  layers: number;
  setLayers: React.Dispatch<React.SetStateAction<number>>;
  zoomFactor: number;
  setZoomFactor: React.Dispatch<React.SetStateAction<number>>;
  rotationPerLayer: number;
  setRotationPerLayer: React.Dispatch<React.SetStateAction<number>>;
  rotationSpeed: number;
  setRotationSpeed: React.Dispatch<React.SetStateAction<number>>;
  hueShift: number;
  setHueShift: React.Dispatch<React.SetStateAction<number>>;
  glowIntensity: number;
  setGlowIntensity: React.Dispatch<React.SetStateAction<number>>;
  baseColor: string;
  setBaseColor: React.Dispatch<React.SetStateAction<string>>;
  glowColor: string;
  setGlowColor: React.Dispatch<React.SetStateAction<string>>;
  baseImage: string | null;
  setBaseImage: React.Dispatch<React.SetStateAction<string | null>>;
  durationSeconds: number;
  setDurationSeconds: React.Dispatch<React.SetStateAction<number>>;
  format: AspectFormat;
  setFormat: React.Dispatch<React.SetStateAction<AspectFormat>>;
  sizeTier: SizeTier;
  setSizeTier: React.Dispatch<React.SetStateAction<SizeTier>>;
  codec: 'h264' | 'prores';
  setCodec: React.Dispatch<React.SetStateAction<'h264' | 'prores'>>;
  onExport: () => void;
  isExporting: boolean;
  exportProgress?: number;
  exportDownloadUrl?: string | null;
  onClearDownload?: () => void;
};

export const FeedbackLoopStudio: React.FC<FeedbackLoopStudioProps> = ({
  layers, setLayers,
  zoomFactor, setZoomFactor,
  rotationPerLayer, setRotationPerLayer,
  rotationSpeed, setRotationSpeed,
  hueShift, setHueShift,
  glowIntensity, setGlowIntensity,
  baseColor, setBaseColor,
  glowColor, setGlowColor,
  baseImage, setBaseImage,
  durationSeconds, setDurationSeconds,
  format, setFormat,
  sizeTier, setSizeTier,
  codec, setCodec,
  onExport,
  isExporting,
  exportProgress,
  exportDownloadUrl,
  onClearDownload,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const { width: compWidth, height: compHeight } = getFormatDimensions(format, sizeTier);
  const durationInFrames = Math.max(1, Math.round(durationSeconds * FEEDBACK_FPS));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBaseImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const inputProps = {
    layers, zoomFactor, rotationPerLayer, rotationSpeed, hueShift,
    glowIntensity, baseColor, glowColor, baseImage, durationSeconds,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview */}
      <div className="flex-1 flex items-center justify-center bg-neutral-950 overflow-hidden min-h-0">
        <div
          className="relative"
          style={{
            aspectRatio: `${compWidth} / ${compHeight}`,
            maxWidth: '100%',
            maxHeight: '100%',
            width: compWidth > compHeight ? '100%' : 'auto',
            height: compWidth <= compHeight ? '100%' : 'auto',
          }}
        >
          <Player
            ref={playerRef}
            component={FeedbackLoop}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            fps={FEEDBACK_FPS}
            compositionWidth={compWidth}
            compositionHeight={compHeight}
            style={{ width: '100%', height: '100%' }}
            autoPlay
            loop
          />
        </div>
      </div>

      {/* Controls */}
      <div className="h-[340px] overflow-y-auto border-t border-white/10 bg-neutral-900 flex">
        {/* Left column: tunnel parameters */}
        <div className="flex-1 p-4 space-y-4 border-r border-white/10 min-w-0">
          <SectionTitle>Tunnel</SectionTitle>
          <SliderRow label="Layers" value={layers} min={3} max={20} onChange={setLayers} />
          <SliderRow label="Zoom per layer" value={zoomFactor} min={0.65} max={0.99} step={0.01} onChange={setZoomFactor} />
          <SliderRow label="Rotation per layer (°)" value={rotationPerLayer} min={0} max={20} step={0.5} onChange={setRotationPerLayer} />
          <SliderRow label="Spin speed (°/s)" value={rotationSpeed} min={0} max={120} step={1} onChange={setRotationSpeed} />

          <SectionTitle>Color</SectionTitle>
          <SliderRow label="Hue shift per layer (°)" value={hueShift} min={0} max={60} step={1} onChange={setHueShift} />
          <SliderRow label="Glow intensity" value={glowIntensity} min={0} max={1} step={0.01} onChange={setGlowIntensity} />

          <div className="flex gap-3">
            <div className="space-y-1 flex-1">
              <span className="text-xs text-white/70">Base color</span>
              <input
                type="color"
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-xs text-white/70">Glow color</span>
              <input
                type="color"
                value={glowColor}
                onChange={(e) => setGlowColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Right column: image, duration, export */}
        <div className="w-52 flex-shrink-0 p-4 space-y-4">
          <SectionTitle>Base image</SectionTitle>
          {baseImage ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={baseImage} alt="" className="w-full h-20 object-cover rounded" />
              <button
                type="button"
                onClick={() => setBaseImage(null)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-white/20 rounded cursor-pointer hover:border-white/40 transition text-white/30 hover:text-white/60 text-xs gap-1">
              <span className="text-lg">+</span>
              Upload image
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}

          <SectionTitle>Duration</SectionTitle>
          <SliderRow label="Seconds" value={durationSeconds} min={2} max={30} step={1} onChange={setDurationSeconds} />

          <SectionTitle>Format</SectionTitle>
          <div className="grid grid-cols-3 gap-1">
            {ALL_FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`text-[10px] py-1 rounded ${format === f ? 'bg-marshall-gold text-black font-semibold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>

          <SectionTitle>Quality</SectionTitle>
          <div className="grid grid-cols-3 gap-1">
            {ALL_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSizeTier(s)}
                className={`text-[10px] py-1 rounded capitalize ${sizeTier === s ? 'bg-marshall-gold text-black font-semibold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                {SIZE_LABELS[s]}
              </button>
            ))}
          </div>

          <SectionTitle>Codec</SectionTitle>
          <div className="grid grid-cols-2 gap-1">
            {(['h264', 'prores'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCodec(c)}
                className={`text-[10px] py-1 rounded uppercase ${codec === c ? 'bg-marshall-gold text-black font-semibold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                {c === 'h264' ? 'H264' : 'ProRes'}
              </button>
            ))}
          </div>

          <SectionTitle>Export</SectionTitle>
          {exportDownloadUrl ? (
            <a
              href={exportDownloadUrl}
              download
              onClick={onClearDownload}
              className="block w-full py-2 bg-marshall-gold text-black font-semibold text-xs rounded text-center hover:brightness-110 transition"
            >
              Download Video
            </a>
          ) : isExporting && exportProgress !== undefined ? (
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
              disabled={isExporting}
              className="w-full py-2 bg-white/10 text-white text-xs font-semibold rounded hover:bg-white/15 disabled:opacity-30 transition"
            >
              Export Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
