"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Search, AlertCircle, Truck, MapPin, Clock } from "lucide-react";
import { MockMap } from "./MockMap";
import { MatchStatusCard } from "./MatchStatusCard";

export interface DispatchRequestItem {
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

interface SiteDispatchRequestManagementProps {
  registeredSiteList: any[];
  dispatchRequestList: DispatchRequestItem[];
  dropoffRequestList?: any[];
  registeredDropoffList?: any[];
  dbCommonCodes?: any[];
  handleCreateDispatch: (formData: any) => Promise<{ success: boolean; message?: string }>;
  handleUpdateDispatch: (id: number, formData: any) => Promise<boolean>;
  handleDeleteDispatch: (id: number) => Promise<boolean>;
  fetchDispatchRequests?: () => Promise<void>;
  handleConfirmMatchJobPost?: (id: number) => Promise<boolean>;
  handleRejectMatchJobPost?: (id: number, reason: string) => Promise<boolean>;
  handleResetMatchJobPost?: (id: number) => Promise<boolean>;
}

export default function SiteDispatchRequestManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
  dropoffRequestList = [],
  registeredDropoffList = [],
  dbCommonCodes = [],
  handleCreateDispatch,
  handleUpdateDispatch,
  handleDeleteDispatch,
  fetchDispatchRequests,
  handleConfirmMatchJobPost,
  handleRejectMatchJobPost,
  handleResetMatchJobPost,
}: SiteDispatchRequestManagementProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchRequestSearchQuery, setDispatchRequestSearchQuery] = useState("");
  const [dispatchRequestMode, setDispatchRequestMode] = useState<"create" | "edit">("create");
  const [editingDispatchRequestId, setEditingDispatchRequestId] = useState<number | null>(null);

  // Modal Form States
  const [dispatchFormSiteId, setDispatchFormSiteId] = useState<number | "">("");
  const [dispatchFormTonTypes, setDispatchFormTonTypes] = useState<string[]>(["T_25"]);
  const [dispatchFormTruckCount, setDispatchFormTruckCount] = useState<number>(1);
  const [dispatchFormSoilType, setDispatchFormSoilType] = useState<string>("GOOD_SOIL");
  const [dispatchFormStartDate, setDispatchFormStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dispatchFormEndDate, setDispatchFormEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dispatchFormDropoffMode, setDispatchFormDropoffMode] = useState<string>("none");
  const [dispatchFormDropoffName, setDispatchFormDropoffName] = useState<string>("");
  const [dispatchFormDropoffAddress, setDispatchFormDropoffAddress] = useState<string>("");
  const [dispatchFormPayerType, setDispatchFormPayerType] = useState<string>("SITE_PAYS");
  const [dispatchFormOfferedUnitPrice, setDispatchFormOfferedUnitPrice] = useState<number>(45000);
  const [dispatchFormMemo, setDispatchFormMemo] = useState<string>("");
  const [dropoffSearchQuery, setDropoffSearchQuery] = useState<string>("");

  // Rejection Modal States
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectingJobId, setRejectingJobId] = useState<number | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");

  const resetDispatchForm = () => {
    setDispatchFormSiteId(registeredSiteList[0]?.id || "");
    setDispatchFormTonTypes(["T_25"]);
    setDispatchFormTruckCount(1);
    setDispatchFormSoilType("GOOD_SOIL");
    setDispatchFormStartDate(new Date().toISOString().split("T")[0]);
    setDispatchFormEndDate(new Date().toISOString().split("T")[0]);
    setDispatchFormDropoffMode("none");
    setDispatchFormDropoffName("");
    setDispatchFormDropoffAddress("");
    setDispatchFormPayerType("SITE_PAYS");
    setDispatchFormOfferedUnitPrice(45000);
    setDispatchFormMemo("");
    setEditingDispatchRequestId(null);
  };

  const startEdit = (req: DispatchRequestItem) => {
    setDispatchFormSiteId(req.siteId);
    setDispatchFormTonTypes(req.tonTypes);
    setDispatchFormTruckCount(req.truckCount);
    setDispatchFormSoilType(req.soilType);
    setDispatchFormStartDate(req.startDate);
    setDispatchFormEndDate(req.endDate);
    setDispatchFormDropoffMode(req.dropoffMode);
    setDispatchFormDropoffName(req.dropoffName || "");
    setDispatchFormDropoffAddress(req.dropoffAddress || "");
    setDispatchFormPayerType(req.payerType || "SITE_PAYS");
    setDispatchFormOfferedUnitPrice(req.offeredUnitPrice || 0);
    setDispatchFormMemo(req.memo && !req.memo.startsWith("[직접매칭") ? req.memo : "");
    setEditingDispatchRequestId(req.id);
    setDispatchRequestMode("edit");
    setIsDispatchModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("정말로 이 배차 요청을 삭제하시겠습니까?")) {
      const success = await handleDeleteDispatch(id);
      if (success) {
        alert("삭제되었습니다.");
        if (selectedRequestId === id) {
          setSelectedRequestId(null);
        }
      } else {
        alert("삭제에 실패했습니다. 다시 시도해 주세요.");
      }
    }
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchFormSiteId) {
      alert("요청할 현장을 선택해 주세요.");
      return;
    }
    if (dispatchFormTonTypes.length === 0) {
      alert("차량 톤수를 최소 하나 이상 선택해 주세요.");
      return;
    }

    const availableDropoffs = dropoffRequestList && dropoffRequestList.length > 0 ? dropoffRequestList : registeredDropoffList;
    const selectedDropoff = dispatchFormDropoffMode === "search"
      ? availableDropoffs.find((d: any) => d.name === dispatchFormDropoffName)
      : null;

    const memoText = dispatchFormMemo.trim() || (
      dispatchFormDropoffMode === "direct"
        ? `[직접매칭 하차지] 명칭: ${dispatchFormDropoffName}, 주소: ${dispatchFormDropoffAddress}`
        : ""
    );

    const formData = {
      siteId: Number(dispatchFormSiteId),
      materialType: dispatchFormSoilType || "GOOD_SOIL",
      truckType: dispatchFormTonTypes[0] || "T_25",
      workDate: dispatchFormStartDate ? `${dispatchFormStartDate}T00:00:00` : new Date().toISOString(),
      requiredTrucks: Number(dispatchFormTruckCount),
      offeredUnitPrice: Number(dispatchFormOfferedUnitPrice),
      payerType: dispatchFormPayerType,
      memo: memoText,
      ...(dispatchFormDropoffMode === "search" && selectedDropoff?.id && { dropOffRequestId: selectedDropoff.id }),
    };

    let success = false;
    if (dispatchRequestMode === "create") {
      const result = await handleCreateDispatch(formData);
      success = result.success;
      if (success) {
        alert("배차 요청이 등록되었습니다.");
      } else {
        alert(`배차 요청 등록에 실패했습니다.\n사유: ${result.message || "알 수 없는 에러"}`);
      }
    } else if (dispatchRequestMode === "edit" && editingDispatchRequestId !== null) {
      success = await handleUpdateDispatch(editingDispatchRequestId, {
        materialType: formData.materialType,
        truckType: formData.truckType,
        workDate: formData.workDate,
        requiredTrucks: formData.requiredTrucks,
        offeredUnitPrice: formData.offeredUnitPrice,
        payerType: formData.payerType,
        memo: formData.memo,
        dropOffRequestId: dispatchFormDropoffMode === "search" ? (selectedDropoff?.id || null) : null,
      });
      if (success) alert("배차 요청이 수정되었습니다.");
      else alert("배차 요청 수정에 실패했습니다. 다시 시도해 주세요.");
    }

    if (success) {
      resetDispatchForm();
      setIsDispatchModalOpen(false);
    }
  };

  const filteredRequests = dispatchRequestList.filter((req) => {
    if (!dispatchRequestSearchQuery || !dispatchRequestSearchQuery.trim()) return true;
    const q = dispatchRequestSearchQuery.trim().toLowerCase();
    const siteNameStr = (req.siteName || "현장명 없음").toLowerCase();
    const soilTypeStr = (req.soilType || "일반 토사").toLowerCase();
    const dropoffNameStr = (req.dropoffName || "").toLowerCase();
    return siteNameStr.includes(q) || soilTypeStr.includes(q) || dropoffNameStr.includes(q);
  });

  const activeSelectedId = selectedRequestId || (filteredRequests.length > 0 ? filteredRequests[0].id : null);
  const selectedReq = dispatchRequestList.find((r) => r.id === activeSelectedId) || null;

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
                  배차 콜을 신청한 기사의 승인 처리 및 게이트 실시간 입/출차 현황을 관제합니다.
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
                    <th className="py-3 px-4">승인 상태</th>
                    <th className="py-3 px-4">진출입 상태</th>
                    <th className="py-3 px-4">입/출차 시각</th>
                    <th className="py-3 px-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {/* 1. 운행 중 (DRIVING) 기사 사례 */}
                  <tr className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      강동원 기사
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      서울 88바 1234 <span className="text-[10px] font-normal text-slate-500">(25톤)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">010-8910-1112</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                        승인완료
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-600">
                      운행 중
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      입차 08:30 / 출차 08:55
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => alert("상단 지도에서 [강동원 기사] 차량의 실시간 동선으로 지도를 이동합니다.")}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                      >
                        지도확인
                      </button>
                    </td>
                  </tr>

                  {/* 2. 상차지 입차 (ARRIVED_LOADING) 적재 중 기사 사례 */}
                  <tr className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      유재석 기사
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      인천 82가 9999 <span className="text-[10px] font-normal text-slate-500">(25톤)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">010-1234-9999</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                        승인완료
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-600">
                      상차지 입차 (적재중)
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      입차 09:10 / 출차 대기
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => alert("상단 지도에서 [유재석 기사] 현장 입차 위치로 지도를 이동합니다.")}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                      >
                        지도확인
                      </button>
                    </td>
                  </tr>

                  {/* 3. 승인대기 기사 사례 */}
                  <tr className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      마동석 기사
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      경기 80사 5678 <span className="text-[10px] font-normal text-slate-500">(25톤)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">010-5678-1234</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-amber-50 text-amber-600 border border-amber-200">
                        승인대기
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-normal">
                      -
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      신청 09:05
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => alert("[마동석 기사] 배차 신청이 승인되었습니다. 실시간 지도 관제가 활성화됩니다.")}
                        className="px-3 py-1.5 text-xs font-black rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        onClick={() => alert("[마동석 기사] 배차 신청이 반려되었습니다.")}
                        className="px-3 py-1.5 text-xs font-black rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 active:scale-95 transition-all"
                      >
                        반려
                      </button>
                    </td>
                  </tr>
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

      {/* CREATE / EDIT MODAL POPUP (흐름 A / B 모드 탭 완비) */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col my-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingDispatchRequestId !== null ? "배차 요청서 수정" : "신규 차량 배차 요청 등록"}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">현장에 배정할 덤프링 차량의 조건과 목적지 하차지를 지정합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetDispatchForm();
                  setIsDispatchModalOpen(false);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs active:scale-90 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRequest} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold block">요청 현장 선택 <span className="text-rose-500">*</span></label>
                <select
                  value={dispatchFormSiteId}
                  onChange={(e) => setDispatchFormSiteId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">현장을 선택해 주세요</option>
                  {registeredSiteList.map((site) => (
                    <option key={site.id} value={site.id}>{site.name} ({site.address})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">요청 차량 톤수 <span className="text-rose-500">*</span></label>
                  <select
                    value={dispatchFormTonTypes[0] || ""}
                    onChange={(e) => setDispatchFormTonTypes(e.target.value ? [e.target.value] : [])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">톤수를 선택해 주세요</option>
                    {dbCommonCodes
                      .filter((codeItem: any) => codeItem.group_code === "TRUCK_TYPE")
                      .map((codeItem: any) => (
                        <option key={codeItem.code} value={codeItem.code}>
                          {codeItem.code_name}
                        </option>
                      ))}
                    {dbCommonCodes.filter((codeItem: any) => codeItem.group_code === "TRUCK_TYPE").length === 0 && (
                      <>
                        <option value="T_15">15톤</option>
                        <option value="T_25">25톤</option>
                        <option value="T_27">27톤</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">요청 대수 <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={dispatchFormTruckCount === 0 ? "" : dispatchFormTruckCount}
                    onChange={(e) => setDispatchFormTruckCount(e.target.value === "" ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">반출 토사 종류 <span className="text-rose-500">*</span></label>
                  <select
                    value={dispatchFormSoilType}
                    onChange={(e) => setDispatchFormSoilType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                    required
                  >
                    {dbCommonCodes
                      .filter((codeItem: any) => codeItem.group_code === "MATERIAL_TYPE")
                      .map((codeItem: any) => (
                        <option key={codeItem.code} value={codeItem.code}>
                          {codeItem.code_name}
                        </option>
                      ))}
                    {dbCommonCodes.filter((codeItem: any) => codeItem.group_code === "MATERIAL_TYPE").length === 0 && (
                      <>
                        <option value="GOOD_SOIL">양질토</option>
                        <option value="MUD_SOIL">갯벌/뻘흙</option>
                        <option value="ROCK">풍화암/돌</option>
                        <option value="MIXED">혼합골재</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">작업일 <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={dispatchFormStartDate}
                    onChange={(e) => {
                      setDispatchFormStartDate(e.target.value);
                      setDispatchFormEndDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">비용 지급 주체 <span className="text-rose-500">*</span></label>
                  <select
                    value={dispatchFormPayerType}
                    onChange={(e) => setDispatchFormPayerType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                    required
                  >
                    {dbCommonCodes
                      .filter((codeItem: any) => codeItem.group_code === "PAYER_TYPE")
                      .map((codeItem: any) => (
                        <option key={codeItem.code} value={codeItem.code}>
                          {codeItem.code_name}
                        </option>
                      ))}
                    {dbCommonCodes.filter((codeItem: any) => codeItem.group_code === "PAYER_TYPE").length === 0 && (
                      <>
                        <option value="SITE_PAYS">현장 지급 (SITE_PAYS)</option>
                        <option value="DROP_OFF_PAYS">하차지 지급 (DROP_OFF_PAYS)</option>
                        <option value="FREE">무상 (FREE)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">제시 단가 (원) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min={0}
                    value={dispatchFormOfferedUnitPrice === 0 ? "" : dispatchFormOfferedUnitPrice}
                    onChange={(e) => setDispatchFormOfferedUnitPrice(e.target.value === "" ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    placeholder="예: 45000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-slate-700 font-bold block">현장 메모 / 특이사항 (선택)</label>
                <textarea
                  rows={2}
                  placeholder="진입로 주의사항, 작업 수용 시간, 기사 전달 메모 등 (선택 입력)"
                  value={dispatchFormMemo}
                  onChange={(e) => setDispatchFormMemo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium resize-none"
                />
              </div>

              {/* 하차지 정보 (라디오 3종 탭 흐름 A vs 흐름 B) */}
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-slate-700 font-bold block">하차지 정보 등록 <span className="text-rose-500">*</span></label>
                </div>

                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchFormDropoffMode("direct");
                      setDispatchFormDropoffName("");
                      setDispatchFormDropoffAddress("");
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      dispatchFormDropoffMode === "direct"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    직접매칭
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchFormDropoffMode("search");
                      setDispatchFormDropoffName("");
                      setDispatchFormDropoffAddress("");
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      dispatchFormDropoffMode === "search"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    하차지 검색
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchFormDropoffMode("none");
                      setDispatchFormDropoffName("");
                      setDispatchFormDropoffAddress("");
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      dispatchFormDropoffMode === "none"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    매칭대기
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  {dispatchFormDropoffMode === "direct" && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-600 font-bold block mb-1">하차지 명칭</label>
                        <input
                          type="text"
                          value={dispatchFormDropoffName}
                          onChange={(e) => setDispatchFormDropoffName(e.target.value)}
                          placeholder="예: 김포 고촌 사토장"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 font-bold block mb-1">하차지 주소</label>
                        <input
                          type="text"
                          value={dispatchFormDropoffAddress}
                          onChange={(e) => setDispatchFormDropoffAddress(e.target.value)}
                          placeholder="예: 경기도 김포시 고촌읍 123"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                      {dispatchFormDropoffAddress && (
                        <div className="pt-2">
                          <label className="text-xs text-slate-600 font-bold block mb-1">하차지 진입로 위치 핀지정</label>
                          <MockMap
                            title="직접매칭 하차지"
                            address={dispatchFormDropoffAddress}
                            pinned={true}
                            interactive={true}
                            onLocationSelect={(_, __, newAddress) => {
                              setDispatchFormDropoffAddress(newAddress);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {dispatchFormDropoffMode === "search" && (() => {
                    const availableDropoffs = (dropoffRequestList && dropoffRequestList.length > 0) ? dropoffRequestList : registeredDropoffList;
                    const filteredDropoffs = availableDropoffs.filter((drop: any) => {
                      if (!dropoffSearchQuery.trim()) return true;
                      const q = dropoffSearchQuery.toLowerCase();
                      return (
                        (drop.name && drop.name.toLowerCase().includes(q)) ||
                        (drop.address && drop.address.toLowerCase().includes(q)) ||
                        (drop.soilType && drop.soilType.toLowerCase().includes(q))
                      );
                    });

                    const selectedObj = availableDropoffs.find((d: any) => d.name === dispatchFormDropoffName);

                    return (
                      <div className="space-y-2">
                        <label className="text-xs text-slate-700 font-bold block">등록 하차지 수용 공고 검색 / 선택</label>
                        
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="하차지명, 주소, 토사 종류로 검색..."
                            value={dropoffSearchQuery}
                            onChange={(e) => setDropoffSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                          />
                          {dropoffSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setDropoffSearchQuery("")}
                              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <select
                          value={selectedObj?.id || ""}
                          onChange={(e) => {
                            const drop = availableDropoffs.find((d: any) => d.id === Number(e.target.value));
                            if (drop) {
                              setDispatchFormDropoffName(drop.name);
                              setDispatchFormDropoffAddress(drop.address);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500"
                          required
                        >
                          <option value="">수용 공고 하차지를 선택해 주세요</option>
                          {filteredDropoffs.map((drop: any) => (
                            <option key={drop.id} value={drop.id}>
                              {drop.name} ({drop.address}) - {drop.soilType || "토사"} / 잔여수용: {drop.remainingCapacity || drop.totalCapacity || "자유"}
                            </option>
                          ))}
                        </select>

                        {selectedObj && (
                          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 space-y-1">
                            <span className="text-[11px] font-extrabold text-blue-700 block">✓ 선택된 하차지: {selectedObj.name}</span>
                            <p className="text-[10px] text-slate-600 font-medium">{selectedObj.address}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {dispatchFormDropoffMode === "none" && (
                    <div className="text-center py-4 text-slate-500 text-xs font-medium space-y-1">
                      <p>하차지를 사전에 지정하지 않고 **[매칭대기]** 상태로 배차 공고를 등록합니다.</p>
                      <p className="text-[10px] text-slate-400">하차지 운영자가 현장 공고를 확인한 후 매칭을 제안할 수 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 active:scale-95 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
                >
                  {editingDispatchRequestId !== null ? "수정 완료" : "배차 요청 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
