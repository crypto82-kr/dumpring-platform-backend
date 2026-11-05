"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PlusCircle, Search, AlertCircle, Truck, MapPin, Clock, CheckCircle2, RotateCcw } from "lucide-react";
import { MockMap } from "@/components/views/common/MockMap";
import { getApiBaseUrl } from "@/utils/api";

export interface DispatchStatusItem {
  id: number;
  siteId: number;
  siteName: string;
  tonTypes: string[];
  truckCount: number;
  soilType: string;
  startDate: string;
  endDate: string;
  dropoffMode: string;
  dropoffName?: string;
  dropoffAddress?: string;
  status: string;
  rawStatus?: string;
  memo?: string;
  payerType?: string;
  offeredUnitPrice?: number;
  distance?: number;
  estimatedTime?: number;
  dropOffRequestId?: number;
  matchedDropOffId?: number;
  authorId?: number;
  rejectionReason?: string;
}

interface SiteDispatchStatusManagementProps {
  registeredSiteList: any[];
  dispatchRequestList: DispatchStatusItem[];
  dropoffRequestList?: any[];
  registeredDropoffList?: any[];
  dbCommonCodes?: any[];
  fetchDispatchRequests?: () => Promise<void>;
  handleRejectMatchJobPost?: (id: number, reason: string) => Promise<boolean>;
}

export default function SiteDispatchStatusManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
  dropoffRequestList = [],
  registeredDropoffList = [],
  dbCommonCodes = [],
  fetchDispatchRequests,
  handleRejectMatchJobPost,
}: SiteDispatchStatusManagementProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  // Rejection Modal States
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectingJobId, setRejectingJobId] = useState<number | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");

  // 상차 자재 적재 확인 및 승인 모달 상태
  const [approvalModalTicket, setApprovalModalTicket] = useState<any | null>(null);
  const [approvalSoilType, setApprovalSoilType] = useState<string>("GOOD_SOIL");
  const [approvalOverloadChecked, setApprovalOverloadChecked] = useState<boolean>(true);
  const [approvalCoverChecked, setApprovalCoverChecked] = useState<boolean>(true);
  const [approvalMemo, setApprovalMemo] = useState<string>("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // 🚨 하차지(사토장) 및 토질 긴급 변경 모달 상태
  const [changeDropoffModalTicket, setChangeDropoffModalTicket] = useState<any | null>(null);
  const [changeTargetMode, setChangeTargetMode] = useState<"ALL" | "SINGLE">("ALL");
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [newDropoffId, setNewDropoffId] = useState<number | string>("");
  const [newMaterialType, setNewMaterialType] = useState<string>("GOOD_SOIL");
  const [changeReasonInput, setChangeReasonInput] = useState<string>("");
  const [isSubmittingChangeDropoff, setIsSubmittingChangeDropoff] = useState<boolean>(false);

  // DB 요금 및 검수/승인 정책 연동 상태
  const [pricingPolicy, setPricingPolicy] = useState<any>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPolicy = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/common-codes/pricing-policy`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setPricingPolicy(data);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("현장 배차 현황: 정책 로드 건너뜀", err?.message || err);
        }
      }
    };
    fetchPolicy();
    return () => {
      controller.abort();
    };
  }, []);

  // DB 연동: 실제 배차 신청 기사 티켓 목록
  const [jobTickets, setJobTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredRequests = dispatchRequestList
    .filter((req) => {
      // 1. 상태 기준: 최종 운행 종료(COMPLETED) 및 취소/반려(CANCELLED)된 건만 제외하고,
      // 기사 배차 완료(CLOSED) 및 모집 완료(OPEN) 건은 반드시 관제 대상에 포함
      const isCompletedStatus =
        req.rawStatus === "COMPLETED" ||
        req.rawStatus === "CANCELLED" ||
        req.status === "운행완료" ||
        req.status === "취소됨" ||
        req.status === "매칭반려";

      if (isCompletedStatus) return false;

      // 2. 하차지 매칭 여부: 하차지가 확정되지 않은 매칭대기(WAITING_MATCH) 상태 오더는 
      // 기사 모집/배차 관제 대상이 아니므로 배차 현황 관제에서는 제외
      if (req.rawStatus === "WAITING_MATCH" && !req.dropoffName && !req.matchedDropOffId && !req.dropOffRequestId) {
        return false;
      }

      // 3. 날짜 기준: 종료일/시작일이 현재일 이전(어제 이전)으로 완전히 지난 건은 제외
      const targetDate = req.endDate || req.startDate;
      if (targetDate && targetDate < todayStr) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // 기사 배차/운행 중인 오더(CLOSED, OPEN 등)를 매칭대기보다 우선 정렬하고, 최신순 배치
      const statusWeight = (s?: string) => {
        if (s === "CLOSED" || s === "마감") return 3;
        if (s === "OPEN" || s === "매칭완료") return 2;
        return 1;
      };
      const diff = statusWeight(b.rawStatus || b.status) - statusWeight(a.rawStatus || a.status);
      if (diff !== 0) return diff;
      return b.id - a.id;
    });

  const activeSelectedId = selectedRequestId || (filteredRequests.length > 0 ? filteredRequests[0].id : null);
  const selectedReq = dispatchRequestList.find((r) => r.id === activeSelectedId) || null;

  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);

  // 티켓 조회 함수 (재사용 가능하도록 분리)
  const fetchTickets = useCallback(async (jobId: number, showLoading = true) => {
    if (!jobId || isNaN(jobId) || jobId <= 0) {
      setJobTickets([]);
      return;
    }
    if (showLoading) setIsLoadingTickets(true);
    try {
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      if (!token) {
        setJobTickets([]);
        return;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/dispatch/job/${jobId}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setJobTickets(Array.isArray(data) ? data : []);
      } else {
        setJobTickets([]);
      }
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("기사 티켓 조회 건너뜀 (서버 응답 없음 또는 권한 필요):", err?.message || err);
        setJobTickets([]);
      }
    } finally {
      if (showLoading) setIsLoadingTickets(false);
    }
  }, []);

  // 1. 선택된 배차 오더 변경 시 즉시 티켓 조회
  useEffect(() => {
    const validJobId = Number(activeSelectedId);
    if (validJobId) {
      fetchTickets(validJobId, true);
    } else {
      setJobTickets([]);
    }
  }, [activeSelectedId, fetchTickets]);

  // 2. 30초 주기 실시간 자동 갱신 (배차 오더 목록 + 선택된 오더의 기사 티켓 상태)
  useEffect(() => {
    const timer = setInterval(() => {
      // 배차 오더 목록 백그라운드 갱신
      if (fetchDispatchRequests) {
        fetchDispatchRequests().catch(() => {});
      }
      // 현재 선택된 오더의 기사 티켓 백그라운드 갱신 (스피너 없이 부드럽게 갱신)
      const validJobId = Number(activeSelectedId);
      if (validJobId) {
        fetchTickets(validJobId, false);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [activeSelectedId, fetchDispatchRequests, fetchTickets]);

  // 수동 즉시 새로고침 버튼 핸들러
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      if (fetchDispatchRequests) {
        await fetchDispatchRequests().catch(() => {});
      }
      const validJobId = Number(activeSelectedId);
      if (validJobId) {
        await fetchTickets(validJobId, true);
      }
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // 상차 승인 API 호출 핸들러
  const handleApproveTicket = async () => {
    if (!approvalModalTicket) return;
    if (!approvalOverloadChecked || !approvalCoverChecked) {
      alert("적재 상태(과적 방지 및 덮개 밀폐)를 확인 체크해 주십시오.");
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      const res = await fetch(`${baseUrl}/api/dispatch/tickets/${approvalModalTicket.id}/approve-loading`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          approval_type: "OFFICE",
          loaded_soil_type: approvalSoilType,
          approval_memo: approvalMemo.trim() || undefined
        })
      });

      if (res.ok) {
        alert("✅ 상차 자재 확인 및 출발 승인이 완료되었습니다!\n기사 단말기 미터기가 가동 상태로 전환됩니다.");
        setApprovalModalTicket(null);
        setApprovalMemo("");
        // 티켓 목록 새로고침
        const validJobId = Number(activeSelectedId);
        if (validJobId) {
          fetchTickets(validJobId, false);
        }
      } else {
        const err = await res.json();
        alert(`상차 승인 실패: ${err.detail || "오류가 발생했습니다."}`);
      }
    } catch (e) {
      console.error("상차 승인 통신 에러:", e);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // 🚨 하차지(사토장) 및 토질 긴급 변경 API 호출 핸들러
  const handleChangeDropoffSubmit = async () => {
    if (!changeDropoffModalTicket) return;
    if (!newDropoffId) {
      alert("변경할 대상 하차지(사토장)를 선택해 주십시오.");
      return;
    }
    if (!changeReasonInput.trim()) {
      alert("하차지 변경 사유를 입력해 주십시오.");
      return;
    }

    // 변경 대상 티켓 ID 목록 결정
    const targetIds = changeTargetMode === "ALL" && selectedTicketIds.length > 0
      ? selectedTicketIds
      : [changeDropoffModalTicket.id];

    if (targetIds.length === 0) {
      alert("변경 대상 차량(기사)을 최소 1대 이상 선택해 주십시오.");
      return;
    }

    // 허용 가능 잔여 인원(대수) 검증
    const targetDropoff = (dropoffRequestList || []).find((d: any) => String(d.dropOffId || d.id) === String(newDropoffId));
    if (targetDropoff) {
      const targetQty = Number(targetDropoff.targetQuantity) || 0;
      const currentQty = Number(targetDropoff.currentQuantity) || 0;
      const remainingQty = targetQty > 0 ? Math.max(0, targetQty - currentQty) : 999;

      if (targetQty > 0 && remainingQty < targetIds.length) {
        alert(`선택하신 하차지의 잔여 수용 가능 대수(${remainingQty}대)보다 변경하려는 기사 수(${targetIds.length}대)가 더 많습니다.\n차량 수를 줄이거나 수용 여력이 충분한 다른 하차지를 선택해 주십시오.`);
        return;
      }
    }

    setIsSubmittingChangeDropoff(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      const results = await Promise.all(
        targetIds.map(async (tId) => {
          try {
            const res = await fetch(`${baseUrl}/api/dispatch/tickets/${tId}/change-material-dropoff`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                new_material_type: newMaterialType,
                new_drop_off_id: Number(newDropoffId),
                reason: changeReasonInput.trim()
              })
            });
            let errorMsg = "";
            if (!res.ok) {
              try {
                const errJson = await res.json();
                errorMsg = errJson.detail || "";
              } catch (_) {}
            }
            return { ticketId: tId, ok: res.ok, errorMsg };
          } catch (e) {
            return { ticketId: tId, ok: false, errorMsg: "네트워크 통신 오류" };
          }
        })
      );

      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;
      const firstFail = results.find(r => !r.ok);

      if (successCount > 0) {
        alert(`✅ ${successCount}대 차량의 하차지 및 토사 성상 긴급 변경이 완료되었습니다!` +
          (failCount > 0 ? `\n(⚠️ ${failCount}대 실패)` : "") +
          `\n기사 단말기 내비게이션 목적지가 새로운 사토장으로 즉시 갱신됩니다.`);
        setChangeDropoffModalTicket(null);
        setChangeReasonInput("");
        setNewDropoffId("");
        setSelectedTicketIds([]);
        // 티켓 목록 새로고침
        const validJobId = Number(activeSelectedId);
        if (validJobId) {
          fetchTickets(validJobId, false);
        }
      } else {
        const detailMsg = firstFail?.errorMsg ? `\n(사유: ${firstFail.errorMsg})` : "";
        alert(`하차지 변경에 실패했습니다.${detailMsg}\n서버 상태 및 티켓 상태를 확인해 주십시오.`);
      }
    } catch (e) {
      console.error("하차지 변경 통신 에러:", e);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingChangeDropoff(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">배차 현황 관제</h2>
          <p className="text-xs text-slate-500 mt-1">
            하차지 매칭이 완료되어 기사 모집 및 운행 중인 현장 배차 건을 실시간으로 통합 관제합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-medium text-slate-400">
            30초 자동 갱신 중 ({lastRefreshedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})
          </span>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || isLoadingTickets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm active:scale-95 transition-all disabled:opacity-50"
            title="배차 현황 및 기사 상태 즉시 새로고침"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-600 ${isManualRefreshing ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* Top Controls: Dispatch Order Selection Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full">
          {/* 배차 오더 선택 */}
          <div className="flex items-center gap-2 min-w-[340px] flex-1">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">배차 오더:</span>
            <select
              value={activeSelectedId || ""}
              onChange={(e) => setSelectedRequestId(Number(e.target.value))}
              className="w-full bg-blue-50/80 border border-blue-200 rounded-xl px-3 py-2 text-xs font-extrabold text-blue-900 focus:outline-none focus:border-blue-600 shadow-sm"
            >
              {filteredRequests.map((req) => {
                const dateLabel = req.startDate ? `[${req.startDate}] ` : "";
                return (
                  <option key={req.id} value={req.id}>
                    {dateLabel}[{req.siteName} ➔ {req.dropoffName || "지정하차지"}] {req.tonTypes.map(t=>t==='T_25'?'25톤':t==='T_15'?'15톤':t).join(',')} ({req.truckCount}대)
                  </option>
                );
              })}
              {filteredRequests.length === 0 && <option value="">등록된 배차 정보 없음</option>}
            </select>
          </div>
        </div>
      </div>

      {selectedReq ? (
        <div className="space-y-6">
          {/* Upper Main Section (2-Column Split): Upper Left MAP + Upper Right SITE & DROPOFF MATCH DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Upper Left: Real-time Live GPS Map */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-2 min-h-[380px] flex flex-col">
              {(() => {
                const matchedSiteObj = registeredSiteList.find((s) => s.id === selectedReq.siteId || s.name === selectedReq.siteName);
                const actualSiteAddress = matchedSiteObj?.address || selectedReq.siteName || "현장 주소 미등록";

                if (selectedReq.dropoffName && selectedReq.dropoffAddress) {
                  return (
                    <MockMap 
                      title={`[상차지] ${selectedReq.siteName} ↔ [하차지] ${selectedReq.dropoffName}`} 
                      address={selectedReq.dropoffAddress} 
                      pinned={true} 
                      isRouteMode={true}
                      siteName={selectedReq.siteName}
                      siteAddress={actualSiteAddress}
                      dropoffName={selectedReq.dropoffName}
                      dropoffAddress={selectedReq.dropoffAddress}
                      distance={selectedReq.distance}
                      estimatedTime={selectedReq.estimatedTime}
                    />
                  );
                } else {
                  return (
                    <MockMap 
                      title={`[상차지 현장 위치] ${selectedReq.siteName}`} 
                      address={actualSiteAddress} 
                      pinned={true} 
                      isRouteMode={false}
                    />
                  );
                }
              })()}
            </div>

            {/* Upper Right: Unified Single Operational Details Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      {selectedReq.siteName} <span className="text-blue-600 font-black">➔</span> {selectedReq.dropoffName || "지정 하차지"}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      하차지 주소: {selectedReq.dropoffAddress || "하차지 주소 미등록"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 상단 통합 하차지 변경 버튼 */}
                    <button
                      type="button"
                      onClick={() => {
                        const activeTickets = jobTickets.filter((t: any) => t.status !== "APPROVED" && t.status !== "CANCELLED");
                        if (activeTickets.length === 0) {
                          alert("현재 배차를 수락하고 운행 중인 대상 차량(기사)이 없습니다.\n기사가 배차 콜을 수락하여 하단 목록에 나타난 후 하차지를 변경하실 수 있습니다.");
                          return;
                        }
                        // 상단 버튼은 기본적으로 전체 기사 일괄 변경 모드로 엶
                        setChangeTargetMode("ALL");
                        setSelectedTicketIds(activeTickets.map((t: any) => t.id));
                        const targetTicket = activeTickets[0];
                        setChangeDropoffModalTicket(targetTicket);
                        setNewMaterialType(targetTicket.actual_material_type || selectedReq?.soilType || "GOOD_SOIL");
                        setNewDropoffId(targetTicket.changed_drop_off_id || selectedReq?.matchedDropOffId || "");
                        setChangeReasonInput(targetTicket.change_reason || "");
                      }}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all ${
                        jobTickets.some((t: any) => t.status !== "APPROVED" && t.status !== "CANCELLED")
                          ? "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300"
                      }`}
                      title={
                        jobTickets.some((t: any) => t.status !== "APPROVED" && t.status !== "CANCELLED")
                          ? "현장 토질 변동이나 사토장 수용 불가 시 하차지/토사를 긴급 변경합니다"
                          : "배차를 수락한 기사가 있을 때 하차지를 변경할 수 있습니다"
                      }
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      하차지 긴급 변경
                    </button>
                    <span className="px-3 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                      {selectedReq.status || "배차 진행 중"}
                    </span>
                  </div>
                </div>

                {/* 하나의 통합된 배차 작업 스펙 카드 */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">차량 톤수 및 요청 대수</span>
                      <div className="font-black text-slate-900 mt-0.5 text-sm">
                        {selectedReq.tonTypes.map((t: string) => t === "T_25" ? "25톤" : t === "T_15" ? "15톤" : t).join(", ")} ({selectedReq.truckCount} 대)
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">반출 토사</span>
                      <div className="font-black text-blue-600 mt-0.5 text-sm">
                        {selectedReq.soilType === "GOOD_SOIL" ? "양질토" : selectedReq.soilType === "MUD_SOIL" ? "뻘흙" : selectedReq.soilType}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">운반 단가</span>
                      <div className="font-black text-slate-900 mt-0.5 text-sm">
                        {selectedReq.offeredUnitPrice ? `${selectedReq.offeredUnitPrice.toLocaleString()} 원` : "0 원"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">작업 희망일</span>
                      <div className="font-bold text-slate-800 mt-0.5">{selectedReq.startDate}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">지급 주체</span>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {selectedReq.payerType === "SITE_PAYS" ? "현장 지급" : "하차지 지급"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">현장 ↔ 하차지 소요</span>
                      <div className="font-bold text-emerald-600 mt-0.5">
                        {selectedReq.distance ? `${selectedReq.distance} km (${selectedReq.estimatedTime || 0}분)` : "거리 연산 대기"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width Section: Driver Application & Approval Table (콜 수신 기사 명단) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  배차 신청 기사 목록 및 진출입 관제
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  배차 콜을 신청한 기사의 자재 적재 상태를 확인하고 상차 출발 승인 처리합니다.
                </p>
              </div>
            </div>

            {/* Driver Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">기사명</th>
                    <th className="py-3 px-4">차량번호</th>
                    <th className="py-3 px-4">연락처</th>
                    <th className="py-3 px-4">목적 하차지</th>
                    <th className="py-3 px-4">운행 상태</th>
                    <th className="py-3 px-4">수락/운행 시각</th>
                    <th className="py-3 px-4">주행거리 / 요금</th>
                    <th className="py-3 px-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {isLoadingTickets ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        배차 신청 기사 목록을 불러오는 중입니다...
                      </td>
                    </tr>
                  ) : jobTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Truck className="w-6 h-6 text-slate-300 mb-1" />
                          <p className="font-bold text-slate-600">아직 배차를 신청한 기사가 없습니다.</p>
                          <p className="text-[11px] text-slate-400">기사가 공고를 수락하면 실시간으로 목록에 반영됩니다.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    jobTickets.map((ticket: any) => {
                      const driverName = ticket.driver?.name || "기사 (미연동)";
                      const driverPhone = ticket.driver?.phone_number || "-";
                      const carNumber = ticket.car?.car_number || "-";
                      const carTonnage = ticket.car?.tonnage ? `${ticket.car.tonnage}톤` : "";

                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case "ACCEPTED":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-amber-50 text-amber-600 border border-amber-200">
                                수락 (상차지 이동)
                              </span>
                            );
                          case "ARRIVED_LOADING":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-orange-50 text-orange-600 border border-orange-200">
                                상차지 도착 (적재중)
                              </span>
                            );
                          case "LOADING_APPROVED":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-blue-50 text-blue-600 border border-blue-200">
                                상차 승인완료
                              </span>
                            );
                          case "DRIVING":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-indigo-50 text-indigo-600 border border-indigo-200 animate-pulse">
                                하차지 운행중
                              </span>
                            );
                          case "ARRIVED":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-purple-50 text-purple-600 border border-purple-200">
                                하차지 도착 (확인대기)
                              </span>
                            );
                          case "APPROVED":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                운행 완료 (정산확정)
                              </span>
                            );
                          case "REJECTED":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-rose-50 text-rose-600 border border-rose-200">
                                반려 (회차)
                              </span>
                            );
                          case "CANCELLED":
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-slate-100 text-slate-500 border border-slate-200">
                                취소됨
                              </span>
                            );
                          default:
                            return (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-slate-100 text-slate-600">
                                {status}
                              </span>
                            );
                        }
                      };

                      return (
                        <tr key={ticket.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            {driverName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {carNumber} {carTonnage && <span className="text-[10px] font-normal text-slate-500">({carTonnage})</span>}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {driverPhone}
                          </td>
                          <td className="py-3.5 px-4">
                            {ticket.changed_drop_off_id ? (() => {
                              // 1) 백엔드 티켓 객체에 포함된 changed_drop_off의 name 우선
                              // 2) dropoffRequestList에서 dropOffId 또는 id 매칭
                              // 3) registeredDropoffList에서 id 매칭
                              const changedName = 
                                ticket.changed_drop_off?.name ||
                                dropoffRequestList.find((d: any) => (d.dropOffId || d.id) === ticket.changed_drop_off_id)?.name ||
                                registeredDropoffList.find((d: any) => d.id === ticket.changed_drop_off_id)?.name ||
                                `하차지 (${ticket.changed_drop_off_id})`;

                              return (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-500 text-white shrink-0">변경됨</span>
                                    <span className="font-extrabold text-amber-900 text-xs truncate max-w-[140px]" title={changedName}>
                                      {changedName}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 line-through truncate max-w-[140px]" title={`원래: ${selectedReq?.dropoffName || "기본 하차지"}`}>
                                    원래: {selectedReq?.dropoffName || "기본 하차지"}
                                  </span>
                                </div>
                              );
                            })() : (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                <span className="font-bold text-slate-800 text-xs truncate max-w-[140px]" title={selectedReq?.dropoffName || "기본 하차지"}>
                                  {selectedReq?.dropoffName || "기본 하차지"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div>{getStatusBadge(ticket.status)}</div>
                              {ticket.changed_drop_off_id && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black rounded bg-amber-100 text-amber-800 border border-amber-300 w-fit" title={`변경 사유: ${ticket.change_reason || '미입력'}`}>
                                  <MapPin className="w-2.5 h-2.5" />
                                  하차지 변경됨
                                </span>
                              )}
                              {ticket.dropoff_rejection_reason && ticket.status === "REJECTED" && (
                                <span className="text-[10px] text-rose-600 font-bold block max-w-[130px] truncate" title={ticket.dropoff_rejection_reason}>
                                  사유: {ticket.dropoff_rejection_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                            {ticket.accepted_at ? new Date(ticket.accepted_at).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' }) : "-"}
                            {ticket.completed_at && ` ~ ${new Date(ticket.completed_at).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}`}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                            {ticket.drive_distance_km ? `${ticket.drive_distance_km.toFixed(1)} km` : "0.0 km"}
                            {ticket.accumulated_fare ? ` / ${ticket.accumulated_fare.toLocaleString()}원` : ""}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(ticket.status === "ARRIVED_LOADING" || ticket.status === "ACCEPTED") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApprovalModalTicket(ticket);
                                    setApprovalSoilType(selectedReq.soilType || "GOOD_SOIL");
                                    setApprovalOverloadChecked(true);
                                    setApprovalCoverChecked(true);
                                    setApprovalMemo("");
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-lg bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-all shadow-sm flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  상차 자재 승인
                                </button>
                              )}
                              {ticket.status === "LOADING_APPROVED" && (
                                <span className="px-2 py-1 text-[11px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
                                  출발 대기
                                </span>
                              )}
                              {/* 🚨 하차지 변경 버튼: 운행 진행 중(ACCEPTED, ARRIVED_LOADING, LOADING_APPROVED, DRIVING, ARRIVED, REJECTED)일 때 지원 */}
                              {ticket.status !== "APPROVED" && ticket.status !== "CANCELLED" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChangeTargetMode("SINGLE");
                                    setSelectedTicketIds([ticket.id]);
                                    setChangeDropoffModalTicket(ticket);
                                    // 기본 선택값 설정
                                    setNewMaterialType(ticket.actual_material_type || selectedReq?.soilType || "GOOD_SOIL");
                                    setNewDropoffId(ticket.changed_drop_off_id || selectedReq?.matchedDropOffId || "");
                                    setChangeReasonInput(ticket.change_reason || "");
                                  }}
                                  className={`px-2.5 py-1.5 text-xs font-black rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95 ${
                                    ticket.changed_drop_off_id
                                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                                  }`}
                                  title="현장 토질 변동이나 사토장 수용 불가 시 하차지/토사를 긴급 변경합니다"
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                  {ticket.changed_drop_off_id ? "하차지 변경됨" : "하차지 변경"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => alert(`[${driverName}] 차량의 관제 정보를 확인합니다.`)}
                                className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                              >
                                관제상세
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            📄
          </div>
          <h3 className="text-sm font-bold text-slate-800">선택된 진행 배차가 없습니다</h3>
        </div>
      )}

      {/* 매칭 반려 사유 입력 레이어 팝업 */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">하차지 매칭 반려 사유 입력</h3>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReasonInput("");
                  setRejectingJobId(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">반려 사유 <span className="text-rose-500">*</span></label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="예: 단가가 맞지 않음, 수용 불가능한 토사 종류 등 상세한 사유를 적어주세요."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReasonInput("");
                  setRejectingJobId(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl active:scale-95 transition-all"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectionReasonInput.trim()) {
                    alert("반려 사유를 입력해 주세요.");
                    return;
                  }
                  if (rejectingJobId !== null) {
                    const success = handleRejectMatchJobPost ? await handleRejectMatchJobPost(rejectingJobId, rejectionReasonInput.trim()) : false;
                    if (success) {
                      alert("매칭 제안이 반려되었습니다.");
                      setIsRejectModalOpen(false);
                      setRejectionReasonInput("");
                      setRejectingJobId(null);
                    } else {
                      alert("반려 처리에 실패했습니다.");
                    }
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-rose-500/10"
              >
                반려 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상차 자재 적재 확인 및 출발 승인 모달 (PC 웹 육안 승인) */}
      {approvalModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">상차 자재 적재 확인 및 출발 승인</h3>
                  <p className="text-[10px] text-slate-500">기사의 차량에 적재된 토사와 규격을 육안 확인 후 승인합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* 기사 및 차량 정보 요약 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">배차 기사:</span>
                <span className="font-extrabold text-slate-900">
                  {approvalModalTicket.driver?.name || "기사 미등록"} ({approvalModalTicket.driver?.phone_number || "-"})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">운행 차량:</span>
                <span className="font-mono font-black text-blue-700">
                  {approvalModalTicket.car?.car_number || "-"} ({approvalModalTicket.car?.tonnage || 25}톤)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">목적 하차지:</span>
                <span className="font-extrabold text-slate-800">
                  {selectedReq?.dropoffName || "지정 하차지"}
                </span>
              </div>
            </div>

            {/* 자재 확인 선택 */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  실제 상차된 토사/자재 종류 확인 <span className="text-blue-600 font-bold">*</span>
                </label>
                <select
                  value={approvalSoilType}
                  onChange={(e) => setApprovalSoilType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="GOOD_SOIL">양질토</option>
                  <option value="NORMAL_SOIL">일반토</option>
                  <option value="MUD_SOIL">뻘흙</option>
                  <option value="ROCK">암버럭</option>
                  <option value="MIXED">혼합토</option>
                </select>
              </div>

              {/* 필수 안전 및 적재 확인 체크박스 */}
              <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={approvalOverloadChecked}
                    onChange={(e) => setApprovalOverloadChecked(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    과적 방지 기준 준수 확인 (적재함 기준선 이하)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={approvalCoverChecked}
                    onChange={(e) => setApprovalCoverChecked(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    적재함 덮개(천막) 완전 밀폐 및 낙하물 방지 조치 확인
                  </span>
                </label>
              </div>

              {/* 확인 메모 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  상차 확인 비고 / 특이사항 (선택사항)
                </label>
                <input
                  type="text"
                  value={approvalMemo}
                  onChange={(e) => setApprovalMemo(e.target.value)}
                  placeholder="예: 게이트 1번 출차, 수분 보통, 토질 양호"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovalModalTicket(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl active:scale-95 transition-all"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isSubmittingApproval}
                onClick={handleApproveTicket}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingApproval ? "승인 처리 중..." : "상차 확인 및 출발 승인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 하차지(사토장) 및 토사 성상 긴급 변경 모달 */}
      {changeDropoffModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto animate-scaleUp p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">하차지(사토장) 및 적재 성상 변경</h3>
                  <p className="text-[10px] text-slate-500">
                    현장 굴착 토질 변동이나 사토장 수용 불가 시 실시간으로 목적지를 변경합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangeDropoffModalTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* 변경 적용 대상 범위 선택 (전체 기사 일괄 vs 개별 기사 선택) */}
            {(() => {
              const activeTickets = jobTickets.filter((t: any) => t.status !== "APPROVED" && t.status !== "CANCELLED");
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">변경 적용 대상 (운행 중 기사)</label>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setChangeTargetMode("ALL");
                          setSelectedTicketIds(activeTickets.map((t: any) => t.id));
                        }}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all ${
                          changeTargetMode === "ALL"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        전체 기사 일괄 ({activeTickets.length}대)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChangeTargetMode("SINGLE");
                          if (!selectedTicketIds.includes(changeDropoffModalTicket.id)) {
                            setSelectedTicketIds([changeDropoffModalTicket.id]);
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all ${
                          changeTargetMode === "SINGLE"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        개별 기사 선택 ({selectedTicketIds.length}대)
                      </button>
                    </div>
                  </div>

                  {/* 기사 목록 (전체 선택/체크박스 제공) */}
                  <div className="max-h-36 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                    {activeTickets.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2 font-bold">운행 중인 차량이 없습니다.</p>
                    ) : (
                      activeTickets.map((t: any) => {
                        const isChecked = selectedTicketIds.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border text-xs font-medium ${
                              isChecked
                                ? "bg-amber-50/70 border-amber-300 text-slate-900"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTicketIds(prev => [...prev, t.id]);
                                  } else {
                                    setSelectedTicketIds(prev => prev.filter(id => id !== t.id));
                                  }
                                }}
                                className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                              />
                              <span className="font-mono font-black">{t.car?.car_number || "-"}</span>
                              <span className="text-slate-500">({t.driver?.name || "기사"})</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                {t.car?.tonnage ? `${t.car.tonnage}톤` : "덤프"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {t.changed_drop_off_id ? (
                                <span className="font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                  하차지 변경됨
                                </span>
                              ) : (
                                <span className="text-slate-400">기본 하차지</span>
                              )}
                              <span className="font-bold text-slate-600">
                                {(() => {
                                  switch (t.status) {
                                    case "ACCEPTED": return "수락 (상차지 이동)";
                                    case "ARRIVED_LOADING": return "상차지 도착 (적재중)";
                                    case "LOADING_APPROVED": return "상차 승인완료";
                                    case "DRIVING": return "하차지 운행중";
                                    case "ARRIVED": return "하차지 도착 (확인대기)";
                                    case "APPROVED": return "운행 완료 (정산확정)";
                                    case "REJECTED": return "반려 (회차)";
                                    case "CANCELLED": return "취소됨";
                                    default: return t.status;
                                  }
                                })()}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-1">
                    <span>* 선택된 기사 총 {selectedTicketIds.length}대에게 실시간 변경 통보됩니다.</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedTicketIds.length === activeTickets.length) {
                          setSelectedTicketIds([]);
                        } else {
                          setSelectedTicketIds(activeTickets.map((t: any) => t.id));
                        }
                      }}
                      className="text-amber-700 hover:underline"
                    >
                      {selectedTicketIds.length === activeTickets.length ? "전체 해제" : "전체 선택"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 기존 하차지 정보 요약 */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">기존 등록 하차지:</span>
                <span className="font-bold text-slate-800">
                  {selectedReq?.dropoffName || "기본 매칭 사토장"} ({selectedReq?.dropoffAddress || "주소 미등록"})
                </span>
              </div>
            </div>

            {/* 변경 폼 */}
            <div className="space-y-3">
                {/* 새 하차지 선택 (오늘자 수용 공고 목록 dropoffRequestList 우선 바인딩) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    변경할 대상 하차지(사토장) 선택 <span className="text-amber-600 font-bold">*</span>
                  </label>
                  {(() => {
                    // 현재 운행 중인 배차의 작업일(selectedReq.startDate) 또는 오늘 날짜(todayStr)
                    const targetWorkDate = selectedReq?.startDate || todayStr;
                    // 현재 배차에 이미 지정되어 있는 기본 하차지 ID (현재 하차지로의 '변경'은 무의미하므로 제외)
                    const currentDropoffId = selectedReq?.matchedDropOffId || changeDropoffModalTicket?.drop_off_id;
                    // 현재 배차의 차량 톤수 규격 (예: T_25)
                    const currentTonType = selectedReq?.tonTypes && selectedReq.tonTypes.length > 0 ? selectedReq.tonTypes[0] : "";

                    // 1. 수용 중(OPEN) + 2. 오늘자(작업일) + 3. 현재 하차지 제외 + 4. 톤수 일치 + 5. 사토장 중복 제거
                    const rawCandidates = (dropoffRequestList && dropoffRequestList.length > 0)
                      ? dropoffRequestList.filter((drop: any) => {
                          const isOpen = drop.status === "OPEN" || drop.status === "수용 중";
                          if (!isOpen) return false;

                          // 작업일 일치 검사
                          const dropDate = drop.startDate || drop.workDate;
                          if (dropDate && dropDate !== targetWorkDate) return false;

                          // 현재 지정된 하차지 제외
                          const dropPk = drop.dropOffId || drop.id;
                          if (currentDropoffId && Number(dropPk) === Number(currentDropoffId)) return false;

                          // 톤수 규격 일치 검사 (하차지 공고에 truckType이 지정된 경우 현재 톤수와 일치해야 함)
                          if (currentTonType && drop.truckType && drop.truckType !== currentTonType) {
                            return false;
                          }

                          return true;
                        })
                      : [];

                    // 동일한 하차지(사토장 PK 기준) 중복 제거
                    const candidateDropoffs: any[] = [];
                    const seenDropoffIds = new Set<number>();
                    for (const drop of rawCandidates) {
                      const dropPk = Number(drop.dropOffId || drop.id);
                      if (!seenDropoffIds.has(dropPk)) {
                        seenDropoffIds.add(dropPk);
                        candidateDropoffs.push(drop);
                      }
                    }

                    const formatSoilName = (soil: string) => {
                      if (soil === "GOOD_SOIL") return "양질토";
                      if (soil === "MUD_SOIL") return "뻘흙";
                      if (soil === "ROCK") return "암버럭";
                      if (soil === "MIXED") return "혼합";
                      return soil || "토사";
                    };

                    const formatTonName = (ton: string) => {
                      if (ton === "T_25") return "25톤";
                      if (ton === "T_15") return "15톤";
                      if (ton === "T_27") return "27톤";
                      return ton || "";
                    };

                    const selectedCount = changeTargetMode === "ALL" && selectedTicketIds.length > 0 ? selectedTicketIds.length : 1;
                    const selectedDropoffObj = candidateDropoffs.find((d: any) => String(d.dropOffId || d.id) === String(newDropoffId));

                    return (
                      <div className="space-y-2">
                        <select
                          value={newDropoffId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewDropoffId(val);
                            // 선택한 하차지의 수용 토종이 있으면 기본값으로 자동 세팅
                            const matchedDrop = candidateDropoffs.find((d: any) => String(d.dropOffId || d.id) === String(val));
                            if (matchedDrop && matchedDrop.soilType) {
                              setNewMaterialType(matchedDrop.soilType);
                            }
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
                          required
                        >
                          <option value="">
                            {candidateDropoffs.length === 0
                              ? `선택한 작업일(${targetWorkDate})에 수용 중인 하차지가 없습니다.`
                              : `-- 변경할 하차지(사토장) 선택 (${candidateDropoffs.length}개소 가능) --`}
                          </option>
                          {candidateDropoffs.length > 0 ? (
                            candidateDropoffs.map((drop: any) => {
                              const dropPk = drop.dropOffId || drop.id;
                              const dropName = drop.name || drop.locationName || `사토장 #${dropPk}`;
                              
                              // 허용 가능 잔여 인원(대수) 계산
                              const targetQty = Number(drop.targetQuantity) || 0;
                              const currentQty = Number(drop.currentQuantity) || 0;
                              const remainingQty = targetQty > 0 ? Math.max(0, targetQty - currentQty) : 999;
                              const isInsufficient = targetQty > 0 && remainingQty < selectedCount;
                              
                              const capacityBadge = targetQty > 0
                                ? `[잔여 ${remainingQty}대]`
                                : `[협의 가능]`;

                              const soilBadge = drop.soilType ? `[${formatSoilName(drop.soilType)}]` : "";
                              const dateBadge = drop.startDate ? `[${drop.startDate}]` : "";

                              return (
                                <option 
                                  key={drop.id} 
                                  value={dropPk}
                                  disabled={isInsufficient}
                                >
                                  {isInsufficient ? "🚫 [수용대수 부족] " : "✓ "}
                                  {dropName} {dateBadge} {capacityBadge} {soilBadge}
                                  {isInsufficient ? ` (잔여 ${remainingQty}대 < 요청 ${selectedCount}대)` : ""}
                                </option>
                              );
                            })
                          ) : (
                            <option value="" disabled>수용 가능한 하차지 공고 목록이 없습니다</option>
                          )}
                        </select>

                        {/* 선택된 하차지의 상세 정보 및 수용 대수 대비 검증 안내 카드 */}
                        {selectedDropoffObj && (() => {
                          const targetQty = Number(selectedDropoffObj.targetQuantity) || 0;
                          const currentQty = Number(selectedDropoffObj.currentQuantity) || 0;
                          const remainingQty = targetQty > 0 ? Math.max(0, targetQty - currentQty) : 999;
                          const isOk = targetQty === 0 || remainingQty >= selectedCount;
                          const dropName = selectedDropoffObj.name || selectedDropoffObj.locationName || `사토장 #${selectedDropoffObj.dropOffId || selectedDropoffObj.id}`;
                          const dropAddr = selectedDropoffObj.address || selectedDropoffObj.detailAddress || "주소 미등록";

                          return (
                            <div className={`p-3 rounded-2xl border text-xs space-y-2 ${
                              isOk 
                                ? "bg-slate-50 border-emerald-300" 
                                : "bg-rose-50/70 border-rose-300"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900 text-xs">{dropName}</span>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                      isOk ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
                                    }`}>
                                      {isOk ? "✓ 반입 가능" : "⚠️ 잔여대수 초과"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{dropAddr}</span>
                                  </p>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-[10px] text-slate-400 font-bold block">반입 가능 잔여</span>
                                  <span className={`text-sm font-black ${isOk ? "text-emerald-600" : "text-rose-600"}`}>
                                    {targetQty > 0 ? `${remainingQty}대` : "협의 가능"}
                                  </span>
                                  {targetQty > 0 && (
                                    <span className="text-[10px] text-slate-400 block font-bold">
                                      (목표 {targetQty}대 중 {currentQty}대 완료)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block">작업 희망일</span>
                                  <span className="font-extrabold text-blue-700">
                                    {selectedDropoffObj.startDate || targetWorkDate}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block">수용 토질</span>
                                  <span className="font-extrabold text-slate-700">
                                    {selectedDropoffObj.soilType ? formatSoilName(selectedDropoffObj.soilType) : "전체 수용"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block">차량 규격</span>
                                  <span className="font-extrabold text-slate-700">
                                    {selectedDropoffObj.truckType ? formatTonName(selectedDropoffObj.truckType) : "전 차종"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold block">변경 요청 대수</span>
                                  <span className="font-black text-amber-700">
                                    {selectedCount}대 신청
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>

              {/* 실제 적재된 토사 성상 선택 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  실제 적재된 토사/자재 성상 <span className="text-amber-600 font-bold">*</span>
                </label>
                <select
                  value={newMaterialType}
                  onChange={(e) => setNewMaterialType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="GOOD_SOIL">양질토 (순수 양질 토사)</option>
                  <option value="NORMAL_SOIL">일반토 (일반 토사)</option>
                  <option value="MUD_SOIL">뻘흙 / 함수비 높은 토사</option>
                  <option value="ROCK">암 / 풍화암 / 발파암</option>
                  <option value="MIXED">혼합토 / 폐골재 혼입</option>
                </select>
              </div>

              {/* 변경 사유 입력 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  하차지 변경 사유 <span className="text-amber-600 font-bold">*</span>
                </label>
                <textarea
                  value={changeReasonInput}
                  onChange={(e) => setChangeReasonInput(e.target.value)}
                  placeholder="예: 굴착 중 뻘토 다량 발생으로 뻘흙 수용 가능 사토장으로 긴급 변경 / 기존 사토장 만차로 인근 사토장 전환"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all resize-none"
                  required
                />
              </div>
            </div>

            {/* 안내 문구 */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
              <p className="font-extrabold flex items-center gap-1">
                <span>⚠️</span> 하차지 변경 시 기사 단말기에 즉시 실시간 통보됩니다.
              </p>
              <p className="text-amber-700">
                - 기사 앱 내비게이션 목적지가 선택한 새로운 하차지로 자동 재설정됩니다.<br />
                - 반입 반려(회차) 상태였던 차량은 즉시 운행 중 상태로 재개됩니다.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setChangeDropoffModalTicket(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl active:scale-95 transition-all"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isSubmittingChangeDropoff || selectedTicketIds.length === 0}
                onClick={handleChangeDropoffSubmit}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingChangeDropoff
                  ? "변경 처리 중..."
                  : `${(changeTargetMode === "ALL" && selectedTicketIds.length > 0 ? selectedTicketIds.length : 1)}대 하차지 변경 확정`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
