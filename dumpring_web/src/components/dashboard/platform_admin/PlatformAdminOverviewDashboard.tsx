import React from "react";
import { MapPin } from "lucide-react";

interface PlatformAdminOverviewDashboardProps {
  setActivePath: (path: string) => void;
  commissionRate: number;
  baseTariff: number;
  tonnages: any[];
  drivers: any[];
  owners: any[];
  sites: any[];
  dropoffSites: any[];
  disputes: any[];
}

export function PlatformAdminOverviewDashboard({
  setActivePath,
  commissionRate,
  baseTariff,
  tonnages,
  drivers,
  owners,
  sites,
  dropoffSites,
  disputes,
}: PlatformAdminOverviewDashboardProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cards Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "오늘 매칭 배차 수송", val: "142 건", change: "+18.4% 지난주 대비", icon: MapPin, color: "bg-blue-50 text-blue-600" },
          { title: "실시간 운행 덤프 트럭", val: "89 대", change: "가동률 84.2%", icon: MapPin, color: "bg-emerald-50 text-emerald-600" },
          { title: "이번 달 누적 수수료 매출", val: "₩24,800,000", change: "목표 달성률 92%", icon: MapPin, color: "bg-purple-50 text-purple-600" },
          { title: "미결 분쟁 / 승인 대기", val: "6 건", change: "긴급 처리 필요 2건", icon: MapPin, color: "bg-amber-50 text-amber-600" }
        ].map((c, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200 flex justify-between items-center shadow-xl">
            <div>
              <p className="text-xs font-semibold text-slate-600">{c.title}</p>
              <h3 className="text-xl font-black mt-2 text-slate-900">{c.val}</h3>
              <span className="text-[10px] text-slate-500 font-medium block mt-1">{c.change}</span>
            </div>
            <div className={`p-3 rounded-xl ${c.color} border border-slate-200`}>
              <c.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map Preview Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-base text-slate-800">실시간 전국 덤프링 현장 지도 모니터링</h2>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Tracking
              </span>
            </div>
            <div className="h-64 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-30 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              <div className="relative z-10 flex flex-col items-center text-center px-6">
                <MapPin className="w-8 h-8 text-blue-600 animate-bounce mb-2" />
                <p className="text-sm font-semibold text-slate-700">인천 검단 3공구 현장 외 18개 현장 모니터링 중</p>
                <p className="text-xs text-slate-500 mt-1">실시간 배차 트럭 위경도 데이터 수신 상태 정상 (1.2s 주기)</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 pt-3">
            <span>최근 GPS 갱신: 방금 전</span>
            <button onClick={() => setActivePath("/admin/sites")} className="text-blue-600 font-bold hover:underline">상세 관제 지도 페이지로 이동 →</button>
          </div>
        </div>

        {/* Quick Link/Summary Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xl">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">승인 신청 실시간 대기 현황</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">1. 신규 기사 가입 대기</span>
                <button
                  onClick={() => setActivePath("/admin/approval")}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                >
                  {drivers.filter(d => d.status === "대기").length}건 검증하기 →
                </button>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">2. 차주 및 운송사 승인 대기</span>
                <button
                  onClick={() => setActivePath("/admin/approval")}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                >
                  {owners.filter(o => o.status === "대기").length}건 검증하기 →
                </button>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">3. 반출 현장 가입 대기</span>
                <button
                  onClick={() => setActivePath("/admin/approval")}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                >
                  {sites.filter(s => s.status === "대기").length}건 검증하기 →
                </button>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">4. 하차지(사토장) 승인 대기</span>
                <button
                  onClick={() => setActivePath("/admin/approval")}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                >
                  {dropoffSites.filter(d => d.status === "대기").length}건 검증하기 →
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
            통합 승인 심사 센터 메뉴를 통해 전체 가입자의 증빙 서류를 한눈에 검색하고 검증 및 승인합니다.
          </div>
        </div>
      </div>

      {/* Integrated Fees, Disputes, Support Boards at the bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fees Policy Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">실시간 단가 및 수수료 현황</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50/50 border border-blue-150">
                <span className="text-blue-600 font-bold">글로벌 플랫폼 수수료율</span>
                <span className="font-bold text-blue-600 font-mono text-sm">{commissionRate}%</span>
              </div>

              <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-black border-b border-slate-200/80 pb-1 mb-1.5 flex justify-between">
                  <span>톤수 공통코드</span>
                  <span>기본운임 (플랫폼 수수료)</span>
                </div>
                {tonnages.map(t => {
                  const fee = Math.round(t.baseTariff * (commissionRate / 100));
                  return (
                    <div key={t.code} className="flex justify-between items-center text-[10.5px] font-semibold text-slate-700">
                      <span>{t.name} <span className="text-[8px] font-mono text-slate-400">({t.code})</span></span>
                      <span className="font-mono text-slate-900 font-extrabold">
                        {t.baseTariff.toLocaleString()}원
                        <span className="text-[9px] text-blue-600 font-medium ml-1">({fee.toLocaleString()}원)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <button onClick={() => setActivePath("/admin/fees")} className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-800">
            톤수별 단가/수수료 설정 바로가기 →
          </button>
        </div>

        {/* Disputes Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">최근 민원 및 분쟁</h2>
            <div className="space-y-2.5">
              {disputes.slice(0, 2).map((d) => (
                <div key={d.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-800">{d.type}</span>
                    <span className="text-[10px] text-amber-600 font-bold">{d.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setActivePath("/admin/disputes")} className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-800">
            분쟁 중재 센터 이동 →
          </button>
        </div>

        {/* Announcements Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">고객지원 & 공지</h2>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-800">모바일 정산 에러 관련 문의</p>
              <p className="text-slate-600 text-[11px]">가끔 가입 승인 단계에서 데이터를 재조회할 때 에러 레이어가 뜨는 현상 검토 중.</p>
            </div>
          </div>
          <button onClick={() => setActivePath("/admin/boards")} className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-800">
            고객 및 게시판 관리 이동 →
          </button>
        </div>
      </div>
    </div>
  );
}
