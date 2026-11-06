import React from "react";
import { createPortal } from "react-dom";
import { Search, Calendar } from "lucide-react";
import { MockMap } from "@/components/views/common/MockMap";
import { MatchStatusCard } from "@/components/views/common/MatchStatusCard";

interface DropoffAnnouncementManagementProps {
  user?: any;
  registeredDropoffList: any[];
  dropoffRequestList?: any[];
  dispatchRequestList?: any[];
  registeredSiteList?: any[];
  dbCommonCodes?: any[];
  handleCreateDropoffRequest?: (payload: any) => Promise<boolean>;
  handleDeleteDropoffRequest?: (id: number) => Promise<boolean>;
  handleUpdateDropoffRequestStatus?: (id: number, status: string) => Promise<boolean>;
  handleUpdateDropoffRequest?: (id: number, payload: any) => Promise<boolean>;
  handleApproveJobPost?: (id: number) => Promise<boolean>;
  handleRejectJobPost?: (id: number, reason?: string) => Promise<boolean>;
  fetchOpenDropOffRequests?: () => Promise<void>;
  handleResetMatchJobPost?: (id: number) => Promise<boolean>;
}

export function DropoffAnnouncementManagement({
  user,
  registeredDropoffList,
  dropoffRequestList = [],
  dispatchRequestList = [],
  registeredSiteList = [],
  dbCommonCodes,
  handleCreateDropoffRequest,
  handleDeleteDropoffRequest,
  handleUpdateDropoffRequestStatus,
  handleUpdateDropoffRequest,
  handleApproveJobPost,
  handleRejectJobPost,
  fetchOpenDropOffRequests,
  handleResetMatchJobPost,
}: DropoffAnnouncementManagementProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const [editingRequest, setEditingRequest] = React.useState<any | null>(null);
  const [selectedReqId, setSelectedReqId] = React.useState<number | null>(null);

  // Reject modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = React.useState("");
  const [rejectingJobId, setRejectingJobId] = React.useState<number | null>(null);
  const [rejectingSiteName, setRejectingSiteName] = React.useState("");

  // Create/Edit request modal states
  const [isReqModalOpen, setIsReqModalOpen] = React.useState(false);
  const [reqDropoffId, setReqDropoffId] = React.useState("");
  const [reqMaterialType, setReqMaterialType] = React.useState("GOOD_SOIL");
  const [reqCapacityType, setReqCapacityType] = React.useState("T_25");
  const [reqUnitPrice, setReqUnitPrice] = React.useState("");
  const [reqWorkDate, setReqWorkDate] = React.useState("");
  const [reqPayerType, setReqPayerType] = React.useState("SITE_PAYS");
  const [reqSoilDealType, setReqSoilDealType] = React.useState<"buy" | "sell">("sell");
  const [reqMatchMode, setReqMatchMode] = React.useState<"none" | "direct" | "search">("none");
  const [reqSiteName, setReqSiteName] = React.useState("");
  const [reqSiteAddress, setReqSiteAddress] = React.useState("");
  const [reqSelectedSiteId, setReqSelectedSiteId] = React.useState("");
  const [reqSelectedJobId, setReqSelectedJobId] = React.useState<string>("");
  const [reqPaymentMethod, setReqPaymentMethod] = React.useState("MONTHLY");
  const [reqHasWashingFacility, setReqHasWashingFacility] = React.useState(false);
  const [reqNightWorkAllowed, setReqNightWorkAllowed] = React.useState(false);
  const [reqRainWorkAllowed, setReqRainWorkAllowed] = React.useState(false);
  const [reqTargetQuantity, setReqTargetQuantity] = React.useState("100");
  const [announceSearchQuery, setAnnounceSearchQuery] = React.useState("");

  // 날짜 기간 검색 상태 (기본값: 오늘 ~ 향후 7일)
  const todayStr = new Date().toISOString().split("T")[0];
  const [filterStartDate, setFilterStartDate] = React.useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = React.useState<string>(() => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    return future.toISOString().split("T")[0];
  });

  const isDetailDisabled = editingRequest?.status === "OPEN";

  // 1. 본인의 하차지 수용 공고 목록 필터링 및 검색어/날짜 기간 적용
  const myDropoffIds = registeredDropoffList.map(d => d.id);
  const rawAnnouncements = dropoffRequestList.filter(req => myDropoffIds.includes(req.dropOffId));
  const myAnnouncements = rawAnnouncements
    .filter(announce => {
      // 1. 날짜 기간 검색 필터 (수용 지정 작업일 기준)
      const targetDate = announce.startDate || announce.endDate;
      if (targetDate) {
        if (filterStartDate && targetDate < filterStartDate) return false;
        if (filterEndDate && targetDate > filterEndDate) return false;
      }

      // 2. 검색어 필터
      if (!announceSearchQuery.trim()) return true;
      const q = announceSearchQuery.toLowerCase();
      const nameMatch = announce.name?.toLowerCase().includes(q);
      const addressMatch = announce.address?.toLowerCase().includes(q);
      const soilMatch = (
        announce.soilType === "GOOD_SOIL" ? "양질토" :
        announce.soilType === "MUD_SOIL" ? "뻘흙" :
        announce.soilType === "ROCK" ? "암버럭" :
        announce.soilType === "MIXED" ? "혼합" : announce.soilType || ""
      ).toLowerCase().includes(q);
      return nameMatch || addressMatch || soilMatch;
    })
    .sort((a, b) => {
      // 작업일(startDate) 최신순(내림차순) 정렬
      const dateA = a.startDate || "";
      const dateB = b.startDate || "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return b.id - a.id;
    });

  const activeSelectedReqId = selectedReqId || (myAnnouncements.length > 0 ? myAnnouncements[0].id : null);
  const selectedAnnounce = myAnnouncements.find(a => a.id === activeSelectedReqId) || null;

  const handleCreateRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDropoffId) {
      alert("대상 하차지를 선택해 주십시오.");
      return;
    }
    if (!reqUnitPrice || !reqWorkDate) {
      alert("필수 입력값을 채워 주십시오.");
      return;
    }

    let finalSiteName = "";
    let finalSiteAddress = "";
    let matchedSiteIdNum: number | null = null;
    let matchedJobPostIdNum: number | null = null;

    if (reqMatchMode === "direct") {
      finalSiteName = reqSiteName;
      finalSiteAddress = reqSiteAddress;
    } else if (reqMatchMode === "search") {
      if (!reqSelectedJobId) {
        alert("매칭할 현장 배차 공고를 선택해 주십시오.");
        return;
      }
      matchedJobPostIdNum = Number(reqSelectedJobId);
      const chosenCandidate = dispatchRequestList.find(j => String(j.id) === String(reqSelectedJobId));
      if (chosenCandidate) {
        finalSiteName = chosenCandidate.siteName || "";
      }
    }

    const success = editingRequest
      ? (handleUpdateDropoffRequest
          ? await handleUpdateDropoffRequest(editingRequest.id, {
              dropOffId: reqDropoffId,
              materialType: reqMaterialType,
              capacityType: reqCapacityType,
              unitPrice: reqUnitPrice,
              startDate: reqWorkDate,
              endDate: reqWorkDate,
              payerType: reqPayerType,
              soilDealType: reqSoilDealType,
              paymentMethod: reqPaymentMethod,
              hasWashingFacility: reqHasWashingFacility,
              nightWorkAllowed: reqNightWorkAllowed,
              rainWorkAllowed: reqRainWorkAllowed,
              targetQuantity: Number(reqTargetQuantity),
              matchMode: reqMatchMode,
              matchedJobPostId: matchedJobPostIdNum,
            })
          : false)
      : (handleCreateDropoffRequest
          ? await handleCreateDropoffRequest({
              dropOffId: reqDropoffId,
              materialType: reqMaterialType,
              capacityType: reqCapacityType,
              unitPrice: reqUnitPrice,
              startDate: reqWorkDate,
              endDate: reqWorkDate,
              payerType: reqPayerType,
              soilDealType: reqSoilDealType,
              paymentMethod: reqPaymentMethod,
              hasWashingFacility: reqHasWashingFacility,
              nightWorkAllowed: reqNightWorkAllowed,
              rainWorkAllowed: reqRainWorkAllowed,
              targetQuantity: Number(reqTargetQuantity),
              siteName: finalSiteName,
              siteAddress: finalSiteAddress,
              matchMode: reqMatchMode,
              matchedJobPostId: matchedJobPostIdNum,
            })
          : false);

    if (success) {
      if (editingRequest && editingRequest.status === "CLOSED" && reqMatchMode !== "none") {
        if (handleUpdateDropoffRequestStatus) {
          await handleUpdateDropoffRequestStatus(editingRequest.id, "OPEN");
        }
      }
      alert(editingRequest ? "수용 공고가 성공적으로 수정되었습니다!" : "수용 공고가 성공적으로 등록되었습니다!");
      setIsReqModalOpen(false);
      setEditingRequest(null);
      setReqUnitPrice("");
      setReqWorkDate("");
      setReqSelectedJobId("");
      setReqSelectedSiteId("");
      setReqSiteName("");
      setReqSiteAddress("");
      setReqMatchMode("none");
      setReqPaymentMethod("MONTHLY");
      setReqHasWashingFacility(false);
      setReqNightWorkAllowed(false);
      setReqRainWorkAllowed(false);
      setReqTargetQuantity("100");
      if (fetchOpenDropOffRequests) {
        await fetchOpenDropOffRequests();
      }
    } else {
      alert(editingRequest ? "공고 수정에 실패했습니다." : "공고 등록에 실패했습니다.");
    }
  };

  const handleDeleteRequest = async (id: number) => {
    const hasActiveJobs = dispatchRequestList.filter(
      job => job.dropOffRequestId === id && 
      (job.rawStatus === "WAITING_APPROVAL" || job.rawStatus === "OPEN")
    );
    if (hasActiveJobs.length > 0) {
      alert("현재 진행 중이거나 승인 대기 중인 매칭 오더가 존재하여 공고를 삭제할 수 없습니다.");
      return;
    }

    if (confirm("정말로 이 수용 공고를 삭제하시겠습니까?")) {
      const success = handleDeleteDropoffRequest ? await handleDeleteDropoffRequest(id) : false;
      if (success) {
        alert("공고가 삭제되었습니다.");
        if (selectedReqId === id) {
          setSelectedReqId(null);
        }
      } else {
        alert("공고 삭제 처리에 실패했습니다.");
      }
    }
  };

  const handleToggleRequestStatus = async (id: number, currentStatus: string) => {
    const targetStatus = currentStatus === "CLOSED" ? "OPEN" : "CLOSED";
    const statusText = targetStatus === "OPEN" ? "수용 재개(OPEN)" : "수용 정지(CLOSED)";
    if (confirm(`공고 상태를 '${statusText}'로 변경하시겠습니까?\n정지 시 현장 배차 등록 화면에 노출되지 않습니다.`)) {
      const success = handleUpdateDropoffRequestStatus ? await handleUpdateDropoffRequestStatus(id, targetStatus) : false;
      if (success) {
        alert("상태가 성공적으로 변경되었습니다.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Title Section */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">공고 관리</h2>
          <p className="text-xs text-slate-500 mt-1">
            본인이 운영하는 사토장의 토사 반입 수용 공고를 등록하고 제어하며, 조건이 일치하는 공사 현장을 탐색해 매칭을 성사시킵니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (registeredDropoffList.length === 0) {
              alert("등록된 하차지가 없습니다. 하차지 등록 메뉴에서 사토장을 먼저 등록해 주십시오.");
              return;
            }
            setEditingRequest(null);
            setReqDropoffId(String(registeredDropoffList[0].id));
            setReqMaterialType("GOOD_SOIL");
            setReqCapacityType("T_25");
            setReqUnitPrice("");
            setReqWorkDate("");
            setReqPayerType("SITE_PAYS");
            setReqSoilDealType("sell");
            setReqMatchMode("none");
            setReqPaymentMethod("MONTHLY");
            setReqHasWashingFacility(false);
            setReqNightWorkAllowed(false);
            setReqRainWorkAllowed(false);
            setReqTargetQuantity("100");
            setIsReqModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
        >
          + 신규 수용 공고 등록
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Announcements List */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 max-h-[640px] overflow-y-auto">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">등록된 수용 공고 ({myAnnouncements.length})</h3>
          </div>

          {/* 수용 공고 실시간 검색창 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={announceSearchQuery}
              onChange={(e) => setAnnounceSearchQuery(e.target.value)}
              placeholder="공고명, 사토장, 토사 검색..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            />
          </div>

          {/* 날짜 기간 검색 바 (현장 배차 요청 화면과 동일 UX) */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>검색 기간 (작업일 기준)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setFilterStartDate(today);
                    setFilterEndDate(today);
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition-all"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const start = today.toISOString().split("T")[0];
                    const future = new Date();
                    future.setDate(today.getDate() + 7);
                    setFilterStartDate(start);
                    setFilterEndDate(future.toISOString().split("T")[0]);
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition-all"
                >
                  1주일
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const start = today.toISOString().split("T")[0];
                    const future = new Date();
                    future.setMonth(today.getMonth() + 1);
                    setFilterStartDate(start);
                    setFilterEndDate(future.toISOString().split("T")[0]);
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition-all"
                >
                  1개월
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition-all"
                >
                  전체
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {myAnnouncements.map((announce) => {
              const isSelected = activeSelectedReqId === announce.id;
              return (
                <div
                  key={announce.id}
                  onClick={() => setSelectedReqId(announce.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-300 shadow-md"
                      : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                      {announce.name}
                    </span>
                    <div className="flex flex-wrap gap-1 items-center justify-end">
                      {(() => {
                        const targetQty = Number(announce.targetQuantity) || 0;
                        const currentQty = Number(announce.currentQuantity) || 0;
                        const remainingQty = Math.max(0, targetQty - currentQty);

                        if (announce.status === "CLOSED") {
                          return (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200">
                              수용 정지
                            </span>
                          );
                        }

                        // 목표 수량을 모두 채운 경우
                        if (targetQty > 0 && currentQty >= targetQty) {
                          return (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-300">
                              수용 완료 ({currentQty}/{targetQty}대)
                            </span>
                          );
                        }

                        // 일부만 매칭된 경우 (예: 2대 중 1대 매칭)
                        if (currentQty > 0 && remainingQty > 0) {
                          return (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-300">
                              부분 매칭 ({currentQty}/{targetQty}대, 잔여 {remainingQty}대)
                            </span>
                          );
                        }

                        // 아직 매칭된 수량이 없는 순수 수용 대기 상태
                        return (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                            수용 중 ({targetQty > 0 ? `잔여 ${targetQty}대` : "협의"})
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-semibold truncate">
                    토종: {(() => {
                      switch (announce.soilType) {
                        case "GOOD_SOIL": return "양질토";
                        case "MUD_SOIL": return "뻘흙";
                        case "ROCK": return "암버럭";
                        case "MIXED": return "혼합";
                        default: return announce.soilType || "양질토";
                      }
                    })()} | 규격: {announce.truckType === "T_25" ? "25톤" : "15톤"}
                  </p>
                  {(() => {
                    const linkedJobs = dispatchRequestList.filter(job => job.dropOffRequestId === announce.id);
                    if (linkedJobs.length === 0) return null;
                    const activeJob = linkedJobs.find(j => j.rawStatus === "WAITING_APPROVAL" || j.rawStatus === "OPEN" || j.rawStatus === "COMPLETED" || j.rawStatus === "CLOSED") || linkedJobs[0];
                    if (!activeJob) return null;
                    const isMySent = Number(activeJob.authorId) === Number(user?.id);

                    // 현장 배차 오더의 상태 뱃지 (하차지 수용 뱃지와 명확히 구분)
                    const getSiteJobBadge = () => {
                      if (activeJob.rawStatus === "WAITING_APPROVAL") {
                        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">승인 대기</span>;
                      }
                      if (activeJob.rawStatus === "OPEN") {
                        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">현장 기사 모집 중 ({activeJob.truckCount}대)</span>;
                      }
                      if (activeJob.rawStatus === "CLOSED") {
                        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">현장 기사 배차 완료 ({activeJob.truckCount}대)</span>;
                      }
                      if (activeJob.rawStatus === "COMPLETED") {
                        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">현장 운행 완료 ({activeJob.truckCount}대)</span>;
                      }
                      if (activeJob.rawStatus === "CANCELLED") {
                        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">매칭 반려</span>;
                      }
                      return null;
                    };

                    return (
                      <div className="mt-2 text-[9.5px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-slate-400">매칭현장:</span>
                          <span className="font-bold text-slate-800 truncate">{activeJob.siteName}</span>
                          <span className="text-slate-400 text-[9px]">({isMySent ? "하차지 ➔ 현장" : "현장 ➔ 하차지"})</span>
                        </div>
                        <div className="shrink-0">
                          {getSiteJobBadge()}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                    <span>수용 단가: <strong className="text-slate-700 font-extrabold">{announce.unitPrice.toLocaleString()}원</strong></span>
                    <span>목표: <strong className="text-slate-700 font-bold">{announce.targetQuantity}대</strong></span>
                    <span className="text-slate-500 font-mono font-bold">작업일: {announce.startDate}</span>
                  </div>

                  {/* 하차지 작업 조건 태그 */}
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-200/30">
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border transition-all ${
                      announce.hasWashingFacility 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-slate-50 text-slate-300 border-slate-200"
                    }`}>
                      세륜기
                    </span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border transition-all ${
                      announce.nightWorkAllowed 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-slate-50 text-slate-300 border-slate-200"
                    }`}>
                      야간작업
                    </span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border transition-all ${
                      announce.rainWorkAllowed 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-slate-50 text-slate-300 border-slate-200"
                    }`}>
                      우천작업
                    </span>
                  </div>
                </div>
              );
            })}
            {myAnnouncements.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
                등록된 수용 공고가 없습니다. <br />상단의 신규 등록 단추를 눌러 생성해 보십시오.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Announcement Detail & Live Site Matching */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAnnounce ? (
            <div className="space-y-6">
              {/* Announcement detail card */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      [{selectedAnnounce.name}] 수용 공고 상세 사양
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">공고번호: DACC-00{selectedAnnounce.id}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedAnnounce.status === "CLOSED" ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRequestStatus(selectedAnnounce.id, selectedAnnounce.status)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-emerald-200"
                      >
                        수용 시작 (OPEN)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleRequestStatus(selectedAnnounce.id, selectedAnnounce.status)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-amber-200"
                      >
                        수용 일시정지
                      </button>
                    )}
                    {(() => {
                      const hasActiveJobs = dispatchRequestList.some(
                        job => job.dropOffRequestId === selectedAnnounce.id && 
                        (job.rawStatus === "WAITING_APPROVAL" || job.rawStatus === "OPEN")
                      );
                      if (!hasActiveJobs) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRequest(selectedAnnounce);
                              setReqDropoffId(String(selectedAnnounce.dropOffId));
                              setReqMaterialType(selectedAnnounce.soilType || "GOOD_SOIL");
                              setReqCapacityType(selectedAnnounce.truckType || "T_25");
                              setReqUnitPrice(String(selectedAnnounce.unitPrice));
                              setReqWorkDate(selectedAnnounce.startDate);
                              setReqPayerType(selectedAnnounce.payerType || "SITE_PAYS");
                              setReqSoilDealType(selectedAnnounce.soilDealType || "sell");
                              setReqPaymentMethod(selectedAnnounce.paymentMethod || "MONTHLY");
                              setReqHasWashingFacility(selectedAnnounce.hasWashingFacility || false);
                              setReqNightWorkAllowed(selectedAnnounce.nightWorkAllowed || false);
                              setReqRainWorkAllowed(selectedAnnounce.rainWorkAllowed || false);
                              setReqTargetQuantity(String(selectedAnnounce.targetQuantity || 100));
                              setReqMatchMode("none");
                              setReqSelectedJobId("");
                              setReqSelectedSiteId("");
                              setReqSiteName("");
                              setReqSiteAddress("");
                              setIsReqModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-blue-200"
                          >
                            공고 수정
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(selectedAnnounce.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-rose-200"
                    >
                      공고 취소(삭제)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">공고 대상 사토장</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedAnnounce.name}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">하차지 지번 주소</span>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedAnnounce.address || "주소 미지정"}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">수용 가능 토사</span>
                        <div className="text-xs font-bold text-blue-600 mt-0.5">
                          {(() => {
                            switch (selectedAnnounce.soilType) {
                              case "GOOD_SOIL": return "양질토";
                              case "MUD_SOIL": return "뻘흙";
                              case "ROCK": return "암버럭";
                              case "MIXED": return "혼합";
                              default: return selectedAnnounce.soilType || "양질토";
                            }
                          })()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">차량 대형 규격</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedAnnounce.truckType === "T_25" ? "25톤 덤프" : "15톤 덤프"}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">비용 정산 구분</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">
                          {selectedAnnounce.payerType === "SITE_PAYS" ? "현장 지급" : selectedAnnounce.payerType === "DROP_OFF_PAYS" ? "하차지 지급" : "무상"}
                          {selectedAnnounce.paymentMethod && ` (${selectedAnnounce.paymentMethod === "MONTHLY" ? "월정산" : "주/일정산"})`}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">수용 단가</span>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedAnnounce.unitPrice.toLocaleString()} 원</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">목표 수량 (대수)</span>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedAnnounce.targetQuantity} 대</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">현재 매칭 수량</span>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedAnnounce.currentQuantity} 대</div>
                      </div>
                    </div>

                    {/* 하차지 작업 조건 태그 */}
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-2.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border transition-all ${
                        selectedAnnounce.hasWashingFacility 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-300 border-slate-200"
                      }`}>
                        세륜기
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border transition-all ${
                        selectedAnnounce.nightWorkAllowed 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-300 border-slate-200"
                      }`}>
                        야간작업
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border transition-all ${
                        selectedAnnounce.rainWorkAllowed 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-300 border-slate-200"
                      }`}>
                        우천작업
                      </span>
                    </div>
                  </div>
                </div>

                {selectedAnnounce.address && (
                  <div className="space-y-1.5 mt-4">
                    <MockMap
                      title="하차지 매핑 위치"
                      address={selectedAnnounce.address}
                      pinned={true}
                      onPinClick={() => {}}
                    />
                  </div>
                )}
              </div>

              {/* 연계된 현장 매칭 상세 현황 */}
              {(() => {
                const connectedRequests = dispatchRequestList
                  .filter(job => job.dropOffRequestId === selectedAnnounce.id)
                  .sort((a, b) => {
                    const dateA = a.startDate || "";
                    const dateB = b.startDate || "";
                    if (dateA !== dateB) {
                      return dateB.localeCompare(dateA);
                    }
                    return b.id - a.id;
                  });
                if (connectedRequests.length > 0) {
                  return (
                    <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-xl space-y-4">
                      <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                        <div>
                          <h3 className="font-extrabold text-sm text-blue-800">🏢 연계된 현장 매칭 상세 현황</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            해당 수용 공고와 연계된 현장 매칭 내역(현장 수신 요청 및 하차지 제안 건) 전체 현황입니다.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600">총 {connectedRequests.length}건</span>
                      </div>

                      <div className="space-y-3">
                        {connectedRequests.map((sentJob) => (
                          <MatchStatusCard
                            key={sentJob.id}
                            id={sentJob.id}
                            title={sentJob.siteName}
                            direction={sentJob.matchedDropOffId !== null ? "dropoff_to_site" : "site_to_dropoff"}
                            rawStatus={sentJob.rawStatus}
                            isMyInitiated={sentJob.matchedDropOffId !== null}
                            workDate={sentJob.startDate}
                            materialType={sentJob.soilType}
                            truckCount={sentJob.truckCount}
                            unitPrice={sentJob.offeredUnitPrice}
                            distance={sentJob.distance}
                            estimatedTime={sentJob.estimatedTime}
                            memo={sentJob.memo}
                            rejectionReason={sentJob.rejectionReason}
                            onApprove={async () => {
                              if (confirm(`[${sentJob.siteName}] 현장의 매칭 요청을 승인하시겠습니까?`)) {
                                const success = handleApproveJobPost ? await handleApproveJobPost(sentJob.id) : false;
                                if (success) {
                                  alert("매칭 요청을 성공적으로 승인했습니다.");
                                } else {
                                  alert("승인 처리에 실패했습니다.");
                                }
                              }
                            }}
                            onReject={() => {
                              setRejectingJobId(sentJob.id);
                              setRejectingSiteName(sentJob.siteName);
                              setIsRejectModalOpen(true);
                            }}
                            onReset={async () => {
                              if (confirm("반려 확인 처리를 하고 이 매칭 건을 목록에서 제외(초기화)하시겠습니까?\n(공고는 다시 매칭 대기 상태로 초기화됩니다.)")) {
                                const success = handleResetMatchJobPost ? await handleResetMatchJobPost(sentJob.id) : false;
                                if (success) {
                                  alert("확인 처리가 완료되었습니다.");
                                } else {
                                  alert("확인 처리에 실패했습니다.");
                                }
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                📄
              </div>
              <h4 className="text-xs font-bold text-slate-700">선택된 수용 공고가 없습니다.</h4>
              <p className="text-[10px] text-slate-400">왼쪽 공고 목록에서 상세 내역 및 현장 매칭을 검토할 공고를 선택해 주십시오.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create announcement request Modal */}
      {mounted && isReqModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-xl w-full p-8 shadow-2xl space-y-6 animate-scaleUp max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-base text-slate-900">{editingRequest ? "토사 반입 수용 공고 수정" : "신규 토사 반입 수용 공고 등록"}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{editingRequest ? "선택한 수용 공고의 상세 조건 및 사양을 수정합니다." : "하차지가 수용 가능한 토사 사양 및 비용 정보를 입력하여 공고를 등록합니다."}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsReqModalOpen(false); setEditingRequest(null); }}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-black transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRequestSubmit} className="space-y-5 text-xs">
              {isDetailDisabled && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-[11px] font-semibold leading-normal animate-fadeIn">
                  ⚠️ <strong>수용 중(OPEN)</strong> 상태인 공고는 상세 사양(토사 종류, 단가, 작업일 등)을 변경할 수 없습니다. 현장 매칭 정보만 설정 가능합니다. 상세 사양 변경을 원하시면 수용 일시정지 후 시도해 주십시오.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-700 font-extrabold block">공고 게시 대상 사토장 <span className="text-rose-500">*</span></label>
                <select
                  value={reqDropoffId}
                  onChange={(e) => setReqDropoffId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                  disabled={isDetailDisabled}
                >
                  {registeredDropoffList.map(drop => (
                    <option key={drop.id} value={drop.id}>{drop.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold block">수용 토사 종류 <span className="text-rose-500">*</span></label>
                  <select
                    value={reqMaterialType}
                    onChange={(e) => setReqMaterialType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  >
                    {dbCommonCodes && dbCommonCodes.filter(c => c.group_code === "MATERIAL_TYPE").length > 0 ? (
                      dbCommonCodes.filter(c => c.group_code === "MATERIAL_TYPE").map(c => (
                        <option key={c.id || c.code} value={c.code}>{c.code_name}</option>
                      ))
                    ) : (
                      <>
                        <option value="GOOD_SOIL">양질토</option>
                        <option value="MUD_SOIL">뻘흙</option>
                        <option value="ROCK">암버럭</option>
                        <option value="MIXED">혼합</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold block">대형 차량 규격 <span className="text-rose-500">*</span></label>
                  <select
                    value={reqCapacityType}
                    onChange={(e) => setReqCapacityType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  >
                    {dbCommonCodes && dbCommonCodes.filter(c => c.group_code === "TRUCK_TYPE").length > 0 ? (
                      dbCommonCodes.filter(c => c.group_code === "TRUCK_TYPE").map(c => (
                        <option key={c.id || c.code} value={c.code}>{c.code_name}</option>
                      ))
                    ) : (
                      <>
                        <option value="T_25">25톤</option>
                        <option value="T_15">15톤</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold block">정산 구분 <span className="text-rose-500">*</span></label>
                  <select
                    value={reqPayerType}
                    onChange={(e) => setReqPayerType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  >
                    <option value="SITE_PAYS">현장 지급 (사토 구입)</option>
                    <option value="DROP_OFF_PAYS">하차지 지급 (사토 처리비)</option>
                    <option value="FREE">무상 (FREE)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold block">정산 방식 <span className="text-rose-500">*</span></label>
                  <select
                    value={reqPaymentMethod}
                    onChange={(e) => setReqPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  >
                    <option value="MONTHLY">월정산</option>
                    <option value="DAILY">주/일정산</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold block">수용 단가 (원) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={reqUnitPrice}
                    onChange={(e) => setReqUnitPrice(e.target.value)}
                    placeholder="단가 입력 (예: 8000)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold block">목표수량 (대수) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={reqTargetQuantity}
                    onChange={(e) => setReqTargetQuantity(e.target.value)}
                    placeholder="대수 입력 (예: 100)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  />
                </div>
              </div>

              {/* 하차지 작업 조건 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-slate-700 font-extrabold block">하차지 작업 조건</label>
                <div className="grid grid-cols-3 gap-3">
                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    reqHasWashingFacility ? "bg-emerald-50/50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"
                  } ${isDetailDisabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                    <input
                      type="checkbox"
                      checked={reqHasWashingFacility}
                      onChange={(e) => !isDetailDisabled && setReqHasWashingFacility(e.target.checked)}
                      disabled={isDetailDisabled}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-[11px] font-bold">세륜기 구비</span>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    reqNightWorkAllowed ? "bg-emerald-50/50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"
                  } ${isDetailDisabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                    <input
                      type="checkbox"
                      checked={reqNightWorkAllowed}
                      onChange={(e) => !isDetailDisabled && setReqNightWorkAllowed(e.target.checked)}
                      disabled={isDetailDisabled}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-[11px] font-bold">야간작업 가능</span>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    reqRainWorkAllowed ? "bg-emerald-50/50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"
                  } ${isDetailDisabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                    <input
                      type="checkbox"
                      checked={reqRainWorkAllowed}
                      onChange={(e) => !isDetailDisabled && setReqRainWorkAllowed(e.target.checked)}
                      disabled={isDetailDisabled}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-[11px] font-bold">우천작업 가능</span>
                  </label>
                </div>
              </div>

              {/* Single Date input field */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <label className="text-slate-700 font-extrabold block">수용 지정 작업일 <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={reqWorkDate}
                  onChange={(e) => {
                    setReqWorkDate(e.target.value);
                    setReqSelectedJobId("");
                    setReqSelectedSiteId("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                  disabled={isDetailDisabled}
                />
              </div>

              {/* Match Mode Selection */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-slate-700 font-extrabold block">현장정보 등록 <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setReqMatchMode("direct");
                      setReqSelectedJobId("");
                      setReqSelectedSiteId("");
                    }}
                    className={`py-3 text-center text-xs font-black rounded-xl transition-all ${reqMatchMode === "direct"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    직접매칭
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReqMatchMode("search");
                      setReqSelectedJobId("");
                      setReqSelectedSiteId("");
                    }}
                    className={`py-3 text-center text-xs font-black rounded-xl transition-all ${reqMatchMode === "search"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    현장 검색
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReqMatchMode("none");
                      setReqSelectedJobId("");
                      setReqSelectedSiteId("");
                    }}
                    className={`py-3 text-center text-xs font-black rounded-xl transition-all ${reqMatchMode === "none"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    매칭대기
                  </button>
                </div>
              </div>

              {/* Match Mode Description & Form Card */}
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/80 space-y-4">
                {reqMatchMode === "none" && (
                  <div className="text-center py-2 space-y-1.5 animate-fadeIn">
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                      현장을 지정하지 않고 공고를 올립니다.
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      현장 관리자들의 매칭 신청을 대기합니다.
                    </p>
                  </div>
                )}

                {reqMatchMode === "search" && (() => {
                  if (!reqWorkDate) {
                    return (
                      <div className="text-center py-4 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-[11px] text-amber-800 font-bold">
                        ⚠️ 수용 지정 작업일을 먼저 선택해 주십시오.
                      </div>
                    );
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
                    return ton || "규격";
                  };

                  // 1. 작업일 일치 + 2. 토사 종류 동일 + 3. 차량 톤수 규격 동일
                  const searchCandidates = dispatchRequestList.filter(job => {
                    const isWaiting = job.rawStatus === "WAITING_MATCH";
                    const isDateMatch = job.startDate === reqWorkDate;
                    
                    // 토사 종류 일치 검사
                    const isSoilMatch = !reqMaterialType || job.soilType === reqMaterialType;

                    // 차량 톤수 규격 일치 검사 (job.tonTypes 배열 또는 단일값)
                    const isTonMatch = !reqCapacityType || (
                      Array.isArray(job.tonTypes) && job.tonTypes.length > 0
                        ? job.tonTypes.includes(reqCapacityType)
                        : true
                    );

                    return isWaiting && isDateMatch && isSoilMatch && isTonMatch;
                  });

                  const selectedJob = searchCandidates.find(j => String(j.id) === reqSelectedJobId);

                  return (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="text-[10px] text-slate-500 font-bold">
                          ℹ️ 선택 조건과 일치하는 매칭 대기 현장 공고 목록입니다.
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            📅 작업일: {reqWorkDate}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            흙: {formatSoilName(reqMaterialType)}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            🚚 {formatTonName(reqCapacityType)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-700 font-bold block">현장 배차 공고 선택 <span className="text-rose-500">*</span></label>
                        {searchCandidates.length === 0 ? (
                          <div className="p-3.5 text-center bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-semibold space-y-1">
                            <p>조건(작업일: {reqWorkDate}, 토종: {formatSoilName(reqMaterialType)}, 톤수: {formatTonName(reqCapacityType)})에 맞는 현장 배차 공고가 없습니다.</p>
                            <p className="text-[10px] text-slate-400">토사 종류나 차량 규격이 일치하는 공고만 노출됩니다.</p>
                          </div>
                        ) : (
                          <select
                            value={reqSelectedJobId || ""}
                            onChange={(e) => {
                              const chosenJobId = e.target.value;
                              setReqSelectedJobId(chosenJobId);
                              const foundJob = searchCandidates.find(j => String(j.id) === chosenJobId);
                              if (foundJob) {
                                setReqSelectedSiteId(String(foundJob.siteId));
                              } else {
                                setReqSelectedSiteId("");
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                            required
                          >
                            <option value="">-- 매칭할 등록 현장 공고 선택 ({searchCandidates.length}건 일치) --</option>
                            {searchCandidates.map(job => {
                              const jobTon = Array.isArray(job.tonTypes) && job.tonTypes.length > 0
                                ? job.tonTypes.map((t: string) => formatTonName(t)).join(", ")
                                : "규격 미지정";
                              return (
                                <option key={job.id} value={job.id}>
                                  [공고 #{job.id}] {job.siteName} (작업일: {job.startDate} | 토종: {formatSoilName(job.soilType)} | 차량: {jobTon} | {job.truckCount}대)
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>
                      {selectedJob && (
                        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 animate-fadeIn text-xs text-slate-700">
                          <div className="font-extrabold text-blue-900 flex items-center gap-1.5 mb-1.5 text-xs border-b border-blue-200 pb-1">
                            <span>🏢 선택 현장 상세 정보</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold">
                            <div>• 현장명: <span className="text-slate-900 font-bold">{selectedJob.siteName}</span></div>
                            <div>• 작업일: <span className="text-slate-900 font-bold">{selectedJob.startDate}</span></div>
                            <div>• 토사 종류: <span className="text-blue-700 font-bold">{formatSoilName(selectedJob.soilType)}</span></div>
                            <div>• 차량 규격: <span className="text-amber-700 font-bold">{
                              Array.isArray(selectedJob.tonTypes) && selectedJob.tonTypes.length > 0
                                ? selectedJob.tonTypes.map((t: string) => formatTonName(t)).join(", ")
                                : "25톤"
                            }</span></div>
                            <div>• 필요 수량: <span className="text-slate-900 font-bold">{selectedJob.truckCount} 대</span></div>
                            <div>• 제시 단가: <span className="text-emerald-700 font-bold">{selectedJob.offeredUnitPrice.toLocaleString()} 원/㎥</span></div>
                            {selectedJob.distance && (
                              <div className="col-span-2">• 거리 / 시간: <span className="text-slate-900 font-bold">{selectedJob.distance}km ({selectedJob.estimatedTime}분 소요)</span></div>
                            )}
                            {selectedJob.memo && (
                              <div className="col-span-2 border-t border-blue-200/50 pt-1.5 mt-1 text-slate-500 font-medium leading-relaxed">
                                • 현장 메모: {selectedJob.memo}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {reqMatchMode === "direct" && (
                  <div className="space-y-3 animate-fadeIn">
                    <p className="text-[10px] text-slate-400 font-bold">
                      ℹ️ 직접 거래를 위해 공사 현장 정보(현장명, 주소)를 수동으로 입력하여 직통 공고를 개설합니다.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-700 font-extrabold block">반출 현장명 <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={reqSiteName}
                          onChange={(e) => setReqSiteName(e.target.value)}
                          placeholder="공사 현장명 입력"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-slate-700 font-extrabold block">현장 주소 <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={reqSiteAddress}
                          onChange={(e) => setReqSiteAddress(e.target.value)}
                          placeholder="현장 위치 주소 입력"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsReqModalOpen(false); setEditingRequest(null); }}
                  className="flex-1 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-extrabold active:scale-98 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/15 active:scale-98 transition-all"
                >
                  {editingRequest ? "수용 공고 수정 완료" : "수용 공고 게시 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 매칭 반려 사유 입력 중앙 레이어 팝업 모달 */}
      {mounted && isRejectModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚫</span>
                <div>
                  <h3 className="font-black text-base text-slate-900">현장 매칭 요청 반려 사유 입력</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    [{rejectingSiteName}] 현장의 매칭 요청을 반려하는 명확한 사유를 입력해 주십시오.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectingJobId(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                반려 사유 작성 <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="예: 수용 가능 단가 불일치 / 요청 토질 사양 상이 / 일시적 매립 용량 초과 등"
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none shadow-inner"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!rejectionReasonInput.trim()) {
                    alert("반려 사유를 작성해 주십시오.");
                    return;
                  }
                  if (rejectingJobId !== null && handleRejectJobPost) {
                    const success = await handleRejectJobPost(rejectingJobId, rejectionReasonInput.trim());
                    if (success) {
                      alert("매칭 요청이 사유와 함께 성공적으로 반려되었습니다.");
                      setIsRejectModalOpen(false);
                      setRejectingJobId(null);
                    } else {
                      alert("반려 처리에 실패했습니다. 다시 시도해 주십시오.");
                    }
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95"
              >
                반려 확정
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectingJobId(null);
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default DropoffAnnouncementManagement;
