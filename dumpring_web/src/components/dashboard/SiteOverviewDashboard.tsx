"use client";

import React, { useState } from "react";
import { Building2, Truck, CheckCircle2, Clock, MapPin, AlertCircle, BarChart3, ArrowUpRight, TrendingUp } from "lucide-react";
import { MockMap } from "./MockMap";

interface SiteOverviewDashboardProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteOverviewDashboard({
  registeredSiteList = [],
  dispatchRequestList = [],
}: SiteOverviewDashboardProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(16);

  // Mock Overview Stats
  const stats = [
    { label: "운영 중인 공사 현장", value: `${registeredSiteList.length || 2} 개소`, icon: Building2, change: "+1 이번 달", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "금일 배차 오더 진행 건수", value: "12 건", icon: Truck, change: "+3 건 (전일 대비)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "실시간 운행 중 덤프 차량", value: "35 대", icon: Clock, change: "정상 운행 중", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { label: "본사 검증 완료 서류", value: "100 %", icon: CheckCircle2, change: "검수 완료", color: "text-purple-600 bg-purple-50 border-purple-200" },
  ];

  // Mock Active Dispatch Activity Logs
  const activeDispatches = [
    { id: 1, siteName: "신길동 아파트 건설 현장", truckNo: "서울 88바 1234 (25톤)", status: "하차지 이동 중", time: "14:25 출하", driver: "김철수 차주", soil: "양질토사 (A급)" },
    { id: 2, siteName: "신길동 아파트 건설 현장", truckNo: "경기 80사 5678 (25톤)", status: "현장 상차 완료", time: "14:28 상차", driver: "박영희 차주", soil: "양질토사 (A급)" },
    { id: 3, siteName: "인천 검단 3공구 택지개발 현장", truckNo: "인천 90자 9999 (25톤)", status: "사토장 하차 중", time: "14:15 진입", driver: "이동수 차주", soil: "풍화암 토사" },
    { id: 4, siteName: "인천 검단 3공구 택지개발 현장", truckNo: "서울 82가 3344 (25톤)", status: "복귀 운행 중", time: "14:30 회차", driver: "최민수 차주", soil: "풍화암 토사" },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Title */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장 관리 통합 요약 대시보드</h2>
          <p className="text-xs text-slate-500 mt-1">
            소속 공사 현장의 실시간 배차 오더 진척률과 덤프 차량 운행 현황을 한눈에 관제합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            실시간 GPS 통합 관제 작동 중
          </span>
        </div>
      </div>

      {/* Overview 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md space-y-3 hover:shadow-lg transition-all">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">{st.label}</span>
                <div className={`p-2 rounded-xl border ${st.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-2xl font-black text-slate-900">{st.value}</span>
                <span className="text-[10.5px] font-bold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {st.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Realtime Dispatch Log & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Realtime Active Truck Logs */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">실시간 현장 출하 및 덤프 운행 현황</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">금일 관제 중인 상하차 출하 모니터링 로그입니다.</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">자동 갱신 (5초)</span>
          </div>

          <div className="space-y-3">
            {activeDispatches.map((log) => (
              <div key={log.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-blue-50/50 hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{log.siteName}</span>
                      <span className="text-[10px] font-mono text-slate-500">({log.driver})</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                      {log.truckNo} <span className="text-slate-300">|</span> <span className="text-blue-600 font-semibold">{log.soil}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 block">
                    {log.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Realtime Location Map */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">현장 실시간 위치 관제</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">선택된 공사 현장의 지도 위치를 확인합니다.</p>
          </div>

          <div className="h-72 rounded-xl border border-slate-200 overflow-hidden relative shadow-inner">
            <MockMap
              title={registeredSiteList[0]?.name || "신길동 아파트 건설 현장"}
              address={registeredSiteList[0]?.address || "서울 영등포구 신길동 123-45"}
              pinned={true}
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-normal">
            💡 현장 상하차 게이트 진입 시 GPS 전자 송장(e-Ticket)이 자동으로 발급되며, 세금계산서 정산 데이터와 실시간 연동됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
