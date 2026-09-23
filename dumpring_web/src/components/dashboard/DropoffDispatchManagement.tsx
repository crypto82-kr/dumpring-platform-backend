"use client";

import React, { useState, useEffect } from "react";
import { Truck, MapPin, Search, CheckCircle2, QrCode, AlertTriangle } from "lucide-react";
import { MockMap } from "./MockMap";
import { getApiBaseUrl } from "@/utils/api";

interface DropoffDispatchManagementProps {
  user?: any;
  registeredDropoffList?: any[];
  dropoffRequestList?: any[];
  dispatchRequestList?: any[];
  registeredSiteList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffDispatchManagement({
  user,
  registeredDropoffList = [],
  dropoffRequestList = [],
  dispatchRequestList = [],
  registeredSiteList = [],
}: DropoffDispatchManagementProps) {
  const [selectedDropoffFilter, setSelectedDropoffFilter] = useState<string>("");
  const [selectedOrderRequestId, setSelectedOrderRequestId] = useState<number | null>(null);
  const [assignedTickets, setAssignedTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);

  // 반입 자재 검수 모달 상태
  const [inspectionModalTicket, setInspectionModalTicket] = useState<any | null>(null);
  const [inspectedSoilType, setInspectedSoilType] = useState<string>("GOOD_SOIL");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isSubmittingInspection, setIsSubmittingInspection] = useState<boolean>(false);
  const [isDropoffQrModalOpen, setIsDropoffQrModalOpen] = useState<boolean>(false);

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
        console.error("하차지 배차 관제: 정책 로드 실패", err);
      }
    };
    fetchPolicy();
  }, []);

  // 하차지 반입 자재 판정 (APPROVED / REJECTED) 핸들러
  const handleInspectionSubmit = async (decision: "APPROVED" | "REJECTED") => {
    if (!inspectionModalTicket) return;
    if (decision === "REJECTED" && !rejectionReason.trim()) {
      alert("반입 반려(회차) 사유를 반드시 입력해 주십시오.");
      return;
    }

    const confirmMsg = decision === "APPROVED"
      ? "반입 자재(토사)를 육안 검수 완료하고 [최종 반입 승인] 처리하시겠습니까?\n기사 운행이 완료되며 정산 대장에 확정됩니다."
      : "불량 토사/이물질 혼입으로 인해 해당 차량을 [반입 거부(회차)] 처리하시겠습니까?";

    if (!confirm(confirmMsg)) return;

    setIsSubmittingInspection(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");

      const res = await fetch(`${baseUrl}/api/dispatch/tickets/${inspectionModalTicket.id}/inspection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          decision: decision,
          soil_type: inspectedSoilType,
          rejection_reason: decision === "REJECTED" ? rejectionReason.trim() : undefined,
          inspection_type: "OFFICE"
        })
      });

      if (res.ok) {
        alert(decision === "APPROVED" ? "🟢 반입 검수 승인 및 정산 확정이 완료되었습니다!" : "🔴 반입 거부(회차) 처리가 완료되었습니다.");
        setInspectionModalTicket(null);
        setRejectionReason("");
        // 티켓 목록 새로고침
        if (selectedReq?.id) {
          const tRes = await fetch(`${baseUrl}/api/dispatch/job/${selectedReq.id}/tickets`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (tRes.ok) {
            const data = await tRes.json();
            setAssignedTickets(Array.isArray(data) ? data : []);
          }
        }
      } else {
        const err = await res.json();
        alert(`검수 처리 실패: ${err.detail || "오류가 발생했습니다."}`);
      }
    } catch (e) {
      console.error("검수 통신 오류:", e);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  // 1. 하차지 관리자의 내 운영 하차지 리스트
  const myDropoffs = registeredDropoffList;

  const todayStr = new Date().toISOString().split("T")[0];

  // 2. 매칭이 완료되어 반입(배차) 진행 중이거나 미래 예정된 배차건 필터링 (과거 지난 정보 제외)
  const activeMatchedDispatches = dispatchRequestList.filter((req) => {
    // 최종 운행 종료(COMPLETED) 및 취소(CANCELLED)된 건만 제외하고, 기사 배차 완료(CLOSED) 건은 포함
    const isCompletedStatus =
      req.rawStatus === "COMPLETED" ||
      req.rawStatus === "CANCELLED" ||
      req.status === "운행완료" ||
      req.status === "취소됨";
    if (isCompletedStatus) return false;

    // 작업일/종료일이 오늘보다 이전인 지난 건 제외
    const targetDate = req.endDate || req.startDate;
    if (targetDate && targetDate < todayStr) {
      return false;
    }

    // 하차지가 연동되어 배차 진행 중(OPEN, 승인대기 등) 오더 포함
    const isMatched =
      req.rawStatus === "OPEN" ||
      req.status === "매칭완료" ||
      Boolean(req.dropoffName);
    if (!isMatched) return false;

    if (!selectedDropoffFilter) return true;
    const filterLower = selectedDropoffFilter.toLowerCase();
    const dropName = (req.dropoffName || "").toLowerCase();
    return dropName.includes(filterLower);
  });

  const activeSelectedId = selectedOrderRequestId || (activeMatchedDispatches.length > 0 ? activeMatchedDispatches[0].id : null);
  const selectedReq = dispatchRequestList.find((r) => r.id === activeSelectedId) || null;

  // 3. 선택된 오더에 배정된 실제 기사 티켓 DB 조회
  useEffect(() => {
    if (!selectedReq?.id) {
      setAssignedTickets([]);
      return;
    }

    const fetchTickets = async () => {
      setIsLoadingTickets(true);
      try {
        const baseUrl = getApiBaseUrl();
        const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
        if (!token) return;

        const res = await fetch(`${baseUrl}/api/dispatch/job/${selectedReq.id}/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setAssignedTickets(Array.isArray(data) ? data : []);
        } else {
          setAssignedTickets([]);
        }
      } catch (err) {
        console.error("Failed to fetch assigned tickets:", err);
        setAssignedTickets([]);
      } finally {
        setIsLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [selectedReq?.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-blue-50 text-blue-600 border border-blue-200">배차 수락</span>;
      case "ARRIVED_LOADING":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-amber-50 text-amber-600 border border-amber-200">상차지 도착</span>;
      case "LOADING_APPROVED":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-purple-50 text-purple-600 border border-purple-200">상차 승인완료</span>;
      case "DRIVING":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-indigo-50 text-indigo-600 border border-indigo-200 animate-pulse">하차지 이동 중</span>;
      case "ARRIVED":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-orange-50 text-orange-600 border border-orange-200">하차지 도착 (승인대기)</span>;
      case "APPROVED":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200">반입 완료</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-rose-50 text-rose-600 border border-rose-200">반입 반려</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-slate-100 text-slate-500 border border-slate-200">배차 취소</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Title Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">하차지 반입 및 배차 현황 관제</h2>
          <p className="text-xs text-slate-500 mt-1">
            현장과 매칭되어 반입 운행 중인 덤프트럭 차량의 실시간 이동 동선 및 진입 현황을 관제합니다.
          </p>
        </div>
      </div>

      {/* Top Controls: Operating Dropoff Site & Active Order Selector */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full">
          {/* 1. 운영 하차지 선택 */}
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">운영 하차지:</span>
            <select
              value={selectedDropoffFilter || (myDropoffs[0]?.name || "")}
              onChange={(e) => setSelectedDropoffFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              {myDropoffs.map((drop) => (
                <option key={drop.id} value={drop.name || drop.locationName}>
                  {drop.name || drop.locationName} ({drop.address || "운영중"})
                </option>
              ))}
              {myDropoffs.length === 0 && <option value="">등록된 하차지 없음</option>}
            </select>
          </div>

          {/* 2. 진행 중인 반입/배차 오더 선택 */}
          <div className="flex items-center gap-2 min-w-[340px] flex-1">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">반입 오더 선택:</span>
            <select
              value={activeSelectedId || ""}
              onChange={(e) => setSelectedOrderRequestId(Number(e.target.value))}
              className="w-full bg-blue-50/80 border border-blue-200 rounded-xl px-3 py-2 text-xs font-extrabold text-blue-900 focus:outline-none focus:border-blue-600 shadow-sm"
            >
              {activeMatchedDispatches.map((req) => (
                <option key={req.id} value={req.id}>
                  [{req.siteName} ➔ {req.dropoffName || "내 하차지"}] {req.tonTypes?.map((t: string) => t === "T_25" ? "25톤" : t).join(",")} ({req.truckCount}대) - {req.status}
                </option>
              ))}
              {activeMatchedDispatches.length === 0 && <option value="">진행 중인 반입 배차 오더 없음</option>}
            </select>
          </div>
        </div>
      </div>

      {selectedReq ? (
        <div className="space-y-6">
          {/* Upper Main Section (2-Column Split): Map Left + Details Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Upper Left: Real-time Live GPS Map */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-2 min-h-[380px] flex flex-col">
              {(() => {
                const matchedSiteObj = registeredSiteList.find((s) => s.id === selectedReq.siteId || s.name === selectedReq.siteName);
                const actualSiteAddress = matchedSiteObj?.address || selectedReq.siteName || "현장 주소 미등록";

                if (selectedReq.dropoffName && selectedReq.dropoffAddress) {
                  return (
                    <MockMap
                      title={`📍 [상차지] ${selectedReq.siteName} ↔ [하차지] ${selectedReq.dropoffName}`}
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
                      title={`📍 [하차지 위치] ${selectedReq.dropoffName || "하차지"}`}
                      address={selectedReq.dropoffAddress || "주소 미등록"}
                      pinned={true}
                      isRouteMode={false}
                    />
                  );
                }
              })()}
            </div>

            {/* Upper Right: Unified Operational Details Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      {selectedReq.siteName} <span className="text-blue-600 font-black">➔</span> {selectedReq.dropoffName || "하차지"}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      상차지 주소: {registeredSiteList.find((s) => s.name === selectedReq.siteName)?.address || "현장 주소 미등록"}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                    {selectedReq.status || "운행 진행 중"}
                  </span>
                </div>

                {/* 하나의 통합된 배차 작업 스펙 카드 */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">차량 톤수 및 반입 대수</span>
                      <div className="font-black text-slate-900 mt-0.5 text-sm">
                        {selectedReq.tonTypes?.map((t: string) => t === "T_25" ? "25톤" : t === "T_15" ? "15톤" : t).join(", ")} ({selectedReq.truckCount} 대)
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">반입 토사 종류</span>
                      <div className="font-black text-blue-600 mt-0.5 text-sm">
                        {selectedReq.soilType === "GOOD_SOIL" ? "양질토" : selectedReq.soilType === "MUD_SOIL" ? "뻘흙" : selectedReq.soilType}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">단가 / 조건</span>
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
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">현장 ↔ 하차지 거리</span>
                      <div className="font-bold text-emerald-600 mt-0.5">
                        {selectedReq.distance ? `${selectedReq.distance} km (${selectedReq.estimatedTime || 0}분)` : "거리 연산 대기"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width Section: Driver List & Inbound Tracking Table (Real DB Connected) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    반입 진입 차량 및 운행 기사 현황 목록
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    도착 차량의 실제 싣고 온 자재(토사 종류)를 확인하고 반입 승인 또는 반려(회차)합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDropoffQrModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-200 active:scale-95 transition-all shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                하차지 고정 QR 보기/인쇄
              </button>
            </div>

            {/* Driver Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">기사 성명</th>
                    <th className="py-3 px-4">차량 번호 / 톤수</th>
                    <th className="py-3 px-4">연락처</th>
                    <th className="py-3 px-4">배차 수락 일시</th>
                    <th className="py-3 px-4 text-center">운행 상태</th>
                    <th className="py-3 px-4 text-right">자재 검수 / 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {isLoadingTickets ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        기사 운행 정보를 불러오는 중입니다...
                      </td>
                    </tr>
                  ) : assignedTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        현재 배차를 수락하거나 운행 중인 기사가 없습니다. (기사 배차 대기 중)
                      </td>
                    </tr>
                  ) : (
                    assignedTickets.map((t) => {
                      const driverName = t.driver?.name || "기사명 미등록";
                      const carPlate = t.car?.car_number || "차량번호 미등록";
                      const carTonnage = t.car?.tonnage ? `${t.car.tonnage}톤` : "덤프";
                      const phone = t.driver?.phone || "-";
                      const acceptedTime = t.accepted_at ? new Date(t.accepted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

                      const canInspect = t.status === "ARRIVED" || t.status === "DRIVING" || t.status === "WAITING_ABSENT_APPROVAL";

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${t.status === "APPROVED" ? "bg-emerald-500" : "bg-blue-500 animate-pulse"}`}></span>
                            {driverName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {carPlate} <span className="text-[10px] font-semibold text-slate-400">({carTonnage})</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{phone}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">{acceptedTime}</td>
                          <td className="py-3.5 px-4 text-center">
                            {getStatusBadge(t.status)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canInspect && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectionModalTicket(t);
                                    setInspectedSoilType(selectedReq?.soilType || "GOOD_SOIL");
                                    setRejectionReason("");
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 transition-all shadow-sm flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  반입 자재 검수
                                </button>
                              )}
                              {t.status === "APPROVED" && (
                                <span className="px-2 py-1 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md">
                                  검수합격 완료
                                </span>
                              )}
                              {t.status === "REJECTED" && (
                                <span className="px-2 py-1 text-[11px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 rounded-md">
                                  반입 반려됨
                                </span>
                              )}
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
          <h3 className="text-sm font-bold text-slate-800">진행 중인 반입 배차 오더가 없습니다</h3>
        </div>
      )}

      {/* 하차지 반입 자재 육안 검수 및 승인/반려 팝업 모달 */}
      {inspectionModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">도착 덤프 반입 자재 검수</h3>
                  <p className="text-[10px] text-slate-500">기사가 싣고 온 자재(토사 종류/상태)를 확인하고 판정합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectionModalTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* 차량 및 상차 정보 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">운행 기사:</span>
                <span className="font-extrabold text-slate-900">
                  {inspectionModalTicket.driver?.name || "기사"} ({inspectionModalTicket.driver?.phone || "-"})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">차량 번호:</span>
                <span className="font-mono font-black text-indigo-700">
                  {inspectionModalTicket.car?.car_number || "-"} ({inspectionModalTicket.car?.tonnage || 25}톤)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">출발 상차지:</span>
                <span className="font-extrabold text-slate-800">
                  {selectedReq?.siteName || "출발 현장"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">공고 요청 토사:</span>
                <span className="font-bold text-blue-600">
                  {selectedReq?.soilType === "GOOD_SOIL" ? "양질토" : selectedReq?.soilType === "MUD_SOIL" ? "뻘흙" : selectedReq?.soilType}
                </span>
              </div>
            </div>

            {/* 육안 검수 토사 종류 선택 */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  실제 들고 온 자재(토사 종류) 육안 판정 <span className="text-indigo-600 font-bold">*</span>
                </label>
                <select
                  value={inspectedSoilType}
                  onChange={(e) => setInspectedSoilType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="GOOD_SOIL">양질토 (양호한 사토/토사)</option>
                  <option value="NORMAL_SOIL">일반토 (보통 토사)</option>
                  <option value="MUD_SOIL">뻘흙 (점토/수분과다 뻘)</option>
                  <option value="ROCK">암버럭 (발파암/돌)</option>
                  <option value="MIXED">혼합토 (자갈/골재 혼입)</option>
                </select>
              </div>

              {/* 반려(회차) 사유 입력란 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  반입 반려 시 사유 기재 (거부 시 필수)
                </label>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="예: 폐콘크리트 이물질 혼입, 뻘 상태 불량으로 사토 불가 회차 지시"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingInspection}
                onClick={() => handleInspectionSubmit("REJECTED")}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                반입 거부 (회차)
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInspectionModalTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl active:scale-95 transition-all"
                >
                  닫기
                </button>
                <button
                  type="button"
                  disabled={isSubmittingInspection}
                  onClick={() => handleInspectionSubmit("APPROVED")}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                >
                  {isSubmittingInspection ? "처리 중..." : "자재 확인 / 반입 승인"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 하차지 고정 QR 모달 */}
      {isDropoffQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-scaleUp p-6 space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                하차지 사토장 고정형 QR
              </h3>
              <button
                type="button"
                onClick={() => setIsDropoffQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-black text-slate-900">{selectedReq?.dropoffName || "사토장"}</div>
              <p className="text-[11px] text-slate-500">사토장 게이트 또는 검수소에 부착하여 기사가 촬영할 수 있도록 합니다.</p>
            </div>

            {/* 실제 QR Code Image Display (앱과 동일 규격) */}
            <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center space-y-2">
              <div className="w-48 h-48 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`DUMPRING:DROPOFF_UNLOADING:${selectedReq?.id || 0}`)}&margin=10`}
                  alt="하차지 사토장 고정 QR"
                  className="w-40 h-40 object-contain"
                />
                <span className="font-mono text-[9px] text-slate-500 font-bold mt-1">DUMPRING:DROPOFF_UNLOADING:{selectedReq?.id}</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-extrabold">기사 앱 [도착지 고정형 QR 스캔] 전용</span>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => alert("하차지 QR 코드가 프린터로 출력되었습니다.")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-sm"
              >
                QR 코드 A4 인쇄
              </button>
              <button
                type="button"
                onClick={() => setIsDropoffQrModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
