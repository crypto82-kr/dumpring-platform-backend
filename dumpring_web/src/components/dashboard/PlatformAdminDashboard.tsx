import React, { useState } from "react";
import {
  ShieldAlert,
  TrendingUp,
  MapPin,
  Truck,
  PlusCircle,
  CheckCircle,
  Database,
  FileCheck,
  Search
} from "lucide-react";

interface PlatformAdminDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  
  // State variables
  commissionRate: number;
  setCommissionRate: (rate: number) => void;
  baseTariff: number;
  setBaseTariff: (tariff: number) => void;
  tonnages: any[];
  setTonnages: React.Dispatch<React.SetStateAction<any[]>>;
  dbCommonCodes: any[];
  setDbCommonCodes: React.Dispatch<React.SetStateAction<any[]>>;
  selectedGroup: string;
  setSelectedGroup: (grp: string) => void;
  isCodesLoading: boolean;
  setIsCodesLoading: (loading: boolean) => void;
  newGroupCode: string;
  setNewGroupCode: (code: string) => void;
  newCodeVal: string;
  setNewCodeVal: (val: string) => void;
  newCodeName: string;
  setNewCodeName: (name: string) => void;
  newDisplayOrder: number;
  setNewDisplayOrder: (order: number) => void;
  faqs: any[];
  setFaqs: React.Dispatch<React.SetStateAction<any[]>>;
  faqCategoryFilter: string;
  setFaqCategoryFilter: (filter: string) => void;
  expandedFaqId: number | null;
  setExpandedFaqId: (id: number | null) => void;
  inquiries: any[];
  setInquiries: React.Dispatch<React.SetStateAction<any[]>>;
  expandedInquiryId: number | null;
  setExpandedInquiryId: (id: number | null) => void;
  replyTexts: Record<number, string>;
  setReplyTexts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  inquiryFilter: "전체" | "대기 중" | "답변 완료";
  setInquiryFilter: (filter: "전체" | "대기 중" | "답변 완료") => void;
  notices: any[];
  setNotices: React.Dispatch<React.SetStateAction<any[]>>;
  newNoticeTitle: string;
  setNewNoticeTitle: (title: string) => void;
  newNoticeTarget: string;
  setNewNoticeTarget: (target: string) => void;
  newNoticeContent: string;
  setNewNoticeContent: (content: string) => void;
  boardActiveTab: "inquiry" | "notice" | "faq";
  setBoardActiveTab: (tab: "inquiry" | "notice" | "faq") => void;
  drivers: any[];
  setDrivers: React.Dispatch<React.SetStateAction<any[]>>;
  owners: any[];
  setOwners: React.Dispatch<React.SetStateAction<any[]>>;
  sites: any[];
  setSites: React.Dispatch<React.SetStateAction<any[]>>;
  dropoffSites: any[];
  setDropoffSites: React.Dispatch<React.SetStateAction<any[]>>;
  disputes: any[];
  setDisputes: React.Dispatch<React.SetStateAction<any[]>>;
  
  // Verification states
  selectedDriverForVerify: any | null;
  setSelectedDriverForVerify: (drv: any | null) => void;
  verifyZoom: number;
  setVerifyZoom: React.Dispatch<React.SetStateAction<number>>;
  selectedDocTab: "license" | "certificate";
  setSelectedDocTab: (tab: "license" | "certificate") => void;
  verifyRotate: number;
  setVerifyRotate: React.Dispatch<React.SetStateAction<number>>;
  panX: number;
  setPanX: React.Dispatch<React.SetStateAction<number>>;
  panY: number;
  setPanY: React.Dispatch<React.SetStateAction<number>>;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  dragStart: { x: number; y: number };
  setDragStart: (start: { x: number; y: number }) => void;
  selectedOwnerForVerify: any | null;
  setSelectedOwnerForVerify: (owner: any | null) => void;
  selectedSiteForVerify: any | null;
  setSelectedSiteForVerify: (site: any | null) => void;
  selectedDropoffForVerify: any | null;
  setSelectedDropoffForVerify: (dropoff: any | null) => void;
  selectedOwnerDocTab: "business" | "insurance";
  setSelectedOwnerDocTab: (tab: "business" | "insurance") => void;
  selectedSiteDocTab: "BIZ_LICENSE" | "CONSTRUCTION_PROOF" | "BANKBOOK";
  setSelectedSiteDocTab: (tab: "BIZ_LICENSE" | "CONSTRUCTION_PROOF" | "BANKBOOK") => void;
  selectedDropoffDocTab: "permit" | "land";
  setSelectedDropoffDocTab: (tab: "permit" | "land") => void;
  
  // File upload and helpers
  uploadedFiles: Record<string, string>;
  handleFileUpload: (key: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleApproveDriver: (id: number) => void;
  handleApproveOwner: (id: number) => void;
  handleApproveSite: (id: number) => void;
  handleApproveDropoff: (id: number) => void;
  handleRejectMember: (id: number, reason: string) => Promise<boolean>;
  handleResolveDispute: (id: number) => void;
  fetchCommonCodes: () => Promise<void>;
  
  // Policy states
  calcMethod: "CONTINUOUS" | "OVER_PLAN";
  setCalcMethod: (method: "CONTINUOUS" | "OVER_PLAN") => void;
  continuousDistanceFare: number;
  setContinuousDistanceFare: (fare: number) => void;
  continuousTimeFare: number;
  setContinuousTimeFare: (fare: number) => void;
  overPlanDistanceFare: number;
  setOverPlanDistanceFare: (fare: number) => void;
  overPlanTimeFare: number;
  setOverPlanTimeFare: (fare: number) => void;
  policySaveSuccess: boolean;
  setPolicySaveSuccess: (val: boolean) => void;
  approvalTab: "driver" | "owner" | "site" | "dropoff";
  setApprovalTab: (tab: "driver" | "owner" | "site" | "dropoff") => void;
  
  // User Management
  userTab: "driver" | "owner" | "site" | "dropoff";
  setUserTab: (tab: "driver" | "owner" | "site" | "dropoff") => void;
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  isAddUserModalOpen: boolean;
  setIsAddUserModalOpen: (open: boolean) => void;
  editingUser: any | null;
  setEditingUser: (usr: any | null) => void;
  viewingUserDetails: any | null;
  setViewingUserDetails: (usr: any | null) => void;
  userFormName: string;
  setUserFormName: (name: string) => void;
  userFormPhone: string;
  setUserFormPhone: (phone: string) => void;
  userFormStatus: string;
  setUserFormStatus: (status: string) => void;
  userFormExtra1: string;
  setUserFormExtra1: (val: string) => void;
  userFormExtra2: string;
  setUserFormExtra2: (val: string) => void;
}

export function PlatformAdminDashboard({
  activePath,
  setActivePath,
  commissionRate,
  setCommissionRate,
  baseTariff,
  setBaseTariff,
  tonnages,
  setTonnages,
  dbCommonCodes,
  setDbCommonCodes,
  selectedGroup,
  setSelectedGroup,
  isCodesLoading,
  setIsCodesLoading,
  newGroupCode,
  setNewGroupCode,
  newCodeVal,
  setNewCodeVal,
  newCodeName,
  setNewCodeName,
  newDisplayOrder,
  setNewDisplayOrder,
  faqs,
  setFaqs,
  faqCategoryFilter,
  setFaqCategoryFilter,
  expandedFaqId,
  setExpandedFaqId,
  inquiries,
  setInquiries,
  expandedInquiryId,
  setExpandedInquiryId,
  replyTexts,
  setReplyTexts,
  inquiryFilter,
  setInquiryFilter,
  notices,
  setNotices,
  newNoticeTitle,
  setNewNoticeTitle,
  newNoticeTarget,
  setNewNoticeTarget,
  newNoticeContent,
  setNewNoticeContent,
  boardActiveTab,
  setBoardActiveTab,
  drivers,
  setDrivers,
  owners,
  setOwners,
  sites,
  setSites,
  dropoffSites,
  setDropoffSites,
  disputes,
  setDisputes,
  selectedDriverForVerify,
  setSelectedDriverForVerify,
  verifyZoom,
  setVerifyZoom,
  selectedDocTab,
  setSelectedDocTab,
  verifyRotate,
  setVerifyRotate,
  panX,
  setPanX,
  panY,
  setPanY,
  isDragging,
  setIsDragging,
  dragStart,
  setDragStart,
  selectedOwnerForVerify,
  setSelectedOwnerForVerify,
  selectedSiteForVerify,
  setSelectedSiteForVerify,
  selectedDropoffForVerify,
  setSelectedDropoffForVerify,
  selectedOwnerDocTab,
  setSelectedOwnerDocTab,
  selectedSiteDocTab,
  setSelectedSiteDocTab,
  selectedDropoffDocTab,
  setSelectedDropoffDocTab,
  uploadedFiles,
  handleFileUpload,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleApproveDriver,
  handleApproveOwner,
  handleApproveSite,
  handleApproveDropoff,
  handleRejectMember,
  handleResolveDispute,
  fetchCommonCodes,
  calcMethod,
  setCalcMethod,
  continuousDistanceFare,
  setContinuousDistanceFare,
  continuousTimeFare,
  setContinuousTimeFare,
  overPlanDistanceFare,
  setOverPlanDistanceFare,
  overPlanTimeFare,
  setOverPlanTimeFare,
  policySaveSuccess,
  setPolicySaveSuccess,
  approvalTab,
  setApprovalTab,
  userTab,
  setUserTab,
  userSearchQuery,
  setUserSearchQuery,
  isAddUserModalOpen,
  setIsAddUserModalOpen,
  editingUser,
  setEditingUser,
  viewingUserDetails,
  setViewingUserDetails,
  userFormName,
  setUserFormName,
  userFormPhone,
  setUserFormPhone,
  userFormStatus,
  setUserFormStatus,
  userFormExtra1,
  userFormExtra2,
  setUserFormExtra2,
}: PlatformAdminDashboardProps) {
  const estimatedFeePerTrip = Math.round(baseTariff * (commissionRate / 100));

  // 반려 레이어 팝업 상태 정의
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectTargetName, setRejectTargetName] = useState("");
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [rejectCallback, setRejectCallback] = useState<((reason: string) => Promise<void>) | null>(null);

  // 반려 레이어 팝업 렌더링 헬퍼 함수
  const renderRejectModal = () => {
    if (!rejectModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              ⚠️ 가입 심사 반려 사유 입력
            </h3>
            <button
              onClick={() => { setRejectModalOpen(false); setRejectReasonText(""); }}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              대상자: <span className="font-extrabold text-slate-800">{rejectTargetName}</span>
            </p>
            <p className="text-[10px] text-slate-400 leading-normal font-medium">
              * 입력하신 사유는 가입 대기 회원에게 SMS/푸시로 즉시 발송되며, 이후 재업로드 진행 시 가이드라인으로 활용됩니다.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">반려 세부 사유</label>
            <textarea
              rows={4}
              value={rejectReasonText}
              onChange={(e) => setRejectReasonText(e.target.value)}
              placeholder="예: 사업자등록번호가 증빙과 다릅니다. 확인 후 재신청 바랍니다."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 transition-all resize-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => { setRejectModalOpen(false); setRejectReasonText(""); }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold text-xs active:scale-95 transition-all"
            >
              취소
            </button>
            <button
              onClick={async () => {
                if (!rejectReasonText.trim()) {
                  alert("반려 사유를 입력해주세요.");
                  return;
                }
                if (rejectCallback) {
                  await rejectCallback(rejectReasonText);
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
    );
  };


  // 1. [플랫폼 대시보드] 메인 화면
  if (activePath === "/admin") {
    return (
      <>
      <div className="space-y-6 animate-fadeIn">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: "실시간 운행 중 트럭", val: "142대", change: "+12대 상승", icon: Truck, color: "text-blue-600 bg-blue-50" },
            { title: "금일 총 배차 완료", val: "847건", change: "+8.4% 전일비", icon: CheckCircle, color: "text-emerald-400 bg-emerald-950/50" },
            { title: "신규 승인 대기 총합", val: `${drivers.filter(d => d.status === "대기").length + owners.filter(o => o.status === "대기").length + sites.filter(s => s.status === "대기").length + dropoffSites.filter(d => d.status === "대기").length}건`, change: "유형별 실시간 대기 집계", icon: ShieldAlert, color: "text-amber-400 bg-amber-950/50" },
            { title: "금일 플랫폼 수수료 총액", val: `₩${Math.round(847 * estimatedFeePerTrip).toLocaleString()}`, change: "수수료율 연동 실시간 집계", icon: TrendingUp, color: "text-rose-400 bg-rose-950/50" }
          ].map((c, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-xs font-semibold text-slate-600">{c.title}</p>
                <h3 className="text-xl font-black mt-2 text-slate-900">{c.val}</h3>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">{c.change}</span>
              </div>
              <div className={`p-3 rounded-xl ${c.color} border border-slate-200`}>
                <c.icon className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Map Preview Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-extrabold text-base text-slate-800">실시간 전국 덤프링 현장 지도 모니터링</h2>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Tracking
                </span>
              </div>
              <div className="h-64 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-30 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                <div className="relative z-10 flex flex-col items-center text-center px-6">
                  <MapPin className="w-8 h-8 text-blue-600 animate-bounce mb-2" />
                  <p className="text-sm font-semibold text-slate-700">인천 검단 3공구 현장 외 18개 현장 모니터링 중</p>
                  <p className="text-xs text-slate-505 mt-1">실시간 배차 트럭 위경도 데이터 수신 상태 정상 (1.2s 주기)</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-650 border-t border-slate-200 pt-3">
              <span>최근 GPS 갱신: 방금 전</span>
              <button onClick={() => setActivePath("/admin/sites")} className="text-blue-600 font-bold hover:underline">상세 관제 지도 페이지로 이동 →</button>
            </div>
          </div>

          {/* Quick Link/Summary Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-xl">
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">승인 신청 실시간 대기 현황</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">1. 신규 기사 가입 대기</span>
                  <button
                    onClick={() => setActivePath("/admin/approve-driver")}
                    className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                  >
                    {drivers.filter(d => d.status === "대기").length}건 검증하기 →
                  </button>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">2. 차주 및 운송사 승인 대기</span>
                  <button
                    onClick={() => setActivePath("/admin/approve-owner")}
                    className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                  >
                    {owners.filter(o => o.status === "대기").length}건 검증하기 →
                  </button>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">3. 반출 현장 가입 대기</span>
                  <button
                    onClick={() => setActivePath("/admin/approve-site")}
                    className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                  >
                    {sites.filter(s => s.status === "대기").length}건 검증하기 →
                  </button>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">4. 하차지(사토장) 승인 대기</span>
                  <button
                    onClick={() => setActivePath("/admin/approve-dropoff")}
                    className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200 text-[10px]"
                  >
                    {dropoffSites.filter(d => d.status === "대기").length}건 검증하기 →
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
              좌측 사이드바의 각 승인 메뉴 혹은 본 카드의 버튼을 클릭하시면, 각각의 가입자에 대한 전용 증빙서류 검증 페이지로 바로 이동합니다.
            </div>
          </div>
        </div>

        {/* Integrated Fees, Disputes, Support Boards at the bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fees Policy Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">실시간 단가 및 수수료 현황</h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50/50 border border-blue-150">
                  <span className="text-blue-600 font-bold">글로벌 플랫폼 수수료율</span>
                  <span className="font-bold text-blue-605 font-mono text-sm">{commissionRate}%</span>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-black border-b border-slate-200/80 pb-1 mb-1.5 flex justify-between">
                    <span>톤수 공통코드</span>
                    <span>기본운임 (플랫폼 수수료)</span>
                  </div>
                  {tonnages.map(t => {
                    const fee = Math.round(t.baseTariff * (commissionRate / 100));
                    return (
                      <div key={t.code} className="flex justify-between items-center text-[10.5px] font-semibold text-slate-700">
                        <span>{t.name} <span className="text-[8px] font-mono text-slate-400">({t.code})</span></span>
                        <span className="font-mono text-slate-900 font-extrabold">
                          {t.baseTariff.toLocaleString()}원
                          <span className="text-[9px] text-blue-600 font-medium ml-1">({fee.toLocaleString()}원)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button onClick={() => setActivePath("/admin/fees")} className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-800">
              톤수별 단가/수수료 설정 바로가기 →
            </button>
          </div>

          {/* Disputes Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">최근 민원 및 분쟁</h2>
              <div className="space-y-2.5">
                {disputes.slice(0, 2).map((d) => (
                  <div key={d.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-800">{d.type}</span>
                      <span className="text-[10px] text-amber-600 font-bold">{d.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-605 mt-1">{d.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setActivePath("/admin/disputes")} className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-800">
              분쟁 중재 센터 이동 →
            </button>
          </div>

          {/* Announcements Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">고객지원 & 공지</h2>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <p className="font-bold text-slate-850">모바일 정산 에러 관련 문의</p>
                <p className="text-slate-600 text-[11px]">가끔 가입 승인 단계에서 데이터를 재조회할 때 에러 레이어가 뜨는 현상 검토 중.</p>
              </div>
            </div>
            <button onClick={() => setActivePath("/admin/boards")} className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-800">
              고객 및 게시판 관리 이동 →
            </button>
          </div>
        </div>
      </div>
      {renderRejectModal()}
      </>
    );
  }

  // 2. [기사 가입 승인] 전용 독립 화면
  if (activePath === "/admin/approve-driver") {
    return (
      <>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              기사 가입 승인 검증 본부
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Split-Screen 심사역</span>
            </h2>
            <p className="text-xs text-slate-505 mt-1">기사님이 등록하신 텍스트 입력 정보와 제출 서류(1종 대형면허증)의 실물 정보를 인브라우저 대조기로 검증합니다.</p>
          </div>
          <button
            onClick={() => { setActivePath("/admin"); setSelectedDriverForVerify(null); }}
            className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Side: Applicants List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2">가입 신청 대기 큐 ({drivers.length}건)</div>
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {drivers.map((drv) => {
                const isSelected = selectedDriverForVerify?.id === drv.id;
                return (
                  <div
                    key={drv.id}
                    onClick={() => {
                      setSelectedDriverForVerify(drv);
                      setVerifyZoom(1.0);
                      setVerifyRotate(0);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-250 active:scale-[0.99] ${isSelected
                        ? "bg-blue-50/60 border-blue-500 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500"
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{drv.name}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">{drv.license}</span>
                        </div>
                        <div className="text-[11px] text-slate-505">연락처: {drv.phone}</div>
                        <div className="text-[10px] text-blue-600 font-semibold mt-1">제출: 운전면허증_앞면.png</div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${drv.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                        }`}>
                        {drv.status}
                      </span>
                    </div>

                    {drv.status === "대기" && !isSelected && (
                      <div className="mt-3 text-right">
                        <span className="text-[10px] text-blue-600 font-bold hover:underline">실물 서류 대조 검증 개시 →</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Document Verification Console */}
          <div className="lg:col-span-3 border border-slate-200 rounded-2xl bg-slate-50/40 p-5 flex flex-col justify-between min-h-[500px] shadow-inner">
            {!selectedDriverForVerify ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="p-4 rounded-full bg-slate-100 border border-slate-200">
                  <FileCheck className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">실물 서류 대조 검수</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">왼쪽의 신청 대기 목록에서 기사를 클릭하시면 제출된 증빙서류의 인브라우저 정밀 검증 화면이 활성화됩니다.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Document Header, Tabs & Upload State */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-sm font-black text-slate-800">심사 대상: {selectedDriverForVerify.name}</span>
                    <span className="text-[10px] text-blue-605 font-bold bg-blue-55/20 px-2 py-0.5 rounded border border-blue-200">
                      필수 서류 다중 검증
                    </span>
                  </div>

                  {/* Document Selector Tabs */}
                  <div className="flex border-b border-slate-200 text-xs">
                    <button
                      onClick={() => { setSelectedDocTab("license"); setVerifyZoom(1.0); setVerifyRotate(0); setPanX(0); setPanY(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedDocTab === "license" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 1. 운전면허증
                    </button>
                    <button
                      onClick={() => { setSelectedDocTab("certificate"); setVerifyZoom(1.0); setVerifyRotate(0); setPanX(0); setPanY(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedDocTab === "certificate" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 2. 화물종사자 자격증
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-700">제출된 서류 파일명</p>
                      <p className="text-[10px] text-slate-505 font-mono">
                        {uploadedFiles[`driver_${selectedDriverForVerify.id}_${selectedDocTab}`]
                          ? "사용자 업로드 이미지.png"
                          : selectedDocTab === "license"
                            ? `license_driver_${selectedDriverForVerify.id}.png (452 KB)`
                            : `cargo_cert_${selectedDriverForVerify.id}.png (512 KB)`}
                      </p>
                    </div>
                    <label
                      className="px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg active:scale-95 transition-all cursor-pointer shadow-md"
                    >
                      실제 파일 업로드
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(`driver_${selectedDriverForVerify.id}_${selectedDocTab}`, e)}
                      />
                    </label>
                  </div>
                </div>

                {/* Document Zoom / Rotate View Container */}
                <div
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  className="flex-1 min-h-[280px] bg-slate-200/60 rounded-xl border border-slate-300 relative flex items-center justify-center overflow-hidden select-none"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-45 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

                  {uploadedFiles[`driver_${selectedDriverForVerify.id}_${selectedDocTab}`] ? (
                    <div
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: isDragging ? "none" : "transform 0.15s ease"
                      }}
                      className="relative max-w-[90%] max-h-[260px] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl"
                    >
                      <img
                        src={uploadedFiles[`driver_${selectedDriverForVerify.id}_${selectedDocTab}`]}
                        alt="Uploaded Document"
                        className="max-h-[240px] w-auto object-contain rounded-lg border border-slate-300 pointer-events-none"
                      />
                    </div>
                  ) : selectedDocTab === "license" ? (
                    <div
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: isDragging ? "none" : "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-gradient-to-br from-amber-50 to-slate-100 border border-slate-350 p-3 shadow-2xl flex flex-col justify-between text-[9px] font-sans relative flex-shrink-0"
                    >
                      <div className="flex justify-between items-start border-b border-slate-300 pb-1">
                        <span className="font-black text-slate-700 tracking-wider">자동차운전면허증</span>
                        <span className="text-[7px] text-slate-400 font-bold font-mono">12-34-567890-12</span>
                      </div>

                      <div className="flex gap-2.5 items-center my-2">
                        <div className="w-14 h-18 rounded bg-slate-300/80 border border-slate-400/50 flex flex-col items-center justify-center flex-shrink-0 text-slate-500 text-[6px]">
                          <span className="font-bold">심사 사진</span>
                          <span className="mt-0.5 tracking-tight font-mono">{selectedDriverForVerify.name[0]}등급</span>
                        </div>

                        <div className="space-y-1 flex-1 text-slate-705 font-semibold leading-normal">
                          <div>성 명: <strong className="text-slate-900 font-extrabold">{selectedDriverForVerify.name}</strong></div>
                          <div>주 민 번 호: 750101-1******</div>
                          <div>주 소: 인천광역시 서구 검단로 102</div>
                          <div className="text-blue-600 font-extrabold mt-1">면허조건: 1종 대형</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[7px] text-slate-500 border-t border-slate-200 pt-1">
                        <span>발행일: 2024. 05. 27</span>
                        <span className="font-bold text-slate-600">인천광역시경찰청장 [인]</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: isDragging ? "none" : "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 p-3 shadow-2xl flex flex-col justify-between text-[9px] font-sans relative flex-shrink-0 text-slate-300"
                    >
                      <div className="flex justify-between items-start border-b border-slate-700 pb-1">
                        <span className="font-black text-amber-400 tracking-wider">화물운송종사자 자격증</span>
                        <span className="text-[7px] text-slate-400 font-bold font-mono">제 14-02-98421호</span>
                      </div>

                      <div className="flex gap-2.5 items-center my-2">
                        <div className="w-14 h-18 rounded bg-slate-700/80 border border-slate-600/50 flex flex-col items-center justify-center flex-shrink-0 text-slate-455 text-[6px]">
                          <span className="font-bold text-amber-500">인증 사진</span>
                          <span className="mt-0.5 tracking-tight font-mono">{selectedDriverForVerify.name[0]}등급</span>
                        </div>

                        <div className="space-y-1 flex-1 text-slate-350 font-semibold leading-normal">
                          <div>성 명: <strong className="text-white font-extrabold">{selectedDriverForVerify.name}</strong></div>
                          <div>자 격 명 칭: 화물운송종사 자격</div>
                          <div>인 증 기 관: 한국교통안전공단</div>
                          <div className="text-amber-400 font-extrabold mt-1">자격등급: 대형 화물 수송</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[7px] text-slate-505 border-t border-slate-700 pt-1">
                        <span>취득일자: 2025. 08. 12</span>
                        <span className="font-bold text-slate-404">한국교통안전공단이사장 [인]</span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Controls Overlay */}
                  <div className="absolute bottom-3 right-3 flex gap-1 z-20">
                    <button
                      onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      ↻
                    </button>
                    <button
                      onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); setPanX(0); setPanY(0); }}
                      className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-600 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                    >
                      리셋
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setRejectTargetId(selectedDriverForVerify.id);
                      setRejectTargetName(`${selectedDriverForVerify.name} 기사님`);
                      setRejectReasonText("서류 식별이 불가능합니다. 다시 등록해주세요.");
                      setRejectCallback(() => async (reason: string) => {
                        const ok = await handleRejectMember(selectedDriverForVerify.id, reason);
                        if (ok) {
                          alert(`${selectedDriverForVerify.name} 기사님의 가입 신청이 반려 처리되었습니다.`);
                          setSelectedDriverForVerify(null);
                        } else {
                          alert("반려 처리에 실패했습니다. 서버 상태를 확인해주세요.");
                        }
                      });
                      setRejectModalOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs active:scale-95 transition-all"
                  >
                    서류 심사 반려
                  </button>
                  <button
                    onClick={() => {
                      handleApproveDriver(selectedDriverForVerify.id);
                      alert(`${selectedDriverForVerify.name} 기사님의 실물서류 검증이 완료되어 최종 회원가입 및 정식 승인이 수락되었습니다!`);
                      setSelectedDriverForVerify(null);
                    }}
                    className="flex-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all px-6"
                  >
                    실물 서류 대조 완료 & 가입 최종 승인
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderRejectModal()}
      </>
    );
  }

  // 3. [차주/운송사 승인] 전용 독립 화면
  if (activePath === "/admin/approve-owner") {
    return (
      <>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              차주 및 법인 운송사 승인 관리
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-655 border border-blue-200 font-bold">Split-Screen 심사역</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">개인차주 및 기업 운송사로부터 수집한 사업자등록증 및 영업용 보험 자격 서류를 확인합니다.</p>
          </div>
          <button
            onClick={() => { setActivePath("/admin"); setSelectedOwnerForVerify(null); }}
            className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Side: Owner List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2">가입 신청 대기 큐 ({owners.length}건)</div>
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {owners.map((own) => {
                const isSelected = selectedOwnerForVerify?.id === own.id;
                return (
                  <div
                    key={own.id}
                    onClick={() => {
                      setSelectedOwnerForVerify(own);
                      setVerifyZoom(1.0);
                      setVerifyRotate(0);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-250 active:scale-[0.99] ${isSelected
                        ? "bg-blue-50/60 border-blue-500 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500"
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{own.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-200">{own.vehicle}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">연락처: {own.phone}</div>
                        <div className="text-[10px] text-blue-600 font-semibold mt-1">제출 서류: 사업자등록증 외 1건</div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${own.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                        }`}>
                        {own.status}
                      </span>
                    </div>

                    {own.status === "대기" && !isSelected && (
                      <div className="mt-3 text-right">
                        <span className="text-[10px] text-blue-600 font-bold hover:underline">실물 서류 대조 검증 개시 →</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Document Verification Console */}
          <div className="lg:col-span-3 border border-slate-200 rounded-2xl bg-slate-50/40 p-5 flex flex-col justify-between min-h-[500px] shadow-inner">
            {!selectedOwnerForVerify ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="p-4 rounded-full bg-slate-100 border border-slate-200">
                  <FileCheck className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">실물 서류 대조 검수</h3>
                  <p className="text-xs text-slate-550 mt-1 max-w-xs leading-relaxed">왼쪽의 신청 대기 목록에서 차주/운송사를 클릭하시면 제출된 증빙서류의 인브라우저 정밀 검증 화면이 활성화됩니다.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Document Header, Tabs & Upload State */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-sm font-black text-slate-800">심사 대상: {selectedOwnerForVerify.name}</span>
                    <span className="text-[10px] text-blue-605 font-bold bg-blue-55/20 px-2 py-0.5 rounded border border-blue-200">
                      B2B 운송사 서류 다중 검증
                    </span>
                  </div>

                  {/* Document Selector Tabs */}
                  <div className="flex border-b border-slate-200 text-xs">
                    <button
                      onClick={() => { setSelectedOwnerDocTab("business"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedOwnerDocTab === "business" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 1. 사업자등록증
                    </button>
                    <button
                      onClick={() => { setSelectedOwnerDocTab("insurance"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedOwnerDocTab === "insurance" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 2. 영업용 보험증서
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-700">제출된 서류 파일명</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {uploadedFiles[`owner_${selectedOwnerForVerify.id}_${selectedOwnerDocTab}`]
                          ? "사용자 업로드 이미지.png"
                          : selectedOwnerDocTab === "business"
                            ? `business_reg_${selectedOwnerForVerify.id}.png (621 KB)`
                            : `insurance_fleet_${selectedOwnerForVerify.id}.png (789 KB)`}
                      </p>
                    </div>
                    <label
                      className="px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg active:scale-95 transition-all cursor-pointer shadow-md"
                    >
                      실제 파일 업로드
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(`owner_${selectedOwnerForVerify.id}_${selectedOwnerDocTab}`, e)}
                      />
                    </label>
                  </div>
                </div>

                {/* Document Zoom / Rotate View Container */}
                <div className="flex-1 min-h-[280px] bg-slate-200/60 rounded-xl border border-slate-300 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 opacity-40 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

                  {uploadedFiles[`owner_${selectedOwnerForVerify.id}_${selectedOwnerDocTab}`] ? (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="relative max-w-[90%] max-h-[260px] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl"
                    >
                      <img
                        src={uploadedFiles[`owner_${selectedOwnerForVerify.id}_${selectedOwnerDocTab}`]}
                        alt="Uploaded Document"
                        className="max-h-[240px] w-auto object-contain rounded-lg border border-slate-300"
                      />
                    </div>
                  ) : selectedOwnerDocTab === "business" ? (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-white border-2 border-slate-800 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-serif relative flex-shrink-0 text-slate-900"
                    >
                      <div className="text-center font-bold text-xs border-b-2 border-double border-slate-900 pb-1 tracking-widest">
                        사 업 자 등 록 증
                      </div>

                      <div className="space-y-1 my-1.5 leading-normal">
                        <div className="flex"><span className="w-16 font-bold">등록번호:</span> <span className="font-mono">102-81-98741</span></div>
                        <div className="flex"><span className="w-16 font-bold">상호(법인명):</span> <span>{selectedOwnerForVerify.name}</span></div>
                        <div className="flex"><span className="w-16 font-bold">성명(대표자):</span> <span>홍길동</span></div>
                        <div className="flex"><span className="w-16 font-bold">개업연월일:</span> <span className="font-mono">2020년 06월 02일</span></div>
                        <div className="flex"><span className="w-16 font-bold">사업장소재지:</span> <span>인천광역시 중구 연안부두로 24</span></div>
                        <div className="flex"><span className="w-16 font-bold">비즈니스형태:</span> <span>덤프 토사 중기 운송업 (종목: 건설기계)</span></div>
                      </div>

                      <div className="text-center border-t border-slate-900 pt-1 font-bold text-[7px]">
                        2026년 06월 02일 <br />
                        <span className="text-[8px] tracking-wider">인 천 세 무 서 장 [인]</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-teal-300 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-sans relative flex-shrink-0 text-slate-800"
                    >
                      <div className="flex justify-between items-center border-b border-teal-200 pb-1">
                        <span className="font-black text-teal-800 text-xs">영업용 화물 자동차 일괄공제증서</span>
                        <span className="text-[7px] text-teal-600 font-bold font-mono">No. 2026-9871A</span>
                      </div>

                      <div className="space-y-1 my-1.5 leading-normal text-[7.5px] text-teal-950">
                        <div>• 조합원명: {selectedOwnerForVerify.name}</div>
                        <div>• 공제차량: {selectedOwnerForVerify.vehicle.split(" (")[0]}</div>
                        <div>• 공제기간: 2026. 03. 01 ~ 2027. 03. 01</div>
                        <div>• 담보내용: 대인공제Ⅰ,Ⅱ 무한 / 대물공제 2억원 가입 완료</div>
                      </div>

                      <div className="text-center border-t border-teal-200 pt-1 font-bold text-[7px] text-teal-750">
                        전국화물자동차운송사업연합회공제조합 [인]
                      </div>
                    </div>
                  )}

                  {/* Interactive Controls Overlay */}
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    <button
                      onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      ↻
                    </button>
                    <button
                      onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-655 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                    >
                      리셋
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setRejectTargetId(selectedOwnerForVerify.id);
                      setRejectTargetName(`${selectedOwnerForVerify.name} 파트너님`);
                      setRejectReasonText("사업자등록증 정보가 불일치합니다.");
                      setRejectCallback(() => async (reason: string) => {
                        const ok = await handleRejectMember(selectedOwnerForVerify.id, reason);
                        if (ok) {
                          alert(`${selectedOwnerForVerify.name} 파트너님의 가입 신청이 반려 처리되었습니다.`);
                          setSelectedOwnerForVerify(null);
                        } else {
                          alert("반려 처리에 실패했습니다.");
                        }
                      });
                      setRejectModalOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs active:scale-95 transition-all"
                  >
                    서류 심사 반려
                  </button>
                  <button
                    onClick={() => {
                      handleApproveOwner(selectedOwnerForVerify.id);
                      alert(`${selectedOwnerForVerify.name} 파트너님의 사업자 자격 검증이 완료되어 최종 가입 승인이 수락되었습니다!`);
                      setSelectedOwnerForVerify(null);
                    }}
                    className="flex-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all px-6"
                  >
                    실물 서류 대조 완료 & 가입 최종 승인
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderRejectModal()}
      </>
    );
  }

  // 4. [반출 건설 현장 가입 승인] 전용 독립 화면
  if (activePath === "/admin/approve-site") {
    return (
      <>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              B2B 반출지 공사현장 승인 본부
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Split-Screen 심사역</span>
            </h2>
            <p className="text-xs text-slate-505 mt-1">공사 현장관리자 가입 시 제출한 비산먼지 배출신고서 및 민간공사 계약서 실물을 인브라우저 정밀 대조기로 검증합니다.</p>
          </div>
          <button
            onClick={() => { setActivePath("/admin"); setSelectedSiteForVerify(null); }}
            className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Side: Sites List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2">가입 신청 대기 큐 ({sites.length}건)</div>
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {sites.map((st) => {
                const isSelected = selectedSiteForVerify?.id === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      setSelectedSiteForVerify(st);
                      setVerifyZoom(1.0);
                      setVerifyRotate(0);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-250 active:scale-[0.99] ${isSelected
                        ? "bg-blue-50/60 border-blue-500 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500"
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{st.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-505">원청사: {st.company}</div>
                        <div className="text-[10px] text-blue-605 font-semibold mt-1">임시 정산코드: {st.code}</div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${st.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                        }`}>
                        {st.status}
                      </span>
                    </div>

                    {st.status === "대기" && !isSelected && (
                      <div className="mt-3 text-right">
                        <span className="text-[10px] text-blue-600 font-bold hover:underline">실물 서류 대조 검증 개시 →</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Document Verification Console */}
          <div className="lg:col-span-3 border border-slate-200 rounded-2xl bg-slate-50/40 p-5 flex flex-col justify-between min-h-[500px] shadow-inner">
            {!selectedSiteForVerify ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="p-4 rounded-full bg-slate-100 border border-slate-200">
                  <FileCheck className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">실물 서류 대조 검수</h3>
                  <p className="text-xs text-slate-505 mt-1 max-w-xs leading-relaxed">왼쪽의 신청 대기 목록에서 반출지 건설 현장을 클릭하시면 제출된 증빙서류의 인브라우저 정밀 검증 화면이 활성화됩니다.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Document Header, Tabs & Upload State */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-sm font-black text-slate-800">심사 대상: {selectedSiteForVerify.name}</span>
                    <span className="text-[10px] text-blue-605 font-bold bg-blue-50/50 px-2 py-0.5 rounded border border-blue-200">
                      건설 현장 인허가 서류 검증
                    </span>
                  </div>

                  {/* 현장 상세 메타정보 카드 */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px] text-slate-700 font-semibold shadow-inner">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <span className="text-slate-400 font-medium block text-[9px] uppercase">회사명 (원청사)</span>
                        <span className="text-slate-900 font-extrabold">{selectedSiteForVerify.company}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[9px] uppercase">사업자등록번호</span>
                        <span className="text-slate-900 font-mono font-extrabold">{selectedSiteForVerify.bizRegNo}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[9px] uppercase">담당자 휴대폰</span>
                        <span className="text-slate-900 font-mono font-extrabold">
                          {selectedSiteForVerify.managerName ? `${selectedSiteForVerify.managerName} (${selectedSiteForVerify.phone || "미등록"})` : (selectedSiteForVerify.phone || "미등록")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[9px] uppercase">임시 정산코드</span>
                        <span className="text-blue-600 font-mono font-extrabold">{selectedSiteForVerify.code}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-200/60 pt-1.5 mt-1.5">
                      <span className="text-slate-400 font-medium block text-[9px] uppercase">현장 주소</span>
                      <span className="text-slate-900 font-bold block mt-0.5 leading-relaxed">{selectedSiteForVerify.address || "현장 주소 정보 없음"}</span>
                    </div>
                  </div>

                  {/* Document Selector Tabs */}
                  <div className="flex border-b border-slate-200 text-xs">
                    <button
                      onClick={() => { setSelectedSiteDocTab("BIZ_LICENSE"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedSiteDocTab === "BIZ_LICENSE" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 1. 사업자등록증
                    </button>
                    <button
                      onClick={() => { setSelectedSiteDocTab("CONSTRUCTION_PROOF"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedSiteDocTab === "CONSTRUCTION_PROOF" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 2. 공사현장 증빙서류
                    </button>
                    <button
                      onClick={() => { setSelectedSiteDocTab("BANKBOOK"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedSiteDocTab === "BANKBOOK" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 3. 통장사본
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-700">제출된 서류 파일명</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {uploadedFiles[`site_${selectedSiteForVerify.id}_${selectedSiteDocTab}`]
                          ? "사용자 업로드 이미지.png"
                          : selectedSiteDocTab === "BIZ_LICENSE"
                            ? `business_license_${selectedSiteForVerify.id}.png (1.2 MB)`
                            : selectedSiteDocTab === "CONSTRUCTION_PROOF"
                            ? `construction_proof_${selectedSiteForVerify.id}.png (920 KB)`
                            : `bankbook_${selectedSiteForVerify.id}.png (780 KB)`}
                      </p>
                    </div>
                    <label
                      className="px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-755 text-white font-bold rounded-lg active:scale-95 transition-all cursor-pointer shadow-md"
                    >
                      실제 파일 업로드
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(`site_${selectedSiteForVerify.id}_${selectedSiteDocTab}`, e)}
                      />
                    </label>
                  </div>
                </div>

                {/* Document Zoom / Rotate View Container */}
                <div className="flex-1 min-h-[280px] bg-slate-200/60 rounded-xl border border-slate-300 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 opacity-40 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

                  {uploadedFiles[`site_${selectedSiteForVerify.id}_${selectedSiteDocTab}`] ? (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="relative max-w-[90%] max-h-[260px] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl"
                    >
                      <img
                        src={uploadedFiles[`site_${selectedSiteForVerify.id}_${selectedSiteDocTab}`]}
                        alt="Uploaded Document"
                        className="max-h-[240px] w-auto object-contain rounded-lg border border-slate-300"
                      />
                    </div>
                  ) : selectedSiteDocTab === "BIZ_LICENSE" ? (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-amber-50/60 border-2 border-amber-300 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-sans relative flex-shrink-0 text-slate-900"
                    >
                      <div className="text-center font-bold text-xs border-b border-amber-400 pb-1 text-amber-800">
                        사업자등록증
                      </div>

                      <div className="space-y-1 my-1.5 leading-normal text-[7.5px] text-amber-950">
                        <div>• 등 록 번 호 : {selectedSiteForVerify.bizRegNo}</div>
                        <div>• 상호(법인명) : {selectedSiteForVerify.company}</div>
                        <div>• 성 명 (대표자) : {selectedSiteForVerify.name || "김현장"}</div>
                        <div>• 개 업 년 월 일 : 2018년 04월 12일</div>
                      </div>

                      <div className="text-center border-t border-amber-300 pt-1 font-bold text-[7px] text-amber-805">
                        국 세 청 장 [인]
                      </div>
                    </div>
                  ) : selectedSiteDocTab === "CONSTRUCTION_PROOF" ? (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-white border border-slate-800 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-serif relative flex-shrink-0 text-slate-800"
                    >
                      <div className="text-center font-bold text-xs border-b-2 border-double border-slate-900 pb-1">
                        민간건설공사 표준도급계약서
                      </div>

                      <div className="space-y-1 my-1.5 leading-normal text-[7px]">
                        <div>• 발 주 자 (갑) : {selectedSiteForVerify.company}</div>
                        <div>• 수 급 인 (을) : 덤프링 종합운송 (주)</div>
                        <div>• 공 사 명 칭 : {selectedSiteForVerify.name} 토사 반출 수송</div>
                        <div>• 현 장 주 소 : {selectedSiteForVerify.address}</div>
                      </div>

                      <div className="flex justify-between items-center text-[7px] text-slate-500 border-t border-slate-300 pt-1">
                        <span>계약체결일: 2026. 05. 28</span>
                        <span className="font-bold text-slate-900">상호 서명 날인 [인]</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-blue-50/60 border-2 border-blue-300 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-sans relative flex-shrink-0 text-slate-900"
                    >
                      <div className="text-center font-bold text-xs border-b border-blue-400 pb-1 text-blue-800">
                        예금거래통장 사본
                      </div>

                      <div className="space-y-1 my-1.5 leading-normal text-[7.5px] text-blue-950">
                        <div>• 계 좌 번 호 : 1002-999-888888 (우리은행)</div>
                        <div>• 예 금 주 : {selectedSiteForVerify.company}</div>
                        <div>• 개 설 지 점 : 인천 검단신도시 지점</div>
                      </div>

                      <div className="text-center border-t border-blue-300 pt-1 font-bold text-[7px] text-blue-805">
                        우 리 은 행 장 [인]
                      </div>
                    </div>
                  )}

                  {/* Interactive Controls Overlay */}
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    <button
                      onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      ↻
                    </button>
                    <button
                      onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-650 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                    >
                      리셋
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setRejectTargetId(selectedSiteForVerify.id);
                      setRejectTargetName(`${selectedSiteForVerify.name} 현장`);
                      setRejectReasonText("필수 서류 누락 또는 공사 계약서 내용 증빙이 미비합니다.");
                      setRejectCallback(() => async (reason: string) => {
                        const ok = await handleRejectMember(selectedSiteForVerify.id, reason);
                        if (ok) {
                          alert(`${selectedSiteForVerify.name} 현장의 가입 신청이 반려 처리되었습니다.`);
                          setSelectedSiteForVerify(null);
                        } else {
                          alert("반려 처리에 실패했습니다.");
                        }
                      });
                      setRejectModalOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs active:scale-95 transition-all"
                  >
                    서류 심사 반려
                  </button>
                  <button
                    onClick={() => {
                      handleApproveSite(selectedSiteForVerify.id);
                      alert(`${selectedSiteForVerify.name} 현장의 실물서류 검증이 완료되어 정식 가동 승인 처리되었습니다!`);
                      setSelectedSiteForVerify(null);
                    }}
                    className="flex-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all px-6"
                  >
                    실물 서류 대조 완료 & 최종 승인
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderRejectModal()}
      </>
    );
  }

  // 5. [하차지 승인 관리] 전용 독립 화면
  if (activePath === "/admin/approve-dropoff") {
    return (
      <>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              하차지 및 사토 매립장 승인 관리
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-655 border border-blue-200 font-bold">Split-Screen 심사역</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">사토장의 개발행위 허가문서와 토지사용 승낙서 실물 서류를 대조 검증하고 매립한도량을 활성화합니다.</p>
          </div>
          <button
            onClick={() => { setActivePath("/admin"); setSelectedDropoffForVerify(null); }}
            className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Side: Dropoff Site List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2">가입 신청 대기 큐 ({dropoffSites.length}건)</div>
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {dropoffSites.map((site) => {
                const isSelected = selectedDropoffForVerify?.id === site.id;
                return (
                  <div
                    key={site.id}
                    onClick={() => {
                      setSelectedDropoffForVerify(site);
                      setVerifyZoom(1.0);
                      setVerifyRotate(0);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-250 active:scale-[0.99] ${isSelected
                        ? "bg-blue-50/60 border-blue-500 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500"
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{site.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-650">허가 법인: {site.company}</div>
                        <div className="text-[10px] text-blue-600 font-semibold mt-1">수용 한도: {site.capacity}</div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${site.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                        }`}>
                        {site.status}
                      </span>
                    </div>

                    {site.status === "대기" && !isSelected && (
                      <div className="mt-3 text-right">
                        <span className="text-[10px] text-blue-600 font-bold hover:underline">실물 서류 대조 검증 개시 →</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Document Verification Console */}
          <div className="lg:col-span-3 border border-slate-200 rounded-2xl bg-slate-50/40 p-5 flex flex-col justify-between min-h-[500px] shadow-inner">
            {!selectedDropoffForVerify ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="p-4 rounded-full bg-slate-100 border border-slate-200">
                  <FileCheck className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-805 text-sm">실물 서류 대조 검수</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">왼쪽의 신청 대기 목록에서 하차지(사토장)를 클릭하시면 제출된 증빙서류의 인브라우저 정밀 검증 화면이 활성화됩니다.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Document Header, Tabs & Upload State */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-sm font-black text-slate-800">심사 대상: {selectedDropoffForVerify.name}</span>
                    <span className="text-[10px] text-blue-605 font-bold bg-blue-55/20 px-2 py-0.5 rounded border border-blue-200">
                      사토장 인허가 및 용량 다중 검증
                    </span>
                  </div>

                  {/* Document Selector Tabs */}
                  <div className="flex border-b border-slate-200 text-xs">
                    <button
                      onClick={() => { setSelectedDropoffDocTab("permit"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedDropoffDocTab === "permit" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 1. 개발행위 허가필증
                    </button>
                    <button
                      onClick={() => { setSelectedDropoffDocTab("land"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedDropoffDocTab === "land" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      📄 2. 토지사용 승낙서
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-700">제출된 서류 파일명</p>
                      <p className="text-[10px] text-slate-505 font-mono">
                        {uploadedFiles[`dropoff_${selectedDropoffForVerify.id}_${selectedDropoffDocTab}`]
                          ? "사용자 업로드 이미지.png"
                          : selectedDropoffDocTab === "permit"
                            ? `development_permit_${selectedDropoffForVerify.id}.png (1.5 MB)`
                            : `land_use_consent_${selectedDropoffForVerify.id}.png (840 KB)`}
                      </p>
                    </div>
                    <label
                      className="px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg active:scale-95 transition-all cursor-pointer shadow-md"
                    >
                      실제 파일 업로드
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(`dropoff_${selectedDropoffForVerify.id}_${selectedDropoffDocTab}`, e)}
                      />
                    </label>
                  </div>
                </div>

                {/* Document Zoom / Rotate View Container */}
                <div className="flex-1 min-h-[280px] bg-slate-200/60 rounded-xl border border-slate-300 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 opacity-40 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

                  {uploadedFiles[`dropoff_${selectedDropoffForVerify.id}_${selectedDropoffDocTab}`] ? (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="relative max-w-[90%] max-h-[260px] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl"
                    >
                      <img
                        src={uploadedFiles[`dropoff_${selectedDropoffForVerify.id}_${selectedDropoffDocTab}`]}
                        alt="Uploaded Document"
                        className="max-h-[240px] w-auto object-contain rounded-lg border border-slate-300"
                      />
                    </div>
                  ) : selectedDropoffDocTab === "permit" ? (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-gradient-to-br from-green-50/80 to-emerald-50 border-2 border-emerald-450 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-sans relative flex-shrink-0 text-slate-900"
                    >
                      <div className="text-center font-bold text-xs border-b border-emerald-400 pb-1 text-emerald-800">
                        개 발 행 위 허 가 필 증
                      </div>

                      <div className="space-y-1 my-1.5 leading-normal text-[7.5px] text-emerald-950">
                        <div>• 허 가 번 호 : 제 2026-개발-0842호</div>
                        <div>• 상호(법인명): {selectedDropoffForVerify.company}</div>
                        <div>• 허 가 대 상 : {selectedDropoffForVerify.name}</div>
                        <div>• 매립 한도 용량 : {selectedDropoffForVerify.capacity}</div>
                        <div>• 허 가 기 간 : 2026. 06. 01 ~ 2029. 05. 31</div>
                      </div>

                      <div className="text-center border-t border-emerald-300 pt-1 font-bold text-[7px] text-emerald-805">
                        인 천 광 역 시 서 구 청 장 [인]
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                        transition: "transform 0.15s ease"
                      }}
                      className="w-72 h-44 rounded-xl bg-white border border-slate-800 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-serif relative flex-shrink-0 text-slate-800"
                    >
                      <div className="text-center font-bold text-xs border-b-2 border-double border-slate-900 pb-1">
                        토 지 사 용 승 낙 서
                      </div>

                      <div className="space-y-1 my-1.5 leading-normal text-[7px]">
                        <div>• 토지소유자(위임인): 김종식 (인천 연희동 204-1)</div>
                        <div>• 피 승 낙 자 : {selectedDropoffForVerify.company}</div>
                        <div>• 승낙토지소재지: {selectedDropoffForVerify.name}</div>
                        <div>• 승 낙 기 간 : 2026. 06. 01 ~ 2029. 06. 01</div>
                        <div>• 승 낙 용 도 : 덤프 매립장(사토장) 개설 및 운영 목적</div>
                      </div>

                      <div className="flex justify-between items-center text-[7px] text-slate-505 border-t border-slate-300 pt-1">
                        <span>작성일자: 2026. 05. 30</span>
                        <span className="font-bold text-slate-900">당사자 기명 날인 [인]</span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Controls Overlay */}
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    <button
                      onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                      className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                    >
                      ↻
                    </button>
                    <button
                      onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); }}
                      className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-600 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                    >
                      리셋
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setRejectTargetId(selectedDropoffForVerify.id);
                      setRejectTargetName(`${selectedDropoffForVerify.name} 하차지`);
                      setRejectReasonText("개발행위 허가증 한도 또는 허가 번호 기재가 부적합합니다.");
                      setRejectCallback(() => async (reason: string) => {
                        const ok = await handleRejectMember(selectedDropoffForVerify.id, reason);
                        if (ok) {
                          alert(`${selectedDropoffForVerify.name} 하차지의 가입 신청이 반려 처리되었습니다.`);
                          setSelectedDropoffForVerify(null);
                        } else {
                          alert("반려 처리에 실패했습니다.");
                        }
                      });
                      setRejectModalOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-650 text-rose-600 font-bold text-xs active:scale-95 transition-all"
                  >
                    서류 심사 반려
                  </button>
                  <button
                    onClick={() => {
                      handleApproveDropoff(selectedDropoffForVerify.id);
                      alert(`${selectedDropoffForVerify.name} 하차지의 실물서류 검증이 완료되어 정식 가동 승인 처리되었습니다!`);
                      setSelectedDropoffForVerify(null);
                    }}
                    className="flex-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all px-6"
                  >
                    실물 서류 대조 완료 & 최종 승인
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderRejectModal()}
      </>
    );
  }

  // 6. [운임 및 수수료 설정] 전용 독립 화면
  if (activePath === "/admin/fees") {
    const simSelectedTonnage = "TON_25";
    const selectedTonnageData = tonnages.find(t => t.code === simSelectedTonnage) || tonnages[1];
    const simFee = Math.round(selectedTonnageData.baseTariff * (commissionRate / 100));

    const handleTariffChange = (code: string, newTariff: number) => {
      setTonnages(prev =>
        prev.map(t => t.code === code ? { ...t, baseTariff: newTariff } : t)
      );
    };

    const handleAddTonnage = () => {
      const codeInput = prompt("새로운 톤수 공통코드를 입력하세요 (예: TON_10):", "TON_10");
      if (!codeInput) return;
      if (tonnages.some(t => t.code === codeInput)) {
        alert("이미 존재하는 톤수 코드입니다.");
        return;
      }
      const nameInput = prompt("톤수 명칭을 입력하세요 (예: 10톤):", "10톤");
      const descInput = prompt("톤수 설명을 입력하세요:", "소형 덤프트럭");
      const tariffInput = prompt("기본 운반 단가(원)를 입력하세요:", "120000");

      if (codeInput && nameInput && tariffInput) {
        setTonnages(prev => [
          ...prev,
          {
            code: codeInput,
            name: nameInput,
            desc: descInput || "",
            baseTariff: Number(tariffInput)
          }
        ]);
        alert(`새로운 톤수 공통코드 [${codeInput}]가 성공적으로 등록되었습니다!`);
      }
    };

    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              공통코드 기반 톤수별 운임 및 수수료 설정
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Enterprise 정책국</span>
            </h2>
            <p className="text-xs text-slate-505 mt-1">시스템 공통코드로 매핑된 트럭 톤수(Tonnage)별로 기본 운반 단가를 분할 제어하고, 수수료를 실시간 통합 관리합니다.</p>
          </div>
          <button
            onClick={() => setActivePath("/admin")}
            className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold text-slate-805">1. 등록된 톤수별 공통코드 및 단가 조율</h3>
                <button
                  onClick={handleAddTonnage}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  신규 톤수 공통코드 등록
                </button>
              </div>

              <div className="space-y-4">
                {tonnages.map((t) => (
                  <div key={t.code} className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm hover:border-slate-350 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{t.name} ({t.desc})</span>
                          <span className="text-[9px] bg-slate-100 border border-slate-250 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">{t.code}</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold">기본단가(원):</span>
                        <input
                          type="number"
                          value={t.baseTariff}
                          onChange={(e) => handleTariffChange(t.code, Number(e.target.value))}
                          className="w-24 px-2.5 py-1 border border-slate-300 rounded font-mono text-xs text-right font-black text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-400 font-bold font-mono">10만</span>
                      <input
                        type="range"
                        min={100000}
                        max={350000}
                        step={5000}
                        value={t.baseTariff}
                        onChange={(e) => handleTariffChange(t.code, Number(e.target.value))}
                        className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-bold font-mono">35만원</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold text-slate-850">2. 실시간 미터기 요금 계산 방식 설정</h3>
                <p className="text-[11px] text-slate-500 mt-1">관리자 선택에 따라 기사 앱 미터기 계산 공식이 무선으로 실시간 스위칭됩니다.</p>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 block">정산 계산 방식 선택</label>
                
                <div
                  onClick={() => setCalcMethod("CONTINUOUS")}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    calcMethod === "CONTINUOUS"
                      ? "bg-blue-50/60 border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500"
                      : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="calcMethod"
                      checked={calcMethod === "CONTINUOUS"}
                      onChange={() => setCalcMethod("CONTINUOUS")}
                      className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="font-extrabold text-xs text-slate-900">연속 누적 방식 (CONTINUOUS)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed pl-5">
                    운행 시작 즉시 기본요금에 전체 주행거리 및 시간에 비례한 요금이 계속 가산되어 실시간 표시됩니다. (일반 택시 방식)
                  </p>
                </div>

                <div
                  onClick={() => setCalcMethod("OVER_PLAN")}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    calcMethod === "OVER_PLAN"
                      ? "bg-blue-50/60 border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500"
                      : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="calcMethod"
                      checked={calcMethod === "OVER_PLAN"}
                      onChange={() => setCalcMethod("OVER_PLAN")}
                      className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="font-extrabold text-xs text-slate-900">계획 초과분 가산 방식 (OVER_PLAN)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed pl-5">
                    예정된 경로의 계획거리와 계획시간 이내에는 기본요금만 청구되며, 초과한 거리와 시간에 대해서만 할증 가산합니다.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-200/60">
                <label className="text-xs font-bold text-slate-700 block">방식별 요금 가산 단가 세부 설정</label>

                <div className={`p-3 rounded-xl border space-y-3 transition-opacity ${calcMethod === "CONTINUOUS" ? "bg-white border-blue-200 opacity-100" : "bg-slate-100/50 border-slate-200 opacity-60"}`}>
                  <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-650">
                    <span>연속 누적: 거리 단가 (원/km)</span>
                    <input
                      type="number"
                      disabled={calcMethod !== "CONTINUOUS"}
                      value={continuousDistanceFare}
                      onChange={(e) => setContinuousDistanceFare(Number(e.target.value))}
                      className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-650">
                    <span>연속 누적: 시간 단가 (원/분)</span>
                    <input
                      type="number"
                      disabled={calcMethod !== "CONTINUOUS"}
                      value={continuousTimeFare}
                      onChange={(e) => setContinuousTimeFare(Number(e.target.value))}
                      className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-xl border space-y-3 transition-opacity ${calcMethod === "OVER_PLAN" ? "bg-white border-blue-200 opacity-100" : "bg-slate-100/50 border-slate-200 opacity-60"}`}>
                  <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-650">
                    <span>계획 초과: 거리 단가 (원/km)</span>
                    <input
                      type="number"
                      disabled={calcMethod !== "OVER_PLAN"}
                      value={overPlanDistanceFare}
                      onChange={(e) => setOverPlanDistanceFare(Number(e.target.value))}
                      className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-655">
                    <span>계획 초과: 시간 단가 (원/분)</span>
                    <input
                      type="number"
                      disabled={calcMethod !== "OVER_PLAN"}
                      value={overPlanTimeFare}
                      onChange={(e) => setOverPlanTimeFare(Number(e.target.value))}
                      className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  setPolicySaveSuccess(true);
                  setTimeout(() => setPolicySaveSuccess(false), 3000);
                  try {
                    await fetch("http://localhost:8000/api/common-codes/pricing-policy", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        calculation_method: calcMethod,
                        continuous_distance_unit_fare: continuousDistanceFare,
                        continuous_time_unit_fare: continuousTimeFare,
                        over_plan_distance_unit_fare: overPlanDistanceFare,
                        over_plan_time_unit_fare: overPlanTimeFare,
                      }),
                    });
                  } catch (e) {
                    console.log("Backend offline or auth bypass required.", e);
                  }
                  alert("미터기 계산 정책 및 단가가 공통코드(METER_PRICING_POLICY)에 성공적으로 저장되었습니다!");
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
              >
                🖥️ 요금 정책 저장 및 적용
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 8. [고객지원 & 게시판 관리] 전용 독립 화면
  if (activePath === "/admin/boards") {
    const filteredFaqs = faqs.filter(f => faqCategoryFilter === "전체" || f.category === faqCategoryFilter);
    const filteredInquiries = inquiries.filter(inq => inquiryFilter === "전체" || inq.status === inquiryFilter);

    const handleAddFaq = () => {
      const category = prompt("FAQ 카테고리를 입력하세요 (공통/기사/현장관리자/하차지):", "공통");
      if (!category) return;
      const q = prompt("질문(Q)을 입력하세요:");
      if (!q) return;
      const a = prompt("답변(A)을 입력하세요:");
      if (!a) return;

      setFaqs(prev => [
        ...prev,
        { id: Date.now(), category, q, a }
      ]);
      alert("새로운 FAQ가 등록되었습니다!");
    };

    const handleDeleteFaq = (id: number) => {
      if (confirm("해당 FAQ를 삭제하시겠습니까?")) {
        setFaqs(prev => prev.filter(f => f.id !== id));
      }
    };

    const handleAddNotice = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newNoticeTitle.trim() || !newNoticeContent.trim()) {
        alert("공지사항 제목과 내용을 모두 작성해주세요.");
        return;
      }
      const newNotice = {
        id: Date.now(),
        title: newNoticeTitle,
        content: newNoticeContent,
        target: newNoticeTarget,
        date: new Date().toISOString().split("T")[0]
      };
      setNotices(prev => [newNotice, ...prev]);
      setNewNoticeTitle("");
      setNewNoticeContent("");
      alert("공지사항이 성공적으로 등록되었습니다!");
    };

    const handleDeleteNotice = (id: number) => {
      if (confirm("삭제하시겠습니까?")) {
        setNotices(prev => prev.filter(n => n.id !== id));
      }
    };

    const handleAnswerInquiry = (id: number) => {
      const replyText = replyTexts[id];
      if (!replyText || !replyText.trim()) {
        alert("답변을 작성해 주세요.");
        return;
      }
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: "답변 완료", reply: replyText } : inq));
      alert("답변이 등록되었습니다.");
    };

    const handleDeleteInquiry = (id: number) => {
      if (confirm("상담 내역을 삭제하시겠습니까?")) {
        setInquiries(prev => prev.filter(inq => inq.id !== id));
      }
    };

    return (
      <>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              통합 고객 소통 및 게시판 관리
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">고객지원 본부</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">사용자 민원 처리, 공지 전송 및 FAQ 관리를 수행합니다.</p>
          </div>
          <button onClick={() => setActivePath("/admin")} className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all">
            ← 대시보드로 돌아가기
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 rounded-xl p-1 gap-1">
          <button
            onClick={() => setBoardActiveTab("inquiry")}
            className={`flex-1 py-2.5 rounded-lg text-center text-xs font-black transition-all flex items-center justify-center gap-1.5 ${boardActiveTab === "inquiry"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
              }`}
          >
            💬 1:1 상담 문의 관리
          </button>
          <button
            onClick={() => setBoardActiveTab("notice")}
            className={`flex-1 py-2.5 rounded-lg text-center text-xs font-black transition-all flex items-center justify-center gap-1.5 ${boardActiveTab === "notice"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
              }`}
          >
            📢 공지사항 전사 등록
          </button>
          <button
            onClick={() => setBoardActiveTab("faq")}
            className={`flex-1 py-2.5 rounded-lg text-center text-xs font-black transition-all flex items-center justify-center gap-1.5 ${boardActiveTab === "faq"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-505 hover:text-slate-800"
              }`}
          >
            💡 FAQ 질문 본부
          </button>
        </div>

        {boardActiveTab === "inquiry" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-805">📥 1:1 상담 문의</h3>
              <div className="flex gap-1">
                {(["전체", "대기 중", "답변 완료"] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setInquiryFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${inquiryFilter === filter
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredInquiries.map(inq => {
                const isExpanded = expandedInquiryId === inq.id;
                const isUnanswered = inq.status === "대기 중";
                return (
                  <div
                    key={inq.id}
                    className={`rounded-2xl border transition-all ${isExpanded ? "border-blue-300 bg-blue-50/5 shadow-md" : "border-slate-200 hover:border-slate-350 bg-white"}`}
                  >
                    <div onClick={() => setExpandedInquiryId(isExpanded ? null : inq.id)} className="p-4 flex justify-between items-center cursor-pointer select-none">
                      <div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${isUnanswered ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>{inq.status}</span>
                        <h4 className="font-extrabold text-xs text-slate-800 mt-1">{inq.title}</h4>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteInquiry(inq.id); }} className="px-2 py-1 text-[9px] bg-rose-50 text-rose-600 rounded">삭제</button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-100 bg-slate-50/40 text-xs space-y-4">
                        <p className="p-3 bg-white border border-slate-200 rounded-xl">{inq.content}</p>
                        {isUnanswered ? (
                          <div className="space-y-2">
                            <textarea rows={3} value={replyTexts[inq.id] || ""} onChange={e => setReplyTexts(prev => ({ ...prev, [inq.id]: e.target.value }))} className="w-full p-3 border rounded-xl" placeholder="답변을 작성하세요" />
                            <button onClick={() => handleAnswerInquiry(inq.id)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">답변 등록</button>
                          </div>
                        ) : (
                          <p className="p-3 bg-emerald-50 text-slate-700 rounded-xl">{inq.reply}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {boardActiveTab === "notice" && (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-6">
              <form onSubmit={handleAddNotice} className="col-span-2 p-5 bg-slate-50 border rounded-2xl space-y-4">
                <input type="text" value={newNoticeTitle} onChange={e => setNewNoticeTitle(e.target.value)} className="w-full p-2 border rounded-xl" placeholder="제목" />
                <select value={newNoticeTarget} onChange={e => setNewNoticeTarget(e.target.value)} className="w-full p-2 border rounded-xl">
                  <option value="전체">전체</option>
                  <option value="기사">기사</option>
                  <option value="현장관리자">현장관리자</option>
                </select>
                <textarea rows={5} value={newNoticeContent} onChange={e => setNewNoticeContent(e.target.value)} className="w-full p-2 border rounded-xl" placeholder="내용" />
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl">공지 등록</button>
              </form>
              <div className="col-span-3 space-y-3">
                {notices.map(n => (
                  <div key={n.id} className="p-4 border rounded-xl">
                    <div className="flex justify-between">
                      <span className="font-bold">{n.title}</span>
                      <button onClick={() => handleDeleteNotice(n.id)} className="text-rose-600 text-xs">삭제</button>
                    </div>
                    <p className="mt-2 text-slate-655">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {boardActiveTab === "faq" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <button onClick={handleAddFaq} className="px-4 py-2 bg-blue-600 text-white rounded-xl">신규 FAQ 등록</button>
            </div>
            <div className="space-y-2">
              {filteredFaqs.map(faq => (
                <div key={faq.id} className="p-4 border rounded-xl bg-white flex justify-between items-center">
                  <span>[{faq.category}] {faq.q}</span>
                  <button onClick={() => handleDeleteFaq(faq.id)} className="text-rose-600 text-xs">삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {renderRejectModal()}
      </>
    );
  }

  // default/disputes fallback pages
  if (activePath === "/admin/sites") {
    // 플랫폼 관리자(Platform Admin)도 동일하게 DB 연동 현장관리를 이용할 수 있도록 /site 대시보드로 즉시 라우팅합니다.
    setTimeout(() => {
      setActivePath("/site");
    }, 50);
    return (
      <div className="p-6 text-center py-24">
        <p className="text-xs text-slate-500">현장 통합 관리 화면으로 리다이렉트 중...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-24 animate-fadeIn">
        <h2 className="text-lg font-extrabold text-slate-800">연동 구현 진행 중인 화면 ({activePath})</h2>
        <p className="text-xs text-slate-500 mt-2">선택하신 서비스는 공통 백엔드 연동 릴리즈 대기 상태입니다.</p>
      </div>

      {renderRejectModal()}
    </>
  );
}
