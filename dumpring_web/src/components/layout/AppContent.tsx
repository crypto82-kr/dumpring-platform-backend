"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "./Sidebar";
import LoginScreen from "../auth/LoginScreen";
import ApprovalRequestScreen from "../auth/ApprovalRequestScreen";

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { user, isInitializing, activePath } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // 현장 관리자 메인 대시보드(/site)일 때는 메뉴바를 숨기고 제니퍼 스타일 풀스크린 관제 모드로 전환
  const isFullScreenDashboard =
    Boolean(user) &&
    (user?.role === "site_manager" || user?.role === "site_worker") &&
    (activePath === "/site" || activePath === "");

  // 경로가 바뀌면 드로어 자동 닫기
  React.useEffect(() => {
    setIsDrawerOpen(false);
  }, [activePath]);

  // 대시보드 내부의 [메뉴 열기] 커스텀 이벤트 수신
  React.useEffect(() => {
    const handleToggleMenu = () => setIsDrawerOpen((prev) => !prev);
    window.addEventListener("dumpring:toggle-sidebar", handleToggleMenu);
    return () => window.removeEventListener("dumpring:toggle-sidebar", handleToggleMenu);
  }, []);

  if (isInitializing) {
    return <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  // 승인이 안 된 사용자의 경우 승인 요청 화면으로 리다이렉트 (플랫폼 관리자와 개발자 권한 제외)
  if (user.role !== "platform_admin" && user.role !== "developer" && user.isApproved === false) {
    return <ApprovalRequestScreen />;
  }

  if (isFullScreenDashboard) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#060a12]">
        {/* 좌측 슬라이드 메뉴 드로어 (대시보드에서 메뉴 호출 시에만 오버레이로 표시) */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="relative z-10 h-full shadow-2xl animate-fadeIn">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Full-Screen Wallboard Content */}
        <main className="w-full h-full overflow-hidden bg-[#060a12]">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
