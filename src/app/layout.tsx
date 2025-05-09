import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/auth-provider';
import BottomNav from '@/components/BottomNav';
import PWAInstall from '@/components/PWAInstall';
import PushSubscribe from '@/components/PushSubscribe';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kargner - Платформа для мастеров и заказчиков',
  description: 'Найдите мастеров для выполнения любых работ или разместите свое объявление',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PushSubscribe />
            {children}
            <PWAInstall />
            <Toaster position="bottom-right" />
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
