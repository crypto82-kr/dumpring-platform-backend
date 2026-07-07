"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "site_manager" | "dropoff_manager" | "platform_admin" | "developer" | "owner";

export interface UserProfile {
  id: string;
  name: string;
  phone_number: string;
  role: UserRole;
  roleName: string;
  isApproved?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  changeRole: (role: UserRole) => void;
  login: (token: string, userData: any) => void;
  logout: () => void;
  activePath: string;
  setActivePath: (path: string) => void;
  updateApprovalStatus: (approved: boolean) => void;
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
      isApproved: true
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

  const login = (token: string, userData: any) => {
    localStorage.setItem("accessToken", token);
    sessionStorage.setItem("dumpring_token", token);
    localStorage.setItem("userData", JSON.stringify(userData));
    
    // Determine role based on API user response flags
    let role: UserRole = "platform_admin";
    if (userData.phone_number === "010-9999-9999" || userData.name === "개발자") role = "developer";
    else if (userData.is_admin) role = "platform_admin";
    else if (userData.is_site_manager) role = "site_manager";
    else if (userData.is_drop_off) role = "dropoff_manager";
    else if (userData.is_owner) role = "owner";
    else if (userData.is_driver) role = "owner"; 
    
    const profile = {
      id: String(userData.id) || `usr_${Math.floor(10000 + Math.random() * 90000)}`,
      name: userData.name || userData.username || "사용자",
      phone_number: userData.phone_number || "",
      role: role,
      roleName: roleNames[role] || "플랫폼 관리자",
      isApproved: userData.is_approved !== undefined ? userData.is_approved : true,
    };
    setUser(profile);
    localStorage.setItem("userProfile", JSON.stringify(profile));
    
    const defaultPaths: Record<UserRole, string> = {
      platform_admin: "/admin",
      site_manager: "/site",
      dropoff_manager: "/dropoff",
      owner: "/owner",
      developer: "/dev",
    };
    
    if (userData.is_approved === false && (role as string) !== "platform_admin" && (role as string) !== "developer") {
      setActivePath("/approval-request");
    } else {
      setActivePath(defaultPaths[role] || "/");
    }
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setUser(parsed);
        const defaultPaths: Record<UserRole, string> = {
          platform_admin: "/admin",
          site_manager: "/site",
          dropoff_manager: "/dropoff",
          owner: "/owner",
          developer: "/dev",
        };
        setActivePath(defaultPaths[parsed.role as UserRole] || "/");
        return;
      } catch (e) {
        console.error("Failed to parse saved user profile:", e);
      }
    }

    // 기본 로그인 유저 세팅 (첫 상태: 플랫폼 관리자)
    setUser({
      id: "usr_10023",
      name: "덤프링 관리자",
      phone_number: "010-1234-5678",
      role: "platform_admin",
      roleName: roleNames["platform_admin"],
      isApproved: true
    });
    setActivePath("/admin");
  }, []);

  const logout = () => {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("dumpring_token");
    localStorage.removeItem("userData");
    localStorage.removeItem("userProfile");
    setUser(null);
  };

  const updateApprovalStatus = (approved: boolean) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isApproved: approved
      };
    });
  };

  return (
    <AuthContext.Provider value={{ user, changeRole, login, logout, activePath, setActivePath, updateApprovalStatus, isSidebarOpen, setIsSidebarOpen }}>
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
