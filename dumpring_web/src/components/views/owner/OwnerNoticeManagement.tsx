import React from "react";

interface OwnerNoticeManagementProps {
  setActivePath: (path: string) => void;
  ownerBroadcastSuccess: boolean;
  setOwnerBroadcastSuccess: (val: boolean) => void;
}

export function OwnerNoticeManagement({
  setActivePath,
  ownerBroadcastSuccess,
  setOwnerBroadcastSuccess,
}: OwnerNoticeManagementProps) {
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
