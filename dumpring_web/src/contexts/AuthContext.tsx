"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "site_manager" | "dropoff_manager" | "platform_admin" | "developer" | "owner";

export interface UserProfile {
  id: string;
  name: string;
  phone_number: string;
  role: UserRole;
  roleName: string;
}

interface AuthContextType {
  user: UserProfile | null;
  changeRole: (role: UserRole) => void;
  logout: () => void;
  activePath: string;
  setActivePath: (path: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const roleNames: Record<UserRole, string> = {
  site_manager: "현장 관리자",
  dropoff_manager: "하차지 관리자",
  platform_admin: "플랫폼 관리자",
  developer: "개발자",
  owner: "차주 / 운송사",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activePath, setActivePath] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    // 기본 로그인 유저 세팅 (첫 상태: 플랫폼 관리자)
    setUser({
      id: "usr_10023",
      name: "덤프링 관리자",
      phone_number: "010-1234-5678",
      role: "platform_admin",
      roleName: roleNames["platform_admin"],
    });
    setActivePath("/admin");
  }, []);

  // 페이지 이동 시 모바일 사이드바를 자동으로 닫습니다.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activePath]);

  const changeRole = (role: UserRole) => {
    setUser({
      id: `usr_${Math.floor(10000 + Math.random() * 90000)}`,
      name: `덤프링 ${roleNames[role]}`,
      phone_number: "010-1234-5678",
      role,
      roleName: roleNames[role],
    });

    const defaultPaths: Record<UserRole, string> = {
      platform_admin: "/admin",
      site_manager: "/site",
      dropoff_manager: "/dropoff",
      owner: "/owner",
      developer: "/dev",
    };
    setActivePath(defaultPaths[role] || "/");
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, changeRole, logout, activePath, setActivePath, isSidebarOpen, setIsSidebarOpen }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
