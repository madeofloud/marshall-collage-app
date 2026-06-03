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
      <body>{children}</body>
    </html>
  );
}
