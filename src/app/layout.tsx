import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '꿈통 시그널: 남북 딜레마 협상 (Direct)',
  description: '선생님과 학생을 위한 간편 통일 토론 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
