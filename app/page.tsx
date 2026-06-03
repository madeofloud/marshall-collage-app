'use client';

import React, { useState, useMemo } from 'react';
import { CollagePreview } from '@/components/CollagePreview';
import { ControlPanel } from '@/components/ControlPanel';
import {
  type PanelOverrides,
  type PanelOverride,
  type AspectFormat,
  type SizeTier,
} from '@/remotion/src/types';

export default function HomePage() {
  const [images, setImages] = useState<string[]>([]);
  const [background, setBackground] = useState('#121212');
  const [rotationSpeed, setRotationSpeed] = useState(60);
  const [grainAmount, setGrainAmount] = useState(0.8);
  const [panelOverrides, setPanelOverrides] = useState<PanelOverrides>({});
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

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

  return (
    <main className="flex h-screen bg-neutral-900">
      <header className="absolute top-0 left-0 right-80 px-5 py-3 border-b border-white/10 bg-neutral-950/50 backdrop-blur z-10">
        <h1 className="text-sm font-semibold tracking-wide">Marshall Motion Studio</h1>
      </header>

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
      />
    </main>
  );
}
