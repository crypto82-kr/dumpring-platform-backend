import React from "react";
import { PlatformAdminOverviewDashboard } from "./platform_admin/PlatformAdminOverviewDashboard";
import { PlatformAdminUnifiedApproval } from "./platform_admin/PlatformAdminUnifiedApproval";

interface PlatformAdminDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  
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

export function PlatformAdminDashboard(props: PlatformAdminDashboardProps) {
  const { activePath, setActivePath } = props;

  // 1. 플랫폼 관리자 메인 대시보드 (/admin)
  if (activePath === "/admin") {
    return (
      <PlatformAdminOverviewDashboard
        setActivePath={setActivePath}
        commissionRate={props.commissionRate}
        baseTariff={props.baseTariff}
        tonnages={props.tonnages}
        drivers={props.drivers}
        owners={props.owners}
        sites={props.sites}
        dropoffSites={props.dropoffSites}
        disputes={props.disputes}
      />
    );
  }

  // 2. 플랫폼 관리자 통합 승인 심사 센터 (/admin/approval 및 하위 경로)
  if (
    activePath === "/admin/approval" ||
    activePath === "/admin/approve-driver" ||
    activePath === "/admin/approve-owner" ||
    activePath === "/admin/approve-site" ||
    activePath === "/admin/approve-dropoff"
  ) {
    return (
      <PlatformAdminUnifiedApproval
        setActivePath={setActivePath}
        drivers={props.drivers}
        owners={props.owners}
        sites={props.sites}
        dropoffSites={props.dropoffSites}
        uploadedFiles={props.uploadedFiles}
        handleApproveDriver={props.handleApproveDriver}
        handleApproveOwner={props.handleApproveOwner}
        handleApproveSite={props.handleApproveSite}
        handleApproveDropoff={props.handleApproveDropoff}
        handleRejectMember={props.handleRejectMember}
      />
    );
  }

  // 3. 현장 리다이렉트 (/admin/sites)
  if (activePath === "/admin/sites") {
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
    <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-24 animate-fadeIn">
      <h2 className="text-lg font-extrabold text-slate-800">연동 구현 진행 중인 화면 ({activePath})</h2>
      <p className="text-xs text-slate-500 mt-2">선택하신 서비스는 공통 백엔드 연동 릴리즈 대기 상태입니다.</p>
    </div>
  );
}
