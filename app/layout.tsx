import type { Metadata } from 'next';
import './globals.css';
import { BrowserCheck } from '@/components/BrowserCheck';

export const metadata: Metadata = {
  title: 'Marshall Motion Studio',
  description: 'Internal tool for animated photo collages and 360° viewing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <BrowserCheck>
          <div className="hidden md:block">{children}</div>
          <div className="flex md:hidden h-screen items-center justify-center bg-neutral-900 px-8">
            <div className="text-center space-y-3">
              <p className="text-white text-lg font-semibold">Desktop only</p>
              <p className="text-white/50 text-sm">This app is optimized for desktop.</p>
            </div>
          </div>
        </BrowserCheck>
      </body>
    </html>
  );
}
