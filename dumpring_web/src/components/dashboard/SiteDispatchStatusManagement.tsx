"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Search, AlertCircle, Truck, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { MockMap } from "./MockMap";
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

  // DB 요금 및 검수/승인 정책 연동 상태
  const [pricingPolicy, setPricingPolicy] = useState<any>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/common-codes/pricing-policy`);
        if (res.ok) {
          const data = await res.json();
          setPricingPolicy(data);
        }
      } catch (err) {
        console.error("현장 배차 현황: 정책 로드 실패", err);
      }
    };
    fetchPolicy();
  }, []);

  // DB 연동: 실제 배차 신청 기사 티켓 목록
  const [jobTickets, setJobTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredRequests = dispatchRequestList.filter((req) => {
    // 1. 상태 기준: 이미 최종 완료되었거나 마감/취소된 과거 건은 운행 이력에서 확인
    const isCompletedStatus =
      req.rawStatus === "COMPLETED" ||
      req.rawStatus === "CLOSED" ||
      req.rawStatus === "CANCELLED" ||
      req.status === "운행완료" ||
      req.status === "마감" ||
      req.status === "취소됨" ||
      req.status === "매칭반려";

    if (isCompletedStatus) return false;

    // 2. 날짜 기준: 종료일/시작일이 현재일 이전(어제 이전)으로 완전히 지난 건은 제외
    const targetDate = req.endDate || req.startDate;
    if (targetDate && targetDate < todayStr) {
      return false;
    }
    return true;
  });

  const activeSelectedId = selectedRequestId || (filteredRequests.length > 0 ? filteredRequests[0].id : null);
  const selectedReq = dispatchRequestList.find((r) => r.id === activeSelectedId) || null;

  // 선택된 배차 요청이 바뀔 때 실제 DB 기사 티켓 조회
  useEffect(() => {
    if (!activeSelectedId) {
      setJobTickets([]);
      return;
    }

    const fetchTickets = async () => {
      setIsLoadingTickets(true);
      try {
        const token = typeof window !== "undefined"
          ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
          : null;
        const res = await fetch(`${getApiBaseUrl()}/api/dispatch/job/${activeSelectedId}/tickets`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setJobTickets(Array.isArray(data) ? data : []);
        } else {
          setJobTickets([]);
        }
      } catch (err) {
        console.error("기사 티켓 조회 실패:", err);
        setJobTickets([]);
      } finally {
        setIsLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [activeSelectedId]);

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
        if (activeSelectedId) {
          const tRes = await fetch(`${baseUrl}/api/dispatch/job/${activeSelectedId}/tickets`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (tRes.ok) {
            const data = await tRes.json();
            setJobTickets(Array.isArray(data) ? data : []);
          }
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Title Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">배차 현황 관제</h2>
          <p className="text-xs text-slate-500 mt-1">
            하차지 매칭이 완료되어 기사 모집 및 운행 중인 현장 배차 건을 실시간으로 통합 관제합니다.
          </p>
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
              {filteredRequests.map((req) => (
                <option key={req.id} value={req.id}>
                  [{req.siteName} ➔ {req.dropoffName || "지정하차지"}] {req.tonTypes.map(t=>t==='T_25'?'25톤':t).join(',')} ({req.truckCount}대)
                </option>
              ))}
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
                  <span className="px-3 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                    {selectedReq.status || "배차 진행 중"}
                  </span>
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
                    <th className="py-3 px-4">운행 상태</th>
                    <th className="py-3 px-4">수락/운행 시각</th>
                    <th className="py-3 px-4">주행거리 / 요금</th>
                    <th className="py-3 px-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {isLoadingTickets ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        배차 신청 기사 목록을 불러오는 중입니다...
                      </td>
                    </tr>
                  ) : jobTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
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
                            {getStatusBadge(ticket.status)}
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
                  <option value="GOOD_SOIL">양질토 (양질사토/토사)</option>
                  <option value="NORMAL_SOIL">일반토 (보통 흙/사토)</option>
                  <option value="MUD_SOIL">뻘흙 (점토/슬러지성 토사)</option>
                  <option value="ROCK">암버럭 (발파암/쇄석/돌)</option>
                  <option value="MIXED">혼합토 (토사+자갈 혼합)</option>
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
    </div>
  );
}
