import React from "react";

export interface MatchStatusCardProps {
  id: number;
  title: string; // 현장명 또는 하차지명
  subtitle?: string; // 주소 등
  direction: "site_to_dropoff" | "dropoff_to_site"; // Flow A: 현장➔하차지, Flow B: 하차지➔현장
  rawStatus: "WAITING_MATCH" | "WAITING_APPROVAL" | "OPEN" | "CANCELLED" | "CLOSED" | string;
  isMyInitiated: boolean; // 내가 먼저 등록/신청/제안한 건인지 여부
  workDate?: string;
  materialType?: string;
  truckCount?: number;
  unitPrice?: number;
  distance?: number;
  estimatedTime?: number;
  memo?: string;
  rejectionReason?: string;

  // 액션 이벤트 핸들러
  onApprove?: () => void;
  onReject?: () => void;
  onReset?: () => void;
}

export const MatchStatusCard: React.FC<MatchStatusCardProps> = ({
  id,
  title,
  subtitle,
  direction,
  rawStatus,
  isMyInitiated,
  workDate,
  materialType,
  truckCount,
  unitPrice,
  distance,
  estimatedTime,
  memo,
  rejectionReason,
  onApprove,
  onReject,
  onReset,
}) => {
  // 토사 종류 한글 변환
  const formatMaterial = (type?: string) => {
    switch (type) {
      case "GOOD_SOIL": return "양질토";
      case "MUD_SOIL": return "뻘흙";
      case "ROCK": return "암버럭";
      case "MIXED": return "혼합";
      default: return type || "토사미지정";
    }
  };

  // 1. 방향 태그 라벨
  const directionText = direction === "site_to_dropoff" ? "현장 ➔ 하차지" : "하차지 ➔ 현장";

  // 2. 통합 상태 뱃지 판별
  const renderBadge = () => {
    if (rawStatus === "WAITING_APPROVAL") {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 shadow-sm animate-pulse">
          {isMyInitiated ? "⏳ 상대방 승인 대기" : "📥 승인 요청 수신"}
        </span>
      );
    }
    if (rawStatus === "OPEN") {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-250 shadow-sm">
          매칭 완료 (배차 진행)
        </span>
      );
    }
    if (rawStatus === "CANCELLED") {
      return (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border shadow-sm ${
          isMyInitiated ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-250"
        }`}>
          {isMyInitiated ? "상대방에 의해 반려됨" : "내가 매칭 반려함"}
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">
        {rawStatus}
      </span>
    );
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-md hover:shadow-lg transition-all space-y-3">
      {/* Header: 명칭, 방향 태그, 상태 뱃지 */}
      <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-2.5 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-900">{title}</span>
          {subtitle && <span className="text-[10px] font-medium text-slate-400">({subtitle})</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {directionText}
          </span>
          {renderBadge()}
        </div>
      </div>

      {/* Body: 표준 2열 그리드 정보 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600">
        <div>• 작업(수용) 예정일: <span className="text-slate-950 font-bold">{workDate || "일정 미지정"}</span></div>
        <div>• 토사 종류: <span className="text-blue-700 font-bold">{formatMaterial(materialType)}</span></div>
        <div>• 요청/목표 수량: <span className="text-slate-950 font-bold">{truckCount ? `${truckCount} 대` : "미정"}</span></div>
        <div>• 제시/수용 단가: <span className="text-emerald-700 font-bold">{unitPrice ? `${unitPrice.toLocaleString()} 원/㎥` : "미정"}</span></div>

        {(distance !== undefined && distance !== null) && (
          <div className="col-span-2 text-slate-700 font-bold bg-slate-50 p-2 rounded-lg border border-slate-150">
            📍 예상 거리 / 소요시간: <span className="text-blue-800 font-extrabold">{distance} km</span> ({estimatedTime}분 소요)
          </div>
        )}

        {memo && (
          <div className="col-span-2 text-slate-500 font-medium text-[10.5px] border-t border-slate-100 pt-1.5 leading-relaxed">
            • 참고 메모: {memo}
          </div>
        )}
      </div>

      {/* Footer Area: WAITING_APPROVAL 액션 및 CANCELLED 사유 렌더링 */}
      {rawStatus === "WAITING_APPROVAL" && (
        <div className="pt-2 border-t border-slate-150">
          {isMyInitiated ? (
            /* 내가 먼저 보낸 요청/제안인 경우: 상대방 검토 안내 (버튼 없음) */
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-800 leading-normal flex items-center justify-between">
              <div>
                ⏳ <strong>승인 대기 중:</strong> 상대방이 매칭 조건을 검토하고 있습니다. (승인 시 즉시 활성화)
              </div>
            </div>
          ) : (
            /* 수신받은 요청/제안인 경우: [승인] & [반려] 버튼 제공 */
            <div className="p-3 bg-amber-50/90 border border-amber-250 rounded-xl space-y-2.5 animate-fadeIn">
              <div className="text-[11px] font-bold text-amber-900 leading-normal">
                📥 <strong>매칭 승인 요청 수신:</strong> 상대방이 매칭을 요청했습니다. 조건 확인 후 승인해 주십시오.
              </div>
              <div className="flex gap-2 justify-end">
                {onApprove && (
                  <button
                    type="button"
                    onClick={onApprove}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                  >
                    매칭 승인
                  </button>
                )}
                {onReject && (
                  <button
                    type="button"
                    onClick={onReject}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold text-xs rounded-xl active:scale-95 transition-all"
                  >
                    매칭 반려
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CANCELLED 상태: 반려 사유 배너 및 [확인 완료] 버튼 */}
      {rawStatus === "CANCELLED" && (
        <div className="pt-2 border-t border-slate-150">
          <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 font-extrabold rounded-xl leading-normal text-[11px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-fadeIn">
            <div>
              ⚠️ {isMyInitiated ? `상대방 반려 사유: ${rejectionReason || "사유 미작성"}` : `내가 작성한 반려 사유: ${rejectionReason || "사유 미작성"}`}
            </div>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10.5px] rounded-lg active:scale-95 transition-all shadow-sm whitespace-nowrap animate-pulse"
              >
                확인 완료 (초기화)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
