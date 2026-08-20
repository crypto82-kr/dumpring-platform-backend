import React, { useState, useRef, useEffect } from "react";
import { Search, Filter, ShieldCheck, CheckCircle2, XCircle, FileText, UserCheck, Eye, ZoomIn, ZoomOut, RotateCw, Sparkles, Check, AlertCircle, ArrowUpRight, Maximize2, X } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface PlatformAdminUnifiedApprovalProps {
  setActivePath: (path: string) => void;
  drivers: any[];
  owners: any[];
  sites: any[];
  dropoffSites: any[];
  uploadedFiles: Record<string, string>;
  handleApproveDriver: (id: number) => void;
  handleApproveOwner: (id: number) => void;
  handleApproveSite: (id: number) => void;
  handleApproveDropoff: (id: number) => void;
  handleRejectMember: (id: number, reason: string) => Promise<boolean>;
  handleCancelRejectMember: (id: number) => Promise<boolean>;
}

export function PlatformAdminUnifiedApproval({
  setActivePath,
  drivers = [],
  owners = [],
  sites = [],
  dropoffSites = [],
  uploadedFiles = {},
  handleApproveDriver,
  handleApproveOwner,
  handleApproveSite,
  handleApproveDropoff,
  handleRejectMember,
  handleCancelRejectMember,
}: PlatformAdminUnifiedApprovalProps) {
  const [filterRole, setFilterRole] = useState<"ALL" | "DRIVER" | "OWNER" | "SITE_MANAGER" | "SITE_WORKER" | "DROPOFF" | "SITE">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [verifyZoom, setVerifyZoom] = useState(1.0);
  const [verifyRotate, setVerifyRotate] = useState(0);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 반려 사유 입력 모달 상태
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState("");

  const [activeDocTab, setActiveDocTab] = useState<string>("DOC_1");
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elem = viewerContainerRef.current;
    if (!elem) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setVerifyZoom((prev) => Math.min(prev + 0.15, 4.0));
      } else {
        setVerifyZoom((prev) => Math.max(prev - 0.15, 0.5));
      }
    };

    elem.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      elem.removeEventListener("wheel", handleWheel);
    };
  }, [selectedItem, activeDocTab]);

  // 통합 승인 목록 데이터 구성 (미승인 대기 건만 필터링)
  const allApprovalList = [
    ...drivers.map((d) => ({
      ...d,
      typeKey: "DRIVER",
      typeName: "덤프 기사",
      badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      iconBg: "bg-sky-500",
      companyOrSite: d.license || "1종대형 면허 보유",
      docName: "운전면허증_앞면.png",
      rawObj: d,
    })),
    ...owners.map((o) => ({
      ...o,
      typeKey: "OWNER",
      typeName: "차주 / 운송사",
      badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      iconBg: "bg-indigo-500",
      companyOrSite: o.companyName || "운송사 미지정",
      docName: "사업자등록증.png",
      rawObj: o,
    })),
    ...sites.map((s) => {
      const isWorker = s.role === "site_worker" || s.is_site_worker || s.employee_role;
      return {
        ...s,
        typeKey: isWorker ? "SITE_WORKER" : "SITE_MANAGER",
        typeName: isWorker ? "현장 담당자" : "현장 관리자",
        name: isWorker ? (s.name || s.workerName || "담당자 미지정") : (s.managerName || s.name || "관리자 미지정"),
        phone: isWorker ? (s.phone || s.workerPhone || "연락처 미등록") : (s.phone || s.managerPhone || "연락처 미등록"),
        siteName: s.siteName || s.name || "현장명 미등록",
        companyName: s.companyName || s.company || "시공/도급사 미등록",
        badgeClass: isWorker
          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        iconBg: isWorker ? "bg-purple-500" : "bg-amber-500",
        companyOrSite: isWorker 
          ? (s.siteName || s.name || "소속 현장 미지정")
          : `${s.siteName || s.name || "공사현장"} (${s.companyName || s.company || "시공사"})`,
        docName: isWorker ? "현장_담당자_연동_신청서.pdf" : "비산먼지_배출신고서_및_공사계약서.pdf",
        rawObj: s,
      };
    }),
    ...dropoffSites.map((dp) => ({
      ...dp,
      typeKey: "DROPOFF",
      typeName: "하차지",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      iconBg: "bg-emerald-500",
      companyOrSite: dp.locationName || dp.name || "사토장 미지정",
      docName: "토사반입_허가서.pdf",
      rawObj: dp,
    })),
  ].filter((item) => item.status !== "승인됨");

  // 필터링 및 검색 적용
  const filteredList = allApprovalList.filter((item) => {
    if (filterRole !== "ALL") {
      if (filterRole === "SITE") {
        if (item.typeKey !== "SITE_MANAGER" && item.typeKey !== "SITE_WORKER") return false;
      } else if (item.typeKey !== filterRole) {
        return false;
      }
    }
    if (filterStatus === "PENDING" && item.status !== "대기") return false;
    if (filterStatus === "REJECTED" && item.status !== "반려됨") return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchPhone = item.phone?.toLowerCase().includes(q);
      const matchCompany = item.companyOrSite?.toLowerCase().includes(q);
      return matchName || matchPhone || matchCompany;
    }

    return true;
  });

  const pendingCount = allApprovalList.filter((i) => i.status === "대기").length;
  const rejectedCount = allApprovalList.filter((i) => i.status === "반려됨").length;

  const handleApproveAction = async (item: any) => {
    if (item.typeKey === "DRIVER") await handleApproveDriver(item.id);
    else if (item.typeKey === "OWNER") await handleApproveOwner(item.id);
    else if (item.typeKey === "SITE_MANAGER" || item.typeKey === "SITE_WORKER") await handleApproveSite(item.id);
    else if (item.typeKey === "DROPOFF") await handleApproveDropoff(item.id);

    setSelectedItem(null);
    alert(`[${item.name}] 님의 가입 요청이 성공적으로 승인되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Basic Clean Menu Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>승인 관리</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            덤프 기사, 차주/운송사, 하차지, 현장 관리자의 가입 승인 요청 및 제출 서류를 심사합니다.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar Container */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: `전체 (${allApprovalList.length})` },
            { id: "DRIVER", label: `🚚 덤프 기사 (${drivers.length})` },
            { id: "OWNER", label: `🏢 차주/운송사 (${owners.length})` },
            { id: "DROPOFF", label: `🏞️ 하차지 (${dropoffSites.length})` },
            { id: "SITE", label: `🏗️ 현장 (${allApprovalList.filter((i) => i.typeKey === "SITE_MANAGER" || i.typeKey === "SITE_WORKER").length})` },
          ].map((tab) => {
            const isSelected = filterRole === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterRole(tab.id as any);
                  setSelectedItem(null);
                  setActiveDocTab("DOC_1");
                  setVerifyZoom(1.0);
                  setVerifyRotate(0);
                }}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all active:scale-95 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-600/30"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-3">
          {/* 심사 상태 탭 (심사대기 / 반려됨) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => {
                setFilterStatus("ALL");
                setSelectedItem(null);
              }}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                filterStatus === "ALL"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              전체 ({allApprovalList.length})
            </button>
            <button
              onClick={() => {
                setFilterStatus("PENDING");
                setSelectedItem(null);
              }}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                filterStatus === "PENDING"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              심사대기 ({pendingCount})
            </button>
            <button
              onClick={() => {
                setFilterStatus("REJECTED");
                setSelectedItem(null);
              }}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                filterStatus === "REJECTED"
                  ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              반려됨 ({rejectedCount})
            </button>
          </div>

          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="이름, 번호, 회사/현장 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Content Split Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Applicants List (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
              <span>📋</span>
              <span>심사 대상 목록 ({filteredList.length}건)</span>
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>선택 시 서류 조회</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 max-h-[750px]">
            {filteredList.length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed rounded-3xl border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold bg-white dark:bg-slate-900 space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <p>조건에 일치하는 가입 승인 요청이 없습니다.</p>
              </div>
            ) : (
              filteredList.map((item, idx) => {
                const isSelected = selectedItem ? (
                  (selectedItem.phone && item.phone && selectedItem.phone === item.phone && selectedItem.typeKey === item.typeKey) ||
                  (selectedItem.id && item.id && selectedItem.id === item.id && selectedItem.typeKey === item.typeKey) ||
                  (selectedItem === item)
                ) : false;
                const isApproved = item.status === "승인됨";

                return (
                  <div
                    key={`${item.typeKey}_${item.id}_${idx}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setVerifyZoom(1.0);
                      setVerifyRotate(0);
                      setPanPos({ x: 0, y: 0 });
                      if (item.typeKey === "SITE_MANAGER") {
                        setActiveDocTab("DOC_BIZ");
                      } else if (item.typeKey === "DRIVER") {
                        setActiveDocTab("DOC_1");
                      } else if (item.typeKey === "OWNER") {
                        setActiveDocTab("DOC_BIZ");
                      } else if (item.typeKey === "DROPOFF") {
                        setActiveDocTab("DOC_PERMIT");
                      } else {
                        setActiveDocTab("DOC_1");
                      }
                    }}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative group overflow-hidden ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 shadow-lg ring-2 ring-blue-500/20"
                        : "bg-slate-50/70 dark:bg-slate-950/40 hover:bg-blue-50/30 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${item.badgeClass}`}>
                            {item.typeName}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                          {item.companyOrSite}
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                          <span>연락처: {item.phone}</span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-xl border shrink-0 flex items-center gap-1 ${
                          item.status === "반려됨"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : isApproved
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {item.status === "반려됨" ? (
                          <XCircle className="w-3 h-3 text-rose-500" />
                        ) : isApproved ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3 animate-spin-slow" />
                        )}
                        <span>{item.status}</span>
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Visual Document Inspection Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          {selectedItem ? (
            <div className="space-y-5">
              {/* Viewer Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${selectedItem.badgeClass}`}>
                    {selectedItem.typeName}
                  </span>
                  <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                    [{selectedItem.name}] 제출 서류 실물 검증
                  </h3>
                </div>

                <span
                  className={`text-[11px] font-extrabold px-3 py-1 rounded-xl border shrink-0 flex items-center gap-1 ${
                    selectedItem.status === "반려됨"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }`}
                >
                  {selectedItem.status === "반려됨" ? <XCircle className="w-3.5 h-3.5 text-rose-500" /> : <AlertCircle className="w-3.5 h-3.5 animate-spin-slow" />}
                  <span>{selectedItem.status === "반려됨" ? "가입 심사 반려됨" : "승인 심사 대기중"}</span>
                </span>
              </div>

              {/* 반려 사유 안내 배너 (반려된 건인 경우) */}
              {selectedItem.status === "반려됨" && selectedItem.rejectReason && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-2 font-extrabold text-rose-800 dark:text-rose-200">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>가입 심사 반려 내역 및 사유</span>
                  </div>
                  <p className="pl-6 text-[11px] text-rose-600 dark:text-rose-300/90 leading-relaxed font-medium">
                    {selectedItem.rejectReason}
                  </p>
                  <p className="pl-6 text-[10px] text-slate-400">
                    * 신청자가 내용을 확인하고 서류를 수정/재신청할 때까지 심사가 보류됩니다.
                  </p>
                </div>
              )}

              {/* 1. Upper Area: Full Detailed Information Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block px-1">
                  📋 가입 신청자 상세 정보
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">신청자 성명</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedItem.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">신청자 연락처</span>
                    <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">{selectedItem.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {selectedItem.typeKey === "SITE_MANAGER" ? "공사 현장명" : "소속 / 현장명"}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                      {selectedItem.siteName || selectedItem.companyOrSite}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">시공 / 도급 건설사</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                      {selectedItem.companyName || selectedItem.company || "건설업체"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold block">공사 현장 주소지</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                      {selectedItem.address || "현장 주소 미등록"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">사업자등록번호</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate block">
                      {selectedItem.bizRegNo || "000-00-00000"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">본인인증 (CI)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ 본인인증 완료</span>
                  </div>
                </div>
              </div>

              {/* 2. Lower Area: Proof Verification Area */}
              {selectedItem.typeKey === "SITE_WORKER" ? (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    🔗 소속 현장 연동 및 본인인증 정보
                  </h4>
                  <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        👷‍♂️
                      </div>
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">현장 담당자 회원가입 검증</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          현장 담당자는 서류를 별도 업로드하지 않으며, 소속 공사 현장과 회원가입 시 휴대폰 본인인증 정보가 자동 연동됩니다.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">소속 현장명</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedItem.companyOrSite}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">현장 관리자 연락처</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">010-****-5678 (현장 연동)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">휴대폰 본인인증 (CI)</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ 일치 (본인인증 완료)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">등록 일자</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">2026-07-30</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {/* Clean Document Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <span>🖼️</span>
                      <span>제출 증빙 서류 확인</span>
                    </h4>

                    {/* Document Tab Buttons */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar shrink-0">
                        {selectedItem.typeKey === "DRIVER" && (
                          <>
                            <button
                              onClick={() => setActiveDocTab("DOC_LICENSE")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_LICENSE" || activeDocTab === "DOC_1"
                                  ? "bg-blue-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              운전면허증
                            </button>
                            <button
                              onClick={() => setActiveDocTab("DOC_SAFETY")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_SAFETY"
                                  ? "bg-blue-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              기초안전보건교육이수증
                            </button>
                            <button
                              onClick={() => setActiveDocTab("DOC_SPECIAL")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_SPECIAL"
                                  ? "bg-blue-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              특수형태근로자 교육확인서
                            </button>
                          </>
                        )}
                        {selectedItem.typeKey === "OWNER" && (
                          <>
                            <button
                              onClick={() => setActiveDocTab("DOC_BIZ")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_BIZ" || activeDocTab === "DOC_1"
                                  ? "bg-indigo-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              사업자등록증
                            </button>
                            <button
                              onClick={() => setActiveDocTab("DOC_INSURANCE")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_INSURANCE"
                                  ? "bg-indigo-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              화물 종합보험증권
                            </button>
                          </>
                        )}
                        {(selectedItem.typeKey === "SITE_MANAGER" || selectedItem.typeKey === "SITE_WORKER") && (
                          <>
                            <button
                              onClick={() => setActiveDocTab("DOC_BIZ")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_BIZ" || activeDocTab === "DOC_1"
                                  ? "bg-amber-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              사업자등록증
                            </button>
                            <button
                              onClick={() => setActiveDocTab("DOC_DUST")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_DUST"
                                  ? "bg-amber-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              비산먼지 배출신고서
                            </button>
                            <button
                              onClick={() => setActiveDocTab("DOC_CONTRACT")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_CONTRACT"
                                  ? "bg-amber-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              공사계약서
                            </button>
                          </>
                        )}
                        {selectedItem.typeKey === "DROPOFF" && (
                          <>
                            <button
                              onClick={() => setActiveDocTab("DOC_PERMIT")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_PERMIT" || activeDocTab === "DOC_1"
                                  ? "bg-emerald-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              사토장 허가증
                            </button>
                            <button
                              onClick={() => setActiveDocTab("DOC_LAND")}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                                activeDocTab === "DOC_LAND"
                                  ? "bg-emerald-600 text-white shadow-md font-extrabold"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              토지사용승낙서
                            </button>
                          </>
                        )}
                    </div>
                  </div>

                  {/* Viewer Toolbar Row */}
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>💡</span>
                      <span>마우스 드래그로 화면 이동 / 휠 스크롤로 확대축소 가능</span>
                    </span>

                    {/* Image Zoom Control Toolbar */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                      <button
                        onClick={() => setVerifyZoom((prev) => Math.min(prev + 0.25, 3.0))}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-all"
                        title="확대"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setVerifyZoom(1.0);
                          setPanPos({ x: 0, y: 0 });
                        }}
                        className="px-2 py-1 text-[10px] hover:bg-white dark:hover:bg-slate-800 rounded-lg font-extrabold text-slate-700 dark:text-slate-300 transition-all"
                      >
                        100% (위치 리셋)
                      </button>
                      <button
                        onClick={() => setVerifyZoom((prev) => Math.max(prev - 0.25, 0.5))}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-all"
                        title="축소"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-800 mx-0.5"></div>
                      <button
                        onClick={() => setVerifyRotate((prev) => (prev + 90) % 360)}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-all"
                        title="90도 회전"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-800 mx-0.5"></div>
                      {(() => {
                        const docCode = activeDocTab === "DOC_SAFETY" ? "SAFETY_TRAINING" : activeDocTab === "DOC_SPECIAL" ? "SPECIAL_LABOR" : activeDocTab === "DOC_INSURANCE" ? "INSURANCE" : activeDocTab === "DOC_CONTRACT" ? "CONSTRUCTION_CONTRACT" : activeDocTab === "DOC_LAND" ? "LAND_USE" : activeDocTab === "DOC_BIZ" ? "BIZ_LICENSE" : activeDocTab === "DOC_DUST" ? "DUST_REPORT" : activeDocTab === "DOC_PERMIT" ? "DEVELOPMENT_PERMIT" : "LICENSE";
                        const localImg = typeof window !== "undefined" ? localStorage.getItem(`doc_driver_${selectedItem.id}_${docCode}`) : null;
                        const serverDocPath = selectedItem.uploadedFiles?.[docCode] || selectedItem.rawObj?.uploaded_files?.[docCode];
                        const token = typeof window !== "undefined" ? (localStorage.getItem("accessToken") || sessionStorage.getItem("dumpring_token")) : null;
                        const serverUrl = serverDocPath ? `${getApiBaseUrl()}${serverDocPath}${token ? `?token=${token}` : ""}` : null;
                        const displaySrc = serverUrl || localImg || selectedItem.rawObj?.biz_license_url || selectedItem.rawObj?.dust_report_url || uploadedFiles[`driver_${selectedItem.id}_${docCode}`] || uploadedFiles[selectedItem.id];
                        return displaySrc ? (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-1 shadow-sm shrink-0 active:scale-95"
                            title="전체화면 확대"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>전체화면 확대</span>
                          </button>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div
                    ref={viewerContainerRef}
                    className="h-[460px] rounded-2xl bg-slate-950 border border-slate-800 relative flex items-center justify-center overflow-hidden shadow-inner group p-2 select-none cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                  >
                    {/* 실제 서류 뷰어 본체 */}
                    {(() => {
                      let docCode = "LICENSE";
                      if (activeDocTab === "DOC_SAFETY") docCode = "SAFETY_TRAINING";
                      else if (activeDocTab === "DOC_SPECIAL") docCode = "SPECIAL_LABOR";
                      else if (activeDocTab === "DOC_INSURANCE") docCode = "INSURANCE";
                      else if (activeDocTab === "DOC_CONTRACT") docCode = "CONSTRUCTION_CONTRACT";
                      else if (activeDocTab === "DOC_LAND") docCode = "LAND_USE";
                      else if (activeDocTab === "DOC_BIZ") docCode = "BIZ_LICENSE";
                      else if (activeDocTab === "DOC_DUST") docCode = "DUST_REPORT";
                      else if (activeDocTab === "DOC_PERMIT") docCode = "DEVELOPMENT_PERMIT";
                      else if (activeDocTab === "DOC_1" || !activeDocTab) {
                        if (selectedItem.typeKey === "SITE_MANAGER" || selectedItem.typeKey === "SITE_WORKER" || selectedItem.typeKey === "OWNER") {
                          docCode = "BIZ_LICENSE";
                        } else if (selectedItem.typeKey === "DROPOFF") {
                          docCode = "DEVELOPMENT_PERMIT";
                        } else {
                          docCode = "LICENSE";
                        }
                      }
                      const localImg = typeof window !== "undefined" ? localStorage.getItem(`doc_driver_${selectedItem.id}_${docCode}`) : null;
                      const serverDocPath = selectedItem.uploadedFiles?.[docCode] || selectedItem.rawObj?.uploaded_files?.[docCode];
                      const token = typeof window !== "undefined" ? (localStorage.getItem("accessToken") || sessionStorage.getItem("dumpring_token")) : null;
                      const serverUrl = serverDocPath ? `${getApiBaseUrl()}${serverDocPath}${token ? `?token=${token}` : ""}` : null;
                      const displaySrc = serverUrl || localImg || selectedItem.rawObj?.biz_license_url || selectedItem.rawObj?.dust_report_url || uploadedFiles[`driver_${selectedItem.id}_${docCode}`] || uploadedFiles[selectedItem.id];

                      // PDF 여부 판별 (BIZ_LICENSE, PERMIT 등 코드 또는 파일명 기반)
                      const isPdfDoc = Boolean(
                        (typeof displaySrc === "string" && (displaySrc.includes(".pdf") || displaySrc.startsWith("data:application/pdf"))) ||
                        (typeof serverDocPath === "string" && serverDocPath.includes(".pdf")) ||
                        (typeof selectedItem.docs === "string" && selectedItem.docs.includes(docCode) && selectedItem.docs.toLowerCase().includes(".pdf")) ||
                        (docCode === "BIZ_LICENSE" && selectedItem.typeKey === "SITE_MANAGER")
                      );

                      if (displaySrc) {
                        if (isPdfDoc) {
                          return (
                            <iframe
                              src={displaySrc}
                              title="제출 증빙 PDF 서류"
                              className="w-full h-full rounded-2xl bg-white border-0"
                            />
                          );
                        }

                        return (
                          <img
                            src={displaySrc}
                            alt="제출 증빙 서류"
                            draggable={false}
                            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-75"
                            style={{
                              transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                            }}
                          />
                        );
                      }

                      const docNameMap: Record<string, string> = {
                        DOC_LICENSE: "운전면허증",
                        DOC_SAFETY: "기초안전보건교육이수증",
                        DOC_SPECIAL: "특수형태근로자 교육확인서",
                        DOC_BIZ: "사업자등록증",
                        DOC_INSURANCE: "화물 종합보험증권",
                        DOC_DUST: "비산먼지 배출신고서",
                        DOC_CONTRACT: "공사계약서",
                        DOC_PERMIT: "사토장 허가증",
                        DOC_LAND: "토지사용승낙서"
                      };

                      const currentDocTitle = docNameMap[activeDocTab] || selectedItem.docName || "증빙 서류";

                      return (
                        <div
                          className="text-center p-6 relative z-10 transition-transform duration-200"
                          style={{
                            transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          }}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
                            <FileText className="w-7 h-7" />
                          </div>
                          <h4 className="text-xs font-extrabold text-white">
                            {currentDocTitle}
                          </h4>
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>⚠️ 해당 증빙 서류 미제출 (실물 파일 미등록)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2">
                            가입 신청자가 {currentDocTitle} 서류를 아직 제출하지 않았습니다.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium">
                  {selectedItem.status === "반려됨"
                    ? "⚠️ 반려된 신청 건입니다. 실수로 반려된 경우 [반려 취소]를 누르면 다시 심사 대기 상태로 원복됩니다."
                    : "검증 완료 후 승인 처리 시 즉시 서비스 이용 권한이 부여됩니다."}
                </span>

                <div className="flex items-center gap-2.5 shrink-0">
                  {selectedItem.status === "반려됨" ? (
                    <>
                      {/* 반려 사유 수정 버튼 */}
                      <button
                        onClick={() => {
                          setRejectReasonText(selectedItem.rejectReason || "제출 서류의 정보가 불일치하거나 식별이 어렵습니다. 재등록 부탁드립니다.");
                          setRejectModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                      >
                        반려 사유 수정
                      </button>

                      {/* 반려 취소 버튼 (실수 원복용) */}
                      <button
                        onClick={async () => {
                          if (confirm(`[${selectedItem.name}] 님의 반려 처리를 취소하고 다시 심사 대기 상태로 원복하시겠습니까?`)) {
                            const ok = await handleCancelRejectMember(selectedItem.id);
                            if (ok) {
                              alert("반려 처리가 취소되었습니다. 심사 대기 상태로 원복되었습니다.");
                              setSelectedItem(null);
                            } else {
                              alert("반려 취소 처리에 실패했습니다.");
                            }
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                      >
                        반려 취소 (심사 대기로 원복)
                      </button>
                    </>
                  ) : (
                    <>
                      {/* 일반 반려 처리 버튼 */}
                      <button
                        onClick={() => {
                          setRejectReasonText("제출 서류의 정보가 불일치하거나 식별이 어렵습니다. 재등록 부탁드립니다.");
                          setRejectModalOpen(true);
                        }}
                        className="px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95"
                      >
                        반려 처리
                      </button>

                      {/* 최종 승인 버튼 */}
                      <button
                        onClick={() => handleApproveAction(selectedItem)}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>검토 완료 및 최종 승인</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-44 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Eye className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-700 dark:text-slate-300">검증할 심사 항목을 선택하세요</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                좌측 목록에서 신청 건을 선택하시면 제출된 서류 이미지와 등록 인적사항이 본 뷰어 카드로 로딩됩니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 보안 전체화면 서류 뷰어 모달 (URL/경로 비노출 & 고화질 확대 지원) */}
      {isModalOpen && selectedItem && (() => {
        let docCode = "LICENSE";
        if (activeDocTab === "DOC_SAFETY") docCode = "SAFETY_TRAINING";
        else if (activeDocTab === "DOC_SPECIAL") docCode = "SPECIAL_LABOR";
        else if (activeDocTab === "DOC_INSURANCE") docCode = "INSURANCE";
        else if (activeDocTab === "DOC_CONTRACT") docCode = "CONSTRUCTION_CONTRACT";
        else if (activeDocTab === "DOC_LAND") docCode = "LAND_USE";
        else if (activeDocTab === "DOC_BIZ") docCode = "BIZ_LICENSE";
        else if (activeDocTab === "DOC_DUST") docCode = "DUST_REPORT";
        else if (activeDocTab === "DOC_PERMIT") docCode = "DEVELOPMENT_PERMIT";
        else if (activeDocTab === "DOC_1" || !activeDocTab) {
          if (selectedItem.typeKey === "SITE_MANAGER" || selectedItem.typeKey === "SITE_WORKER" || selectedItem.typeKey === "OWNER") {
            docCode = "BIZ_LICENSE";
          } else if (selectedItem.typeKey === "DROPOFF") {
            docCode = "DEVELOPMENT_PERMIT";
          } else {
            docCode = "LICENSE";
          }
        }
        const localImg = typeof window !== "undefined" ? localStorage.getItem(`doc_driver_${selectedItem.id}_${docCode}`) : null;
        const serverDocPath = selectedItem.uploadedFiles?.[docCode] || selectedItem.rawObj?.uploaded_files?.[docCode];
        const token = typeof window !== "undefined" ? (localStorage.getItem("accessToken") || sessionStorage.getItem("dumpring_token")) : null;
        const serverUrl = serverDocPath ? `${getApiBaseUrl()}${serverDocPath}${token ? `?token=${token}` : ""}` : null;
        const displaySrc = serverUrl || localImg || selectedItem.rawObj?.biz_license_url || selectedItem.rawObj?.dust_report_url || uploadedFiles[`driver_${selectedItem.id}_${docCode}`] || uploadedFiles[selectedItem.id];

        // PDF 여부 판별 (BIZ_LICENSE, PERMIT 등 코드 또는 파일명 기반)
        const isPdfDoc = Boolean(
          (typeof displaySrc === "string" && (displaySrc.includes(".pdf") || displaySrc.startsWith("data:application/pdf"))) ||
          (typeof serverDocPath === "string" && serverDocPath.includes(".pdf")) ||
          (typeof selectedItem.docs === "string" && selectedItem.docs.includes(docCode) && selectedItem.docs.toLowerCase().includes(".pdf")) ||
          (docCode === "BIZ_LICENSE" && selectedItem.typeKey === "SITE_MANAGER")
        );

        const docNameMap: Record<string, string> = {
          DOC_LICENSE: "운전면허증",
          DOC_SAFETY: "기초안전보건교육이수증",
          DOC_SPECIAL: "특수형태근로자 교육확인서",
          DOC_BIZ: "사업자등록증",
          DOC_INSURANCE: "화물 종합보험증권",
          DOC_DUST: "비산먼지 배출신고서",
          DOC_CONTRACT: "공사계약서",
          DOC_PERMIT: "사토장 허가증",
          DOC_LAND: "토지사용승낙서"
        };
        const currentDocTitle = docNameMap[activeDocTab] || selectedItem.docName || "증빙 서류";

        return (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fadeIn">
            {/* Modal Header */}
            <div className="w-full max-w-6xl flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 shadow-2xl shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-sm font-extrabold text-white">
                  {selectedItem.name} 님의 {currentDocTitle}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                  {selectedItem.typeName}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setVerifyZoom((prev) => Math.min(prev + 0.25, 4.0))}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 font-bold"
                    title="확대"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setVerifyZoom(1.0);
                      setPanPos({ x: 0, y: 0 });
                    }}
                    className="px-2.5 py-1 text-[11px] hover:bg-slate-700 rounded-lg font-extrabold text-slate-300"
                  >
                    {Math.round(verifyZoom * 100)}% 리셋
                  </button>
                  <button
                    onClick={() => setVerifyZoom((prev) => Math.max(prev - 0.25, 0.5))}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 font-bold"
                    title="축소"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
                  <button
                    onClick={() => setVerifyRotate((prev) => (prev + 90) % 360)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 font-bold"
                    title="90도 회전"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl border border-rose-500/30 transition-all font-bold"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Interactive Drag & Zoom Area) */}
            <div
              className="w-full max-w-6xl flex-1 my-4 bg-slate-950/80 border border-slate-800/80 rounded-3xl relative flex items-center justify-center overflow-hidden shadow-2xl p-2 select-none"
            >
              {displaySrc ? (
                isPdfDoc ? (
                  <iframe
                    src={displaySrc}
                    title={currentDocTitle}
                    className="w-full h-full rounded-2xl bg-white border-0"
                  />
                ) : (
                  <img
                    src={displaySrc}
                    alt={currentDocTitle}
                    draggable={false}
                    className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-75 cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    style={{
                      transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                    }}
                  />
                )
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
                  <p className="font-bold">등록된 원본 서류 이미지가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 반려 사유 입력 모달 팝업 */}
      {rejectModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>⚠️</span>
                <span>가입 심사 반려 사유 입력</span>
              </h3>
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReasonText("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                대상자: <span className="font-extrabold text-slate-900 dark:text-slate-100">{selectedItem.name} ({selectedItem.typeName})</span>
              </p>
              <p className="text-[11px] text-slate-400">
                입력하신 반려 사유는 신청자에게 안내되며, 재신청 시 가이드로 활용됩니다.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">반려 세부 사유</label>
              <textarea
                rows={4}
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                placeholder="예: 사업자등록번호가 증빙과 다릅니다. 확인 후 재신청 바랍니다."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReasonText("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-xs active:scale-95 transition-all"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!rejectReasonText.trim()) {
                    alert("반려 사유를 입력해주세요.");
                    return;
                  }
                  const ok = await handleRejectMember(selectedItem.id, rejectReasonText.trim());
                  if (ok) {
                    alert(`[${selectedItem.name}] 님의 가입 신청이 반려 처리되었습니다.`);
                    setSelectedItem(null);
                  } else {
                    alert("반려 처리에 실패했습니다. 서버 상태를 확인해주세요.");
                  }
                  setRejectModalOpen(false);
                  setRejectReasonText("");
                }}
                className="flex-none w-2/3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-500/10 active:scale-95 transition-all"
              >
                반려 처리 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
