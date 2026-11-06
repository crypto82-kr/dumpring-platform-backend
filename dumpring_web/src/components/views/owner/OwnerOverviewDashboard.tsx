"use client";

import React from "react";
import {
  Truck,
  Calendar,
  Receipt,
  TrendingUp,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  BarChart3,
  Users,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface OwnerOverviewDashboardProps {
  setActivePath: (path: string) => void;
}

export function OwnerOverviewDashboard({ setActivePath }: OwnerOverviewDashboardProps) {
  const kpiCards = [
    {
      label: "소속 등록 차량 / 기사",
      value: "18 대",
      sub: "15대 정상 가동 중 · 소속 기사 18명",
      badge: "가동률 83.3%",
      badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: Truck,
      iconBg: "bg-blue-50 text-blue-600 border-blue-200",
      targetPath: "/owner/trucks",
    },
    {
      label: "금일 배차 투입 / 운행",
      value: "42 회",
      sub: "투입 현장 3개소 · 평균 2.8회전",
      badge: "실시간 운행 중",
      badgeColor: "text-blue-700 bg-blue-50 border-blue-200",
      icon: Calendar,
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-200",
      targetPath: "/owner/schedule",
    },
    {
      label: "입금 수령확인 / 정산 대기",
      value: "7 건",
      sub: "입금확인 대기 3건 · 정산검토 4건",
      badge: "확인 필요",
      badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
      icon: Receipt,
      iconBg: "bg-amber-50 text-amber-600 border-amber-200",
      targetPath: "/owner/revenues",
    },
    {
      label: "이번 달 누적 운임 매출",
      value: "₩18,240,000",
      sub: "월간 누적 248회 운행 완료 (VAT 별도)",
      badge: "+12.4% 전월 대비",
      badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: TrendingUp,
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
      targetPath: "/owner/statistics",
    },
  ];

  const todayDispatches = [
    {
      id: 1,
      carNumber: "경기 82자 7732 (25.5톤)",
      driver: "강감찬 기사",
      siteName: "검단 3공구 택지개발 현장",
      dropoffName: "김포 양촌 제1사토장",
      soil: "양질토",
      trips: "3회차 운행 중",
      status: "하차지 이동 중",
      statusStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
      time: "14:25 상차승인",
    },
    {
      id: 2,
      carNumber: "경기 80바 4531 (25.5톤)",
      driver: "김철수 기사",
      siteName: "신길동 아파트 신축공사",
      dropoffName: "파주 적성 매립지",
      soil: "암버럭",
      trips: "2회차 완료",
      status: "반입 완료",
      statusStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
      time: "14:10 하차완료",
    },
    {
      id: 3,
      carNumber: "인천 88아 1209 (25.5톤)",
      driver: "박준형 기사",
      siteName: "검단 3공구 택지개발 현장",
      dropoffName: "강화 길상 사토장 (변경)",
      soil: "뻘흙",
      trips: "2회차 운행 중",
      status: "하차지 변경됨",
      statusStyle: "bg-amber-50 text-amber-700 border-amber-300",
      time: "13:50 경로변경",
    },
    {
      id: 4,
      carNumber: "서울 85사 9081 (15톤)",
      driver: "이정재 기사",
      siteName: "영종도 물류센터 터파기",
      dropoffName: "영종 제2매립장",
      soil: "풍화암",
      trips: "4회차 상차 대기",
      status: "상차지 도착",
      statusStyle: "bg-blue-50 text-blue-700 border-blue-200",
      time: "14:32 게이트진입",
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">차주 · 운송사 통합 관제 대시보드</h2>
          <p className="text-xs text-slate-500 mt-1">
            소속 덤프 차량의 실시간 배차 운행 현황과 운반비 정산 내역을 한눈에 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            소속 차량 GPS 전자전표 실시간 연동 중
          </span>
        </div>
      </div>

      {/* 1. KPI Summary 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => setActivePath(card.targetPath)}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                  {card.label}
                </span>
                <div className={`p-2 rounded-xl border ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{card.value}</div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 truncate">{card.sub}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Middle Section: Today's Active Fleet Dispatch & Settlement Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): 실시간 소속 차량 배차 및 운행 현황 */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">금일 소속 차량 배차 및 운행 현황</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                현재 현장에 투입되어 운행 중인 소속 덤프트럭의 실시간 상·하차 상태입니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePath("/owner/schedule")}
              className="text-xs text-blue-600 font-extrabold hover:underline flex items-center gap-1"
            >
              배차 스케줄러 이동 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {todayDispatches.map((item) => (
              <div
                key={item.id}
                onClick={() => setActivePath("/owner/schedule")}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100/80 text-blue-700 border border-blue-200 shrink-0 mt-0.5">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{item.carNumber}</span>
                      <span className="text-[11px] font-bold text-slate-600">· {item.driver}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white border border-slate-200 text-slate-700">
                        {item.soil}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-800">{item.siteName}</span>
                      <span className="text-blue-600 font-black">➔</span>
                      <span className="font-bold text-emerald-700">{item.dropoffName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${item.statusStyle}`}>
                    {item.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.trips} · {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1 col): 운반비 정산 및 마감 현황 요약 */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">운반비 정산 진행 현황</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">전표 검수 및 대금 수령 단계별 요약</p>
              </div>
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                onClick={() => setActivePath("/owner/revenues")}
                className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between cursor-pointer hover:bg-indigo-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-extrabold text-indigo-950 block">입금 수령확인 대기</span>
                    <span className="text-[10px] text-indigo-700 font-semibold">현장 송금 완료 · 차주 수령확인 필요</span>
                  </div>
                </div>
                <span className="text-sm font-black text-indigo-700">3 건</span>
              </div>

              <div
                onClick={() => setActivePath("/owner/revenues")}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">현장 정산 검토 대기</span>
                    <span className="text-[10px] text-slate-500 font-medium">운행 완료 후 현장 승인 대기 중</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-800">4 건</span>
              </div>

              <div
                onClick={() => setActivePath("/owner/revenues")}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">정산 금액 이의 / 협의 중</span>
                    <span className="text-[10px] text-slate-500 font-medium">회차비 및 대기료 협의 진행 건</span>
                  </div>
                </div>
                <span className="text-sm font-black text-amber-600">1 건</span>
              </div>

              <div
                onClick={() => setActivePath("/owner/revenues")}
                className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 block">이번 달 정산 완료 확정</span>
                    <span className="text-[10px] text-emerald-700 font-medium">대금 입금 및 전표 마감 완료</span>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-700">240 건</span>
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setActivePath("/owner/revenues")}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/10 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              매출 및 운반 정산 관리 바로가기
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActivePath("/owner/trucks")}
                className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all flex items-center justify-center gap-1"
              >
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                차량 등록/관리
              </button>
              <button
                type="button"
                onClick={() => setActivePath("/owner/drivers")}
                className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all flex items-center justify-center gap-1"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                기사 관리
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: 소속 차량 주간 운행 실적 트렌드 */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">소속 차량 주간 배차 실적 추이</h3>
              <p className="text-[11px] text-slate-500">최근 4주간 소속 덤프 차량의 운행 완료 회전수 및 가동 추이</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActivePath("/owner/statistics")}
            className="text-xs text-blue-600 font-extrabold hover:underline flex items-center gap-1"
          >
            운행 통계 상세 대장 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-36 flex items-end justify-around gap-4 bg-slate-50 px-6 py-4 rounded-xl border border-slate-200/70">
          <div className="flex flex-col items-center gap-1.5 w-24">
            <span className="text-[11px] text-slate-600 font-extrabold">52회 (₩9.3M)</span>
            <div className="w-10 h-[48px] bg-slate-300 rounded-t-lg" />
            <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">1주차</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 w-24">
            <span className="text-[11px] text-slate-600 font-extrabold">61회 (₩10.9M)</span>
            <div className="w-10 h-[58px] bg-slate-400 rounded-t-lg" />
            <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">2주차</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 w-24">
            <span className="text-[11px] text-slate-600 font-extrabold">65회 (₩11.7M)</span>
            <div className="w-10 h-[64px] bg-blue-400 rounded-t-lg" />
            <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">3주차</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 w-24">
            <span className="text-[11px] text-blue-600 font-black">70회 (₩12.6M)</span>
            <div className="w-10 h-[74px] bg-blue-600 rounded-t-lg shadow-md" />
            <span className="text-[11px] text-blue-700 font-extrabold whitespace-nowrap">금주 (진행중)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
