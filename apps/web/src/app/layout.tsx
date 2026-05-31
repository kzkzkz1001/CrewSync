import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CrewSync — Manager Portal',
  description: 'Intelligent staff pickup coordination for mobile catering operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
