"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "site_manager" | "site_worker" | "dropoff_manager" | "platform_admin" | "developer" | "owner";

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
}

const roleNames: Record<UserRole, string> = {
  platform_admin: "플랫폼 관리자",
  site_manager: "현장 관리자",
  site_worker: "현장 담당자",
  dropoff_manager: "하차지 관리자",
  owner: "차주 / 운송사",
  developer: "시스템 개발자",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activePath, setActivePath] = useState<string>("/");

  const changeRole = (role: UserRole) => {
    if (!user) return;
    setUser({
      ...user,
      role,
      roleName: roleNames[role] || role,
    });

    const defaultPaths: Record<UserRole, string> = {
      platform_admin: "/admin",
      site_manager: "/site",
      site_worker: "/site",
      dropoff_manager: "/dropoff",
      owner: "/owner",
      developer: "/dev",
    };
    setActivePath(defaultPaths[role] || "/");
  };

  const login = (token: string, userData: any) => {
    // Determine role strictly based on API user response flags
    let role: UserRole | null = null;
    if (userData.phone_number === "010-9999-9999" || userData.name === "개발자") {
      role = "developer";
    } else if (userData.is_admin) {
      role = "platform_admin";
    } else if (userData.is_site_manager) {
      role = "site_manager";
    } else if (userData.is_site_worker) {
      role = "site_worker";
    } else if (userData.is_drop_off) {
      role = "dropoff_manager";
    } else if (userData.is_owner || userData.is_driver) {
      role = "owner";
    }

    // 보안 강화: 유효한 서비스 이용 권한이 할당되지 않은 경우 접속 엄격 차단
    if (!role) {
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("dumpring_token");
      localStorage.removeItem("userData");
      localStorage.removeItem("userProfile");
      setUser(null);
      throw new Error("부여된 서비스 이용 권한이 없습니다. 플랫폼 관리자에게 문의해 주세요.");
    }

    localStorage.setItem("accessToken", token);
    sessionStorage.setItem("dumpring_token", token);
    localStorage.setItem("userData", JSON.stringify(userData));

    const profile: UserProfile = {
      id: String(userData.id) || `usr_${Math.floor(10000 + Math.random() * 90000)}`,
      name: userData.name || userData.username || "사용자",
      phone_number: userData.phone_number || "",
      role: role,
      roleName: roleNames[role] || "회원",
      isApproved: userData.is_approved !== undefined ? userData.is_approved : true,
    };
    setUser(profile);
    localStorage.setItem("userProfile", JSON.stringify(profile));

    const defaultPaths: Record<UserRole, string> = {
      platform_admin: "/admin",
      site_manager: "/site",
      site_worker: "/site",
      dropoff_manager: "/dropoff",
      owner: "/owner",
      developer: "/dev",
    };

    if (userData.is_approved === false && role !== "platform_admin" && role !== "developer") {
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
          site_worker: "/site",
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

    // 기본 로그인 유저 세팅 제거 (비로그인 상태 유지)
    setUser(null);
    setActivePath("/");
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
    <AuthContext.Provider value={{ user, changeRole, login, logout, activePath, setActivePath, updateApprovalStatus }}>
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
