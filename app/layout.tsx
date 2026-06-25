import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'RBN Boarding System',
  description: 'Sistem Manajemen Karyawan — Roti Bakar Ngeunah',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://boarding-karyawan.vercel.app'),
  // Favicon dari URL Cloudinary (tidak di-embed lokal)
  icons: {
    icon: 'https://res.cloudinary.com/dckzmg6c3/image/upload/v1780334644/rbngeunahicon_ptetbj.webp',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px' },
            success: { iconTheme: { primary: '#D32F2F', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
