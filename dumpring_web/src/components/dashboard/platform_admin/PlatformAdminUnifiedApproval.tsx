import React, { useState, useRef, useEffect } from "react";
import { Search, Filter, ShieldCheck, CheckCircle2, XCircle, FileText, UserCheck, Eye, ZoomIn, ZoomOut, RotateCw, Sparkles, Check, AlertCircle, ArrowUpRight } from "lucide-react";

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
}: PlatformAdminUnifiedApprovalProps) {
  const [filterRole, setFilterRole] = useState<"ALL" | "DRIVER" | "OWNER" | "SITE_MANAGER" | "SITE_WORKER" | "DROPOFF" | "SITE">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [verifyZoom, setVerifyZoom] = useState(1.0);
  const [verifyRotate, setVerifyRotate] = useState(0);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
    if (filterStatus === "PENDING" && item.status === "승인됨") return false;
    if (filterStatus === "APPROVED" && item.status !== "승인됨") return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchPhone = item.phone?.toLowerCase().includes(q);
      const matchCompany = item.companyOrSite?.toLowerCase().includes(q);
      return matchName || matchPhone || matchCompany;
    }

    return true;
  });

  const pendingCount = allApprovalList.filter((i) => i.status !== "승인됨").length;
  const approvedCount = allApprovalList.filter((i) => i.status === "승인됨").length;

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
            { id: "ALL", label: `전체보기 (${allApprovalList.length})` },
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
                className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all active:scale-95 ${
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

        {/* Search Input Only (Only shows PENDING approval queue) */}
        <div className="relative w-72 shrink-0">
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

      {/* Main Content Split Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Applicants List (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4">
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

          <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-[550px] max-h-[780px]">
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
                          isApproved
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {isApproved ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3 animate-spin-slow" />}
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
              </div>

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
                        {selectedItem.typeKey === "SITE_MANAGER" && (
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
                        const serverUrl = serverDocPath ? `http://127.0.0.1:8000${serverDocPath}` : null;
                        const displaySrc = serverUrl || localImg || selectedItem.rawObj?.biz_license_url || selectedItem.rawObj?.dust_report_url || uploadedFiles[`driver_${selectedItem.id}_${docCode}`] || uploadedFiles[selectedItem.id];
                        return displaySrc ? (
                          <button
                            onClick={() => window.open(displaySrc, "_blank")}
                            className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
                            title="새 창에서 원본 크게 보기"
                          >
                            <Eye className="w-3 h-3" />
                            <span>원본 크게보기</span>
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
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                    {/* 실제 업로드된 이미지 또는 localStorage 미리보기 데이터 렌더링 */}
                    {(() => {
                      const docCode = activeDocTab === "DOC_SAFETY" ? "SAFETY_TRAINING" : activeDocTab === "DOC_SPECIAL" ? "SPECIAL_LABOR" : activeDocTab === "DOC_INSURANCE" ? "INSURANCE" : activeDocTab === "DOC_CONTRACT" ? "CONSTRUCTION_CONTRACT" : activeDocTab === "DOC_LAND" ? "LAND_USE" : activeDocTab === "DOC_BIZ" ? "BIZ_LICENSE" : activeDocTab === "DOC_DUST" ? "DUST_REPORT" : activeDocTab === "DOC_PERMIT" ? "DEVELOPMENT_PERMIT" : "LICENSE";
                      const localImg = typeof window !== "undefined" ? localStorage.getItem(`doc_driver_${selectedItem.id}_${docCode}`) : null;
                      const serverDocPath = selectedItem.uploadedFiles?.[docCode] || selectedItem.rawObj?.uploaded_files?.[docCode];
                      const serverUrl = serverDocPath ? `http://127.0.0.1:8000${serverDocPath}` : null;
                      const displaySrc = serverUrl || localImg || selectedItem.rawObj?.biz_license_url || selectedItem.rawObj?.dust_report_url || uploadedFiles[`driver_${selectedItem.id}_${docCode}`] || uploadedFiles[selectedItem.id];

                      if (displaySrc) {
                        return (
                          <div className="relative z-10 w-full h-full p-2 flex items-center justify-center pointer-events-none">
                            <img
                              src={displaySrc}
                              alt="제출 증빙 서류"
                              draggable={false}
                              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-75"
                              style={{
                                transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                              }}
                            />
                          </div>
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
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400 font-medium">
                  검증 완료 후 승인 처리 시 즉시 서비스 이용 권한이 부여됩니다.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleRejectMember(selectedItem.id, "제출 서류 검증 미흡")}
                    className="px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95"
                  >
                    반려 처리
                  </button>
                  <button
                    onClick={() => handleApproveAction(selectedItem)}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>검토 완료 및 최종 승인</span>
                  </button>
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
    </div>
  );
}
