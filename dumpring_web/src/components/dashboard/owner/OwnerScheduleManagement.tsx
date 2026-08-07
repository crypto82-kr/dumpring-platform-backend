import React from "react";

interface OwnerScheduleManagementProps {
  setActivePath: (path: string) => void;
}

export function OwnerScheduleManagement({ setActivePath }: OwnerScheduleManagementProps) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">배차 관리자 스케줄러 & 실시간 가동 관제</h2>
          <p className="text-xs text-slate-500 mt-1">소속 덤프 기사들의 날짜별 배차 현황과 운행 스케줄을 실시간 타임라인으로 관리합니다.</p>
        </div>
        <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
          ← 대시보드로 돌아가기
        </button>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <span className="font-bold text-xs text-slate-700">오늘의 덤프 가동 현황 (18대 중 15대 운행 중)</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-400 font-mono block">경기80사1234 (김철수)</span>
            <span className="font-bold text-emerald-600">인천 검단 → 사토장 운행 중 (3회차)</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-400 font-mono block">경기80사5678 (이영희)</span>
            <span className="font-bold text-blue-600">영종도 매립지 대기 중</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-400 font-mono block">경기80사9999 (박민수)</span>
            <span className="font-bold text-amber-600">상차 대기 중</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-400 font-mono block">서울88바4321 (최동수)</span>
            <span className="font-bold text-slate-400">휴무 / 점검 중</span>
          </div>
        </div>
      </div>
    </div>
  );
}
