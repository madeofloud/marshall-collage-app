'use client';

import React, { useRef, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { EyeOff, Eye, ImagePlus, X, RotateCcw } from 'lucide-react';
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
  selectedImageUrl?: string;
  onSelectImage?: (url: string) => void;
  hiddenImageUrls?: string[];
  onToggleHidden?: () => void;
  isPanelHidden?: boolean;
  backgroundImage?: string | null;
  setBackgroundImage?: (url: string | null) => void;
  basePanelOverride?: PanelOverride | null;
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
  defaultValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  defaultValue?: number;
}) => {
  const decimals = step < 1 ? 2 : 0;
  const [inputText, setInputText] = useState<string | null>(null);

  const commitInput = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
    setInputText(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs items-center">
        <span className="text-white/70">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            className="w-14 text-right bg-transparent text-white/50 tabular-nums focus:text-white focus:outline-none focus:bg-white/10 rounded px-1"
            value={inputText !== null ? inputText : value.toFixed(decimals)}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={(e) => { setInputText(value.toFixed(decimals)); e.target.select(); }}
            onBlur={(e) => commitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { commitInput((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
              if (e.key === 'Escape') { setInputText(null); (e.target as HTMLInputElement).blur(); }
            }}
          />
          {defaultValue !== undefined && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              title="Reset to 0"
              className="text-white/50 hover:text-marshall-gold transition"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
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
};

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
  selectedImageUrl,
  onSelectImage,
  hiddenImageUrls,
  onToggleHidden,
  isPanelHidden,
  backgroundImage,
  setBackgroundImage,
  basePanelOverride,
}) => {
  const exportDims = getFormatDimensions(format, sizeTier);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (data.url && setBackgroundImage) {
      setBackgroundImage(data.url);
    }
    // Reset input so re-selecting same file works
    e.target.value = '';
  };

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
          <ImageUploader
            images={images}
            onChange={setImages}
            selectedImageUrl={selectedImageUrl}
            onSelectImage={onSelectImage}
            hiddenImageUrls={hiddenImageUrls}
          />
        </section>

        {/* Background */}
        <section>
          <SectionTitle>Background</SectionTitle>
          <div className="mt-2 space-y-2">
            {/* Transparent background toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                  background === 'transparent' ? 'bg-marshall-gold' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 mt-[1px] ml-[1px] rounded-full bg-white shadow transition-transform ${
                    background === 'transparent' ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={background === 'transparent'}
                onChange={(e) => setBackground(e.target.checked ? 'transparent' : '#121212')}
              />
              <span className="text-xs text-white/70">Transparent bakgrund</span>
              {background === 'transparent' && (
                <span className="text-[10px] text-white/40 ml-auto">Kräver ProRes</span>
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
                  onClick={() => setBackgroundImage?.(null)}
                  className="absolute top-1 right-1 p-0.5 bg-black/70 rounded"
                  aria-label="Remove background image"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
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
            defaultValue={0}
          />
          <SliderRow
            label="Grain amount"
            value={grainAmount}
            min={0}
            max={3}
            step={0.05}
            onChange={setGrainAmount}
            defaultValue={0}
          />
        </section>

        {/* Selected panel */}
        {selectedPanelId && panelOverride && (
          <section className="space-y-4">
            <SectionTitle>Selected Panel</SectionTitle>
            {onToggleHidden && (
              <button
                type="button"
                onClick={onToggleHidden}
                className="flex items-center gap-1.5 w-full px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition"
                aria-label={isPanelHidden ? 'Show panel' : 'Hide panel'}
              >
                {isPanelHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {isPanelHidden ? 'Show object' : 'Hide object'}
              </button>
            )}
            <p className="text-[10px] text-white/40 italic">
              Drag to rotate · Space to move · Backspace to delete
            </p>
            <SliderRow
              label="X position"
              value={panelOverride.worldX}
              min={-200}
              max={200}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, worldX: v })}
              defaultValue={0}
            />
            <SliderRow
              label="Y position"
              value={panelOverride.worldY}
              min={-200}
              max={200}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, worldY: v })}
              defaultValue={0}
            />
            <SliderRow
              label="Z position"
              value={panelOverride.worldZ}
              min={-200}
              max={200}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, worldZ: v })}
              defaultValue={0}
            />
            <SliderRow
              label="Facing angle Y (°)"
              value={panelOverride.facingAngle}
              min={-360}
              max={360}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, facingAngle: v })}
              defaultValue={0}
            />
            <SliderRow
              label="Tilt X (°)"
              value={panelOverride.tiltX}
              min={-90}
              max={90}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, tiltX: v })}
              defaultValue={0}
            />
            <SliderRow
              label="Tilt Z (°)"
              value={panelOverride.tiltZ}
              min={-90}
              max={90}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, tiltZ: v })}
              defaultValue={0}
            />
            <SliderRow
              label="Width"
              value={panelOverride.width}
              min={50}
              max={600}
              onChange={(v) => onUpdatePanelOverride({ ...panelOverride, width: v })}
              defaultValue={basePanelOverride?.width ?? 200}
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
              {(['h264', 'prores'] as const).map((c) => {
                const disabledByTransparent = background === 'transparent' && c === 'h264';
                const active = codec === c || (background === 'transparent' && c === 'prores');
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCodec(c)}
                    disabled={disabledByTransparent}
                    className={`flex-1 py-1.5 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed ${
                      active
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
