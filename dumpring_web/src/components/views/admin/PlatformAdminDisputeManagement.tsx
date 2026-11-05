import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Phone,
  Copy,
  CheckCircle2,
  XCircle,
  Truck,
  Building2,
  MapPin,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Lock,
  Camera,
  RotateCcw,
  UserX
} from "lucide-react";

// 분쟁/이슈 유형: 상단 탭은 심플하게 3대 핵심 정산/반려 위주, 노쇼는 목록 및 검색에서 뱃지로 확인
export type DisputeType = 
  | "DROPOFF_REJECT"      // 1. 하차지 반입 반려 (토사 불량 / 회차 발생)
  | "DUMP_SETTLEMENT"     // 2. 덤프비·대기료 미입금 (현장 송금 지연)
  | "SOIL_SETTLEMENT"     // 3. 사토장 흙값 정산 지연 (토사대금 미송금)
  | "DRIVER_NOSHOW";      // 4. 기사 노쇼 (현장 긴급 재배차 건 / 목록 및 검색 조회)

export type DisputeStatus = "PENDING" | "RESOLVED" | "OVERDUE";
export type EmergencyAction = 
  | "FORCE_COMPLETE"      // 사토장 오클릭 소명 시 [정상 완료]로 전표 복구
  | "FORCE_REJECT"        // [반려 확정 종결] (회차 인정, 분쟁 마감)
  | "PENALTY_DRIVER"      // 상습 노쇼 기사 [배차 수락 7일 정지]
  | "BLOCK_DISPATCH";     // 악성 장기 미입금 현장 [신규 배차 일시 정지]

export interface DisputeIssue {
  id: string; // 예: 2610-82
  type: DisputeType;
  status: DisputeStatus;
  createdAt: string;
  elapsedTimeText: string;
  isOverdue?: boolean; // 48시간 이상 방치 건 (관리자 개입 대상)
  
  // 운행 기본 정보
  siteName: string;
  siteManagerName: string;
  siteManagerPhone: string;
  
  dropoffName: string;
  dropoffManagerName: string;
  dropoffManagerPhone: string;
  
  driverName: string;
  driverCarPlate: string;
  driverPhone: string;
  
  tonnage: string; // 25.5t, 15t
  soilType: string; // 사토, 양토, 혼합토
  operationDate: string;
  fareAmount: number; // 대상 금액 (운임, 대기료 또는 흙값)
  
  // 사유 요약 및 상세
  summaryReason: string;
  detailedReason: string;
  proofImageUrl?: string; // 하차지 검수 사진 (단순 조회용)
  
  // 시스템 팩트 데이터 (GPS & 타임라인 기록)
  facts: {
    gateEnteredTime?: string;
    rejectedOrSignedTime?: string;
    gateExitedTime?: string;
    stayDurationMinutes?: number;
    electronicInvoiceStatus: string;
    dunningCount?: number; // 독촉 알림 발송 횟수
    dueDateText?: string; // 입금 기한
    noshowCount?: number; // 기사 누적 노쇼 횟수
    noshowAction?: string; // 현장 소장 조치 내용
  };

  // 플랫폼 약관 및 기준 안내 (자동청구 X, 계좌 직접 송금 기준)
  guideline: {
    title: string;
    standardAmountText?: string;
    description: string;
  };
}

// 목업 데이터 (노쇼 건도 자연스럽게 포함되어 목록 및 검색으로 확인 가능)
const INITIAL_DISPUTES: DisputeIssue[] = [
  {
    id: "2610-82",
    type: "DROPOFF_REJECT",
    status: "PENDING",
    createdAt: "2026-10-30 11:20",
    elapsedTimeText: "25분 전",
    siteName: "인천 송도 B현장",
    siteManagerName: "김현장 소장",
    siteManagerPhone: "010-1234-5678",
    dropoffName: "화성 비봉 사토장",
    dropoffManagerName: "박사토 소장",
    dropoffManagerPhone: "010-3456-7890",
    driverName: "박덤프",
    driverCarPlate: "81바5678",
    driverPhone: "010-2345-6789",
    tonnage: "25.5t",
    soilType: "토사 (사토)",
    operationDate: "2026-10-30",
    fareAmount: 180000,
    summaryReason: "폐기물/이물질 혼입으로 하차지 반입 거부",
    detailedReason: "상차 토사 내 폐콘크리트 조각 및 비닐류 다량 포함으로 사토장 반입 허가 기준 미달, 즉시 회차 지시함.",
    proofImageUrl: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=500&auto=format&fit=crop&q=60",
    facts: {
      gateEnteredTime: "10/30 11:10 (GPS 인증)",
      rejectedOrSignedTime: "10/30 11:20 (하차지 관리자 반려)",
      gateExitedTime: "10/30 11:25 (GPS 이탈)",
      stayDurationMinutes: 15,
      electronicInvoiceStatus: "반입 반려됨 (회차)",
    },
    guideline: {
      title: "약관 기준: 현장 ➔ 기사 직접 계좌 송금 대상",
      standardAmountText: "25.5톤 표준 권장 회차비: 70,000원",
      description: "하차지 검수 사진이 현장 소장 화면에 전달되었습니다. 사진 확인 후 현장에서 기사 계좌로 70,000원을 직접 송금하고 전표를 종결하도록 안내합니다.",
    }
  },
  {
    id: "2610-75",
    type: "DUMP_SETTLEMENT",
    status: "OVERDUE",
    isOverdue: true,
    createdAt: "2026-10-27 14:00",
    elapsedTimeText: "3일 전 (48시간 초과)",
    siteName: "태양토건 안산 현장",
    siteManagerName: "이공무 과장",
    siteManagerPhone: "010-9876-5432",
    dropoffName: "시흥 정왕 사토장",
    dropoffManagerName: "최지주 대표",
    dropoffManagerPhone: "010-8765-4321",
    driverName: "김기사",
    driverCarPlate: "85보1234",
    driverPhone: "010-7654-3210",
    tonnage: "25.5t",
    soilType: "양토",
    operationDate: "2026-10-27",
    fareAmount: 230000,
    summaryReason: "대기료 5만원 미입금 및 덤프비 정산 지연 (48시간 방치)",
    detailedReason: "상차지 굴삭기 고장으로 2시간 15분 초과 대기 발생. 기사가 대기료 청구했으나 현장이 일방적으로 송금 보류함.",
    facts: {
      gateEnteredTime: "10/27 12:10",
      rejectedOrSignedTime: "10/27 12:30 (정상 하차 완료 서명됨)",
      stayDurationMinutes: 20,
      electronicInvoiceStatus: "하차 완료 서명됨 (정상 전표)",
      dunningCount: 3,
      dueDateText: "10/29 18:00 (만료됨)",
    },
    guideline: {
      title: "🚨 관리자 유선 확인 및 배차 잠금(Lock) 대상",
      description: "하차 완료 전표 및 현장 GPS 대기 기록이 명백합니다. 48시간이 경과하여 현장에 신규 배차 기능 정지 예고 통보가 필요합니다.",
    }
  },
  {
    id: "2610-40",
    type: "SOIL_SETTLEMENT",
    status: "PENDING",
    createdAt: "2026-10-28 17:00",
    elapsedTimeText: "2일 전",
    siteName: "수원 매탄 재개발",
    siteManagerName: "강소장",
    siteManagerPhone: "010-4444-1111",
    dropoffName: "용인 모현 사토장",
    dropoffManagerName: "윤지주",
    dropoffManagerPhone: "010-4444-2222",
    driverName: "복수 기사(12대)",
    driverCarPlate: "12대 분할 운행",
    driverPhone: "현장 직통",
    tonnage: "25.5t",
    soilType: "토사 1,500㎥",
    operationDate: "2026-10-28",
    fareAmount: 12000000,
    summaryReason: "월간 흙값(토사비) 루베 계근량 불일치로 정산 보류",
    detailedReason: "사토장 청구량 1,500㎥(1,200만원) vs 현장 장부 기록 1,350㎥(1,080만원)으로 150㎥ 차이가 발생하여 현장이 세금계산서 입금 보류 중.",
    facts: {
      electronicInvoiceStatus: "전자송장 승인 합산 1,480㎥ 대조됨",
      dunningCount: 1,
      dueDateText: "10/31 말일 마감",
    },
    guideline: {
      title: "전자송장 통과 데이터 상호 대조 안내",
      description: "시스템 전자송장 발행 합산본(1,480㎥)을 양측 소장 화면에 표출 중입니다. 차이 나는 20㎥ 건에 대해 상호 확인 후 직접 계좌 송금하도록 안내합니다.",
    }
  },
  {
    id: "2610-15",
    type: "DRIVER_NOSHOW",
    status: "PENDING",
    createdAt: "2026-10-30 07:40",
    elapsedTimeText: "현장 재배차 완료됨",
    siteName: "인천 송도 B현장",
    siteManagerName: "김현장 소장",
    siteManagerPhone: "010-1234-5678",
    dropoffName: "화성 비봉 사토장",
    dropoffManagerName: "박사토 소장",
    dropoffManagerPhone: "010-3456-7890",
    driverName: "최노쇼 기사",
    driverCarPlate: "92다3456",
    driverPhone: "010-9999-8888",
    tonnage: "25.5t",
    soilType: "토사 (사토)",
    operationDate: "2026-10-30",
    fareAmount: 180000,
    summaryReason: "현장 상차 예정시각 미도착 및 연락 두절 (노쇼)",
    detailedReason: "07:00 도착 예정이었으나 무단 미도착으로 현장 소장이 07:40에 긴급 재배차 호출 처리 완료함. 해당 기사 당월 2회 노쇼 누적.",
    facts: {
      electronicInvoiceStatus: "현장 긴급 재배차 호출 완료",
      noshowCount: 2,
      noshowAction: "인근 대기 덤프 긴급 알림 발송으로 대체 기사 매칭 완료",
    },
    guideline: {
      title: "기사 노쇼 이력 기록 (현장 자체 해결 완료)",
      description: "현장에서 자체적으로 재호출하여 공사는 정상 진행 중입니다. 플랫폼은 해당 기사의 누적 노쇼 2회 확인 후 페널티 부여 여부를 관리합니다.",
    }
  }
];

interface PlatformAdminDisputeManagementProps {
  setActivePath?: (path: string) => void;
}

export function PlatformAdminDisputeManagement({ setActivePath }: PlatformAdminDisputeManagementProps = {}) {
  const [disputes, setDisputes] = useState<DisputeIssue[]>(INITIAL_DISPUTES);
  const [selectedIssueId, setSelectedIssueId] = useState<string>("2610-82");

  // 필터 상태: 3대 핵심 탭 (노쇼는 전체 목록 및 검색에서 바로 확인)
  const [typeFilter, setTypeFilter] = useState<"ALL" | "DROPOFF_REJECT" | "DUMP_SETTLEMENT" | "SOIL_SETTLEMENT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNRESOLVED_ONLY" | "OVERDUE_ONLY">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // 비상 조치 입력 상태
  const [actionType, setActionType] = useState<EmergencyAction | "">("");
  const [actionReason, setActionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyPhone = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredDisputes = disputes.filter(item => {
    if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
    if (statusFilter === "UNRESOLVED_ONLY" && item.status === "RESOLVED") return false;
    if (statusFilter === "OVERDUE_ONLY" && !item.isOverdue) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = item.id.toLowerCase().includes(q);
      const matchPlate = item.driverCarPlate.toLowerCase().includes(q);
      const matchSite = item.siteName.toLowerCase().includes(q);
      const matchDriver = item.driverName.toLowerCase().includes(q);
      const matchType = item.type === "DRIVER_NOSHOW" && ("노쇼".includes(q) || "noshow".includes(q));
      if (!matchId && !matchPlate && !matchSite && !matchDriver && !matchType) return false;
    }
    return true;
  });

  const selectedIssue = disputes.find(item => item.id === selectedIssueId) || filteredDisputes[0];

  const handleExecuteEmergencyAction = () => {
    if (!actionType) {
      alert("비상 조치 항목을 선택해 주십시오.");
      return;
    }
    if (!actionReason.trim()) {
      alert("관리자 사유는 필수 입력 사항입니다. (사토장 소장 통화 내용 또는 소명 사유 기재)");
      return;
    }

    const actionNameMap: Record<EmergencyAction, string> = {
      FORCE_COMPLETE: "[정상 완료]로 강제 변경 (사토장 오클릭 복구)",
      FORCE_REJECT: "[반려 확정 종결] (회차 인정, 분쟁 마감)",
      PENALTY_DRIVER: "[배차 수락 7일 정지] (상습 노쇼 기사 제재)",
      BLOCK_DISPATCH: "[상대방 신규 배차 일시 정지] (악성 미지급 현장)",
    };

    const confirmMsg = `정말 ${actionNameMap[actionType]} 처리를 진행하시겠습니까?\n\n이 조치는 전표 원장 및 계정 상태에 반영되며 관리자 감사 로그에 영구 보관됩니다.`;
    if (!window.confirm(confirmMsg)) return;

    setIsSubmittingAction(true);
    setTimeout(() => {
      setDisputes(prev =>
        prev.map(item => {
          if (item.id === selectedIssue.id) {
            return {
              ...item,
              status: "RESOLVED",
              isOverdue: false,
              facts: {
                ...item.facts,
                electronicInvoiceStatus:
                  actionType === "FORCE_COMPLETE"
                    ? "하차 정상 완료 (관리자 오클릭 복구)"
                    : actionType === "FORCE_REJECT"
                    ? "반려 회차 종결 (관리자 확정)"
                    : actionType === "PENALTY_DRIVER"
                    ? "기사 배차정지 7일 조치 완료"
                    : "현장 배차제한 조치 완료",
              },
            };
          }
          return item;
        })
      );
      setIsSubmittingAction(false);
      setActionType("");
      setActionReason("");
      alert("비상 조치가 성공적으로 실행되어 반영되었습니다.");
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* 1. 상단 타이틀 및 통합 필터 바 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                배차 관리 &gt; 분쟁 및 예외 관제
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-100 text-rose-700">
                  비상 관제실
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                하차지 반려(회차), 덤프비·대기료 미입금, 사토장 흙값 정산 지연 및 기사 노쇼를 데이터 기반으로 관제하고 비상 조치합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("OVERDUE_ONLY")}
              className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-extrabold flex items-center gap-1 transition-all"
            >
              🚨 48시간 이상 미송금 방치:{" "}
              <span className="font-mono text-rose-600 font-black">
                {disputes.filter(d => d.isOverdue).length}
              </span>
              건
            </button>
            <div className="h-3 w-px bg-slate-200" />
            <span className="text-[11px] font-bold text-slate-500">
              미해결 건: <span className="text-slate-800 font-extrabold">{disputes.filter(d => d.status !== "RESOLVED").length}</span>건
            </span>
          </div>
        </div>

        {/* 3대 핵심 탭 & 검색 툴바 */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                전체 보기
              </button>
              <button
                onClick={() => setTypeFilter("DROPOFF_REJECT")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === "DROPOFF_REJECT"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🛑 하차지 반려
              </button>
              <button
                onClick={() => setTypeFilter("DUMP_SETTLEMENT")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === "DUMP_SETTLEMENT"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💰 덤프비 미입금
              </button>
              <button
                onClick={() => setTypeFilter("SOIL_SETTLEMENT")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === "SOIL_SETTLEMENT"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🌾 흙값 미입금
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 상태</option>
              <option value="UNRESOLVED_ONLY">⚠️ 미해결 건만</option>
              <option value="OVERDUE_ONLY">🚨 48시간 이상 방치 건만</option>
            </select>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="배차ID / 차량번호 / 현장명 / 노쇼 검색"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 2. 2-Pane 레이아웃 본문 (좌 35% : 우 65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================= */}
        {/* [좌측 Pane: 35%] 이슈 카드 목록 (List Pane)                */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-700">
              이슈 목록 ({filteredDisputes.length}건)
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              클릭 시 우측 상세 연동
            </span>
          </div>

          {filteredDisputes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-600">조건에 맞는 이슈 건이 없습니다.</p>
            </div>
          ) : (
            filteredDisputes.map(item => {
              const isSelected = selectedIssue?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedIssueId(item.id)}
                  className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-blue-500 shadow-md ring-2 ring-blue-500/20 bg-blue-50/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-sm"
                  }`}
                >
                  {/* 1줄: 뱃지 + 배차ID + 시간 */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.type === "DROPOFF_REJECT" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          🛑 하차반려
                        </span>
                      )}
                      {item.type === "DUMP_SETTLEMENT" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          💰 덤프비
                        </span>
                      )}
                      {item.type === "SOIL_SETTLEMENT" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          🌾 흙값
                        </span>
                      )}
                      {item.type === "DRIVER_NOSHOW" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                          ⚠️ 노쇼발생
                        </span>
                      )}

                      {item.isOverdue && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
                          🚨 48시간초과
                        </span>
                      )}

                      {item.status === "RESOLVED" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          완료
                        </span>
                      )}

                      <span className="text-xs font-mono font-black text-slate-900">
                        #{item.id}
                      </span>
                    </div>

                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                      {item.elapsedTimeText}
                    </span>
                  </div>

                  {/* 2줄: 상차지 ↔ 하차지 */}
                  <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1 truncate mb-1">
                    <span className="truncate">{item.siteName}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{item.dropoffName}</span>
                  </div>

                  {/* 3줄: 기사명 (차량번호) */}
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-2 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-slate-400" />
                      {item.driverName}
                    </span>
                    <span className="font-mono text-slate-500 font-bold">
                      ({item.driverCarPlate})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {item.tonnage}
                    </span>
                  </div>

                  {/* 4줄: 사유 요약 */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-700 truncate">
                    <span className="text-slate-400 font-bold mr-1">사유:</span>
                    "{item.summaryReason}"
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================= */}
        {/* [우측 Pane: 65%] 팩트 조회 & 비상 조치 (Detail Pane)        */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {selectedIssue ? (
            <>
              {/* 상단 요약 바 */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500 text-white uppercase tracking-wider">
                      배차ID: {selectedIssue.id}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {selectedIssue.tonnage} | {selectedIssue.soilType} | {selectedIssue.operationDate}
                    </span>
                  </div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    {selectedIssue.siteName} ➔ {selectedIssue.dropoffName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
                    <span className="text-[10px] font-bold text-slate-400 block">대상 금액</span>
                    <span className="text-xs font-mono font-extrabold text-amber-400">
                      ₩ {selectedIssue.fareAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                    selectedIssue.status === "RESOLVED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : selectedIssue.isOverdue
                      ? "bg-rose-500/30 text-rose-300 border border-rose-500/50"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {selectedIssue.facts.electronicInvoiceStatus}
                  </div>
                </div>
              </div>

              {/* [영역 1] 3자 비상 연락망 카드 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="text-xs font-black text-slate-900 mb-3 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  1. 당사자 연락처 (3자 직통 연락망)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* 상차지 소장 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      상차지 (현장 소장)
                    </div>
                    <div className="text-xs font-extrabold text-slate-800">
                      {selectedIssue.siteManagerName}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-1">
                      <span>{selectedIssue.siteManagerPhone}</span>
                      <button
                        onClick={() => handleCopyPhone("site", selectedIssue.siteManagerPhone)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                        title="전화번호 복사"
                      >
                        {copiedKey === "site" ? (
                          <span className="text-[9px] font-bold text-emerald-600">복사됨!</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 운행 기사 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-slate-500" />
                      운행 기사 (차주)
                    </div>
                    <div className="text-xs font-extrabold text-slate-800">
                      {selectedIssue.driverName} ({selectedIssue.driverCarPlate})
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-1">
                      <span>{selectedIssue.driverPhone}</span>
                      <button
                        onClick={() => handleCopyPhone("driver", selectedIssue.driverPhone)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                        title="전화번호 복사"
                      >
                        {copiedKey === "driver" ? (
                          <span className="text-[9px] font-bold text-emerald-600">복사됨!</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 하차지 소장 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      하차지 (사토장 소장)
                    </div>
                    <div className="text-xs font-extrabold text-slate-800">
                      {selectedIssue.dropoffManagerName}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-1">
                      <span>{selectedIssue.dropoffManagerPhone}</span>
                      <button
                        onClick={() => handleCopyPhone("dropoff", selectedIssue.dropoffManagerPhone)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                        title="전화번호 복사"
                      >
                        {copiedKey === "dropoff" ? (
                          <span className="text-[9px] font-bold text-emerald-600">복사됨!</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* [영역 2] 시스템 팩트 데이터 (플랫폼 DB 자동 기록 대조) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  2. 시스템 팩트 데이터 (플랫폼 DB 자동 기록 대조)
                </h3>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div>
                      <span className="font-bold text-slate-500 mr-2">• 전표 상태:</span>
                      <span className="font-extrabold text-rose-600">
                        {selectedIssue.facts.electronicInvoiceStatus}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 truncate max-w-[280px]">
                      사유: "{selectedIssue.summaryReason}"
                    </span>
                  </div>

                  {/* 하차 반려 건일 때의 GPS 타임라인 */}
                  {selectedIssue.type === "DROPOFF_REJECT" && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500">
                        • 하차지 GPS 로그 타임라인:
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-800 bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto">
                        <span className="text-blue-600">{selectedIssue.facts.gateEnteredTime || "11:10 진입"}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="text-rose-600">{selectedIssue.facts.rejectedOrSignedTime || "11:20 반려"}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="text-slate-600">{selectedIssue.facts.gateExitedTime || "11:25 이탈"}</span>
                        <span className="ml-auto text-[10px] text-amber-600 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          체류 {selectedIssue.facts.stayDurationMinutes || 15}분
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        💡 <strong>시스템 팩트:</strong> 기사가 하차지에 정상 진입 후 약 10분 만에 사토장에서 반려 처리하고 게이트를 이탈한 사실이 GPS 상 일치합니다.
                      </p>

                      {/* 사진 증빙 상태 */}
                      {selectedIssue.proofImageUrl && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 shrink-0">
                              <img
                                src={selectedIssue.proofImageUrl}
                                alt="하차지 검수 사진"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                <Camera className="w-3 h-3 text-blue-600" />
                                하차지 현장 사진 등록됨 (1장)
                              </div>
                              <div className="text-[10px] text-slate-400">
                                * 현장 소장 화면에 전달되어 직접 확인 중입니다.
                              </div>
                            </div>
                          </div>

                          <a
                            href={selectedIssue.proofImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1"
                          >
                            사진 원본 보기
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 정산 지연 건일 때의 팩트 */}
                  {(selectedIssue.type === "DUMP_SETTLEMENT" || selectedIssue.type === "SOIL_SETTLEMENT") && (
                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div>
                        • <strong>정산 대상 금액:</strong> ₩ {selectedIssue.fareAmount.toLocaleString()}
                      </div>
                      <div>
                        • <strong>전자전표 전자서명:</strong> {selectedIssue.facts.electronicInvoiceStatus}
                      </div>
                      <div>
                        • <strong>독촉 현황:</strong> 알림 {selectedIssue.facts.dunningCount || 0}회 발송됨
                        (마감일: {selectedIssue.facts.dueDateText || "말일"})
                      </div>
                      {selectedIssue.isOverdue && (
                        <div className="text-rose-600 font-extrabold text-[11px] pt-1">
                          ⚠️ 48시간 이상 미송금 상태가 지속되고 있습니다. (현장 신규 배차 잠금 대상)
                        </div>
                      )}
                    </div>
                  )}

                  {/* 노쇼 이력일 때의 팩트 */}
                  {selectedIssue.type === "DRIVER_NOSHOW" && (
                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div>
                        • <strong>현장 처리 현황:</strong> {selectedIssue.facts.noshowAction}
                      </div>
                      <div>
                        • <strong>기사 누적 노쇼 기록:</strong> 당월{" "}
                        <span className="font-extrabold text-red-600">{selectedIssue.facts.noshowCount}회</span> 발생
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* [영역 3] 💡 플랫폼 약관 및 안내 가이드 (전화 문의 시 관리자가 읽어줄 팩트) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <FileText className="w-4 h-4 text-blue-600" />
                    3. 플랫폼 표준 기준 및 처리 안내
                  </div>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    상담 안내 가이드
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span>기준:</span>
                    <span>{selectedIssue.guideline.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {selectedIssue.guideline.description}
                  </p>
                  {selectedIssue.guideline.standardAmountText && (
                    <div className="text-[11px] font-bold text-blue-600 pt-0.5">
                      • {selectedIssue.guideline.standardAmountText}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  ※ 전화 문의 시 "플랫폼 DB 기록 및 사진이 현장에 전달되어 있으니 직접 송금해 주시면 된다"고 안내하시면 됩니다.
                </p>
              </div>

              {/* [영역 4] 비상 조치 실행부 (긴급 상황 또는 오클릭 시에만 사용) */}
              <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    4. 관리자 비상 조치 (Emergency Override)
                  </h3>
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    ※ 원장 데이터 강제 변경
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* 라디오 버튼 목록 (오클릭 복구, 반려 종결, 노쇼 제재, 배차 차단) */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    {selectedIssue.type === "DRIVER_NOSHOW" ? (
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 font-bold text-red-600">
                        <input
                          type="radio"
                          name="emergencyAction"
                          value="PENALTY_DRIVER"
                          checked={actionType === "PENALTY_DRIVER"}
                          onChange={() => setActionType("PENALTY_DRIVER")}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>[배차 수락 7일 정지] (상습 노쇼 기사 계정 페널티 부여)</span>
                      </label>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 font-bold text-slate-700">
                          <input
                            type="radio"
                            name="emergencyAction"
                            value="FORCE_COMPLETE"
                            checked={actionType === "FORCE_COMPLETE"}
                            onChange={() => setActionType("FORCE_COMPLETE")}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>[정상 완료]로 강제 변경 (사토장 단순 오클릭 소명 확인 시 전표 복구)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 font-bold text-slate-700">
                          <input
                            type="radio"
                            name="emergencyAction"
                            value="FORCE_REJECT"
                            checked={actionType === "FORCE_REJECT"}
                            onChange={() => setActionType("FORCE_REJECT")}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span>[반려 확정 종결] (회차 인정, 분쟁 강제 마감)</span>
                        </label>
                      </>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 font-bold text-slate-700">
                      <input
                        type="radio"
                        name="emergencyAction"
                        value="BLOCK_DISPATCH"
                        checked={actionType === "BLOCK_DISPATCH"}
                        onChange={() => setActionType("BLOCK_DISPATCH")}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>[상대방 신규 배차 일시 정지] (장기 악성 미송금 현장 제재)</span>
                    </label>
                  </div>

                  {/* 관리자 사유 입력란 */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                      관리자 조치 사유 <span className="text-rose-500">* (필수 입력)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={actionReason}
                      onChange={e => setActionReason(e.target.value)}
                      placeholder="예: 사토장 소장 통화 확인 결과 오클릭 인정하여 정상 전표로 복구함."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 resize-none"
                    />
                  </div>

                  {/* 실행 버튼 */}
                  <button
                    disabled={isSubmittingAction || !actionType || !actionReason.trim()}
                    onClick={handleExecuteEmergencyAction}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {isSubmittingAction
                      ? "전자전표 원장 반영 중..."
                      : "비상 조치 실행 및 전표 원장 반영"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              좌측에서 이슈를 선택해 주십시오.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
