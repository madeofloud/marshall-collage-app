import type { Metadata } from 'next';
import './globals.css';

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
        {/* Safari block */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var ua = navigator.userAgent;
            var isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
            if (isSafari) {
              document.documentElement.setAttribute('data-safari', 'true');
            }
          })();
        `}} />
        <div id="safari-block" style={{display:'none'}} className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900 px-8">
          <div className="text-center space-y-3">
            <p className="text-white text-lg font-semibold">Chrome required</p>
            <p className="text-white/50 text-sm">This app is not supported in Safari.<br />Please open it in Google Chrome.</p>
          </div>
        </div>
        <style>{`[data-safari="true"] #safari-block { display: flex !important; }`}</style>
        <div className="hidden md:block">{children}</div>
        <div className="flex md:hidden h-screen items-center justify-center bg-neutral-900 px-8">
          <div className="text-center space-y-3">
            <p className="text-white text-lg font-semibold">Desktop only</p>
            <p className="text-white/50 text-sm">This app is optimized for desktop.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
