import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Small Group Toolkit Generator',
  description: 'Generate discussion toolkits from sermon transcripts',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
