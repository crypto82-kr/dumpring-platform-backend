"use client";

import React, { useState, useEffect } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Truck,
  Database,
  Terminal,
  Settings,
  FileText,
  ShieldCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Volume2,
  HardHat,
  BarChart3,
  LogOut,
  RefreshCw,
  Percent,
  ShieldAlert,
  MessageSquare,
  Receipt,
  Bell,
  Sliders,
  Activity,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon
} from "lucide-react";

interface MenuItem {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
  subItems?: { title: string; path: string }[];
}

const menuByRole: Record<UserRole, MenuItem[]> = {
  developer: [
    { title: "실시간 APM 모니터링", icon: Activity, path: "/dev/apm" },
    { title: "개발자 대시보드", icon: LayoutDashboard, path: "/dev" },
    { title: "앱/웹 통합 메뉴 관리", icon: Sliders, path: "/dev/menus" },
    { title: "공통 코드 설정", icon: Database, path: "/dev/codes" },
    { title: "API 매핑 제어", icon: Terminal, path: "/dev/api" },
    { title: "DB 테이블 조회", icon: Settings, path: "/dev/db" },
    { title: "시스템 로그 분석", icon: FileText, path: "/dev/logs" },
  ],
  platform_admin: [
    { title: "플랫폼 대시보드", icon: BarChart3, path: "/admin" },
    {
      title: "승인 관리",
      icon: ShieldCheck,
      path: "#approve",
      subItems: [
        { title: "기사 가입 승인", path: "/admin/approve-driver" },
        { title: "차주/운송사 승인", path: "/admin/approve-owner" },
        { title: "현장 관리자 승인", path: "/admin/approve-site" },
        { title: "하차지 승인 관리", path: "/admin/approve-dropoff" }
      ]
    },
    { title: "통합 이용자 관리", icon: Users, path: "/admin/users" },
    { title: "운임 및 수수료 설정", icon: Percent, path: "/admin/fees" },
    { title: "분쟁 및 신고 처리", icon: ShieldAlert, path: "/admin/disputes" },
    { title: "고객지원 & 게시판 관리", icon: MessageSquare, path: "/admin/boards" },
    { title: "전체 현장 지도", icon: MapPin, path: "/admin/sites" },
    { title: "하차지 배차 관리", icon: Truck, path: "/admin/dropoffs" },
    { title: "통합 정산 & 통계", icon: DollarSign, path: "/admin/settlement" },
    { title: "공통코드 관리", icon: Database, path: "/admin/codes" },
    { title: "시스템 설정", icon: Settings, path: "/admin/settings" },
  ],
  site_manager: [
    { title: "현장 관리 대시보드", icon: LayoutDashboard, path: "/site" },
    { title: "현장관리자 권한 관리", icon: Users, path: "/site/org-hierarchy" },
    { title: "현장 관리", icon: MapPin, path: "/site/request" },
    {
      title: "배차 관리",
      icon: Truck,
      path: "#site-dispatch",
      subItems: [
        { title: "배차 요청", path: "/site/dispatch-request" },
        { title: "배차 요청 현황", path: "/site/dispatch" },
        { title: "배차 승인 처리", path: "/site/dispatch-approve" },
        { title: "운행 이력 조회", path: "/site/history" },
      ]
    },
    { title: "진출입 실시간 현황", icon: Activity, path: "/site/status" },
    { title: "덤프비 정산 확인", icon: DollarSign, path: "/site/dump-expenses" },
    { title: "흙값 정산 관리", icon: TrendingUp, path: "/site/soil-expenses" },
    { title: "세금계산서 업무", icon: Receipt, path: "/site/tax-invoice" },
    { title: "현장 안전 공지", icon: HardHat, path: "/site/safety" },
  ],
  dropoff_manager: [
    { title: "하차지 대시보드", icon: LayoutDashboard, path: "/dropoff" },
    { title: "하차지 담당자 권한 관리", icon: Users, path: "/dropoff/org-hierarchy" },
    { title: "하차지 등록", icon: MapPin, path: "/dropoff/register" },
    {
      title: "배차 현황",
      icon: Truck,
      path: "#dropoff-dispatch",
      subItems: [
        { title: "배차 요청", path: "/dropoff/dispatch-request" },
        { title: "금일 배차 현황", path: "/dropoff/dispatch" },
        { title: "반입 허가 차량 관리", path: "/dropoff/trucks" },
        { title: "실시간 반입 현황", path: "/dropoff/inbound" },
        { title: "실시간 반입 확인", path: "/dropoff/verification" },
      ]
    },
    { title: "흙값 정산 관리", icon: DollarSign, path: "/dropoff/soil-settlement" },
    { title: "하차지 정보 통계", icon: BarChart3, path: "/dropoff/stats" },
    { title: "알림 수신함", icon: Bell, path: "/dropoff/alerts" },
  ],
  owner: [
    { title: "운송사 대시보드", icon: LayoutDashboard, path: "/owner" },
    { title: "배차 스케줄러", icon: Calendar, path: "/owner/schedule" },
    { title: "소속 차량 & 기사 관리", icon: Users, path: "/owner/fleet" },
    { title: "운행 통계 조회", icon: BarChart3, path: "/owner/statistics" },
    { title: "매출 및 운반 정산", icon: DollarSign, path: "/owner/revenues" },
    { title: "알림 센터", icon: Bell, path: "/owner/notice" },
  ],
};

export default function Sidebar() {
  const { user, changeRole, logout, activePath, setActivePath } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ "승인 관리": true });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync dark mode state with HTML class
  useEffect(() => {
    const root = window.document.documentElement;
    const initialDark = root.classList.contains("dark") || localStorage.getItem("darkMode") === "true";
    setIsDarkMode(initialDark);
    if (initialDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const root = window.document.documentElement;
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      root.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  };

  const menus = user ? (menuByRole[user.role] || []) : [];

  // Auto-expand menu when active sub-item path changes
  useEffect(() => {
    menus.forEach(item => {
      if (item.subItems && item.subItems.some(sub => sub.path === activePath)) {
        setExpandedMenus(prev => ({ ...prev, [item.title]: true }));
      }
    });
  }, [activePath, menus]);

  if (!user) return null;

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-72 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 flex flex-col justify-between h-screen sticky top-0 transition-colors duration-250">
      <div>
        {/* Logo / Header with Dark Mode Toggle */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="font-black text-xl text-white">D</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg bg-gradient-to-r from-brand-500 to-brand-700 dark:from-brand-400 dark:to-brand-600 bg-clip-text text-transparent">
                DUMPRING
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">통합 모빌리티 플랫폼</p>
            </div>
          </div>
          
          {/* User toggleable Dark Mode button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-gray-500 dark:text-gray-400 active:scale-95"
            title={isDarkMode ? "라이트 모드로 변경" : "다크 모드로 변경"}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>

        {/* Current Active User Profile info */}
        <div className="m-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center font-bold text-sm text-brand-500 font-sans">
                {user.name[0]}
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{user.name}</div>
                <select
                  value={user.role}
                  onChange={(e) => changeRole(e.target.value as any)}
                  className="text-[11px] text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-lg mt-1 border border-brand-150 dark:border-brand-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="platform_admin">🔧 플랫폼 관리자</option>
                  <option value="site_manager">🚧 현장 관리자</option>
                  <option value="dropoff_manager">🚚 하차지 관리자</option>
                  <option value="owner">🚛 차주 / 운송사</option>
                  <option value="developer">💻 개발자 (관제)</option>
                </select>
              </div>
            </div>
            
            {/* Logout button */}
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 text-gray-400 transition-all active:scale-95"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Navigation Menu Items */}
        <nav className="px-3 py-4 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-360px)] no-scrollbar">
          <div className="px-3 mb-2 text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
            서비스 메뉴 ({user.roleName})
          </div>
          {menus.map((item, idx) => {
            const Icon = item.icon;
            const hasSub = !!item.subItems;
            const isExpanded = !!expandedMenus[item.title];
            const isAnySubActive = hasSub && item.subItems!.some(sub => activePath === sub.path);
            const isActive = activePath === item.path || isAnySubActive;

            if (hasSub) {
              return (
                <div key={item.title} className="flex flex-col gap-1">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); toggleMenu(item.title); }}
                    className={`menu-item group ${
                      isActive ? "menu-item-active" : "menu-item-inactive"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? "text-brand-500 dark:text-brand-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                      }`}
                    />
                    <span className="flex-1">{item.title}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-550" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-555" />
                    )}
                  </a>

                  {isExpanded && (
                    <div className="pl-6 flex flex-col gap-1 border-l border-gray-200 dark:border-gray-800 ml-5 mt-0.5 animate-fadeIn">
                      {item.subItems!.map(sub => {
                        const isSubActive = activePath === sub.path;
                        return (
                          <a
                            key={sub.title}
                            href="#"
                            onClick={(e) => { e.preventDefault(); setActivePath(sub.path); }}
                            className={`menu-dropdown-item group ${
                              isSubActive ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                            }`}
                          >
                            {sub.title}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <a
                key={item.title}
                href="#"
                onClick={(e) => { e.preventDefault(); setActivePath(item.path); }}
                className={`menu-item group ${
                  isActive ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-brand-500 dark:text-brand-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                  }`}
                />
                <span>{item.title}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
