"use client";

import React from "react";
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
  Activity
} from "lucide-react";

interface MenuItem {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
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
    { title: "가입 및 하차지 승인", icon: ShieldCheck, path: "/admin/approvals" },
    { title: "운임 및 수수료 설정", icon: Percent, path: "/admin/fees" },
    { title: "분쟁 및 신고 처리", icon: ShieldAlert, path: "/admin/disputes" },
    { title: "고객지원 & 게시판 관리", icon: MessageSquare, path: "/admin/boards" },
    { title: "전체 현장 지도", icon: MapPin, path: "/admin/sites" },
    { title: "하차지 배차 관리", icon: Truck, path: "/admin/dropoffs" },
    { title: "통합 정산 & 통계", icon: DollarSign, path: "/admin/settlement" },
  ],
  site_manager: [
    { title: "현장 관리 대시보드", icon: LayoutDashboard, path: "/site" },
    { title: "덤프트럭 배차 신청", icon: Truck, path: "/site/request" },
    { title: "진출입 실시간 현황", icon: MapPin, path: "/site/status" },
    { title: "운행 이력 조회", icon: FileText, path: "/site/history" },
    { title: "덤프비 정산 확인", icon: DollarSign, path: "/site/dump-expenses" },
    { title: "흙값 정산 관리", icon: TrendingUp, path: "/site/soil-expenses" },
    { title: "세금계산서 업무", icon: Receipt, path: "/site/tax-invoice" },
    { title: "현장 안전 공지", icon: HardHat, path: "/site/safety" },
  ],
  dropoff_manager: [
    { title: "하차지 대시보드", icon: LayoutDashboard, path: "/dropoff" },
    { title: "신규 하차지 등록", icon: MapPin, path: "/dropoff/register" },
    { title: "실시간 반입 현황", icon: Truck, path: "/dropoff/inbound" },
    { title: "실시간 반입 확인", icon: ShieldCheck, path: "/dropoff/verification" },
    { title: "반입 허가 차량 관리", icon: Users, path: "/dropoff/trucks" },
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
  const { user, changeRole } = useAuth();

  if (!user) return null;

  const menus = menuByRole[user.role] || [];

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Logo / Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-black text-xl text-slate-900">D</span>
          </div>
          <div>
            <h1 className="font-extrabold text-lg bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              DUMPRING
            </h1>
            <p className="text-xs text-slate-400 font-medium">통합 모빌리티 플랫폼</p>
          </div>
        </div>

        {/* Current Active User Profile info */}
        <div className="m-4 p-4 rounded-xl bg-slate-800/50 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm text-cyan-400">
              {user.name[0]}
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-200">{user.name}</div>
              <div className="text-[11px] text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-cyan-800/30">
                {user.roleName}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Menu Items */}
        <nav className="px-3 py-4 flex flex-col gap-1.5">
          <div className="px-3 mb-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
            서비스 메뉴 ({user.roleName})
          </div>
          {menus.map((item, idx) => {
            const Icon = item.icon;
            const isActive = idx === 0; // 데모를 위해 첫 번째 아이템 활성화 처리
            return (
              <a
                key={item.title}
                href="#"
                onClick={(e) => e.preventDefault()}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_1px_0_0_0_rgba(6,182,212,0.1)]"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span>{item.title}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Role Quick Selector at Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="text-[11px] font-bold text-slate-500 mb-2.5 flex items-center gap-1.5 px-1">
          <RefreshCw className="w-3 h-3 animate-spin-slow" />
          <span>권한 빠른 시뮬레이션</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <button
            onClick={() => changeRole("platform_admin")}
            className={`px-2 py-1.5 rounded-lg border text-left font-medium transition-colors ${
              user.role === "platform_admin"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            플랫폼 관리자
          </button>
          <button
            onClick={() => changeRole("site_manager")}
            className={`px-2 py-1.5 rounded-lg border text-left font-medium transition-colors ${
              user.role === "site_manager"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            현장 관리자
          </button>
          <button
            onClick={() => changeRole("dropoff_manager")}
            className={`px-2 py-1.5 rounded-lg border text-left font-medium transition-colors ${
              user.role === "dropoff_manager"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            하차지 관리자
          </button>
          <button
            onClick={() => changeRole("owner")}
            className={`px-2 py-1.5 rounded-lg border text-left font-medium transition-colors ${
              user.role === "owner"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            차주/운송사
          </button>
          <button
            onClick={() => changeRole("developer")}
            className={`col-span-2 px-2 py-1.5 rounded-lg border text-center font-medium transition-colors ${
              user.role === "developer"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            시스템 개발자 (Developer)
          </button>
        </div>
      </div>
    </aside>
  );
}
