import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Providers from './providers';
import './globals.css';

const pretendard = localFont({
  src: [
    { path: './fonts/Pretendard-Light.woff', weight: '300', style: 'normal' },
    { path: './fonts/Pretendard-Regular.woff', weight: '400', style: 'normal' },
    { path: './fonts/Pretendard-Medium.woff', weight: '500', style: 'normal' },
    { path: './fonts/Pretendard-SemiBold.woff', weight: '600', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '정압기 트렌드 관리 시스템',
  description: '정압기 측정 트렌드 데이터 조회 및 관리',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}