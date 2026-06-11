import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "덤프링 통합 관리 시스템 (DUMPRING Integrated Admin Portal)",
  description: "현장, 하차지, 운송사, 플랫폼 전체를 통합 모니터링하고 제어하는 덤프링 관리 포털입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const mode = localStorage.getItem('darkMode');
              if (mode === 'true') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className="min-h-full bg-gray-50 dark:bg-gray-950 font-sans flex text-gray-900 dark:text-gray-100 antialiased selection:bg-brand-500/20 selection:text-brand-900">
        <AuthProvider>
          <div className="flex w-full min-h-screen">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content Area */}
            <main className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
