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
  label, value, min, max, step = 1, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-white/70">{label}</span>
      <span className="text-white/50 tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
    <Slider.Root
      className="relative flex items-center select-none touch-none w-full h-5"
      value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step}
    >
      <Slider.Track className="bg-white/10 relative grow rounded-full h-1">
        <Slider.Range className="absolute bg-marshall-gold rounded-full h-full" />
      </Slider.Track>
      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-marshall-gold transition" />
    </Slider.Root>
  </div>
);

export type FeedbackLoopStudioProps = {
  layers: number; setLayers: React.Dispatch<React.SetStateAction<number>>;
  zoomFactor: number; setZoomFactor: React.Dispatch<React.SetStateAction<number>>;
  rotationPerLayer: number; setRotationPerLayer: React.Dispatch<React.SetStateAction<number>>;
  rotationSpeed: number; setRotationSpeed: React.Dispatch<React.SetStateAction<number>>;
  driftX: number; setDriftX: React.Dispatch<React.SetStateAction<number>>;
  driftY: number; setDriftY: React.Dispatch<React.SetStateAction<number>>;
  glowIntensity: number; setGlowIntensity: React.Dispatch<React.SetStateAction<number>>;
  glowColor: string; setGlowColor: React.Dispatch<React.SetStateAction<string>>;
  baseImage: string | null; setBaseImage: React.Dispatch<React.SetStateAction<string | null>>;
  durationSeconds: number; setDurationSeconds: React.Dispatch<React.SetStateAction<number>>;
  format: AspectFormat; setFormat: React.Dispatch<React.SetStateAction<AspectFormat>>;
  sizeTier: SizeTier; setSizeTier: React.Dispatch<React.SetStateAction<SizeTier>>;
  codec: 'h264' | 'prores'; setCodec: React.Dispatch<React.SetStateAction<'h264' | 'prores'>>;
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
  driftX, setDriftX,
  driftY, setDriftY,
  glowIntensity, setGlowIntensity,
  glowColor, setGlowColor,
  baseImage, setBaseImage,
  durationSeconds, setDurationSeconds,
  format, setFormat,
  sizeTier, setSizeTier,
  codec, setCodec,
  onExport, isExporting, exportProgress, exportDownloadUrl, onClearDownload,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const { width: compWidth, height: compHeight } = getFormatDimensions(format, sizeTier);
  const durationInFrames = Math.max(1, Math.round(durationSeconds * FEEDBACK_FPS));

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBaseImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const inputProps = {
    layers, zoomFactor, rotationPerLayer, rotationSpeed,
    driftX, driftY, glowIntensity, glowColor, baseImage, durationSeconds,
  };

  return (
    <>
      {/* Canvas */}
      <div
        className="flex-1 flex items-center justify-center bg-neutral-950 overflow-hidden min-w-0"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div style={{
          aspectRatio: `${compWidth} / ${compHeight}`,
          maxWidth: '100%', maxHeight: '100%',
          width: compWidth > compHeight ? '100%' : 'auto',
          height: compWidth <= compHeight ? '100%' : 'auto',
        }}>
          <Player
            ref={playerRef}
            component={FeedbackLoop}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            fps={FEEDBACK_FPS}
            compositionWidth={compWidth}
            compositionHeight={compHeight}
            style={{ width: '100%', height: '100%' }}
            autoPlay loop
          />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-80 h-full bg-neutral-950 border-l border-white/10 overflow-y-auto flex-shrink-0">
        <div className="p-5 space-y-6">

          {/* Base image */}
          <div>
            <SectionTitle>Base image</SectionTitle>
            {baseImage ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={baseImage} alt="" className="w-full h-24 object-cover rounded" />
                <button type="button" onClick={() => setBaseImage(null)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition">
                  ✕
                </button>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-white/20 rounded cursor-pointer hover:border-white/40 transition text-white/30 hover:text-white/60 text-xs gap-1"
                onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => e.preventDefault()}
              >
                <span className="text-2xl">+</span>
                Drop or click to upload
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; }} className="hidden" />
              </label>
            )}
          </div>

          {/* Feedback */}
          <div className="space-y-4">
            <SectionTitle>Feedback</SectionTitle>
            <SliderRow label="Layers" value={layers} min={3} max={20} onChange={setLayers} />
            <SliderRow label="Zoom per layer" value={zoomFactor} min={0.65} max={0.99} step={0.01} onChange={setZoomFactor} />
            <SliderRow label="Drift X" value={driftX} min={-50} max={50} step={1} onChange={setDriftX} />
            <SliderRow label="Drift Y" value={driftY} min={-50} max={50} step={1} onChange={setDriftY} />
          </div>

          {/* Motion */}
          <div className="space-y-4">
            <SectionTitle>Motion</SectionTitle>
            <SliderRow label="Spin speed (°/s)" value={rotationSpeed} min={0} max={60} step={1} onChange={setRotationSpeed} />
            <SliderRow label="Rotation per layer (°)" value={rotationPerLayer} min={0} max={15} step={0.5} onChange={setRotationPerLayer} />
          </div>

          {/* Color */}
          <div className="space-y-4">
            <SectionTitle>Color</SectionTitle>
            <SliderRow label="Glow intensity" value={glowIntensity} min={0} max={1} step={0.01} onChange={setGlowIntensity} />
            <div className="space-y-1">
              <span className="text-xs text-white/70">Glow color</span>
              <input type="color" value={glowColor} onChange={(e) => setGlowColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-4">
            <SectionTitle>Duration</SectionTitle>
            <SliderRow label="Seconds" value={durationSeconds} min={2} max={30} step={1} onChange={setDurationSeconds} />
          </div>

          {/* Format */}
          <div>
            <SectionTitle>Format</SectionTitle>
            <div className="grid grid-cols-5 gap-1">
              {ALL_FORMATS.map((f) => (
                <button key={f} type="button" onClick={() => setFormat(f)}
                  className={`py-2 rounded text-xs font-medium transition ${format === f ? 'bg-marshall-gold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Export */}
          <div>
            <SectionTitle>Export</SectionTitle>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {ALL_SIZES.map((s) => (
                <button key={s} type="button" onClick={() => setSizeTier(s)}
                  className={`py-1.5 rounded text-xs font-medium capitalize transition ${sizeTier === s ? 'bg-marshall-gold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                  {SIZE_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 mb-4">
              {(['h264', 'prores'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCodec(c)}
                  className={`py-1.5 rounded text-xs font-medium uppercase transition ${codec === c ? 'bg-marshall-gold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                  {c === 'h264' ? 'H264' : 'ProRes'}
                </button>
              ))}
            </div>
            {exportDownloadUrl ? (
              <a href={exportDownloadUrl} download onClick={onClearDownload}
                className="block w-full py-2.5 bg-marshall-gold text-black font-semibold text-sm rounded text-center hover:brightness-110 transition">
                Download Video
              </a>
            ) : isExporting && exportProgress !== undefined ? (
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-marshall-gold transition-all duration-500" style={{ width: `${Math.round(exportProgress * 100)}%` }} />
                </div>
                <p className="text-center text-xs text-white/50">Rendering… {Math.round(exportProgress * 100)}%</p>
              </div>
            ) : (
              <button type="button" onClick={onExport} disabled={isExporting}
                className="w-full py-2.5 bg-white/10 text-white text-sm font-semibold rounded hover:bg-white/15 disabled:opacity-30 transition">
                Export Video
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
};
