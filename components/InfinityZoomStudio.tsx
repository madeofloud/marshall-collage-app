'use client';

import React, { useRef, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Player, type PlayerRef } from '@remotion/player';
import { InfinityZoom, INFINITY_ZOOM_FPS, defaultInfinityZoomProps, type InfinityZoomItem } from '@/remotion/src/InfinityZoom';
import {
  type AspectFormat, type SizeTier,
  ALL_FORMATS, ALL_SIZES, FORMAT_LABELS, SIZE_LABELS, getFormatDimensions,
} from '@/remotion/src/types';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">{children}</h3>
);

const SliderRow = ({
  label, value, min, max, step = 1, onChange,
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-white/70">{label}</span>
      <span className="text-white/50 tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
    <Slider.Root className="relative flex items-center select-none touch-none w-full h-5"
      value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step}>
      <Slider.Track className="bg-white/10 relative grow rounded-full h-1">
        <Slider.Range className="absolute bg-marshall-gold rounded-full h-full" />
      </Slider.Track>
      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-marshall-gold transition" />
    </Slider.Root>
  </div>
);

export type InfinityZoomStudioProps = {
  items: InfinityZoomItem[]; setItems: React.Dispatch<React.SetStateAction<InfinityZoomItem[]>>;
  zoomFactor: number; setZoomFactor: React.Dispatch<React.SetStateAction<number>>;
  secondsPerImage: number; setSecondsPerImage: React.Dispatch<React.SetStateAction<number>>;
  easingType: 'inout' | 'in' | 'out'; setEasingType: React.Dispatch<React.SetStateAction<'inout' | 'in' | 'out'>>;
  backgroundColor: string; setBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
  format: AspectFormat; setFormat: React.Dispatch<React.SetStateAction<AspectFormat>>;
  sizeTier: SizeTier; setSizeTier: React.Dispatch<React.SetStateAction<SizeTier>>;
  codec: 'h264' | 'prores'; setCodec: React.Dispatch<React.SetStateAction<'h264' | 'prores'>>;
  onExport: () => void;
  isExporting: boolean;
  exportProgress?: number;
  exportDownloadUrl?: string | null;
  onClearDownload?: () => void;
};

export const InfinityZoomStudio: React.FC<InfinityZoomStudioProps> = ({
  items, setItems,
  zoomFactor, setZoomFactor,
  secondsPerImage, setSecondsPerImage,
  easingType, setEasingType,
  backgroundColor, setBackgroundColor,
  format, setFormat, sizeTier, setSizeTier, codec, setCodec,
  onExport, isExporting, exportProgress, exportDownloadUrl, onClearDownload,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { width: compWidth, height: compHeight } = getFormatDimensions(format, sizeTier);

  const durationInFrames = Math.max(
    1,
    Math.round(secondsPerImage * INFINITY_ZOOM_FPS * Math.max(1, items.length))
  );

  const inputProps = { items, zoomFactor, secondsPerImage, easingType, backgroundColor };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const type: InfinityZoomItem['type'] = file.type.startsWith('video/') ? 'video' : 'image';
      setItems((prev) => [...prev, { url: data.url, type }]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) await uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) await uploadFile(file);
  };

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const moveItem = (from: number, to: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  return (
    <>
      {/* Canvas */}
      <div
        className="flex-1 flex items-center justify-center bg-neutral-950 overflow-hidden min-w-0"
        onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
      >
        <div style={{
          aspectRatio: `${compWidth} / ${compHeight}`,
          maxWidth: '100%', maxHeight: '100%',
          width: compWidth > compHeight ? '100%' : 'auto',
          height: compWidth <= compHeight ? '100%' : 'auto',
        }}>
          <Player
            ref={playerRef}
            component={InfinityZoom}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            fps={INFINITY_ZOOM_FPS}
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

          {/* Format — top */}
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

          {/* Image list */}
          <div>
            <SectionTitle>Images / Clips ({items.length})</SectionTitle>

            {items.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {items.map((item, i) => (
                  <li key={item.url + i} className="flex items-center gap-2 group">
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white/5">
                      {item.type === 'video' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">▶</div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="flex-1 text-xs text-white/60 truncate">Image {i + 1}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button type="button" onClick={() => i > 0 && moveItem(i, i - 1)}
                        disabled={i === 0}
                        className="text-white/30 hover:text-white disabled:opacity-20 text-xs px-1">↑</button>
                      <button type="button" onClick={() => i < items.length - 1 && moveItem(i, i + 1)}
                        disabled={i === items.length - 1}
                        className="text-white/30 hover:text-white disabled:opacity-20 text-xs px-1">↓</button>
                      <button type="button" onClick={() => removeItem(i)}
                        className="text-white/20 hover:text-red-400 text-xs px-1">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Upload */}
            <label
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition block ${
                uploading ? 'border-white/40' : 'border-white/20 hover:border-white/40'
              }`}
              onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => e.preventDefault()}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                {uploading ? (
                  <><span className="text-xl animate-spin block">⟳</span><span className="text-xs text-white/70">Uploading…</span></>
                ) : (
                  <>
                    <span className="text-xl">📁</span>
                    <p className="text-xs text-white/70">Add images or clips</p>
                    <p className="text-xs text-white/40">Multiple files supported · max 200MB each</p>
                  </>
                )}
              </div>
              <input type="file" accept="image/*,video/*" multiple onChange={handleFileInput} className="hidden" disabled={uploading} />
            </label>
            {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
          </div>

          {/* Zoom */}
          <div className="space-y-4">
            <SectionTitle>Zoom</SectionTitle>
            <SliderRow label="Zoom per step" value={zoomFactor} min={1.5} max={8} step={0.1} onChange={setZoomFactor} />
            <SliderRow label="Seconds per image" value={secondsPerImage} min={1} max={12} step={0.5} onChange={setSecondsPerImage} />
            <div className="space-y-1.5">
              <span className="text-xs text-white/70">Easing</span>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {(['inout', 'in', 'out'] as const).map((e) => (
                  <button key={e} type="button" onClick={() => setEasingType(e)}
                    className={`py-1.5 rounded text-xs font-medium transition ${easingType === e ? 'bg-marshall-gold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                    {e === 'inout' ? 'Ease In/Out' : e === 'in' ? 'Ease In' : 'Ease Out'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Background */}
          <div className="space-y-2">
            <SectionTitle>Background</SectionTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">Color</span>
              <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 h-8 rounded cursor-pointer border-0 bg-transparent" />
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
              <button type="button" onClick={onExport} disabled={isExporting || items.length === 0}
                className="w-full py-2.5 bg-white/10 text-white text-sm font-semibold rounded hover:bg-white/15 disabled:opacity-30 transition">
                {items.length === 0 ? 'Add images to export' : 'Export Video'}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
};
