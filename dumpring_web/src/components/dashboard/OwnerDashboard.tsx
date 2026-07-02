import React from "react";

interface OwnerDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  ownerBroadcastSuccess: boolean;
  setOwnerBroadcastSuccess: (val: boolean) => void;
}

export function OwnerDashboard({
  activePath,
  setActivePath,
  ownerBroadcastSuccess,
  setOwnerBroadcastSuccess,
}: OwnerDashboardProps) {
  // 1. 운송사 대시보드 메인 (/owner)
  if (activePath === "/owner") {
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

  // 2. 배차 스케줄러 (/owner/schedule)
  if (activePath === "/owner/schedule") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">운송사 소속 차량 배차 스케줄러</h2>
            <p className="text-xs text-slate-500 mt-1">현장별 반출 스케줄에 따라 우리 덤프트럭들의 투입 일정표를 배정합니다.</p>
          </div>
          <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-800">인천 검단 3공구 반출 노선 (사토)</span>
              <p className="text-slate-500 mt-1">운행일자: 2026-06-03 | 소속 덤프 8대 배차 투입 완료 | 대표 기사: 강감찬</p>
            </div>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-600 rounded font-bold">배차 확정</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-800">영종도 A지구 신축 사토 노선 (혼합골재)</span>
              <p className="text-slate-500 mt-1">운행일자: 2026-06-04 | 소속 덤프 4대 배차 진행 중</p>
            </div>
            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 rounded font-bold">대기 중</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. 소속 차량 & 기사 관리 (/owner/fleet)
  if (activePath === "/owner/fleet") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">운송사 소속 차량 및 기사 디렉토리</h2>
            <p className="text-xs text-slate-500 mt-1">법인에 소속되어 배차를 부여받는 덤프트럭 자산과 전문 드라이버 정보망입니다.</p>
          </div>
          <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-850">강감찬 기사 (1종대형면허)</span>
            <p className="text-slate-500 mt-1">차량: 경기 82자 7732 (25.5톤 덤프) | 연락처: 010-1111-2222</p>
            <div className="mt-2.5 flex gap-1.5">
              <span className="px-2 py-0.2 rounded bg-emerald-50 text-emerald-600 border border-emerald-150">운행 중</span>
              <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">GPS 정상</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-850">김철수 기사 (1종대형면허)</span>
            <p className="text-slate-500 mt-1">차량: 경기 80바 4531 (25.5톤 덤프) | 연락처: 010-2222-3333</p>
            <div className="mt-2.5 flex gap-1.5">
              <span className="px-2 py-0.2 rounded bg-emerald-50 text-emerald-600 border border-emerald-150">운행 중</span>
              <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">GPS 정상</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. 운행 통계 조회 (/owner/statistics)
  if (activePath === "/owner/statistics") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">운행 통계 및 성능 실적 분석</h2>
            <p className="text-xs text-slate-500 mt-1">당사의 배차 수락 성공율과 평균 덤프 순환 속도를 요약합니다.</p>
          </div>
          <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-slate-500">배차 수락 성공율</span>
            <p className="text-2xl font-black text-blue-600 mt-1.5">98.4%</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-slate-500">누적 반반출 흙량</span>
            <p className="text-2xl font-black text-slate-800 mt-1.5">4,960 ㎥</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-slate-500">기사당 월간 운행 횟수</span>
            <p className="text-2xl font-black text-slate-800 mt-1.5">13.7 회</p>
          </div>
        </div>
      </div>
    );
  }

  // 5. 매출 및 운반 정산 (/owner/revenues)
  if (activePath === "/owner/revenues") {
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

  // 6. 알림 센터 (/owner/notice)
  if (activePath === "/owner/notice") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">B2B 파트너 알림 전송 및 수신 센터</h2>
            <p className="text-xs text-slate-500 mt-1">수신된 본부 공지사항을 확인하고, 소속 덤프 기사에게 긴급 알림을 모바일 푸시로 발송합니다.</p>
          </div>
          <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Broadcaster */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between min-h-[280px]">
            <div>
              <span className="font-bold text-slate-750 block border-b border-slate-200 pb-2 mb-3">소속 기사 대상 모바일 푸시 발송기</span>
              {ownerBroadcastSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg mb-3">
                  ✓ 소속 드라이버들의 모바일 앱으로 공지가 즉시 수신 처리되었습니다.
                </div>
              )}
              <textarea
                placeholder="예: 영종도 매립구역 C-3 게이트 비산 방지용 물세척 장치가 작동 중이오니 천천히 진입하세요."
                rows={4}
                disabled={ownerBroadcastSuccess}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800"
              />
            </div>
            {!ownerBroadcastSuccess ? (
              <button onClick={() => setOwnerBroadcastSuccess(true)} className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md">
                긴급 메시지 푸시 발송
              </button>
            ) : (
              <button onClick={() => setOwnerBroadcastSuccess(false)} className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
                새 공지 작성
              </button>
            )}
          </div>

          {/* Recipient Feed */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-slate-750 block border-b border-slate-200 pb-2">플랫폼 본부 수신 피드</span>
            <div className="p-3 bg-white border border-slate-200 rounded">
              <span className="text-[9px] text-blue-600 font-bold">[긴급]</span>
              <p className="font-bold text-slate-800 mt-1">인천 영종도 C구역 진입로 토요일 야간 통제 안내</p>
              <span className="text-[10px] text-slate-400 mt-1 block">작성: 플랫폼 본부 | 2026-05-27</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-20 animate-fadeIn">
      <h2 className="text-lg font-bold text-slate-800">개발 진행 중</h2>
      <p className="text-xs text-slate-500 mt-2">선택하신 {activePath} 메뉴는 추가 개발 연동 대기 중입니다.</p>
    </div>
  );
}
