"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "./Sidebar";
import LoginScreen from "../auth/LoginScreen";
import ApprovalRequestScreen from "../auth/ApprovalRequestScreen";

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  // 승인이 안 된 사용자의 경우 승인 요청 화면으로 리다이렉트 (플랫폼 관리자와 개발자 권한 제외)
  if (user.role !== "platform_admin" && user.role !== "developer" && user.isApproved === false) {
    return <ApprovalRequestScreen />;
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
