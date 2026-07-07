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
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  updateApprovalStatus: (approved: boolean) => void;
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
    // Check if userProfile is stored in localStorage
    try {
      const storedToken = localStorage.getItem("authToken");
      const storedProfile = localStorage.getItem("userProfile");
      if (storedToken && storedProfile) {
        sessionStorage.setItem("dumpring_token", storedToken);
        const parsed = JSON.parse(storedProfile);
        
        let roleVal: UserRole = "site_manager";
        if (parsed.is_admin) {
          roleVal = "platform_admin";
        } else if (parsed.is_site_manager || parsed.is_site_worker) {
          roleVal = "site_manager";
        } else if (parsed.is_drop_off) {
          roleVal = "dropoff_manager";
        } else if (parsed.is_owner || parsed.is_driver) {
          roleVal = "owner";
        } else if (parsed.role) {
          roleVal = parsed.role as UserRole;
        }

        setUser({
          id: String(parsed.id),
          name: parsed.name || "사용자",
          phone_number: parsed.phone_number || "",
          role: roleVal,
          roleName: roleNames[roleVal],
          isApproved: parsed.is_approved !== undefined ? parsed.is_approved : true,
        });
        const defaultPaths: Record<UserRole, string> = {
          platform_admin: "/admin",
          site_manager: "/site",
          dropoff_manager: "/dropoff",
          owner: "/owner",
          developer: "/dev",
        };
        setActivePath(defaultPaths[roleVal] || "/");
      }
    } catch (e) {
      console.error("Failed to recover user session", e);
    }
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

  const login = (token: string, userData: any) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("accessToken", token);
    sessionStorage.setItem("dumpring_token", token);
    localStorage.setItem("userProfile", JSON.stringify(userData));

    // DB boolean 플래그 값에 대응하여 우선순위 권한 부여
    let roleVal: UserRole = "site_manager";
    if (userData.is_admin) {
      roleVal = "platform_admin";
    } else if (userData.is_site_manager || userData.is_site_worker) {
      roleVal = "site_manager";
    } else if (userData.is_drop_off) {
      roleVal = "dropoff_manager";
    } else if (userData.is_owner || userData.is_driver) {
      roleVal = "owner";
    } else if (userData.role) {
      roleVal = userData.role as UserRole;
    }

    setUser({
      id: String(userData.id),
      name: userData.name || "사용자",
      phone_number: userData.phone_number || "",
      role: roleVal,
      roleName: roleNames[roleVal],
      isApproved: userData.is_approved !== undefined ? userData.is_approved : true,
    });

    const defaultPaths: Record<UserRole, string> = {
      platform_admin: "/admin",
      site_manager: "/site",
      dropoff_manager: "/dropoff",
      owner: "/owner",
      developer: "/dev",
    };
    setActivePath(defaultPaths[roleVal] || "/");
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userProfile");
    setUser(null);
  };

  const updateApprovalStatus = (approved: boolean) => {
    if (user) {
      setUser({
        ...user,
        isApproved: approved,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, changeRole, login, logout, activePath, setActivePath, isSidebarOpen, setIsSidebarOpen, updateApprovalStatus }}>
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
