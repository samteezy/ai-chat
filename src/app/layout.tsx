import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Chat',
  description: 'Chat with AI models via OpenAI-compatible endpoints',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
