import React from "react";

interface OwnerOverviewDashboardProps {
  setActivePath: (path: string) => void;
}

export function OwnerOverviewDashboard({ setActivePath }: OwnerOverviewDashboardProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">소속 등록 트럭</h3>
          <p className="text-3xl font-black text-slate-900 mt-2">18 대</p>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mt-2">
            15대 정상 가동 중
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">이번 달 정산 예정액</h3>
          <p className="text-3xl font-black text-blue-600 mt-2">₩18,240,000</p>
          <span className="text-[10px] text-slate-500 font-semibold inline-block mt-2 font-mono">
            지급 예정일: 2026-06-10
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">완료 배차 건수 (월간)</h3>
          <p className="text-3xl font-black text-slate-900 mt-2">248 건</p>
          <span className="text-[10px] text-slate-500 font-semibold inline-block mt-2 font-mono">
            배차 수락률 98.4%
          </span>
        </div>
      </div>

      {/* Quick Schedule summary & Fleet Operational statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-800">소속 차량 운행 트렌드</h3>
              <p className="text-xs text-slate-500">주간 배차 실적 시계열</p>
            </div>
            <button onClick={() => setActivePath("/owner/statistics")} className="text-xs text-blue-600 font-bold hover:underline">상세 분석 대장 →</button>
          </div>
          <div className="h-32 flex items-end justify-around gap-2 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <div className="flex flex-col items-center gap-2 z-10 w-16">
              <span className="text-[10px] text-slate-600 font-bold">52회</span>
              <div className="w-8 h-[52px] bg-slate-400 rounded-t"></div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 1주차</span>
            </div>
            <div className="flex flex-col items-center gap-2 z-10 w-16">
              <span className="text-[10px] text-slate-600 font-bold">61회</span>
              <div className="w-8 h-[61px] bg-slate-400 rounded-t"></div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 2주차</span>
            </div>
            <div className="flex flex-col items-center gap-2 z-10 w-16">
              <span className="text-[10px] text-slate-600 font-bold">65회</span>
              <div className="w-8 h-[65px] bg-slate-400 rounded-t"></div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 3주차</span>
            </div>
            <div className="flex flex-col items-center gap-2 z-10 w-16">
              <span className="text-[10px] text-blue-600 font-bold">70회</span>
              <div className="w-8 h-[70px] bg-blue-600 rounded-t shadow-md"></div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 4주차</span>
            </div>
          </div>
        </div>

        {/* Quick alert and dispatcher */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-200 pb-2">기사용 공지망 바로가기</h3>
            <p className="text-xs text-slate-500 mt-2">소속 기사 18명의 모바일 앱으로 비상 지시문이나 대기 명령을 한 번에 브로드캐스트합니다.</p>
          </div>
          <button onClick={() => setActivePath("/owner/notice")} className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/10">
            기사 긴급 알림 방송실 이동
          </button>
        </div>
      </div>
    </div>
  );
}
