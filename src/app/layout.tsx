import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Small Group Toolkit Generator',
  description: 'Generate discussion toolkits from sermon transcripts',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Small Group Toolkit Generator',
    description: 'Generate discussion toolkits from sermon transcripts',
    images: [
      {
        url: '/opengraph-image.png',
        width: 500,
        height: 500,
        alt: 'Redeemer Church',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Small Group Toolkit Generator',
    description: 'Generate discussion toolkits from sermon transcripts',
    images: ['/opengraph-image.png'],
  },
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
