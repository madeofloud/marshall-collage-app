'use client';

import React, { useState, useMemo } from 'react';
import { CollagePreview } from '@/components/CollagePreview';
import { ControlPanel } from '@/components/ControlPanel';
import { SessionManager } from '@/components/SessionManager';
import { StopMotionStudio } from '@/components/StopMotionStudio';
import {
  type PanelOverrides,
  type PanelOverride,
  type AspectFormat,
  type SizeTier,
} from '@/remotion/src/types';
import { generatePanels } from '@/remotion/src/generation';

export default function HomePage() {
  const [mode, setMode] = useState<'collage' | 'stopmotion'>('collage');
  const [images, setImages] = useState<string[]>([]);
  const [background, setBackground] = useState('#121212');
  const [rotationSpeed, setRotationSpeed] = useState(60);
  const [grainAmount, setGrainAmount] = useState(0.8);
  const [panelOverrides, setPanelOverrides] = useState<PanelOverrides>({});
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [format, setFormat] = useState<AspectFormat>('1x1');
  const [sizeTier, setSizeTier] = useState<SizeTier>('medium');
  const [codec, setCodec] = useState<'h264' | 'prores'>('h264');
  const [isExporting, setIsExporting] = useState(false);

  const selectedOverride = useMemo<PanelOverride | null>(
    () => (selectedPanelId ? panelOverrides[selectedPanelId] ?? null : null),
    [selectedPanelId, panelOverrides]
  );

  const handleUpdatePanelOverride = (override: PanelOverride) => {
    if (!selectedPanelId) return;
    setPanelOverrides({ ...panelOverrides, [selectedPanelId]: override });
  };

  const handleSelectImage = (url: string) => {
    const panel = generatePanels(images).find((p) => p.image === url);
    if (!panel) return;
    const id = panel.id;
    // Ensure override exists (same pattern as handleSelectPanel in CollagePreview)
    if (!panelOverrides[id]) {
      const newOverride: PanelOverride = {
        worldX: panel.worldX,
        worldY: panel.worldY,
        worldZ: panel.worldZ,
        facingAngle: panel.facingAngle,
        tiltX: panel.tiltX,
        tiltZ: panel.tiltZ,
        width: panel.width,
      };
      setPanelOverrides({ ...panelOverrides, [id]: newOverride });
    }
    setSelectedPanelId(id);
  };

  const selectedImageUrl = useMemo(
    () => generatePanels(images).find((p) => p.id === selectedPanelId)?.image ?? null,
    [images, selectedPanelId]
  );

  const hiddenImageUrls = useMemo(
    () =>
      images.filter((url) => {
        const panel = generatePanels(images).find((p) => p.image === url);
        return panel ? !!(panelOverrides[panel.id]?.hidden) : false;
      }),
    [images, panelOverrides]
  );

  const handleToggleHidden = () => {
    if (!selectedPanelId) return;
    const current = panelOverrides[selectedPanelId];
    if (!current) return;
    setPanelOverrides({ ...panelOverrides, [selectedPanelId]: { ...current, hidden: !current.hidden } });
  };

  const handleLoadSession = (data: {
    images: string[];
    background: string;
    rotationSpeed: number;
    grainAmount: number;
    panelOverrides: Record<string, unknown>;
    format: string;
    sizeTier: string;
    codec: string;
  }) => {
    setImages(data.images ?? []);
    setBackground(data.background ?? '#121212');
    setRotationSpeed(data.rotationSpeed ?? 60);
    setGrainAmount(data.grainAmount ?? 0.8);
    setPanelOverrides((data.panelOverrides ?? {}) as PanelOverrides);
    setFormat((data.format ?? '1x1') as AspectFormat);
    setSizeTier((data.sizeTier ?? 'medium') as SizeTier);
    setCodec((data.codec ?? 'h264') as 'h264' | 'prores');
    setBackgroundImage((data as { backgroundImage?: string | null }).backgroundImage ?? null);
    setSelectedPanelId(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          background,
          rotationSpeed,
          grainAmount,
          panelOverrides,
          format,
          sizeTier,
          codec,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Render failed' }));
        throw new Error(err.error || 'Render failed');
      }

      const { downloadUrl } = await res.json();
      window.open(downloadUrl, '_blank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      alert(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const currentSessionData = {
    images,
    background,
    rotationSpeed,
    grainAmount,
    panelOverrides,
    format,
    sizeTier,
    codec,
  };

  return (
    <main className="flex h-screen bg-neutral-900">
      <header
        className={`absolute top-0 left-0 ${
          mode === 'collage' ? 'right-80' : 'right-0'
        } px-5 py-3 border-b border-white/10 bg-neutral-950/50 backdrop-blur z-10 flex items-center justify-between`}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold tracking-wide">Marshall Motion Studio</h1>
          <div className="flex gap-1">
            {(
              [
                ['collage', '360° Collage'],
                ['stopmotion', 'Stop Motion'],
              ] as const
            ).map(([m, label]) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  mode === m
                    ? 'bg-marshall-gold text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {mode === 'collage' && (
          <SessionManager currentData={currentSessionData} onLoad={handleLoadSession} />
        )}
      </header>

      {mode === 'collage' ? (
        <>
          <CollagePreview
            images={images}
            setImages={setImages}
            background={background}
            rotationSpeed={rotationSpeed}
            grainAmount={grainAmount}
            panelOverrides={panelOverrides}
            selectedPanelId={selectedPanelId}
            setSelectedPanelId={setSelectedPanelId}
            setPanelOverrides={setPanelOverrides}
            format={format}
            backgroundImage={backgroundImage ?? undefined}
          />

          <ControlPanel
            images={images}
            setImages={setImages}
            background={background}
            setBackground={setBackground}
            rotationSpeed={rotationSpeed}
            setRotationSpeed={setRotationSpeed}
            grainAmount={grainAmount}
            setGrainAmount={setGrainAmount}
            selectedPanelId={selectedPanelId}
            panelOverride={selectedOverride}
            onUpdatePanelOverride={handleUpdatePanelOverride}
            format={format}
            setFormat={setFormat}
            sizeTier={sizeTier}
            setSizeTier={setSizeTier}
            codec={codec}
            setCodec={setCodec}
            onExport={handleExport}
            isExporting={isExporting}
            selectedImageUrl={selectedImageUrl ?? undefined}
            onSelectImage={handleSelectImage}
            hiddenImageUrls={hiddenImageUrls}
            onToggleHidden={handleToggleHidden}
            isPanelHidden={selectedPanelId ? !!(panelOverrides[selectedPanelId]?.hidden) : false}
            backgroundImage={backgroundImage}
            setBackgroundImage={setBackgroundImage}
          />
        </>
      ) : (
        <StopMotionStudio />
      )}
    </main>
  );
}
