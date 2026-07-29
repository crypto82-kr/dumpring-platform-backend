"use client";

import React, { useState } from "react";
import { Building2, Truck, CheckCircle2, Clock, MapPin, AlertCircle, BarChart3, ArrowUpRight, TrendingUp } from "lucide-react";
import { MockMap } from "./MockMap";

interface DropoffOverviewDashboardProps {
  registeredDropoffList?: any[];
  dropoffRequestList?: any[];
}

export default function DropoffOverviewDashboard({
  registeredDropoffList = [],
  dropoffRequestList = [],
}: DropoffOverviewDashboardProps) {
  const [selectedDropoffId, setSelectedDropoffId] = useState<number | null>(null);

  // Stats summary cards
  const stats = [
    { label: "운영 중인 사토장/하차지", value: `${registeredDropoffList.length || 1} 개소`, icon: MapPin, change: "정상 가동 중", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "토사 반입 수용 공고 건수", value: `${dropoffRequestList.length || 0} 건`, icon: Truck, change: "실시간 노출 중", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "금일 반입 확인 덤프 차량", value: "18 대", icon: Clock, change: "정상 반입 처리", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { label: "필수 인허가 서류 제출률", value: "100 %", icon: CheckCircle2, change: "검수 완료", color: "text-purple-600 bg-purple-50 border-purple-200" },
  ];

  const activeDrop = registeredDropoffList.find((d) => d.id === selectedDropoffId) || registeredDropoffList[0] || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Title */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">하차지 관제 통합 요약 대시보드</h2>
          <p className="text-xs text-slate-500 mt-1">
            소속 사토장의 토사 반입 수용 용량 현황 및 실시간 반입 차량 관제 상태를 모니터링합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            하차지 시스템 정상 작동 중
          </span>
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 relative overflow-hidden group hover:border-blue-300 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-extrabold text-slate-500">{item.label}</span>
                <div className={`p-2.5 rounded-xl border ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</div>
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{item.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Split: Dropoff Info & Map Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dropoff List Overview */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            소속 사토장 현황 ({registeredDropoffList.length})
          </h3>
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {registeredDropoffList.map((drop) => {
              const isSelected = activeDrop?.id === drop.id;
              return (
                <div
                  key={drop.id}
                  onClick={() => setSelectedDropoffId(drop.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-300 shadow-md"
                      : "bg-slate-50 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-black ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                      {drop.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                      수용 가능
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 truncate">{drop.address}</p>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-between text-[10px] font-semibold text-slate-400">
                    <span>계약 용량: {drop.capacity.toLocaleString()} ㎥</span>
                    <span className="text-blue-600 font-bold">상세 보기 ➔</span>
                  </div>
                </div>
              );
            })}
            {registeredDropoffList.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                등록된 사토장 정보가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dropoff Location Map */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {activeDrop ? `[${activeDrop.name}] 사토장 위치 관제` : "하차지 위치 관제"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">사토장 소재지 및 주변 지형 관제 지도입니다.</p>
            </div>
          </div>
          {activeDrop ? (
            <div className="space-y-3">
              <MockMap title={activeDrop.name} address={activeDrop.address} pinned={true} />
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">사토장 명칭</span>
                  <span className="font-extrabold text-slate-800">{activeDrop.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">소재지</span>
                  <span className="font-semibold text-slate-700 truncate block">{activeDrop.address}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">계약 용량</span>
                  <span className="font-extrabold text-blue-600">{activeDrop.capacity.toLocaleString()} ㎥</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 font-bold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              조회할 사토장을 선택해 주십시오.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
