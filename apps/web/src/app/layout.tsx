import type { Metadata } from 'next';
import { AuthProvider } from '@/context/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrewSync — Manager Portal',
  description: 'Intelligent staff pickup coordination for mobile catering operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
