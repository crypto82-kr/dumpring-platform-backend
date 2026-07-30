import React from "react";

interface OwnerSettlementManagementProps {
  setActivePath: (path: string) => void;
}

export function OwnerSettlementManagement({ setActivePath }: OwnerSettlementManagementProps) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">월간 배차 운반 수송비 대금 정산서</h2>
          <p className="text-xs text-slate-500 mt-1">공사현장별로 운반을 완료하여 플랫폼 매칭 수수료를 공제한 최종 실지급 예정액입니다.</p>
        </div>
        <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
          ← 대시보드로 돌아가기
        </button>
      </div>
      <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 max-w-md space-y-4">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">B2B 대금 정산 요약</span>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600 font-semibold">총 매칭 덤프 운임 매출:</span>
            <span className="font-bold text-slate-800">₩19,840,050</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 font-semibold">덤프링 플랫폼 매칭 수수료 (8% 공제):</span>
            <span className="font-bold text-rose-500">-₩1,600,050</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 mt-3">
            <span className="text-slate-700 font-bold text-sm">실 지급 예정 정산액:</span>
            <span className="font-black text-lg text-blue-600">₩18,240,000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
