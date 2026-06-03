'use client';

import React from 'react';
import * as Slider from '@radix-ui/react-slider';
import { ImageUploader } from './ImageUploader';
import {
  type PanelOverride,
  type AspectFormat,
  type SizeTier,
  ALL_FORMATS,
  ALL_SIZES,
  FORMAT_LABELS,
  SIZE_LABELS,
  getFormatDimensions,
} from '@/remotion/src/types';

type Props = {
  images: string[];
  setImages: (urls: string[]) => void;
  background: string;
  setBackground: (c: string) => void;
  rotationSpeed: number;
  setRotationSpeed: (n: number) => void;
  grainAmount: number;
  setGrainAmount: (n: number) => void;
  selectedPanelId: string | null;
  panelOverride: PanelOverride | null;
  onUpdatePanelOverride: (override: PanelOverride) => void;
  format: AspectFormat;
  setFormat: (f: AspectFormat) => void;
  sizeTier: SizeTier;
  setSizeTier: (s: SizeTier) => void;
  codec: 'h264' | 'prores';
  setCodec: (c: 'h264' | 'prores') => void;
  onExport: () => void;
  isExporting: boolean;
};

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

export const ControlPanel: React.FC<Props> = ({
  images,
  setImages,
  background,
  setBackground,
  rotationSpeed,
  setRotationSpeed,
  grainAmount,
  setGrainAmount,
  selectedPanelId,
  panelOverride,
  onUpdatePanelOverride,
  format,
  setFormat,
  sizeTier,
  setSizeTier,
  codec,
  setCodec,
  onExport,
  isExporting,
}) => {
  const exportDims = getFormatDimensions(format, sizeTier);

  return (
    <div className="w-80 h-full bg-neutral-950 border-l border-white/10 overflow-y-auto">
      <div className="p-5 space-y-6">
        {/* Format */}
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

        {/* Images */}
        <section>
          <SectionTitle>Images</SectionTitle>
          <ImageUploader images={images} onChange={setImages} />
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

        {/* Animation */}
        <section className="space-y-4">
          <SectionTitle>Animation</SectionTitle>
          <SliderRow
            label="Rotation speed (°/s)"
            value={rotationSpeed}
            min={-360}
            max={360}
            step={5}
            onChange={setRotationSpeed}
          />
          <SliderRow
            label="Grain amount"
            value={grainAmount}
            min={0}
            max={3}
            step={0.05}
            onChange={setGrainAmount}
          />
        </section>

        {/* Selected panel */}
        {selectedPanelId && panelOverride && (
          <section className="space-y-4">
            <SectionTitle>Selected Panel</SectionTitle>
            <p className="text-[10px] text-white/40 -mt-2 italic">
              Drag to rotate · Space to move · Backspace to delete
            </p>
            <SliderRow
              label="X position"
              value={panelOverride.worldX}
              min={-200}
              max={200}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, worldX: v })}
            />
            <SliderRow
              label="Y position"
              value={panelOverride.worldY}
              min={-200}
              max={200}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, worldY: v })}
            />
            <SliderRow
              label="Z position"
              value={panelOverride.worldZ}
              min={-200}
              max={200}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, worldZ: v })}
            />
            <SliderRow
              label="Facing angle Y (°)"
              value={panelOverride.facingAngle}
              min={-360}
              max={360}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, facingAngle: v })}
            />
            <SliderRow
              label="Tilt X (°)"
              value={panelOverride.tiltX}
              min={-90}
              max={90}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, tiltX: v })}
            />
            <SliderRow
              label="Tilt Z (°)"
              value={panelOverride.tiltZ}
              min={-90}
              max={90}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, tiltZ: v })}
            />
            <SliderRow
              label="Width"
              value={panelOverride.width}
              min={50}
              max={300}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, width: v })}
            />
          </section>
        )}

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
              {exportDims.width} × {exportDims.height}
            </div>
            <div className="flex gap-1">
              {(['h264', 'prores'] as const).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCodec(c)}
                  className={`flex-1 py-1.5 rounded text-xs ${
                    codec === c
                      ? 'bg-marshall-gold text-black font-semibold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting || images.length === 0}
            className="w-full py-2.5 bg-marshall-gold text-black font-semibold rounded hover:bg-marshall-gold/90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {isExporting ? 'Rendering...' : 'Export Video'}
          </button>
        </section>
      </div>
    </div>
  );
};
