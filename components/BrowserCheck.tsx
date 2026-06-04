'use client';

import { useEffect, useState } from 'react';

export function BrowserCheck({ children }: { children: React.ReactNode }) {
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const safari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
    setIsSafari(safari);
  }, []);

  if (isSafari) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-900 px-8">
        <div className="text-center space-y-3">
          <p className="text-white text-lg font-semibold">Chrome required</p>
          <p className="text-white/50 text-sm">This app is not supported in Safari.<br />Please open it in Google Chrome.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
