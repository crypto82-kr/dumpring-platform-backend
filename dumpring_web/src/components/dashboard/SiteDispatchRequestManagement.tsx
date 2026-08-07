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
          <h2 className="text-xl font-extrabold text-slate-900">배차 요청 관리</h2>
          <p className="text-xs text-slate-500 mt-1">
            현장에 필요한 덤프 차량 배차 공고를 생성하고 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetDispatchForm();
            setDispatchRequestMode("create");
            setIsDispatchModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
        >
          + 신규 배차 요청 등록
        </button>
      </div>

      {/* Master-Detail Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requests List (Master) */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 min-h-[740px] max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="space-y-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={dispatchRequestSearchQuery}
                onChange={(e) => setDispatchRequestSearchQuery(e.target.value)}
                placeholder="현장명, 토사 종류 등으로 검색..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mt-3 mb-2">
            배차 요청 목록 ({filteredRequests.length})
          </h3>

          <div className="space-y-2">
            {filteredRequests.map((req) => {
              const isSelected = activeSelectedId === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-300 shadow-md"
                      : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-350"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                      {req.siteName}
                    </span>
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          req.status === "매칭완료" || req.status === "배차완료" || req.rawStatus === "OPEN"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : req.status === "매칭반려" || req.rawStatus === "CANCELLED"
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : req.status === "승인대기" || req.rawStatus === "WAITING_APPROVAL"
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}
                      >
                        {req.status}
                      </span>
                      {req.rawStatus === "OPEN" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-200">
                          🚚 기사 모집 중
                        </span>
                      )}
                      {req.rawStatus === "CLOSED" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-300">
                          🚚 기사 배차 완료
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2 font-semibold truncate">
                    토사 종류:{" "}
                    {(() => {
                      switch (req.soilType) {
                        case "GOOD_SOIL": return "양질토";
                        case "MUD_SOIL": return "뻘흙";
                        case "ROCK": return "암버럭";
                        case "MIXED": return "혼합";
                        default: return req.soilType;
                      }
                    })()}
                  </p>

                  <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                    <span>
                      차종:{" "}
                      {req.tonTypes.map((t: string) => {
                        if (t === "T_15") return "15톤";
                        if (t === "T_25") return "25톤";
                        if (t === "T_27") return "27톤";
                        return t;
                      }).join(", ")}{" "}
                      ({req.truckCount}대)
                    </span>
                    <span className="text-slate-500 font-mono">{req.startDate}</span>
                  </div>
                </div>
              );
            })}

            {filteredRequests.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                배차 요청 내역이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Request Detail View Card */}
        <div className="lg:col-span-2 space-y-6">
          {selectedReq ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    [{selectedReq.siteName}] 배차 요청 상세 내역
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">요청번호: DREQ-00{selectedReq.id}</p>
                </div>
                <div className="flex gap-2">
                  {(() => {
                    const isLocked = selectedReq.rawStatus === "OPEN" || selectedReq.rawStatus === "WAITING_APPROVAL";
                    return (
                      <>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) {
                              alert("기사 모집 중(매칭 완료)이거나 승인 대기 중인 오더는 직접 수정할 수 없습니다.\n먼저 하단 매칭 상태를 초기화/취소한 후 시도해 주십시오.");
                              return;
                            }
                            startEdit(selectedReq);
                          }}
                          title={isLocked ? "기사 모집 중/승인 대기 상태 오더는 수정 불가" : "오더 정보 수정"}
                          className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                            isLocked
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 active:scale-95 cursor-pointer"
                          }`}
                        >
                          정보 수정
                        </button>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) {
                              alert("기사 모집 중(매칭 완료)이거나 승인 대기 중인 오더는 직접 삭제할 수 없습니다.\n먼저 하단 매칭 상태를 초기화/취소한 후 시도해 주십시오.");
                              return;
                            }
                            handleDelete(selectedReq.id);
                          }}
                          title={isLocked ? "기사 모집 중/승인 대기 상태 오더는 삭제 불가" : "오더 삭제"}
                          className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                            isLocked
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                              : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 active:scale-95 cursor-pointer"
                          }`}
                        >
                          삭제
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* 1. 상단 요약 정보 3컬럼 카드 배치 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="border-b border-slate-200/60 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">요청 현장명</span>
                    <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">{selectedReq.siteName}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">차량 톤수</span>
                      <div className="font-semibold text-slate-700 mt-0.5">
                        {selectedReq.tonTypes.map((t: string) => {
                          if (t === "T_15") return "15톤";
                          if (t === "T_25") return "25톤";
                          if (t === "T_27") return "27톤";
                          return t;
                        }).join(", ")}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">요청 대수</span>
                      <div className="font-semibold text-slate-700 mt-0.5">{selectedReq.truckCount} 대</div>
                    </div>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">반출 토사 종류</span>
                    <div className="text-xs font-semibold text-blue-600 mt-0.5">
                      {(() => {
                        switch (selectedReq.soilType) {
                          case "GOOD_SOIL": return "양질토";
                          case "MUD_SOIL": return "뻘흙";
                          case "ROCK": return "암버럭";
                          case "MIXED": return "혼합";
                          default: return selectedReq.soilType;
                        }
                      })()}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="border-b border-slate-200/60 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">작업 희망일</span>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedReq.startDate}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">지급 주체</span>
                      <div className="font-semibold text-slate-700 mt-0.5">
                        {(() => {
                          switch (selectedReq.payerType) {
                            case "SITE_PAYS": return "현장 지급";
                            case "DROP_OFF_PAYS": return "하차지 지급";
                            case "FREE": return "무상";
                            default: return selectedReq.payerType || "현장 지급";
                          }
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">제시 단가</span>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {selectedReq.offeredUnitPrice ? `${selectedReq.offeredUnitPrice.toLocaleString()} 원` : "0 원"}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">현장 메모 / 특이사항</span>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                      {selectedReq.memo && !selectedReq.memo.startsWith("[직접매칭")
                        ? selectedReq.memo
                        : "특이사항 없음"}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="border-b border-slate-200/60 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">지정 하차지 명칭</span>
                    <div className="text-sm font-bold text-blue-600 mt-0.5 truncate">
                      {selectedReq.dropoffName ? `${selectedReq.dropoffName} (${selectedReq.dropoffMode === "search" ? "덤프링 연동" : "직접등록"})` : "하차지 미지정"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">하차지 상세 주소</span>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5 line-clamp-2">{selectedReq.dropoffAddress || "주소 정보 없음"}</div>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">현장 ↔ 하차지 거치 및 시간</span>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">
                      {(selectedReq.distance !== undefined && selectedReq.distance !== null) 
                        ? `${selectedReq.distance} km / ${selectedReq.estimatedTime} 분 소요` 
                        : "거리 연산 대기중"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 하단 2컬럼 매칭 카드 & 지도 배치 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                  {(selectedReq.matchedDropOffId !== null || selectedReq.dropOffRequestId !== null) ? (
                    <MatchStatusCard
                      id={selectedReq.id}
                      title={selectedReq.dropoffName || "지정 하차지"}
                      subtitle={selectedReq.dropoffAddress || ""}
                      direction={selectedReq.dropOffRequestId !== null && selectedReq.matchedDropOffId === null ? "site_to_dropoff" : "dropoff_to_site"}
                      rawStatus={selectedReq.rawStatus || "OPEN"}
                      isMyInitiated={selectedReq.dropOffRequestId !== null && selectedReq.matchedDropOffId === null}
                      workDate={selectedReq.startDate}
                      materialType={selectedReq.soilType}
                      truckCount={selectedReq.truckCount}
                      unitPrice={selectedReq.offeredUnitPrice}
                      distance={selectedReq.distance}
                      estimatedTime={selectedReq.estimatedTime}
                      rejectionReason={selectedReq.rejectionReason}
                      onApprove={async () => {
                        if (confirm(`[${selectedReq.dropoffName}] 하차지 매칭 제안을 승인하고 기사 모집을 시작하시겠습니까?`)) {
                          const success = handleConfirmMatchJobPost ? await handleConfirmMatchJobPost(selectedReq.id) : false;
                          if (success) alert("매칭이 승인되어 공고가 OPEN 되었습니다!");
                          else alert("승인 처리에 실패했습니다.");
                        }
                      }}
                      onReject={() => {
                        setRejectingJobId(selectedReq.id);
                        setIsRejectModalOpen(true);
                      }}
                      onReset={async () => {
                        if (confirm("공고를 매칭 정보가 없는 대기 상태(WAITING_MATCH)로 다시 되돌리시겠습니까?")) {
                          const success = handleResetMatchJobPost ? await handleResetMatchJobPost(selectedReq.id) : false;
                          if (success) {
                            alert("대기 상태로 성공적으로 초기화되었습니다.");
                            if (fetchDispatchRequests) await fetchDispatchRequests();
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <span className="text-2xl block">⏳</span>
                      <h4 className="text-xs font-bold text-slate-700">현재 연계된 하차지 매칭 요청이 없습니다</h4>
                      <p className="text-[10px] text-slate-500">
                        하차지 수용 공고에서 매칭을 요청하거나, 하차지 지주가 제안을 보내면 이곳에 매칭 상태 카드가 노출됩니다.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
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
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                📄
              </div>
              <h3 className="text-sm font-bold text-slate-800">선택된 배차 요청이 없습니다</h3>
            </div>
          )}
        </div>
      </div>

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
