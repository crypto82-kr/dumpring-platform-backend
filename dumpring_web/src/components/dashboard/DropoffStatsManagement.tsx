"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, Truck, MapPin, Calendar, PieChart, Download } from "lucide-react";

interface DropoffStatsManagementProps {
  registeredDropoffList?: any[];
}

export default function DropoffStatsManagement({
  registeredDropoffList = [],
}: DropoffStatsManagementProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"WEEK" | "MONTH" | "YEAR">("MONTH");

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">하차지 정보 및 운행 통계 분석</h2>
          <p className="text-xs text-slate-500 mt-1">
            하차지별 토사 반입량, 처리 잔여 용량 및 현장별 반입 추이를 다각도로 분석합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => alert("통계 보고서 PDF 다운로드가 시작됩니다.")}
            className="px-4 py-2.5 bg-slate-900 text-white font-extrabold text-xs rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md"
          >
            📥 통계 보고서 PDF
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold text-slate-500">분석 기간:</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedPeriod("WEEK")}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${selectedPeriod === "WEEK" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              주간
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod("MONTH")}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${selectedPeriod === "MONTH" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500"}`}
            >
              월간
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod("YEAR")}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${selectedPeriod === "YEAR" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              연간
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase">총 누적 반입 차량</span>
          <div className="text-2xl font-black text-slate-900">1,240 대</div>
          <span className="text-[10px] text-emerald-600 font-bold">전월 대비 +14.2% 증대</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase">반입 토사 총 용량</span>
          <div className="text-2xl font-black text-blue-600">31,000 ㎥</div>
          <span className="text-[10px] text-blue-500 font-bold">양질토 비율 82%</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase">하차지 평균 수용률</span>
          <div className="text-2xl font-black text-emerald-600">68.5 %</div>
          <span className="text-[10px] text-slate-400 font-semibold">잔여 용량 여유 있음</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase">매칭 성공 현장 수</span>
          <div className="text-2xl font-black text-amber-600">12 개 현장</div>
          <span className="text-[10px] text-amber-600 font-bold">활성 거래 지속</span>
        </div>
      </div>

      {/* Chart Visualizations (Mock Visual Blocks) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              일자별 덤프트럭 반입 통계 추이
            </h4>
          </div>
          <div className="h-48 flex items-end justify-between gap-2 pt-8 pb-2 px-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full bg-blue-500 rounded-t-lg h-[40%]"></div>
              <span className="text-[10px] font-bold text-slate-500">월</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full bg-blue-500 rounded-t-lg h-[65%]"></div>
              <span className="text-[10px] font-bold text-slate-500">화</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full bg-blue-600 rounded-t-lg h-[85%]"></div>
              <span className="text-[10px] font-bold text-slate-500">수</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full bg-blue-500 rounded-t-lg h-[50%]"></div>
              <span className="text-[10px] font-bold text-slate-500">목</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full bg-blue-700 rounded-t-lg h-[95%]"></div>
              <span className="text-[10px] font-bold text-slate-500">금</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full bg-blue-400 rounded-t-lg h-[30%]"></div>
              <span className="text-[10px] font-bold text-slate-500">토</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              반입 토사 종류별 비중 분석
            </h4>
          </div>
          <div className="h-48 bg-slate-50 rounded-xl border border-slate-200/80 p-4 flex items-center justify-around">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                양질토 (75%)
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                뻘흙 (15%)
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                기타/암버럭 (10%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
