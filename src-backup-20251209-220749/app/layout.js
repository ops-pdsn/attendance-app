export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import NetworkStatus from '@/components/NetworkStatus'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Attendance Monitor',
  description: 'Track your daily tasks and attendance with ease',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Attendance Monitor'
  },
  formatDetection: {
    telephone: false
  }
}

export const viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Attendance" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('darkMode');
                  var useSystem = localStorage.getItem('useSystemTheme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  if (useSystem === 'false') {
                    if (savedTheme === 'true') {
                      document.documentElement.classList.add('dark');
                    }
                  } else if (prefersDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <ToastProvider>
            <ConfirmProvider>
              <NetworkStatus />
              {children}
              <PWAInstallPrompt />
              <ServiceWorkerRegistration />
            </ConfirmProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  )
}