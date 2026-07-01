"use client";

import React, { useState, useEffect } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import {
  ShieldAlert,
  Clock,
  TrendingUp,
  MapPin,
  Truck,
  PlusCircle,
  CheckCircle,
  Database,
  Terminal,
  Activity,
  FileCheck,
  AlertCircle,
  Search,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";

export default function Home() {
  const { user, changeRole, activePath, setActivePath } = useAuth();
  const [inputText, setInputText] = useState("");

  // Dynamic User Uploaded Document Preview URLs
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  const handleFileUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedFiles(prev => ({
        ...prev,
        [key]: url
      }));
    }
  };

  // Interactive Verification States for Driver Approval
  const [selectedDriverForVerify, setSelectedDriverForVerify] = useState<any | null>(null);
  const [verifyZoom, setVerifyZoom] = useState(1.0);
  const [selectedDocTab, setSelectedDocTab] = useState<"license" | "certificate">("license");
  const [verifyRotate, setVerifyRotate] = useState(0);

  // Drag-to-Pan States
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const [selectedOwnerForVerify, setSelectedOwnerForVerify] = useState<any | null>(null);
  const [selectedSiteForVerify, setSelectedSiteForVerify] = useState<any | null>(null);
  const [selectedDropoffForVerify, setSelectedDropoffForVerify] = useState<any | null>(null);
  const [selectedOwnerDocTab, setSelectedOwnerDocTab] = useState<"business" | "insurance">("business");
  const [selectedSiteDocTab, setSelectedSiteDocTab] = useState<"dust" | "contract">("dust");
  const [selectedDropoffDocTab, setSelectedDropoffDocTab] = useState<"permit" | "land">("permit");
  // Tonnage Codes (공통코드) and Tonnage Tariffs States
  const [tonnages, setTonnages] = useState([
    { code: "TON_15", name: "15톤", desc: "중형 덤프트럭", baseTariff: 140000 },
    { code: "TON_25", name: "25.5톤", desc: "대형 덤프트럭 (기본)", baseTariff: 180000 },
    { code: "TON_30", name: "30톤 초과", desc: "특수 덤프/트레일러", baseTariff: 220000 }
  ]);
  const [simSelectedTonnage, setSimSelectedTonnage] = useState("TON_25");
  // DB Common Codes States
  const [dbCommonCodes, setDbCommonCodes] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("전체");
  const [isCodesLoading, setIsCodesLoading] = useState(false);
  const [newGroupCode, setNewGroupCode] = useState("");
  const [newCodeVal, setNewCodeVal] = useState("");
  const [newCodeName, setNewCodeName] = useState("");
  const [newDisplayOrder, setNewDisplayOrder] = useState(0);

  const fetchCommonCodes = async () => {
    setIsCodesLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/common-codes");
      if (res.ok) {
        const data = await res.json();
        setDbCommonCodes(data);
      }
    } catch (e) {
      console.error("Failed to fetch common codes from backend:", e);
    } finally {
      setIsCodesLoading(false);
    }
  };

  useEffect(() => {
    if (activePath === "/admin/codes" || activePath === "/dev/codes") {
      fetchCommonCodes();
    }
  }, [activePath]);
  // FAQ Board States
  const [faqs, setFaqs] = useState([
    { id: 1, category: "기사", q: "제출 서류 심사는 얼마나 걸리나요?", a: "기사 면허 및 화물종사자 자격증 심사는 보통 가입 신청 후 영업일 기준 1~2시간 이내에 완료되며, 결과는 SMS로 즉시 전송됩니다." },
    { id: 2, category: "현장관리자", q: "공사현장 정산코드는 어떻게 발급받나요?", a: "현장관리자 가입 승인 단계에서 비산먼지 배출신고서 및 공사 계약서 검증이 완료되는 즉시 시스템에서 영문+숫자 혼합의 고유 정산코드(예: GD-3-DUMP)가 자동 발급됩니다." },
    { id: 3, category: "하차지", q: "매립지 수용량이 꽉 차면 어떻게 되나요?", a: "지정 수용한도 용량(㎥)에 도달하면 해당 하차지는 배차 시스템에서 자동으로 매칭 비활성화 처리되며, 추가 개발행위 허가 완료 시 한도 수정 등록이 가능합니다." },
    { id: 4, category: "공통", q: "수수료 정산 및 세금계산서 발행 주기가 어떻게 되나요?", a: "플랫폼 수임 수수료 정산은 매월 말일 일괄 집계되며, 익월 5일 영업용 세금계산서가 플랫폼을 통해 자동 전자 발행됩니다." }
  ]);
  const [faqCategoryFilter, setFaqCategoryFilter] = useState("전체");
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);

  // 1:1 Inquiry States
  const [inquiries, setInquiries] = useState([
    { id: 1, title: "정산 데이터 지연 문제", content: "모바일에서 가끔 정산 데이터가 2초 정도 늦게 뜹니다. 검단 3공구 진입 정산 화면 로딩 속도 지연 확인 요청합니다.", author: "삼부 현장 김과장", date: "2026-06-02", status: "대기 중", reply: "" },
    { id: 2, title: "화물종사 자격증 승인 반려 문의", content: "화물종사자 자격증 사진이 선명하게 나왔는데 왜 심사에서 반려되었나요? 재신청 방법 문의드립니다.", author: "박길동 기사", date: "2026-06-01", status: "대기 중", reply: "" },
    { id: 3, title: "정산 세금계산서 자동 발행 시점", content: "B2B 파트너 정산 시 매월 5일에 세금계산서가 발행된다고 나와 있는데 메일로도 같이 수신이 되나요?", author: "대진운송 최 대표", date: "2026-05-30", status: "답변 완료", reply: "네, 대진운송 파트너 계정에 등록된 대표 이메일로도 세금계산서 XML 파일 및 PDF 사본이 자동으로 동시 발송됩니다." }
  ]);
  const [expandedInquiryId, setExpandedInquiryId] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [inquiryFilter, setInquiryFilter] = useState<"전체" | "대기 중" | "답변 완료">("전체");

  // Notice Board States
  const [notices, setNotices] = useState([
    { id: 1, title: "[중요] 전국 덤프 기사 대상 하절기 안전 운행 수칙 및 휴게시간 준수 안내", content: "폭염 대비 무리한 운행을 금하고 4시간 운행 시 30분 이상 휴식을 취해야 합니다. 특히 적재물 비산 먼지 단속이 강화되오니 덮개 쇄정을 철저히 해주시기 바랍니다.", target: "기사", date: "2026-06-02" },
    { id: 2, title: "[서비스 점검] 6월 7일 새벽 2시 ~ 6시 시스템 데이터베이스 고도화 정기 점검", content: "더 안정적인 덤프링 실시간 GPS 관제 서비스를 위해 시스템 정기점검이 진행됩니다. 점검 시간 중에는 모바일 앱 접속 및 자동 배차 매칭이 일시 중단됩니다.", target: "전체", date: "2026-06-01" },
    { id: 3, title: "[정산정책] B2B 현장 가상계좌 및 직접 정산 거래 영수증 첨부 가이드라인 안내", content: "각 공사 현장관리자분들께서는 차주 직접 정산 거래 후 수임료 증빙용 법인세 영수증 또는 이체증 사본을 반드시 현장 대시보드에 업로드 및 승인 처리해주셔야 최종 매칭이 완료됩니다.", target: "현장관리자", date: "2026-05-29" }
  ]);
  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeTarget, setNewNoticeTarget] = useState("전체");
  const [newNoticeContent, setNewNoticeContent] = useState("");
  const [boardActiveTab, setBoardActiveTab] = useState<"inquiry" | "notice" | "faq">("inquiry");

  // Interactive Simulation States
  const [commissionRate, setCommissionRate] = useState(8.5); // %
  const [baseTariff, setBaseTariff] = useState(180000); // 원
  const [calcMethod, setCalcMethod] = useState<"CONTINUOUS" | "OVER_PLAN">("CONTINUOUS");
  const [continuousDistanceFare, setContinuousDistanceFare] = useState(1200);
  const [continuousTimeFare, setContinuousTimeFare] = useState(150);
  const [overPlanDistanceFare, setOverPlanDistanceFare] = useState(1500);
  const [overPlanTimeFare, setOverPlanTimeFare] = useState(200);
  const [policySaveSuccess, setPolicySaveSuccess] = useState(false);

  const [approvalTab, setApprovalTab] = useState<"driver" | "owner" | "site" | "dropoff">("driver");

  useEffect(() => {
    if (activePath === "/admin/approve-driver") {
      setApprovalTab("driver");
    } else if (activePath === "/admin/approve-owner") {
      setApprovalTab("owner");
    } else if (activePath === "/admin/approve-site") {
      setApprovalTab("site");
    } else if (activePath === "/admin/approve-dropoff") {
      setApprovalTab("dropoff");
    }
  }, [activePath]);

  const [drivers, setDrivers] = useState([
    { id: 1, name: "이순신 기사", phone: "010-9999-8888", license: "1종대형면허", status: "대기" },
    { id: 2, name: "강감찬 기사", phone: "010-1111-2222", license: "1종대형면허", status: "승인됨" },
  ]);
  const [owners, setOwners] = useState([
    { id: 1, name: "홍길동 차주 (개인)", phone: "010-3333-4444", vehicle: "인천 80바 4531 (25.5톤)", status: "대기" },
    { id: 2, name: "대진운송 (법인)", phone: "010-5555-6666", vehicle: "경기 82자 7732 외 15대", status: "승인됨" },
  ]);
  const [sites, setSites] = useState<any[]>([
    { id: 1, name: "인천 검단 3공구 현장", company: "삼부토건", code: "미발급", status: "대기", phone: "010-1234-5678", bizRegNo: "120-81-45678", registeredSites: ["인천 검단 3공구"] },
    { id: 2, name: "영종도 A지구 현장", company: "현대건설", code: "YJ-A-DUMP", status: "승인됨", phone: "010-8765-4321", bizRegNo: "110-85-12345", registeredSites: ["영종도 A지구"] },
  ]);
  const [dropoffSites, setDropoffSites] = useState<any[]>([
    { id: 1, name: "인천 송도 남측 매립지 B구역", company: "삼부토건", status: "대기", capacity: "80,000 ㎥", phone: "010-9999-1111", bizRegNo: "135-85-12345", registeredLandfills: ["인천 송도 남측 매립지 B구역"] },
    { id: 2, name: "경기 김포 고촌 신축 사토장", company: "대우건설", status: "대기", capacity: "45,000 ㎥", phone: "010-8888-2222", bizRegNo: "140-88-22222", registeredLandfills: ["경기 김포 고촌 신축 사토장"] },
    { id: 3, name: "인천 청라 지구 매립지", company: "현대건설", status: "승인됨", capacity: "120,000 ㎥", phone: "010-7777-3333", bizRegNo: "150-89-33333", registeredLandfills: ["인천 청라 지구 매립지"] },
  ]);


  // Disputes & Support States
  const [disputes, setDisputes] = useState([
    { id: 1, type: "운임 미지급", desc: "김포 사토장 - 송도 운행 2건 미지급", reporter: "홍길동 차주", status: "대기", date: "2026-05-27" },
    { id: 2, type: "배차 취소 갈등", desc: "검단 3공구 현장 일방적 당일 배차 취소", reporter: "김철수 기사", status: "중재 중", date: "2026-05-26" },
  ]);

  // Site Manager states
  const [taxInvoiceApproved, setTaxInvoiceApproved] = useState(false);

  // Drop-off Manager states
  const [dropoffVerifiedCount, setDropoffVerifiedCount] = useState(0);
  const [dropoffRegSuccess, setDropoffRegSuccess] = useState(false);
  const [inboundTrucks, setInboundTrucks] = useState([
    { id: 1, plate: "인천 88사 9081", driver: "이영희", time: "17:10:15", status: "진입 대기", type: "사토 (토사)", weight: "24.5 ton" },
    { id: 2, plate: "경기 82자 7732", driver: "박민수", time: "17:05:00", status: "진입 대기", type: "사토 (토사)", weight: "25.0 ton" },
  ]);

  // Owner states
  const [ownerBroadcastSuccess, setOwnerBroadcastSuccess] = useState(false);

  // Developer states
  const [menuTarget, setMenuTarget] = useState<"web" | "app">("web");
  const [menuSelectedRole, setMenuSelectedRole] = useState<string>("site_manager");
  const [menuConfigSaveSuccess, setMenuConfigSaveSuccess] = useState(false);
  const [developerMenus, setDeveloperMenus] = useState([
    { id: 1, name: "덤프비 정산 확인", target: "web", role: "site_manager", allowed: true },
    { id: 2, name: "흙값 정산 관리", target: "web", role: "site_manager", allowed: true },
    { id: 3, name: "운행 이력 조회", target: "web", role: "site_manager", allowed: true },
    { id: 4, name: "세금계산서 업무", target: "web", role: "site_manager", allowed: true },
    { id: 5, name: "실시간 반입 확인", target: "web", role: "dropoff_manager", allowed: true },
    { id: 6, name: "흙값 정산 관리 (하차지)", target: "web", role: "dropoff_manager", allowed: true },
    { id: 7, name: "시스템 DB 원격 터미널", target: "web", role: "platform_admin", allowed: false },
    { id: 8, name: "모바일 계량 전송", target: "app", role: "site_manager", allowed: true },
    { id: 9, name: "모바일 배차 서명", target: "app", role: "site_manager", allowed: true },
  ]);

  // APM States
  const [apmLoadTesting, setApmLoadTesting] = useState(false);
  // --- User Management States ---
  const [userTab, setUserTab] = useState<"driver" | "owner" | "site" | "dropoff">("driver");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [viewingUserDetails, setViewingUserDetails] = useState<any | null>(null);
  const [userFormName, setUserFormName] = useState("");
  const [userFormPhone, setUserFormPhone] = useState("");
  const [userFormStatus, setUserFormStatus] = useState("승인됨");
  const [userFormExtra1, setUserFormExtra1] = useState("");
  const [userFormExtra2, setUserFormExtra2] = useState("");

  // --- Site & Dispatch States ---
  const [registeredSiteList, setRegisteredSiteList] = useState([
    {
      id: 1,
      name: "인천 검단 3공구",
      address: "인천광역시 서구 검단동 123-45",
      roadDesc: "정문 차단기 통과 후 우회전하여 진입",
      managers: ["김현장 (010-1234-5678)", "박담당 (010-8765-4321)"],
    },
    {
      id: 2,
      name: "송도 5공구 아파트 신축현장",
      address: "인천광역시 연수구 송도동 98-1",
      roadDesc: "남측 진입로 이용, 대형 트럭 서행 필수",
      managers: ["이현장 (010-5555-6666)"],
    }
  ]);

  const [dispatchRequestList, setDispatchRequestList] = useState([
    {
      id: 1,
      siteId: 1,
      siteName: "인천 검단 3공구",
      tonTypes: ["25.5톤", "15톤"],
      truckCount: 5,
      soilType: "일반 토사",
      startDate: "2026-06-06",
      endDate: "2026-06-10",
      dropoffMode: "search",
      dropoffName: "인천 송도 남측 매립지 B구역",
      dropoffAddress: "인천광역시 연수구 송도동 456",
      status: "대기중",
    },
    {
      id: 2,
      siteId: 2,
      siteName: "송도 5공구 아파트 신축현장",
      tonTypes: ["25.5톤"],
      truckCount: 3,
      soilType: "풍화암",
      startDate: "2026-06-08",
      endDate: "2026-06-09",
      dropoffMode: "none",
      status: "배차완료",
    }
  ]);

  // Form states for Site Request
  const [siteFormName, setSiteFormName] = useState("");
  const [siteFormAddress, setSiteFormAddress] = useState("");
  const [siteFormRoadDesc, setSiteFormRoadDesc] = useState("");
  const [siteFormManagers, setSiteFormManagers] = useState("");
  const [siteFormSearchQuery, setSiteFormSearchQuery] = useState("");
  const [siteFormSelectedManager, setSiteFormSelectedManager] = useState("");

  // Form states for Dispatch Request
  const [dispatchFormSiteId, setDispatchFormSiteId] = useState<number | "">("");
  const [dispatchFormTonTypes, setDispatchFormTonTypes] = useState<string[]>([]);
  const [dispatchFormTruckCount, setDispatchFormTruckCount] = useState(1);
  const [dispatchFormSoilType, setDispatchFormSoilType] = useState("일반 토사");
  const [dispatchFormStartDate, setDispatchFormStartDate] = useState("");
  const [dispatchFormEndDate, setDispatchFormEndDate] = useState("");
  const [dispatchFormDropoffMode, setDispatchFormDropoffMode] = useState<"direct" | "search" | "none">("none");
  const [dispatchFormDropoffName, setDispatchFormDropoffName] = useState("");
  const [dispatchFormDropoffAddress, setDispatchFormDropoffAddress] = useState("");
  const [dispatchFormDropoffCapacity, setDispatchFormDropoffCapacity] = useState("");
  const [dispatchFormDropoffSoilType, setDispatchFormDropoffSoilType] = useState("일반 토사");
  const [dispatchRequestMode, setDispatchRequestMode] = useState<"list" | "create" | "edit" | "detail">("list");
  const [editingDispatchRequestId, setEditingDispatchRequestId] = useState<number | null>(null);
  const [dispatchRequestSearchQuery, setDispatchRequestSearchQuery] = useState("");

  const resetDispatchForm = () => {
    setDispatchFormSiteId("");
    setDispatchFormTonTypes([]);
    setDispatchFormTruckCount(1);
    setDispatchFormSoilType("일반 토사");
    setDispatchFormStartDate("");
    setDispatchFormEndDate("");
    setDispatchFormDropoffMode("none");
    setDispatchFormDropoffName("");
    setDispatchFormDropoffAddress("");
    setEditingDispatchRequestId(null);
  };

  // --- Dropoff States ---
  const [registeredDropoffList, setRegisteredDropoffList] = useState([
    {
      id: 1,
      name: "인천 송도 남측 매립지 B구역",
      address: "인천광역시 연수구 송도동 456",
      managers: ["정하차 (010-9999-1111)"],
      soilTypes: ["일반 토사", "풍화암"],
      capacity: 80000,
      soilDealType: "buy", // "buy" (돈 주고 삼) | "sell" (돈 받고 팖)
    },
    {
      id: 2,
      name: "경기 김포 고촌 신축 사토장",
      address: "경기도 김포시 고촌읍 789",
      managers: ["최하차 (010-8888-2222)"],
      soilTypes: ["일반 토사"],
      capacity: 45000,
      soilDealType: "sell", // "sell" (돈 받고 팖)
    }
  ]);

  // Form states for Dropoff Registration
  const [dropoffFormName, setDropoffFormName] = useState("");
  const [dropoffFormAddress, setDropoffFormAddress] = useState("");
  const [dropoffFormManagers, setDropoffFormManagers] = useState("");
  const [dropoffFormSoilTypes, setDropoffFormSoilTypes] = useState<string[]>(["일반 토사"]);
  const [dropoffFormCapacity, setDropoffFormCapacity] = useState("");
  const [dropoffFormSoilDealType, setDropoffFormSoilDealType] = useState<"buy" | "sell">("sell");


  if (!user) return null;

  const handleApproveDriver = (id: number) => {
    setDrivers(prev =>
      prev.map(d => d.id === id ? { ...d, status: "승인됨" } : d)
    );
  };

  const handleApproveOwner = (id: number) => {
    setOwners(prev =>
      prev.map(o => o.id === id ? { ...o, status: "승인됨" } : o)
    );
  };

  const handleApproveSite = (id: number) => {
    setSites(prev =>
      prev.map(s => s.id === id ? { ...s, status: "승인됨", code: `GD-${id}-DUMP` } : s)
    );
  };

  const handleApproveDropoff = (id: number) => {
    setDropoffSites(prev =>
      prev.map(site => site.id === id ? { ...site, status: "승인됨" } : site)
    );
  };

  const handleResolveDispute = (id: number) => {
    setDisputes(prev =>
      prev.map(d => d.id === id ? { ...d, status: "해결됨" } : d)
    );
  };

  const handleVerifyInbound = (id: number) => {
    setInboundTrucks(prev =>
      prev.map(t => t.id === id ? { ...t, status: "반입 완료" } : t)
    );
    setDropoffVerifiedCount(prev => prev + 1);
  };

  const handleToggleMenuAllowed = (id: number) => {
    setDeveloperMenus(prev =>
      prev.map(m => m.id === id ? { ...m, allowed: !m.allowed } : m)
    );
  };

  // 1. 플랫폼 관리자 대시보드 렌더링 함수
  const renderPlatformAdmin = (): React.ReactNode => {
    const estimatedFeePerTrip = Math.round(baseTariff * (commissionRate / 100));
    const estimatedDriverRevenue = baseTariff - estimatedFeePerTrip;

    // 1. [플랫폼 대시보드] 메인 화면
    if (activePath === "/admin") {
      return (
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
                    <p className="text-xs text-slate-500 mt-1">실시간 배차 트럭 위경도 데이터 수신 상태 정상 (1.2s 주기)</p>
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
                      <p className="text-[11px] text-slate-600 mt-1">{d.desc}</p>
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
      );
    }

    // 2. [기사 가입 승인] 전용 독립 화면 (인터랙티브 스플릿 서류 프리뷰어 탑재)
    if (activePath === "/admin/approve-driver") {
      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                기사 가입 승인 검증 본부
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Split-Screen 심사역</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">기사님이 등록하신 텍스트 입력 정보와 제출 서류(1종 대형면허증)의 실물 정보를 인브라우저 대조기로 검증합니다.</p>
            </div>
            <button
              onClick={() => { setActivePath("/admin"); setSelectedDriverForVerify(null); }}
              className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
            >
              ← 대시보드로 돌아가기
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Side: Applicants List (2 columns) */}
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
                          <div className="text-[11px] text-slate-500">연락처: {drv.phone}</div>
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

            {/* Right Side: Document Verification Console (3 columns) */}
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
                        <p className="text-[10px] text-slate-500 font-mono">
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

                  {/* Document Zoom / Rotate View Container with Drag to Pan */}
                  <div
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isDragging ? "grabbing" : "grab" }}
                    className="flex-1 min-h-[280px] bg-slate-200/60 rounded-xl border border-slate-300 relative flex items-center justify-center overflow-hidden select-none"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-40 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

                    {uploadedFiles[`driver_${selectedDriverForVerify.id}_${selectedDocTab}`] ? (
                      /* Actual Uploaded Image Preview */
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
                      /* Mock Korean Driver's License Card */
                      <div
                        style={{
                          transform: `translate(${panX}px, ${panY}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: isDragging ? "none" : "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-gradient-to-br from-amber-50 to-slate-100 border border-slate-350 p-3 shadow-2xl flex flex-col justify-between text-[9px] font-sans relative flex-shrink-0"
                      >
                        {/* Card Header */}
                        <div className="flex justify-between items-start border-b border-slate-300 pb-1">
                          <span className="font-black text-slate-700 tracking-wider">자동차운전면허증</span>
                          <span className="text-[7px] text-slate-400 font-bold font-mono">12-34-567890-12</span>
                        </div>

                        {/* Card Contents */}
                        <div className="flex gap-2.5 items-center my-2">
                          {/* Driver Photo Placeholder */}
                          <div className="w-14 h-18 rounded bg-slate-300/80 border border-slate-400/50 flex flex-col items-center justify-center flex-shrink-0 text-slate-500 text-[6px]">
                            <span className="font-bold">심사 사진</span>
                            <span className="mt-0.5 tracking-tight font-mono">{selectedDriverForVerify.name[0]}등급</span>
                          </div>

                          {/* Driver text meta */}
                          <div className="space-y-1 flex-1 text-slate-700 font-semibold leading-normal">
                            <div>성 명: <strong className="text-slate-900 font-extrabold">{selectedDriverForVerify.name}</strong></div>
                            <div>주 민 번 호: 750101-1******</div>
                            <div>주 소: 인천광역시 서구 검단로 102</div>
                            <div className="text-blue-600 font-extrabold mt-1">면허조건: 1종 대형</div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="flex justify-between items-center text-[7px] text-slate-500 border-t border-slate-200 pt-1">
                          <span>발행일: 2024. 05. 27</span>
                          <span className="font-bold text-slate-600">인천광역시경찰청장 [인]</span>
                        </div>
                      </div>
                    ) : (
                      /* Mock Cargo Carrier Certificate Card */
                      <div
                        style={{
                          transform: `translate(${panX}px, ${panY}px) scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: isDragging ? "none" : "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 p-3 shadow-2xl flex flex-col justify-between text-[9px] font-sans relative flex-shrink-0 text-slate-300"
                      >
                        {/* Card Header */}
                        <div className="flex justify-between items-start border-b border-slate-700 pb-1">
                          <span className="font-black text-amber-400 tracking-wider">화물운송종사자 자격증</span>
                          <span className="text-[7px] text-slate-400 font-bold font-mono">제 14-02-98421호</span>
                        </div>

                        {/* Card Contents */}
                        <div className="flex gap-2.5 items-center my-2">
                          {/* Driver Photo Placeholder */}
                          <div className="w-14 h-18 rounded bg-slate-700/80 border border-slate-600/50 flex flex-col items-center justify-center flex-shrink-0 text-slate-450 text-[6px]">
                            <span className="font-bold text-amber-500">인증 사진</span>
                            <span className="mt-0.5 tracking-tight font-mono">{selectedDriverForVerify.name[0]}등급</span>
                          </div>

                          {/* Driver text meta */}
                          <div className="space-y-1 flex-1 text-slate-350 font-semibold leading-normal">
                            <div>성 명: <strong className="text-white font-extrabold">{selectedDriverForVerify.name}</strong></div>
                            <div>자 격 명 칭: 화물운송종사 자격</div>
                            <div>인 증 기 관: 한국교통안전공단</div>
                            <div className="text-amber-400 font-extrabold mt-1">자격등급: 대형 화물 수송</div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="flex justify-between items-center text-[7px] text-slate-500 border-t border-slate-700 pt-1">
                          <span>취득일자: 2025. 08. 12</span>
                          <span className="font-bold text-slate-400">한국교통안전공단이사장 [인]</span>
                        </div>
                      </div>
                    )}

                    {/* Interactive Zoom / Rotate Controls Overlay */}
                    <div className="absolute bottom-3 right-3 flex gap-1 z-20">
                      <button
                        onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="확대 (Zoom In)"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="축소 (Zoom Out)"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="서류 회전 (Rotate)"
                      >
                        ↻
                      </button>
                      <button
                        onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); setPanX(0); setPanY(0); }}
                        className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-600 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                        title="초기화"
                      >
                        리셋
                      </button>
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        alert(`${selectedDriverForVerify.name} 기사님의 서류가 반려 처리되었으며, 반려 사유(사진 식별 불가) SMS가 즉시 발송되었습니다.`);
                        setSelectedDriverForVerify(null);
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
      );
    }

    // 3. [차주/운송사 승인] 전용 독립 화면 (인터랙티브 스플릿 서류 프리뷰어 탑재)
    if (activePath === "/admin/approve-owner") {
      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                차주 및 법인 운송사 승인 관리
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Split-Screen 심사역</span>
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
            {/* Left Side: Owner List (2 columns) */}
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
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">왼쪽의 신청 대기 목록에서 차주/운송사를 클릭하시면 제출된 증빙서류의 인브라우저 정밀 검증 화면이 활성화됩니다.</p>
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
                      /* Actual Uploaded Image Preview */
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
                      /* Mock Korean Business Registration Certificate */
                      <div
                        style={{
                          transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-white border-2 border-slate-800 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-serif relative flex-shrink-0 text-slate-900"
                      >
                        {/* Header */}
                        <div className="text-center font-bold text-xs border-b-2 border-double border-slate-900 pb-1 tracking-widest">
                          사 업 자 등 록 증
                        </div>

                        {/* Contents */}
                        <div className="space-y-1 my-1.5 leading-normal">
                          <div className="flex"><span className="w-16 font-bold">등록번호:</span> <span className="font-mono">102-81-98741</span></div>
                          <div className="flex"><span className="w-16 font-bold">상호(법인명):</span> <span>{selectedOwnerForVerify.name}</span></div>
                          <div className="flex"><span className="w-16 font-bold">성명(대표자):</span> <span>홍길동</span></div>
                          <div className="flex"><span className="w-16 font-bold">개업연월일:</span> <span className="font-mono">2020년 06월 02일</span></div>
                          <div className="flex"><span className="w-16 font-bold">사업장소재지:</span> <span>인천광역시 중구 연안부두로 24</span></div>
                          <div className="flex"><span className="w-16 font-bold">비즈니스형태:</span> <span>덤프 토사 중기 운송업 (종목: 건설기계)</span></div>
                        </div>

                        {/* Footer */}
                        <div className="text-center border-t border-slate-900 pt-1 font-bold text-[7px]">
                          2026년 06월 02일 <br />
                          <span className="text-[8px] tracking-wider">인 천 세 무 서 장 [인]</span>
                        </div>
                      </div>
                    ) : (
                      /* Mock Commercial Insurance Certificate */
                      <div
                        style={{
                          transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-teal-300 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-sans relative flex-shrink-0 text-slate-800"
                      >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-teal-200 pb-1">
                          <span className="font-black text-teal-800 text-xs">영업용 화물 자동차 일괄공제증서</span>
                          <span className="text-[7px] text-teal-600 font-bold font-mono">No. 2026-9871A</span>
                        </div>

                        {/* Contents */}
                        <div className="space-y-1 my-1.5 leading-normal">
                          <div>계 약 자 명 : <strong className="text-teal-900 font-extrabold">{selectedOwnerForVerify.name}</strong></div>
                          <div>가 입 대 상 : {selectedOwnerForVerify.vehicle}</div>
                          <div>담 보 내 용 : 대인배상 I, II / 대물배상 (5억 한도) / 화물적재물배상 (1억)</div>
                          <div>공 제 기 간 : 2026. 01. 01 ~ 2026. 12. 31</div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center text-[7px] text-teal-700 border-t border-teal-200 pt-1">
                          <span>계약처: 전국화물자동차운송사업연합회</span>
                          <span className="font-bold text-teal-800">전국화물공제조합 [인]</span>
                        </div>
                      </div>
                    )}

                    {/* Interactive Zoom / Rotate Controls Overlay */}
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <button
                        onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="확대 (Zoom In)"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="축소 (Zoom Out)"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="서류 회전 (Rotate)"
                      >
                        ↻
                      </button>
                      <button
                        onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); }}
                        className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-600 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                        title="초기화"
                      >
                        리셋
                      </button>
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        alert(`${selectedOwnerForVerify.name} 차주/운송사의 서류가 반려 처리되었으며, 반려 사유 SMS가 즉시 발송되었습니다.`);
                        setSelectedOwnerForVerify(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs active:scale-95 transition-all"
                    >
                      서류 심사 반려
                    </button>
                    <button
                      onClick={() => {
                        handleApproveOwner(selectedOwnerForVerify.id);
                        alert(`${selectedOwnerForVerify.name} 차주/운송사의 실물서류 검증이 완료되어 최종 가입 승인 처리되었습니다!`);
                        setSelectedOwnerForVerify(null);
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
      );
    }

    // 4. [현장 관리자 승인] 전용 독립 화면 (인터랙티브 스플릿 서류 프리뷰어 탑재)
    if (activePath === "/admin/approve-site") {
      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                반출지 건설 현장 승인 및 고유코드 발급
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Split-Screen 심사역</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">건설현장 개설 승인을 위한 비산먼지 배출신고서 및 공사 계약서 실물을 정밀 대조 및 확인합니다.</p>
            </div>
            <button
              onClick={() => { setActivePath("/admin"); setSelectedSiteForVerify(null); }}
              className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
            >
              ← 대시보드로 돌아가기
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Side: Site List */}
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
                          <div className="text-[11px] text-slate-500">원청사: {st.company}</div>
                          <div className="text-[10px] text-blue-600 font-semibold mt-1">임시 정산코드: {st.code}</div>
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
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">왼쪽의 신청 대기 목록에서 반출지 건설 현장을 클릭하시면 제출된 증빙서류의 인브라우저 정밀 검증 화면이 활성화됩니다.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Document Header, Tabs & Upload State */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="text-sm font-black text-slate-800">심사 대상: {selectedSiteForVerify.name}</span>
                      <span className="text-[10px] text-blue-605 font-bold bg-blue-55/20 px-2 py-0.5 rounded border border-blue-200">
                        건설 현장 인허가 서류 검증
                      </span>
                    </div>

                    {/* Document Selector Tabs */}
                    <div className="flex border-b border-slate-200 text-xs">
                      <button
                        onClick={() => { setSelectedSiteDocTab("dust"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                        className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedSiteDocTab === "dust" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        📄 1. 비산먼지 배출신고서
                      </button>
                      <button
                        onClick={() => { setSelectedSiteDocTab("contract"); setVerifyZoom(1.0); setVerifyRotate(0); }}
                        className={`flex-1 py-2 text-center font-bold border-b-2 transition-all ${selectedSiteDocTab === "contract" ? "border-blue-500 text-blue-600 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        📄 2. 공사 계약서
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-sm">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-700">제출된 서류 파일명</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {uploadedFiles[`site_${selectedSiteForVerify.id}_${selectedSiteDocTab}`]
                            ? "사용자 업로드 이미지.png"
                            : selectedSiteDocTab === "dust"
                              ? `dust_report_permit_${selectedSiteForVerify.id}.png (1.2 MB)`
                              : `construction_contract_${selectedSiteForVerify.id}.png (920 KB)`}
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
                          onChange={(e) => handleFileUpload(`site_${selectedSiteForVerify.id}_${selectedSiteDocTab}`, e)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Document Zoom / Rotate View Container */}
                  <div className="flex-1 min-h-[280px] bg-slate-200/60 rounded-xl border border-slate-300 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 opacity-40 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

                    {uploadedFiles[`site_${selectedSiteForVerify.id}_${selectedSiteDocTab}`] ? (
                      /* Actual Uploaded Image Preview */
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
                    ) : selectedSiteDocTab === "dust" ? (
                      /* Mock Korean Fine Dust Certificate */
                      <div
                        style={{
                          transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-amber-50/60 border-2 border-amber-300 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-sans relative flex-shrink-0 text-slate-900"
                      >
                        {/* Header */}
                        <div className="text-center font-bold text-xs border-b border-amber-400 pb-1 text-amber-800">
                          특정공사(비산먼지 배출) 신고필증
                        </div>

                        {/* Contents */}
                        <div className="space-y-1 my-1.5 leading-normal text-[7.5px] text-amber-950">
                          <div>• 현 장 상 호 : {selectedSiteForVerify.name}</div>
                          <div>• 신 고 인 : {selectedSiteForVerify.company} (홍길동)</div>
                          <div>• 공 사 기 간 : 2026. 06. 01 ~ 2028. 06. 01</div>
                          <div>• 비산방지대책: 게이트 세륜기 가동 및 가설 방음벽 설치 조건</div>
                        </div>

                        {/* Footer */}
                        <div className="text-center border-t border-amber-300 pt-1 font-bold text-[7px] text-amber-800">
                          인 천 광 역 시 서 구 청 장 [인]
                        </div>
                      </div>
                    ) : (
                      /* Mock Construction Contract */
                      <div
                        style={{
                          transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-white border border-slate-800 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-serif relative flex-shrink-0 text-slate-800"
                      >
                        {/* Header */}
                        <div className="text-center font-bold text-xs border-b-2 border-double border-slate-900 pb-1">
                          민간건설공사 표준도급계약서
                        </div>

                        {/* Contents */}
                        <div className="space-y-1 my-1.5 leading-normal text-[7px]">
                          <div>• 발 주 자 (갑) : {selectedSiteForVerify.company}</div>
                          <div>• 수 급 인 (을) : 덤프링 종합운송 (주)</div>
                          <div>• 공 사 명 칭 : {selectedSiteForVerify.name} 토사 반출 수송</div>
                          <div>• 도 급 금 액 : 일금 일천구백만원정 (₩19,000,000)</div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center text-[7px] text-slate-500 border-t border-slate-300 pt-1">
                          <span>계약체결일: 2026. 05. 28</span>
                          <span className="font-bold text-slate-900">상호 서명 날인 [인]</span>
                        </div>
                      </div>
                    )}

                    {/* Interactive Zoom / Rotate Controls Overlay */}
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <button
                        onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="확대 (Zoom In)"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="축소 (Zoom Out)"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="서류 회전 (Rotate)"
                      >
                        ↻
                      </button>
                      <button
                        onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); }}
                        className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-600 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                        title="초기화"
                      >
                        리셋
                      </button>
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        alert(`${selectedSiteForVerify.name} 현장의 서류가 반려 처리되었으며, 반려 사유 SMS가 즉시 발송되었습니다.`);
                        setSelectedSiteForVerify(null);
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
      );
    }

    // 5. [하차지 승인 관리] 전용 독립 화면 (인터랙티브 스플릿 서류 프리뷰어 탑재)
    if (activePath === "/admin/approve-dropoff") {
      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                하차지 및 사토 매립장 승인 관리
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Split-Screen 심사역</span>
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
            {/* Left Side: Dropoff Site List (2 columns) */}
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

            {/* Right Side: Document Verification Console (3 columns) */}
            <div className="lg:col-span-3 border border-slate-200 rounded-2xl bg-slate-50/40 p-5 flex flex-col justify-between min-h-[500px] shadow-inner">
              {!selectedDropoffForVerify ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="p-4 rounded-full bg-slate-100 border border-slate-200">
                    <FileCheck className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">실물 서류 대조 검수</h3>
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
                        <p className="text-[10px] text-slate-500 font-mono">
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
                      /* Actual Uploaded Image Preview */
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
                      /* Mock Korean Development Permit Certificate */
                      <div
                        style={{
                          transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-gradient-to-br from-green-50/80 to-emerald-50 border-2 border-emerald-450 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-sans relative flex-shrink-0 text-slate-900"
                      >
                        {/* Header */}
                        <div className="text-center font-bold text-xs border-b border-emerald-400 pb-1 text-emerald-800">
                          개 발 행 위 허 가 필 증
                        </div>

                        {/* Contents */}
                        <div className="space-y-1 my-1.5 leading-normal text-[7.5px] text-emerald-950">
                          <div>• 허 가 번 호 : 제 2026-개발-0842호</div>
                          <div>• 상호(법인명): {selectedDropoffForVerify.company}</div>
                          <div>• 허 가 대 상 : {selectedDropoffForVerify.name}</div>
                          <div>• 매립 한도 용량 : {selectedDropoffForVerify.capacity}</div>
                          <div>• 허 가 기 간 : 2026. 06. 01 ~ 2029. 05. 31</div>
                        </div>

                        {/* Footer */}
                        <div className="text-center border-t border-emerald-300 pt-1 font-bold text-[7px] text-emerald-800">
                          인 천 광 역 시 서 구 청 장 [인]
                        </div>
                      </div>
                    ) : (
                      /* Mock Land Use Consent */
                      <div
                        style={{
                          transform: `scale(${verifyZoom}) rotate(${verifyRotate}deg)`,
                          transition: "transform 0.15s ease"
                        }}
                        className="w-72 h-44 rounded-xl bg-white border border-slate-800 p-3 shadow-2xl flex flex-col justify-between text-[8px] font-serif relative flex-shrink-0 text-slate-800"
                      >
                        {/* Header */}
                        <div className="text-center font-bold text-xs border-b-2 border-double border-slate-900 pb-1">
                          토 지 사 용 승 낙 서
                        </div>

                        {/* Contents */}
                        <div className="space-y-1 my-1.5 leading-normal text-[7px]">
                          <div>• 토지소유자(위임인): 김종식 (인천 연희동 204-1)</div>
                          <div>• 피 승 낙 자 : {selectedDropoffForVerify.company}</div>
                          <div>• 승낙토지소재지: {selectedDropoffForVerify.name}</div>
                          <div>• 승 낙 기 간 : 2026. 06. 01 ~ 2029. 06. 01</div>
                          <div>• 승 낙 용 도 : 덤프 매립장(사토장) 개설 및 운영 목적</div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center text-[7px] text-slate-500 border-t border-slate-300 pt-1">
                          <span>작성일자: 2026. 05. 30</span>
                          <span className="font-bold text-slate-900">당사자 기명 날인 [인]</span>
                        </div>
                      </div>
                    )}

                    {/* Interactive Zoom / Rotate Controls Overlay */}
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <button
                        onClick={() => setVerifyZoom(prev => Math.min(2.0, prev + 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="확대 (Zoom In)"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setVerifyZoom(prev => Math.max(0.6, prev - 0.1))}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="축소 (Zoom Out)"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setVerifyRotate(prev => (prev + 90) % 360)}
                        className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow shadow-slate-400/10 active:scale-95 transition-all text-xs"
                        title="서류 회전 (Rotate)"
                      >
                        ↻
                      </button>
                      <button
                        onClick={() => { setVerifyZoom(1.0); setVerifyRotate(0); }}
                        className="px-2 h-7 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-600 shadow shadow-slate-400/10 active:scale-95 transition-all text-[9px]"
                        title="초기화"
                      >
                        리셋
                      </button>
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        alert(`${selectedDropoffForVerify.name} 하차지의 서류가 반려 처리되었으며, 반려 사유 SMS가 즉시 발송되었습니다.`);
                        setSelectedDropoffForVerify(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs active:scale-95 transition-all"
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
      );
    }

    // 6. [운임 및 수수료 설정] 전용 독립 화면 (공통코드 기반 톤수별 운임 관리 본부)
    if (activePath === "/admin/fees") {
      const selectedTonnageData = tonnages.find(t => t.code === simSelectedTonnage) || tonnages[1];
      const simFee = Math.round(selectedTonnageData.baseTariff * (commissionRate / 100));
      const simDriverRevenue = selectedTonnageData.baseTariff - simFee;

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
              <p className="text-xs text-slate-500 mt-1">시스템 공통코드로 매핑된 트럭 톤수(Tonnage)별로 기본 운반 단가를 분할 제어하고, 수수료를 실시간 통합 관리합니다.</p>
            </div>
            <button
              onClick={() => setActivePath("/admin")}
              className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
            >
              ← 대시보드로 돌아가기
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left & Middle: Tonnage Common Codes Tariffs Table & Sliders (2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">1. 등록된 톤수별 공통코드 및 단가 조율</h3>
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

                      {/* Range slider per tonnage with solid visible background track */}
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

            {/* Right: Meter Pricing Policy Settings (1 column) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">2. 실시간 미터기 요금 계산 방식 설정</h3>
                  <p className="text-[11px] text-slate-500 mt-1">관리자 선택에 따라 기사 앱 미터기 계산 공식이 무선으로 실시간 스위칭됩니다.</p>
                </div>

                {/* Calculation Method Radio Group */}
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

                {/* Unit Fares Inputs */}
                <div className="space-y-4 pt-2 border-t border-slate-200/60">
                  <label className="text-xs font-bold text-slate-700 block">방식별 요금 가산 단가 세부 설정</label>

                  {/* Continuous Fare inputs */}
                  <div className={`p-3 rounded-xl border space-y-3 transition-opacity ${calcMethod === "CONTINUOUS" ? "bg-white border-blue-200 opacity-100" : "bg-slate-100/50 border-slate-200 opacity-60"}`}>
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-600">
                      <span>연속 누적: 거리 단가 (원/km)</span>
                      <input
                        type="number"
                        disabled={calcMethod !== "CONTINUOUS"}
                        value={continuousDistanceFare}
                        onChange={(e) => setContinuousDistanceFare(Number(e.target.value))}
                        className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-600">
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

                  {/* Over Plan Fare inputs */}
                  <div className={`p-3 rounded-xl border space-y-3 transition-opacity ${calcMethod === "OVER_PLAN" ? "bg-white border-blue-200 opacity-100" : "bg-slate-100/50 border-slate-200 opacity-60"}`}>
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-600">
                      <span>계획 초과: 거리 단가 (원/km)</span>
                      <input
                        type="number"
                        disabled={calcMethod !== "OVER_PLAN"}
                        value={overPlanDistanceFare}
                        onChange={(e) => setOverPlanDistanceFare(Number(e.target.value))}
                        className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-600">
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

                {/* Save Button */}
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
                  🖥️ 정산 요금 정책 저장 및 실시간 적용
                </button>

                {policySaveSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[10.5px] font-bold text-center animate-pulse">
                    ✅ 요금 정책이 공통코드 시스템에 실시간 전파되었습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 8. [고객지원 & 게시판 관리] 전용 독립 화면 (자주 묻는 질문 FAQ 본부 통합)
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
        alert("새로운 자주 묻는 질문(FAQ)이 등록되었습니다!");
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
        alert("신규 공지사항이 성공적으로 등록 및 전사(앱 푸시) 발송되었습니다!");
      };

      const handleDeleteNotice = (id: number) => {
        if (confirm("해당 공지사항을 삭제하시겠습니까?")) {
          setNotices(prev => prev.filter(n => n.id !== id));
        }
      };

      const handleAnswerInquiry = (id: number) => {
        const replyText = replyTexts[id];
        if (!replyText || !replyText.trim()) {
          alert("답변 내용을 입력해주세요.");
          return;
        }
        setInquiries(prev => prev.map(inq => {
          if (inq.id === id) {
            return { ...inq, status: "답변 완료", reply: replyText };
          }
          return inq;
        }));
        alert("1:1 상담 문의 답변이 성공적으로 등록되었으며, 해당 회원에게 모바일 알림이 발송되었습니다!");
      };

      const handleDeleteInquiry = (id: number) => {
        if (confirm("해당 1:1 문의를 영구 삭제하시겠습니까?")) {
          setInquiries(prev => prev.filter(i => i.id !== id));
        }
      };

      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                통합 고객 소통 및 게시판 관리
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-bold">고객지원 본부</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">사용자 민원 처리, 전사 공지 전송 및 대고객 FAQ(자주 묻는 질문) 데이터베이스를 통합 운영합니다.</p>
            </div>
            <button
              onClick={() => setActivePath("/admin")}
              className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
            >
              ← 대시보드로 돌아가기
            </button>
          </div>

          {/* Interactive Sub-Tab Menu */}
          <div className="flex border-b border-slate-200 bg-slate-50 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBoardActiveTab("inquiry")}
              className={`flex-1 py-2.5 rounded-lg text-center text-xs font-black transition-all flex items-center justify-center gap-1.5 ${boardActiveTab === "inquiry"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              💬 1:1 상담 문의 관리
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${inquiries.filter(i => i.status === "대기 중").length > 0
                  ? "bg-amber-100 text-amber-700 animate-pulse"
                  : "bg-slate-200 text-slate-500"
                }`}>
                {inquiries.filter(i => i.status === "대기 중").length}건 대기
              </span>
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
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              💡 FAQ 질문 본부
            </button>
          </div>

          {/* TAB 1: 1:1 상담 문의 관리 */}
          {boardActiveTab === "inquiry" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    📥 회원 1:1 상담 민원 처리 센터
                  </h3>
                  <p className="text-[11px] text-slate-500">덤프링 플랫폼 드라이버, 현장관리자, 하차지 운영자의 1:1 문의사항 리스트입니다.</p>
                </div>
                {/* Status Filter */}
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

              {/* Inquiry list container */}
              <div className="space-y-3">
                {filteredInquiries.length === 0 ? (
                  <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-400">
                    조회된 조건에 해당하는 1:1 상담 문의가 존재하지 않습니다.
                  </div>
                ) : (
                  filteredInquiries.map(inq => {
                    const isExpanded = expandedInquiryId === inq.id;
                    const isUnanswered = inq.status === "대기 중";
                    return (
                      <div
                        key={inq.id}
                        className={`rounded-2xl border transition-all ${isExpanded
                            ? "border-blue-300 bg-blue-50/5 shadow-md"
                            : "border-slate-200 hover:border-slate-350 bg-white"
                          }`}
                      >
                        {/* Header Row */}
                        <div
                          onClick={() => setExpandedInquiryId(isExpanded ? null : inq.id)}
                          className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${isUnanswered
                                  ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                }`}>
                                {inq.status}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{inq.date}</span>
                              <span className="text-[10px] text-slate-500 font-bold">| {inq.author}</span>
                            </div>
                            <h4 className="font-extrabold text-xs text-slate-800 mt-1">
                              {inq.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteInquiry(inq.id); }}
                              className="px-2 py-1 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-lg transition-colors"
                            >
                              문의 삭제
                            </button>
                            <span className="text-slate-400 font-bold text-xs">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </div>
                        </div>

                        {/* Expanded details & dynamic reply panel */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 bg-slate-50/40 text-xs space-y-4 animate-fadeIn">
                            {/* Question Details */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">문의 원문 내용</span>
                              <p className="p-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 leading-relaxed">
                                {inq.content}
                              </p>
                            </div>

                            {/* Reply Input or Static Display */}
                            {isUnanswered ? (
                              <div className="space-y-2 border-t border-dashed border-slate-200 pt-3.5">
                                <label className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                  ✏️ 공식 관리자 답변 작성 및 발송
                                </label>
                                <textarea
                                  rows={3}
                                  value={replyTexts[inq.id] || ""}
                                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [inq.id]: e.target.value }))}
                                  placeholder="회원님께 발송될 공식 시스템 답변을 정밀하게 작성하세요. 전송 시 푸시 알림 및 SMS로 즉시 연동 피드백됩니다."
                                  className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 font-medium"
                                />
                                <button
                                  onClick={() => handleAnswerInquiry(inq.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 self-end"
                                >
                                  답변 전송 및 처리 완료
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2 border-t border-dashed border-slate-200 pt-3.5">
                                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                                  ✓ 등록된 공식 답변 정보
                                </span>
                                <div className="p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-xl flex gap-2 leading-relaxed">
                                  <span className="font-black text-emerald-600 text-sm font-sans flex-shrink-0">A.</span>
                                  <div className="space-y-2 flex-1">
                                    <p className="font-semibold text-slate-700">{inq.reply}</p>
                                    <span className="text-[9px] text-slate-400 font-mono block">답변 일시: {inq.date} (발송 완료)</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setReplyTexts(prev => ({ ...prev, [inq.id]: inq.reply }));
                                    setInquiries(prev => prev.map(i => i.id === inq.id ? { ...i, status: "대기 중" } : i));
                                  }}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-extrabold text-[10px] rounded-lg border border-slate-250 transition-colors"
                                >
                                  답변 재수정하기
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 공지사항 관리 */}
          {boardActiveTab === "notice" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Notice Registration Form (2 cols) */}
                <form
                  onSubmit={handleAddNotice}
                  className="lg:col-span-2 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Announcement Publisher</h3>
                      <h4 className="text-sm font-black text-slate-800 mt-0.5">📢 신규 전사 공지사항 작성</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">플랫폼의 각 회원 모바일 앱 메인 또는 전체 알림판에 노출될 안내를 게시합니다.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-600">공지 제목</label>
                      <input
                        type="text"
                        value={newNoticeTitle}
                        onChange={(e) => setNewNoticeTitle(e.target.value)}
                        placeholder="예: [중요] 추석 연휴 기간 플랫폼 수임 정산 일정 공지"
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-600">수신 대상 그룹 (Target)</label>
                      <select
                        value={newNoticeTarget}
                        onChange={(e) => setNewNoticeTarget(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="전체">전체 회원 (드라이버/차주/현장/하차지)</option>
                        <option value="기사">드라이버 & 차주 (운송 주체)</option>
                        <option value="현장관리자">B2B 공사현장 관리자</option>
                        <option value="하차지">사토장/매립지 운영사</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-600">공지 상세 내용</label>
                      <textarea
                        rows={5}
                        value={newNoticeContent}
                        onChange={(e) => setNewNoticeContent(e.target.value)}
                        placeholder="공지할 핵심 세부 세칙 사항 및 안내 가이드라인을 상세히 작성해 주세요."
                        className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 mt-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                  >
                    공지사항 등록 및 모바일 푸시 발송
                  </button>
                </form>

                {/* Published Notice List (3 cols) */}
                <div className="lg:col-span-3 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">📋 등록된 전사 공지사항 목록 ({notices.length}건)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">현재 데이터베이스에 적재되어 회원 모바일에 노출 중인 공지 목록입니다.</p>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {notices.map(notice => (
                      <div
                        key={notice.id}
                        className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 hover:bg-slate-50 transition-colors space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-150">
                                {notice.target} 대상
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">{notice.date}</span>
                            </div>
                            <h5 className="font-extrabold text-slate-850 text-xs mt-1">
                              {notice.title}
                            </h5>
                          </div>
                          <button
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="px-2 py-1 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-lg transition-colors flex-shrink-0"
                          >
                            공지 삭제
                          </button>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap p-2.5 bg-white border border-slate-150 rounded-lg">
                          {notice.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FAQ 자주 묻는 질문 관리 */}
          {boardActiveTab === "faq" && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/30 shadow-md space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3.5">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-slate-800">💡 대고객 자주 묻는 질문 (FAQ) 관리 본부</h3>
                  <p className="text-[11px] text-slate-500">모바일 앱 및 웹 사용자 지원센터 FAQ 게시판에 노출될 질문과 답변을 조율합니다.</p>
                </div>
                <button
                  onClick={handleAddFaq}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10 self-start sm:self-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  신규 FAQ 질문 등록
                </button>
              </div>

              {/* FAQ Category Filters */}
              <div className="flex flex-wrap gap-1.5">
                {["전체", "공통", "기사", "현장관리자", "하차지"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setFaqCategoryFilter(cat); setExpandedFaqId(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${faqCategoryFilter === cat
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* FAQs Accordion List */}
              <div className="space-y-2.5">
                {filteredFaqs.length === 0 ? (
                  <div className="text-center p-8 text-xs text-slate-450 bg-white rounded-xl border border-slate-200 font-semibold">
                    선택하신 카테고리에 해당하는 등록된 FAQ가 존재하지 않습니다.
                  </div>
                ) : (
                  filteredFaqs.map(faq => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all"
                      >
                        <div
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-150 text-slate-650 border border-slate-200">
                              {faq.category}
                            </span>
                            <span className="font-extrabold text-slate-805 text-xs">{faq.q}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFaq(faq.id); }}
                              className="px-2 py-0.5 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded transition-colors"
                            >
                              삭제
                            </button>
                            <span className={`text-slate-405 font-bold transform transition-transform text-[10px] ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/50 border-t border-slate-150 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 9. [전체 현장 지도] 실시간 위성/GPS 관제 화면
    if (activePath === "/admin/sites") {
      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                전국 가동 덤프 트럭 실시간 위성/GPS 관제
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold animate-pulse">Live GPS</span>
              </h2>
              <p className="text-xs text-slate-505 mt-1">현장에서 지정 매립지로 반출 운반되는 덤프 트럭들의 위치 정보를 1초 주기로 연산 추적합니다.</p>
            </div>
            <button onClick={() => setActivePath("/admin")} className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all">
              ← 대시보드로 돌아가기
            </button>
          </div>
          <div className="h-[550px] rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-white/5 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              <MapPin className="w-12 h-12 text-blue-500 animate-bounce mb-3" />
              <p className="text-base font-extrabold text-slate-100">초고정밀 GPS 통합 차량 관제 시스템 가동 중</p>
              <p className="text-xs text-slate-400 mt-2">인천 검단 3공구 반출지 노선 및 김포 고촌 하차지 등의 위성 맵 타일 렌더링 정상 완료.</p>
            </div>
          </div>
        </div>
      );
    }

    // 10. [통합 이용자 관리] 전용 독립 화면
    if (activePath === "/admin/users") {
      // Filtering logic
      const filteredDrivers = drivers.filter(d =>
        d.name.includes(userSearchQuery) || d.phone.includes(userSearchQuery) || (d.license && d.license.includes(userSearchQuery))
      );
      const filteredOwners = owners.filter(o =>
        o.name.includes(userSearchQuery) || o.phone.includes(userSearchQuery) || (o.vehicle && o.vehicle.includes(userSearchQuery))
      );
      const filteredSites = sites.filter(s =>
        s.name.includes(userSearchQuery) || s.phone.includes(userSearchQuery) || s.company.includes(userSearchQuery) || (s.bizRegNo && s.bizRegNo.includes(userSearchQuery))
      );
      const filteredDropoffs = dropoffSites.filter(d =>
        d.name.includes(userSearchQuery) || d.phone.includes(userSearchQuery) || d.company.includes(userSearchQuery) || (d.bizRegNo && d.bizRegNo.includes(userSearchQuery))
      );

      const handleAddUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newId = Date.now();
        if (userTab === "driver") {
          setDrivers(prev => [...prev, { id: newId, name: userFormName, phone: userFormPhone, license: userFormExtra1 || "1종대형면허", status: userFormStatus }]);
        } else if (userTab === "owner") {
          setOwners(prev => [...prev, { id: newId, name: userFormName, phone: userFormPhone, vehicle: userFormExtra1 || "25.5톤 덤프", status: userFormStatus }]);
        } else if (userTab === "site") {
          setSites(prev => [...prev, {
            id: newId,
            company: userFormExtra1 || "신규 B2B 건설사",
            name: userFormName,
            phone: userFormPhone,
            bizRegNo: userFormExtra2 || "000-00-00000",
            status: userFormStatus,
            registeredSites: []
          }]);
        } else if (userTab === "dropoff") {
          setDropoffSites(prev => [...prev, {
            id: newId,
            company: userFormExtra1 || "신규 하차업체",
            name: userFormName,
            phone: userFormPhone,
            bizRegNo: userFormExtra2 || "000-00-00000",
            status: userFormStatus,
            capacity: "10,000 ㎥",
            registeredLandfills: []
          }]);
        }
        setIsAddUserModalOpen(false);
        alert("신규 이용자(대리 가입) 등록이 완료되었습니다.");
        setUserFormName("");
        setUserFormPhone("");
        setUserFormExtra1("");
        setUserFormExtra2("");
      };

      const handleEditUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (userTab === "driver") {
          setDrivers(prev => prev.map(d => d.id === editingUser.id ? { ...d, name: userFormName, phone: userFormPhone, license: userFormExtra1, status: userFormStatus } : d));
        } else if (userTab === "owner") {
          setOwners(prev => prev.map(o => o.id === editingUser.id ? { ...o, name: userFormName, phone: userFormPhone, vehicle: userFormExtra1, status: userFormStatus } : o));
        } else if (userTab === "site") {
          setSites(prev => prev.map(s => s.id === editingUser.id ? { ...s, name: userFormName, company: userFormExtra1, bizRegNo: userFormExtra2, status: userFormStatus, phone: userFormPhone } : s));
        } else if (userTab === "dropoff") {
          setDropoffSites(prev => prev.map(site => site.id === editingUser.id ? { ...site, name: userFormName, company: userFormExtra1, bizRegNo: userFormExtra2, status: userFormStatus, phone: userFormPhone } : site));
        }
        setEditingUser(null);
        alert("이용자 정보 수정이 저장되었습니다.");
        setUserFormName("");
        setUserFormPhone("");
        setUserFormExtra1("");
        setUserFormExtra2("");
      };

      const openEditModal = (u: any) => {
        setEditingUser(u);
        setUserFormName(u.name || "");
        setUserFormPhone(u.phone || "");
        setUserFormStatus(u.status || "승인됨");
        if (userTab === "driver") {
          setUserFormExtra1(u.license || "");
          setUserFormExtra2("");
        } else if (userTab === "owner") {
          setUserFormExtra1(u.vehicle || "");
          setUserFormExtra2("");
        } else if (userTab === "site") {
          setUserFormExtra1(u.company || "");
          setUserFormExtra2(u.bizRegNo || "");
        } else if (userTab === "dropoff") {
          setUserFormExtra1(u.company || "");
          setUserFormExtra2(u.bizRegNo || "");
        }
      };

      const openAddModal = () => {
        setUserFormName("");
        setUserFormPhone("");
        setUserFormExtra1("");
        setUserFormExtra2("");
        setUserFormStatus("승인됨");
        setIsAddUserModalOpen(true);
      };

      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                통합 이용자 관리 콘솔
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">마스터 전용</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">이용자 정보 조회, 상세 검색, 대리 가입 및 가입 정보 수정이 가능한 통합 관리 시스템입니다.</p>
            </div>
            <button
              onClick={() => setActivePath("/admin")}
              className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all"
            >
              ← 대시보드로 돌아가기
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 text-xs font-bold gap-2">
            {[
              { id: "driver", label: "기사", count: drivers.length },
              { id: "owner", label: "차주/운송사", count: owners.length },
              { id: "site", label: "현장 관리자", count: sites.length },
              { id: "dropoff", label: "하차지 관리자", count: dropoffSites.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setUserTab(tab.id as any); setUserSearchQuery(""); }}
                className={`py-2 px-4 border-b-2 transition-all ${userTab === tab.id
                    ? "border-blue-500 text-blue-600 font-black"
                    : "border-transparent text-slate-505 hover:text-slate-700"
                  }`}
              >
                {tab.label} ({tab.count}명)
              </button>
            ))}
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="이름, 연락처, 상세 정보 검색..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-550 font-semibold text-slate-800"
              />
            </div>
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              신규 대리 가입 등록
            </button>
          </div>

          {/* User Table List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left text-slate-705 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-505 font-bold text-[11px]">
                  {userTab === "driver" && (
                    <>
                      <th className="p-3 pl-4">이름</th>
                      <th className="p-3">연락처</th>
                      <th className="p-3">면허/자격 정보</th>
                    </>
                  )}
                  {userTab === "owner" && (
                    <>
                      <th className="p-3 pl-4">이름</th>
                      <th className="p-3">연락처</th>
                      <th className="p-3">소속 차량/운송사 정보</th>
                    </>
                  )}
                  {userTab === "site" && (
                    <>
                      <th className="p-3 pl-4">기업명</th>
                      <th className="p-3">기업담당자(PIC)</th>
                      <th className="p-3">연락처</th>
                      <th className="p-3">사업자등록번호</th>
                      <th className="p-3">등록된 현장 목록</th>
                    </>
                  )}
                  {userTab === "dropoff" && (
                    <>
                      <th className="p-3 pl-4">하차 운영사</th>
                      <th className="p-3">총괄 소장</th>
                      <th className="p-3">연락처</th>
                      <th className="p-3">사업자등록번호</th>
                      <th className="p-3">등록된 하차지/매립지</th>
                    </>
                  )}
                  <th className="p-3">상태</th>
                  <th className="p-3 text-right pr-4 font-bold">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {/* Driver List */}
                {userTab === "driver" && filteredDrivers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-4 font-black text-slate-800">{d.name}</td>
                    <td className="p-3 font-mono text-slate-505">{d.phone}</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-650 font-bold">{d.license}</span></td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${d.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>{d.status}</span>
                    </td>
                    <td className="p-3 text-right pr-4 space-x-1.5">
                      <button onClick={() => openEditModal(d)} className="px-2.5 py-1 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 font-bold rounded-lg transition-all">수정</button>
                      <button onClick={() => setViewingUserDetails(d)} className="px-2.5 py-1 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 font-bold rounded-lg transition-all">상세</button>
                    </td>
                  </tr>
                ))}

                {/* Owner List */}
                {userTab === "owner" && filteredOwners.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-4 font-black text-slate-800">{o.name}</td>
                    <td className="p-3 font-mono text-slate-505">{o.phone}</td>
                    <td className="p-3 font-semibold text-slate-660">{o.vehicle}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${o.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>{o.status}</span>
                    </td>
                    <td className="p-3 text-right pr-4 space-x-1.5">
                      <button onClick={() => openEditModal(o)} className="px-2.5 py-1 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 font-bold rounded-lg transition-all">수정</button>
                      <button onClick={() => setViewingUserDetails(o)} className="px-2.5 py-1 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 font-bold rounded-lg transition-all">상세</button>
                    </td>
                  </tr>
                ))}

                {/* Site List */}
                {userTab === "site" && filteredSites.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-4 font-black text-slate-800">{s.company}</td>
                    <td className="p-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="p-3 font-mono text-slate-505">{s.phone}</td>
                    <td className="p-3 font-mono font-bold text-slate-505">{s.bizRegNo}</td>
                    <td className="p-3 font-semibold text-slate-650">
                      <div className="flex flex-wrap gap-1">
                        {s.registeredSites && s.registeredSites.map((site: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-150 rounded text-[10px] font-bold">{site}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${s.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>{s.status}</span>
                    </td>
                    <td className="p-3 text-right pr-4 space-x-1.5">
                      <button onClick={() => openEditModal(s)} className="px-2.5 py-1 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 font-bold rounded-lg transition-all">수정</button>
                      <button onClick={() => setViewingUserDetails(s)} className="px-2.5 py-1 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 font-bold rounded-lg transition-all">상세</button>
                    </td>
                  </tr>
                ))}

                {/* Dropoff List */}
                {userTab === "dropoff" && filteredDropoffs.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-4 font-black text-slate-800">{d.company}</td>
                    <td className="p-3 font-semibold text-slate-800">{d.name}</td>
                    <td className="p-3 font-mono text-slate-505">{d.phone}</td>
                    <td className="p-3 font-mono font-bold text-slate-505">{d.bizRegNo}</td>
                    <td className="p-3 font-semibold text-slate-650">
                      <div className="flex flex-wrap gap-1">
                        {d.registeredLandfills && d.registeredLandfills.map((land: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-650 border border-indigo-150 rounded text-[10px] font-bold">{land}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${d.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>{d.status}</span>
                    </td>
                    <td className="p-3 text-right pr-4 space-x-1.5">
                      <button onClick={() => openEditModal(d)} className="px-2.5 py-1 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 font-bold rounded-lg transition-all">수정</button>
                      <button onClick={() => setViewingUserDetails(d)} className="px-2.5 py-1 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 font-bold rounded-lg transition-all">상세</button>
                    </td>
                  </tr>
                ))}

                {((userTab === "driver" && filteredDrivers.length === 0) ||
                  (userTab === "owner" && filteredOwners.length === 0) ||
                  (userTab === "site" && filteredSites.length === 0) ||
                  (userTab === "dropoff" && filteredDropoffs.length === 0)) && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-455 font-bold">검색 결과에 매칭되는 이용자가 존재하지 않습니다.</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {/* Add User Modal */}
          {isAddUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    신규 {userTab === "driver" && "기사"}
                    {userTab === "owner" && "차주/운송사"}
                    {userTab === "site" && "현장 관리자"}
                    {userTab === "dropoff" && "하차지 관리자"} 대리 가입 등록
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">이용자를 대리하여 플랫폼에 기본 회원 계정을 신규 개설합니다.</p>
                </div>
                <form onSubmit={handleAddUserSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold">성명 / 대표자명</label>
                    <input required type="text" value={userFormName} onChange={e => setUserFormName(e.target.value)} placeholder="예: 홍길동" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold">연락처</label>
                    <input required type="text" value={userFormPhone} onChange={e => setUserFormPhone(e.target.value)} placeholder="예: 010-1234-5678" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {userTab === "driver" && (
                    <div className="space-y-1">
                      <label className="text-slate-600 font-bold">면허 종류</label>
                      <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} placeholder="예: 1종대형면허" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  {userTab === "owner" && (
                    <div className="space-y-1">
                      <label className="text-slate-600 font-bold">소속 차량 정보</label>
                      <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} placeholder="예: 인천 80바 4531 (25.5톤)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  {userTab === "site" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">원청 건설사명</label>
                        <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} placeholder="예: 삼부토건" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">사업자등록번호</label>
                        <input type="text" value={userFormExtra2} onChange={e => setUserFormExtra2(e.target.value)} placeholder="예: 120-81-45678" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </>
                  )}
                  {userTab === "dropoff" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">하차 운영사명</label>
                        <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} placeholder="예: 송도환경개발" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">사업자등록번호</label>
                        <input type="text" value={userFormExtra2} onChange={e => setUserFormExtra2(e.target.value)} placeholder="예: 135-85-12345" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold">가입 승인 상태</label>
                    <select value={userFormStatus} onChange={e => setUserFormStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="승인됨">즉시 승인 (활성화)</option>
                      <option value="대기">심사 대기 (대기중)</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl active:scale-95 transition-all">취소</button>
                    <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all">등록 완료</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    이용자 상세 정보 수정 ({userTab === "driver" && "기사"}
                    {userTab === "owner" && "차주/운송사"}
                    {userTab === "site" && "현장 관리자"}
                    {userTab === "dropoff" && "하차지 관리자"})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">등록된 이용자의 연락처 및 권한 상태 세부내용을 업데이트합니다.</p>
                </div>
                <form onSubmit={handleEditUserSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold">성명 / 대표자명</label>
                    <input required type="text" value={userFormName} onChange={e => setUserFormName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold">연락처</label>
                    <input required type="text" value={userFormPhone} onChange={e => setUserFormPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {userTab === "driver" && (
                    <div className="space-y-1">
                      <label className="text-slate-600 font-bold">면허 종류</label>
                      <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  {userTab === "owner" && (
                    <div className="space-y-1">
                      <label className="text-slate-600 font-bold">소속 차량 정보</label>
                      <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  {userTab === "site" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">원청 건설사명</label>
                        <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">사업자등록번호</label>
                        <input type="text" value={userFormExtra2} onChange={e => setUserFormExtra2(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </>
                  )}
                  {userTab === "dropoff" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">하차 운영사명</label>
                        <input required type="text" value={userFormExtra1} onChange={e => setUserFormExtra1(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-600 font-bold">사업자등록번호</label>
                        <input type="text" value={userFormExtra2} onChange={e => setUserFormExtra2(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <label className="text-slate-600 font-bold">승인 상태</label>
                    <select value={userFormStatus} onChange={e => setUserFormStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="승인됨">승인됨</option>
                      <option value="대기">대기</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl active:scale-95 transition-all">취소</button>
                    <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all">저장 완료</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User Details Modal */}
          {viewingUserDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    이용자 상세 정보 프로필
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${userTab === "driver" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                      userTab === "owner" ? "bg-amber-50 text-amber-600 border-amber-200" :
                        userTab === "site" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          "bg-indigo-50 text-indigo-650 border border-indigo-200"
                    }`}>
                    {userTab === "driver" && "기사"}
                    {userTab === "owner" && "차주/운송사"}
                    {userTab === "site" && "현장 관리자"}
                    {userTab === "dropoff" && "하차지 관리자"}
                  </span>
                </div>
                <div className="space-y-3.5 text-xs text-slate-700">
                  <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-semibold">이름/대표자:</span>
                    <span className="col-span-2 font-bold text-slate-900">{viewingUserDetails.name}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                    <span className="text-slate-505 font-semibold">연락처:</span>
                    <span className="col-span-2 font-mono text-slate-900">{viewingUserDetails.phone}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                    <span className="text-slate-505 font-semibold">가입 상태:</span>
                    <span className="col-span-2">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${viewingUserDetails.status === "승인됨" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>{viewingUserDetails.status}</span>
                    </span>
                  </div>

                  {userTab === "driver" && (
                    <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-semibold">면허 정보:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{viewingUserDetails.license}</span>
                    </div>
                  )}
                  {userTab === "owner" && (
                    <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-semibold">소속 차량 정보:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{viewingUserDetails.vehicle}</span>
                    </div>
                  )}
                  {userTab === "site" && (
                    <>
                      <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                        <span className="text-slate-505 font-semibold">소속 기업명:</span>
                        <span className="col-span-2 font-bold text-slate-800">{viewingUserDetails.company}</span>
                      </div>
                      {viewingUserDetails.bizRegNo && (
                        <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                          <span className="text-slate-505 font-semibold">사업자 번호:</span>
                          <span className="col-span-2 font-mono text-slate-800">{viewingUserDetails.bizRegNo}</span>
                        </div>
                      )}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-slate-505 font-semibold block">등록된 B2B 현장 목록:</span>
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          {viewingUserDetails.registeredSites && viewingUserDetails.registeredSites.length > 0 ? (
                            viewingUserDetails.registeredSites.map((site: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-150 rounded text-[10px] font-bold">{site}</span>
                            ))
                          ) : (
                            <span className="text-slate-450 italic">등록된 현장 정보가 없습니다. (승인 전)</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {userTab === "dropoff" && (
                    <>
                      <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                        <span className="text-slate-505 font-semibold">하차 운영사:</span>
                        <span className="col-span-2 font-bold text-slate-800">{viewingUserDetails.company}</span>
                      </div>
                      {viewingUserDetails.bizRegNo && (
                        <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                          <span className="text-slate-505 font-semibold">사업자 번호:</span>
                          <span className="col-span-2 font-mono text-slate-800">{viewingUserDetails.bizRegNo}</span>
                        </div>
                      )}
                      {viewingUserDetails.capacity && (
                        <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                          <span className="text-slate-505 font-semibold">수용 한도량:</span>
                          <span className="col-span-2 font-semibold text-slate-800 font-mono">{viewingUserDetails.capacity}</span>
                        </div>
                      )}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-slate-505 font-semibold block">등록된 하차지/매립지 목록:</span>
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          {viewingUserDetails.registeredLandfills && viewingUserDetails.registeredLandfills.length > 0 ? (
                            viewingUserDetails.registeredLandfills.map((land: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-650 border border-indigo-150 rounded text-[10px] font-bold">{land}</span>
                            ))
                          ) : (
                            <span className="text-slate-450 italic">등록된 하차지 정보가 없습니다.</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-150 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingUserDetails(null)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all text-xs"
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

    if (activePath === "/admin/codes") {
      const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupCode || !newCodeVal || !newCodeName) {
          alert("그룹코드, 코드 키, 표시명은 필수 입력입니다.");
          return;
        }
        try {
          const res = await fetch("http://localhost:8000/api/common-codes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer mock-token-admin"
            },
            body: JSON.stringify({
              group_code: newGroupCode.toUpperCase(),
              code: newCodeVal.toUpperCase(),
              code_name: newCodeName,
              display_order: Number(newDisplayOrder),
              is_active: true
            })
          });
          if (res.ok) {
            alert(`공통코드 [${newCodeVal}]가 데이터베이스에 성공적으로 추가되었습니다.`);
            // Keep the group code filled, but clear code key, display name and order
            setNewCodeVal("");
            setNewCodeName("");
            setNewDisplayOrder(0);
            fetchCommonCodes();
          } else {
            const err = await res.json();
            alert(`오류: ${err.detail || "등록 실패"}`);
          }
        } catch (e) {
          alert("백엔드 서버 연결 오류가 발생했습니다.");
        }
      };

      const handleUpdateCode = async (id: number, currentName: string, currentOrder: number, currentActive: boolean) => {
        const nextName = prompt("수정할 한글 표시명을 입력하세요:", currentName);
        if (nextName === null) return;
        const nextOrderStr = prompt("수정할 정렬 순서를 입력하세요 (숫자):", currentOrder.toString());
        if (nextOrderStr === null) return;
        const nextOrder = Number(nextOrderStr);

        try {
          const res = await fetch(`http://localhost:8000/api/common-codes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code_name: nextName,
              display_order: isNaN(nextOrder) ? currentOrder : nextOrder,
              is_active: currentActive
            })
          });
          if (res.ok) {
            alert("공통코드가 성공적으로 수정되었습니다.");
            fetchCommonCodes();
          } else {
            alert("수정에 실패했습니다.");
          }
        } catch (e) {
          alert("서버 연결 실패");
        }
      };

      const handleToggleActive = async (id: number, currentName: string, currentOrder: number, currentActive: boolean) => {
        try {
          const res = await fetch(`http://localhost:8000/api/common-codes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              is_active: !currentActive
            })
          });
          if (res.ok) {
            fetchCommonCodes();
          }
        } catch (e) {
          console.error(e);
        }
      };

      const handleDeleteCode = async (id: number, code: string) => {
        if (!confirm(`[${code}] 공통코드를 데이터베이스에서 영구 삭제하시겠습니까?`)) return;
        try {
          const res = await fetch(`http://localhost:8000/api/common-codes/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            alert("삭제되었습니다.");
            fetchCommonCodes();
          } else {
            alert("삭제 권한이 없거나 실패했습니다.");
          }
        } catch (e) {
          alert("서버 연결 실패");
        }
      };

      // Unique groups extraction
      const groupNames: Record<string, string> = {
        "MATERIAL_TYPE": "토사 종류",
        "TRUCK_TYPE": "차량 규격",
        "PAYER_TYPE": "비용 지급 주체",
        "PAYMENT_METHOD": "정산 방식"
      };

      const groups = ["전체", ...Array.from(new Set(dbCommonCodes.map(c => c.group_code)))];
      const filteredCodes = selectedGroup === "전체"
        ? dbCommonCodes
        : dbCommonCodes.filter(c => c.group_code === selectedGroup);

      const handleGroupSelect = (group: string) => {
        setSelectedGroup(group);
        if (group !== "전체") {
          setNewGroupCode(group);
        } else {
          setNewGroupCode("");
        }
      };

      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                ⚙️ 시스템 공통코드 관리 본부
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">Common Codes</span>
              </h2>
              <p className="text-xs text-slate-505 mt-1">데이터베이스(common_codes) 테이블의 시스템 식별 코드 및 기준 파라미터를 그룹별로 실시간 조회, 등록, 수정, 삭제합니다.</p>
            </div>
            <button onClick={() => setActivePath("/admin")} className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all">
              ← 대시보드로 돌아가기
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Group List */}
            <div className="lg:col-span-3 p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  📁 공통코드 그룹 ({groups.length - 1}개)
                </h3>
              </div>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {groups.map((g) => {
                  const count = g === "전체" ? dbCommonCodes.length : dbCommonCodes.filter(c => c.group_code === g).length;
                  const isActive = selectedGroup === g;
                  const friendlyName = g === "전체" ? "전체 목록" : (groupNames[g] || g);
                  return (
                    <button
                      key={g}
                      onClick={() => handleGroupSelect(g)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex justify-between items-center ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md scale-[1.02]"
                          : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-[12px]">{friendlyName}</span>
                        {g !== "전체" && (
                          <span className={`text-[9.5px] font-mono mt-0.5 ${
                            isActive ? "text-blue-100 opacity-90" : "text-slate-400 font-medium"
                          }`}>
                            {g}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle Column: Sub-keys (Codes) Table */}
            <div className="lg:col-span-6 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-155 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-805">
                    🔑 {selectedGroup === "전체" ? "전체 하위 키 목록" : `[${groupNames[selectedGroup] || selectedGroup}] 하위 키 목록`} ({filteredCodes.length}건)
                  </h3>
                </div>
                <button
                  onClick={fetchCommonCodes}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] border border-slate-250 flex items-center gap-1"
                >
                  🔄 새로고침
                </button>
              </div>
              
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1 animate-fadeIn">
                {isCodesLoading ? (
                  <div className="text-center py-12 text-xs font-semibold text-slate-400">데이터베이스에서 공통코드를 로딩 중입니다...</div>
                ) : filteredCodes.length === 0 ? (
                  <div className="text-center py-12 text-xs font-semibold text-slate-400">등록된 하위 코드가 존재하지 않습니다. 우측 폼에서 새로 추가해 주세요.</div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold pb-2 sticky top-0 bg-white">
                        {selectedGroup === "전체" && <th className="py-2.5">그룹코드</th>}
                        <th className="py-2.5">코드 키 (Key)</th>
                        <th className="py-2.5">표시명 (Value)</th>
                        <th className="py-2.5 text-center">정렬순서</th>
                        <th className="py-2.5 text-center">사용여부</th>
                        <th className="py-2.5 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredCodes.map((codeObj) => (
                        <tr key={codeObj.id} className="hover:bg-slate-50/50">
                          {selectedGroup === "전체" && <td className="py-3 font-bold text-slate-900 font-mono text-[10.5px]">{codeObj.group_code}</td>}
                          <td className="py-3 font-mono text-[11px] text-blue-600 font-bold">{codeObj.code}</td>
                          <td className="py-3 text-slate-800 font-semibold">{codeObj.code_name}</td>
                          <td className="py-3 text-center font-mono">{codeObj.display_order}</td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => handleToggleActive(codeObj.id, codeObj.code_name, codeObj.display_order, codeObj.is_active)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                codeObj.is_active
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : "bg-rose-50 text-rose-600 border border-rose-200"
                              }`}
                            >
                              {codeObj.is_active ? "사용" : "미사용"}
                            </button>
                          </td>
                          <td className="py-3 text-right space-x-1">
                            <button
                              onClick={() => handleUpdateCode(codeObj.id, codeObj.code_name, codeObj.display_order, codeObj.is_active)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-250 font-bold text-[10px]"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteCode(codeObj.id, codeObj.code)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border border-rose-200 font-bold text-[10px]"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right Column: Quick Action Info Card & Add Form */}
            <div className="lg:col-span-3 p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-5 flex flex-col justify-between">
              <form onSubmit={handleCreateCode} className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">➕ 신규 공통코드 등록</h3>
                  <p className="text-[11px] text-slate-505 mt-1">시스템에서 사용할 신규 코드 쌍을 데이터베이스 테이블에 즉시 생성합니다.</p>
                </div>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-655 font-bold">그룹코드 (예: MATERIAL_TYPE)</label>
                    <input
                      type="text"
                      placeholder="MATERIAL_TYPE"
                      value={newGroupCode}
                      onChange={(e) => setNewGroupCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-655 font-bold">코드 키 (Key) (예: MUD_SOIL)</label>
                    <input
                      type="text"
                      placeholder="MUD_SOIL"
                      value={newCodeVal}
                      onChange={(e) => setNewCodeVal(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-655 font-bold">한글 표시명 (Value) (예: 뻘흙)</label>
                    <input
                      type="text"
                      placeholder="뻘흙"
                      value={newCodeName}
                      onChange={(e) => setNewCodeName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-655 font-bold">정렬 순서 (Display Order)</label>
                    <input
                      type="number"
                      value={newDisplayOrder}
                      onChange={(e) => setNewDisplayOrder(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-850 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  데이터베이스에 저장
                </button>
              </form>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-[10.5px] text-slate-500 leading-relaxed font-medium space-y-1.5">
                <p className="font-extrabold text-slate-700 flex items-center gap-1">⚠️ 주의사항:</p>
                <p>여기서 추가한 공통코드는 DB 마스터 정보가 되어, 즉각적으로 기사의 배차 운행 데이터나 현장 물품 분류 등에 연동되므로 오타에 각별히 유의해 주세요.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 12. [시스템 설정] 화면
    if (activePath === "/admin/settings") {
      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                ⚙️ 글로벌 시스템 설정 및 배포 정책
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">System Settings</span>
              </h2>
              <p className="text-xs text-slate-550 mt-1">덤프링 통합 플랫폼의 서버 가동 상태, 모바일 버전 배포 정책 및 자동 정산 연계를 정의합니다.</p>
            </div>
            <button onClick={() => setActivePath("/admin")} className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg active:scale-95 transition-all">
              ← 대시보드로 돌아가기
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Setting Item Lists (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: App Version & Push */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-150 pb-2">📱 모바일 앱 배포 및 업데이트 규정</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-650 font-bold">최소 강제 업데이트 버전</label>
                    <input type="text" defaultValue="v1.2.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 font-bold focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-650 font-bold">실시간 GPS 업로드 주기</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-850 focus:outline-none">
                      <option value="1">1초 (최고정밀 - 배터리 소모 높음)</option>
                      <option value="3" selected>3초 (기본값 - 권장)</option>
                      <option value="5">5초 (여유 - 저정밀)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: Virtual Account & Settlement */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-150 pb-2">💳 가상계좌 및 B2B 정산 스케줄</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-650 font-bold">주거래 가상계좌 발급 은행</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {["신한은행", "하나은행", "국민은행", "우리은행"].map((bank) => (
                        <span key={bank} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-650 border border-blue-200 font-bold text-[10.5px] cursor-pointer hover:bg-blue-100">
                          ✓ {bank}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-650 font-bold">수수료 정산 및 발행일자</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-855 focus:outline-none">
                      <option value="1">매월 1일 일괄 정산</option>
                      <option value="5" selected>매월 5일 일괄 정산 (기본값)</option>
                      <option value="10">매월 10일 일괄 정산</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Config Control Panel (1 col) */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">🛑 비상 통제 설정</h3>
                  <p className="text-[11px] text-slate-500 mt-1">시스템 전역에 강제 비상 모드 또는 전체 점검 점검 상태를 고지합니다.</p>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center p-3.5 bg-white border border-slate-200 rounded-xl">
                    <div>
                      <span className="font-bold text-slate-800">시스템 전체 점검 모드</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">ON 활성화 시 앱 전체 접속 차단</p>
                    </div>
                    <button onClick={() => alert("비상 점검 모드를 활성화하려면 어드민 2차 OTP 인증이 필요합니다.")} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold rounded-lg border border-slate-300">
                      OFF (대기)
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-650 font-bold">비상 대책 긴급 연락망</label>
                    <input type="text" defaultValue="010-1234-5678" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none" />
                  </div>
                </div>
              </div>
              <button onClick={() => alert("글로벌 시스템 설정 저장이 완벽하게 적용되었습니다.")} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95">
                💾 설정 최종 저장 및 서비스 동기화
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 13. [준비 중인 화면들] (하차지 배차 관리 등)
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-24 animate-fadeIn">
        <h2 className="text-lg font-extrabold text-slate-800">연동 구현 진행 중인 화면</h2>
        <p className="text-xs text-slate-500 mt-2">선택하신 {activePath} 서비스는 공통 백엔드 연동 릴리즈 대기 상태입니다.</p>
      </div>
    );
  };



    // --- Beautiful Map Mock Component ---
    const renderMockMap = (title: string, address: string, pinned: boolean, onPinClick?: () => void) => {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600 animate-bounce" />
              <span className="font-extrabold text-sm text-slate-800">{title} 진입로/위치 맵핑</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {pinned ? "● 핀 지정 완료" : "○ 핀 대기 중"}
            </span>
          </div>
          <div
            onClick={onPinClick}
            className="relative h-60 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex flex-col items-center justify-center cursor-pointer group"
          >
            {/* Mock Grid Lines */}
            <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
            {/* Mock road curves */}
            <div className="absolute w-full h-8 bg-slate-200/20 top-1/3 rotate-6 transform scale-110"></div>
            <div className="absolute h-full w-8 bg-slate-200/20 left-1/4 -rotate-12 transform scale-110"></div>

            <div className="relative z-10 text-center px-4 flex flex-col items-center">
              {pinned ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 border-2 border-blue-500 flex items-center justify-center animate-pulse mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">{address || "선택된 위치"}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">좌표: 37.5665° N, 126.9780° E (인근 오차 2m)</p>
                </>
              ) : (
                <>
                  <MapPin className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform mb-2" />
                  <p className="text-xs font-bold text-slate-600">지도를 클릭하여 정확한 핀 위치 지정</p>
                  <p className="text-[10px] text-slate-400 mt-1">주소: {address || "주소를 입력해 주세요"}</p>
                </>
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span>* 진로 진입 시 차량의 상세 위경도 데이터를 안내합니다.</span>
            <button type="button" className="text-blue-600 font-bold hover:underline">상세 지도 앱 열기</button>
          </div>
        </div>
      );
    };

    // --- 2-1. 현장 등록 화면 ---
    const renderSiteRegister = () => {
      const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (!siteFormName || !siteFormAddress) {
          alert("현장명과 현장 주소는 필수 입력 항목입니다.");
          return;
        }

        const newSite = {
          id: registeredSiteList.length + 1,
          name: siteFormName,
          address: siteFormAddress,
          roadDesc: siteFormRoadDesc,
          managers: siteFormManagers ? siteFormManagers.split(",").map(m => m.trim()) : ["담당자 미정"],
        };

        setRegisteredSiteList(prev => [...prev, newSite]);

        // Clear forms
        setSiteFormName("");
        setSiteFormAddress("");
        setSiteFormRoadDesc("");
        setSiteFormManagers("");

        alert("신규 현장이 성공적으로 등록되었습니다.");
        setActivePath("/site");
      };

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">신규 현장 등록</h2>
              <p className="text-xs text-slate-500 mt-1">덤프링 플랫폼에 신규 B2B 공사 현장을 등록합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setActivePath("/site")}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs transition-all"
            >
              ← 대시보드로 이동
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Form */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">현장명 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={siteFormName}
                    onChange={(e) => setSiteFormName(e.target.value)}
                    placeholder="예: 인천 검단 3공구 신축공사"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">현장 주소 <span className="text-rose-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={siteFormAddress}
                      onChange={(e) => setSiteFormAddress(e.target.value)}
                      placeholder="예: 인천광역시 서구 검단동 123-45"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!siteFormAddress) {
                          alert("검색할 주소를 입력해 주세요.");
                          return;
                        }
                        setSiteFormSearchQuery(siteFormAddress);
                        alert("입력한 주소를 기반으로 지도가 맵핑되었습니다.");
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-lg transition-colors"
                    >
                      주소 조회
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">진입로 상세 설명 (배차 가이드)</label>
                  <textarea
                    value={siteFormRoadDesc}
                    onChange={(e) => setSiteFormRoadDesc(e.target.value)}
                    placeholder="예: 정문 차단기 통과 후 우회전하여 진입, 대형 차량 서행 요망"
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">현장 담당자 설정 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={siteFormManagers}
                    onChange={(e) => setSiteFormManagers(e.target.value)}
                    placeholder="예: 김현장 (010-1234-5678), 박담당 (010-8765-4321)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-500/10 active:scale-95"
                  >
                    현장 등록 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSiteFormName("");
                      setSiteFormAddress("");
                      setSiteFormRoadDesc("");
                      setSiteFormManagers("");
                      setActivePath("/site");
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>

            {/* Right Map Preview */}
            <div className="lg:col-span-1">
              {renderMockMap("현장", siteFormAddress || siteFormSearchQuery, !!siteFormSearchQuery, () => {
                if (siteFormAddress) setSiteFormSearchQuery(siteFormAddress);
              })}
            </div>
          </div>
        </div>
      );
    };

    // --- 2-2. 배차 요청 화면 (목록 / 등록 / 수정 / 상세) ---
    const renderSiteDispatchRequest = () => {
      const handleSaveRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!dispatchFormSiteId) {
          alert("요청할 현장을 선택해 주세요.");
          return;
        }
        if (dispatchFormTonTypes.length === 0) {
          alert("차량 톤수를 최소 하나 이상 선택해 주세요.");
          return;
        }

        const selectedSite = registeredSiteList.find(s => s.id === Number(dispatchFormSiteId));
        const siteName = selectedSite ? selectedSite.name : "알 수 없는 현장";

        if (dispatchRequestMode === "create") {
          const newReq = {
            id: dispatchRequestList.length + 1,
            siteId: Number(dispatchFormSiteId),
            siteName,
            tonTypes: dispatchFormTonTypes,
            truckCount: Number(dispatchFormTruckCount),
            soilType: dispatchFormSoilType,
            startDate: dispatchFormStartDate || "2026-06-06",
            endDate: dispatchFormEndDate || "2026-06-10",
            dropoffMode: dispatchFormDropoffMode,
            dropoffName: dispatchFormDropoffMode === "direct" ? dispatchFormDropoffName : (dispatchFormDropoffMode === "search" ? dispatchFormDropoffName : ""),
            dropoffAddress: dispatchFormDropoffAddress,
            status: "대기중"
          };
          setDispatchRequestList(prev => [...prev, newReq]);
          alert("배차 요청이 등록되었습니다.");
        } else if (dispatchRequestMode === "edit" && editingDispatchRequestId !== null) {
          setDispatchRequestList(prev => prev.map(req => {
            if (req.id === editingDispatchRequestId) {
              return {
                ...req,
                siteId: Number(dispatchFormSiteId),
                siteName,
                tonTypes: dispatchFormTonTypes,
                truckCount: Number(dispatchFormTruckCount),
                soilType: dispatchFormSoilType,
                startDate: dispatchFormStartDate,
                endDate: dispatchFormEndDate,
                dropoffMode: dispatchFormDropoffMode,
                dropoffName: dispatchFormDropoffName,
                dropoffAddress: dispatchFormDropoffAddress,
              };
            }
            return req;
          }));
          alert("배차 요청이 수정되었습니다.");
        }

        // Reset
        resetDispatchForm();
        setDispatchRequestMode("list");
      };

      const startEdit = (req: any) => {
        setDispatchFormSiteId(req.siteId);
        setDispatchFormTonTypes(req.tonTypes);
        setDispatchFormTruckCount(req.truckCount);
        setDispatchFormSoilType(req.soilType);
        setDispatchFormStartDate(req.startDate);
        setDispatchFormEndDate(req.endDate);
        setDispatchFormDropoffMode(req.dropoffMode);
        setDispatchFormDropoffName(req.dropoffName);
        setDispatchFormDropoffAddress(req.dropoffAddress || "");
        setEditingDispatchRequestId(req.id);
        setDispatchRequestMode("edit");
      };

      const handleDelete = (id: number) => {
        if (confirm("정말로 이 배차 요청을 삭제하시겠습니까?")) {
          setDispatchRequestList(prev => prev.filter(r => r.id !== id));
          alert("삭제되었습니다.");
        }
      };

      const toggleTonType = (ton: string) => {
        setDispatchFormTonTypes(prev =>
          prev.includes(ton) ? prev.filter(t => t !== ton) : [...prev, ton]
        );
      };

      // Filter list
      const filteredRequests = dispatchRequestList.filter(req => {
        const matchSearch = req.siteName.includes(dispatchRequestSearchQuery) ||
          req.soilType.includes(dispatchRequestSearchQuery) ||
          (req.dropoffName && req.dropoffName.includes(dispatchRequestSearchQuery));
        return matchSearch;
      });

      if (dispatchRequestMode === "create" || dispatchRequestMode === "edit") {
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {dispatchRequestMode === "create" ? "신규 배차 요청 등록" : "배차 요청 수정"}
                </h2>
                <p className="text-xs text-slate-505 mt-1">현장에 필요한 차량 정보 및 작업 일정을 등록합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => { resetDispatchForm(); setDispatchRequestMode("list"); }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs transition-all"
              >
                ← 목록으로 가기
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
                <form onSubmit={handleSaveRequest} className="space-y-5 text-xs">
                  {/* Site Selection */}
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">요청 현장 선택 <span className="text-rose-500">*</span></label>
                    <select
                      value={dispatchFormSiteId}
                      onChange={(e) => setDispatchFormSiteId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="">현장을 선택해 주세요</option>
                      {registeredSiteList.map(site => (
                        <option key={site.id} value={site.id}>{site.name} ({site.address})</option>
                      ))}
                    </select>
                  </div>

                  {/* Vehicle Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">필요 차량 톤수 (중복 선택) <span className="text-rose-500">*</span></label>
                      <div className="flex gap-3 pt-1">
                        {["25.5톤", "25톤", "15톤"].map(ton => (
                          <label key={ton} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={dispatchFormTonTypes.includes(ton)}
                              onChange={() => toggleTonType(ton)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-0 accent-blue-600 font-bold"
                            />
                            {ton}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">요청 대수 <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={dispatchFormTruckCount}
                        onChange={(e) => setDispatchFormTruckCount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Work Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">반출 토사 종류 <span className="text-rose-500">*</span></label>
                      <select
                        value={dispatchFormSoilType}
                        onChange={(e) => setDispatchFormSoilType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="일반 토사">일반 토사</option>
                        <option value="혼합골재">혼합골재</option>
                        <option value="풍화암">풍화암</option>
                        <option value="사토">사토</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">작업 시작일 <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={dispatchFormStartDate}
                        onChange={(e) => setDispatchFormStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">작업 종료일 <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={dispatchFormEndDate}
                        onChange={(e) => setDispatchFormEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Drop-off Selection */}
                  <div className="space-y-2.5 border-t border-slate-100 pt-4">
                    <label className="text-slate-700 font-bold block">하차지 정보 등록 <span className="text-rose-500">*</span></label>
                    <div className="flex gap-4 mb-2">
                      {[
                        { val: "none", label: "없음" },
                        { val: "search", label: "덤프링 등록 하차지 검색" },
                        { val: "direct", label: "직접 등록 (사토장 신설)" }
                      ].map(opt => (
                        <label key={opt.val} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="dropoffMode"
                            checked={dispatchFormDropoffMode === opt.val}
                            onChange={() => {
                              setDispatchFormDropoffMode(opt.val as any);
                              setDispatchFormDropoffName("");
                              setDispatchFormDropoffAddress("");
                            }}
                            className="w-4 h-4 text-blue-600 focus:ring-0 accent-blue-600 font-bold"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>

                    {dispatchFormDropoffMode === "search" && (
                      <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="text-slate-600 font-bold block">하차지 검색 & 선택</label>
                        <select
                          onChange={(e) => {
                            const drop = registeredDropoffList.find(d => d.id === Number(e.target.value));
                            if (drop) {
                              setDispatchFormDropoffName(drop.name);
                              setDispatchFormDropoffAddress(drop.address);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="">하차지를 지정해 주세요</option>
                          {registeredDropoffList.map(drop => (
                            <option key={drop.id} value={drop.id}>
                              {drop.name} ({drop.soilDealType === "buy" ? "구매/돈 줌" : "판매/돈 받음"}) - {drop.address}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {dispatchFormDropoffMode === "direct" && (
                      <div className="space-y-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-slate-600 font-semibold block">직접등록 하차지명</label>
                            <input
                              type="text"
                              value={dispatchFormDropoffName}
                              onChange={(e) => setDispatchFormDropoffName(e.target.value)}
                              placeholder="예: 김포 고촌 사토장"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-slate-600 font-semibold block">하차지 주소</label>
                            <input
                              type="text"
                              value={dispatchFormDropoffAddress}
                              onChange={(e) => setDispatchFormDropoffAddress(e.target.value)}
                              placeholder="예: 경기도 김포시 고촌읍 신곡리"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-500/10 active:scale-95"
                    >
                      {dispatchRequestMode === "create" ? "배차 요청 등록하기" : "수정 완료"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { resetDispatchForm(); setDispatchRequestMode("list"); }}
                      className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-1">
                {renderMockMap(
                  "하차지",
                  dispatchFormDropoffAddress,
                  !!dispatchFormDropoffAddress,
                  () => { }
                )}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">배차 요청 관리</h2>
              <p className="text-xs text-slate-550 mt-1">현장에 필요한 덤프 배차 요청 목록을 조회하고 신설할 수 있습니다.</p>
            </div>
            <button
              type="button"
              onClick={() => { resetDispatchForm(); setDispatchRequestMode("create"); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-white text-xs shadow-lg shadow-blue-500/10 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              신규 배차 요청 등록
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 p-4 rounded-xl bg-white border border-slate-200 shadow-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={dispatchRequestSearchQuery}
                onChange={(e) => setDispatchRequestSearchQuery(e.target.value)}
                placeholder="현장명, 토사 종류, 하차지명 등으로 검색..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Requests Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map(req => (
              <div key={req.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800">{req.siteName}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">요청번호: DREQ-00{req.id}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${req.status === "배차완료"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}>
                    {req.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-505 font-medium">필요 차종:</span>
                    <span className="font-bold text-slate-800">{req.tonTypes.join(", ")} ({req.truckCount}대)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-550 font-medium">토종 / 일시:</span>
                    <span className="font-semibold text-slate-800">{req.soilType} | {req.startDate} ~ {req.endDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-550 font-medium">하차지:</span>
                    <span className="font-semibold text-slate-800 text-blue-600">
                      {req.dropoffName ? `${req.dropoffName} (${req.dropoffMode === "search" ? "덤프링" : "직접등록"})` : "없음"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(req)}
                    className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(req.id)}
                    className="flex-1 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] transition-colors border border-rose-200"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="col-span-2 text-center py-12 text-xs font-semibold text-slate-500">
                검색 조건에 맞는 배차 요청 내역이 존재하지 않습니다.
              </div>
            )}
          </div>
        </div>
      );
    };

    const renderSiteManager = (): React.ReactNode => {
      if (activePath === "/site/request") {
        return renderSiteRegister();
      }
      if (activePath === "/site/dispatch-request") {
        return renderSiteDispatchRequest();
      }

      if (activePath !== "/site") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-16 space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">준비 중인 화면</h3>
            <p className="text-sm text-slate-500">'{activePath}' 메뉴는 현재 현장 연동 점검 중입니다.</p>
            <button type="button" onClick={() => setActivePath("/site")} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs">
              대시보드로 돌아가기
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {/* Header section */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">[인천 검단 3공구] 현장 관리 본부</h2>
              <p className="text-xs text-slate-600 mt-1">현장 고유 인증 코드: <span className="text-blue-600 font-mono font-bold">GD-3-DUMP</span></p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { resetDispatchForm(); setDispatchRequestMode("create"); setActivePath("/site/dispatch-request"); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold text-white text-xs shadow-lg shadow-blue-500/10 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                신규 배차 신청서 작성
              </button>
            </div>
          </div>

          {/* Main Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" /> 오늘 배차 요청 현황
              </h3>
              <div className="text-3xl font-black text-slate-900">12 / 20 대</div>
              <p className="text-xs text-slate-500 mt-1">오전 배차 100% 완료, 오후 추가 대기 중</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" /> 현재 하차 지정지
              </h3>
              <div className="text-base font-extrabold text-slate-900">인천 영종도 신공항 북측 매립지</div>
              <p className="text-xs text-slate-500 mt-1">경로 정체 지체 지연 없음 (운행 소요 35분)</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" /> 실시간 평균 대기 시간
              </h3>
              <div className="text-3xl font-black text-rose-400">14 분</div>
              <p className="text-xs text-slate-500 mt-1">전년 동월 대비 8분 단축</p>
            </div>
          </div>

          {/* 덤프비 / 흙값 정산 및 세금계산서 업무 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dump & Soil Settlement */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                  <h3 className="font-extrabold text-base text-slate-800">금월 현장 정산 및 단가 관리</h3>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/30">
                    실시간 단가 연동
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dump truck expenses */}
                  <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">덤프비 정산 확인 (운송료)</span>
                    <p className="text-2xl font-black text-slate-900 mt-1.5">₩12,450,000</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-600 mt-3 pt-2.5 border-t border-slate-200/40">
                      <span>총 운반 횟수: 69회</span>
                      <span className="text-blue-600 font-bold">1회 평균 단가: 180,000원</span>
                    </div>
                  </div>

                  {/* Soil / Earthwork expenses */}
                  <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                    <span className="text-[10px] text-slate-505 font-bold uppercase tracking-wider block">흙값 정산 관리 (토사비)</span>
                    <p className="text-2xl font-black text-blue-600 mt-1.5">₩4,800,000</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-650 mt-3 pt-2.5 border-t border-slate-200/40">
                      <span>반출 흙 분량: 600 ㎥</span>
                      <span className="text-emerald-400 font-bold">㎥당 단가: 8,000원</span>
                    </div>
                  </div>
                </div>

                {/* Simulated mini dynamic pricing changer */}
                <div className="mt-4 p-3 rounded-xl bg-slate-100/30 border border-slate-200 text-xs flex justify-between items-center text-slate-600">
                  <span>흙값(토사)㎥당 단가 조정: <strong>8,000원</strong></span>
                  <span className="text-[10px] text-slate-500">단가 변경은 플랫폼 본부 승인 후 적용됩니다.</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActivePath("/site/dump-expenses")}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800"
                >
                  덤프 운송 정산서 보기
                </button>
                <button
                  type="button"
                  onClick={() => setActivePath("/site/soil-expenses")}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800"
                >
                  사토/흙값 정산 대장
                </button>
              </div>
            </div>

            {/* Tax Invoice Module */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                  <h3 className="font-extrabold text-sm text-slate-800">세금계산서 발행 및 증빙</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${taxInvoiceApproved
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30"
                      : "bg-amber-950/60 text-amber-400 border-amber-800/30"
                    }`}>
                    {taxInvoiceApproved ? "승인완료" : "승인대기"}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 space-y-2">
                    <div className="text-[11px] text-slate-500 font-bold">5월 정기 세금계산서 청구 건</div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-700 font-semibold">공급가액:</span>
                      <span className="text-sm font-black text-slate-900">₩17,250,000</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-700 font-semibold">세액 (10%):</span>
                      <span className="text-xs font-bold text-slate-600">₩1,725,000</span>
                    </div>
                    <div className="flex justify-between items-baseline border-t border-slate-200/50 pt-2 mt-2">
                      <span className="text-xs text-slate-700 font-bold">합계금액:</span>
                      <span className="text-sm font-black text-blue-600">₩18,975,000</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 leading-relaxed leading-5">
                    * 위 청구 내역은 덤프비 정산액과 흙값 정산액을 합산한 5월 분 반출 증빙 내역입니다. 발행 승인 시 홈택스 세금계산서가 자동 대행 발행됩니다.
                  </div>
                </div>
              </div>

              {!taxInvoiceApproved ? (
                <button
                  type="button"
                  onClick={() => setTaxInvoiceApproved(true)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                >
                  전자 세금계산서 발행 최종 승인
                </button>
              ) : (
                <div className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold text-center">
                  ✓ 세금계산서 승인 및 국세청 전송 완료
                </div>
              )}
            </div>
          </div>

          {/* 실시간 운행 이력 조회 (Trip logs / history) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-205">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">실시간 반출 차량 운행 이력</h3>
                <p className="text-xs text-slate-500 mt-0.5">인천 검단 3공구 현장 출발 실시간 배차 목록</p>
              </div>
              <button type="button" className="text-xs font-bold text-blue-600 hover:underline">
                전체 운행 로그 파일(CSV) 다운로드 →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 font-bold">
                    <th className="py-3 px-1">차량 번호</th>
                    <th className="py-3 px-1">기사명 / 운송사</th>
                    <th className="py-3 px-1">하차 지정 목적지</th>
                    <th className="py-3 px-1">반출 종류</th>
                    <th className="py-3 px-1">출발 시각</th>
                    <th className="py-3 px-1 text-right">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-y-slate-800/50">
                  {[
                    { plate: "경기 80바 4531", driver: "김철수 (대진운송)", dest: "영종도 신공항 북측 매립지", type: "사토 (토사)", time: "16:20:11", status: "운행완료" },
                    { plate: "서울 86아 1002", driver: "홍길동 (개인차주)", dest: "영종도 신공항 북측 매립지", type: "사토 (토사)", time: "16:05:40", status: "운행완료" },
                    { plate: "인천 88사 9081", driver: "이영희 (인천물류)", dest: "인천 송도 남측 매립지 B", type: "혼합골재", time: "15:52:19", status: "운행완료" },
                    { plate: "경기 82자 7732", driver: "박민수 (대진운송)", dest: "경기 김포 고촌 사토장", type: "사토 (토사)", time: "15:45:00", status: "운행완료" }
                  ].map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/30 transition-colors">
                      <td className="py-3 px-1 font-bold text-slate-800">{log.plate}</td>
                      <td className="py-3 px-1">{log.driver}</td>
                      <td className="py-3 px-1 text-slate-600">{log.dest}</td>
                      <td className="py-3 px-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/40 text-[10px]">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-1 font-mono text-slate-500">{log.time}</td>
                      <td className="py-3 px-1 text-right font-bold text-emerald-450">{log.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };


    // 3. 하차지 관리자 대시보드 렌더링 함수
    const renderDropoffManager = (): React.ReactNode => {
      const renderDropoffRegister = () => {
        const handleRegister = (e: React.FormEvent) => {
          e.preventDefault();
          if (!dropoffFormName || !dropoffFormAddress || !dropoffFormCapacity) {
            alert("하차지명, 주소, 총 용량은 필수 입력 항목입니다.");
            return;
          }

          const newDrop = {
            id: registeredDropoffList.length + 1,
            name: dropoffFormName,
            address: dropoffFormAddress,
            managers: dropoffFormManagers ? dropoffFormManagers.split(",").map(m => m.trim()) : ["담당자 미정"],
            soilTypes: dropoffFormSoilTypes,
            capacity: Number(dropoffFormCapacity.replace(/,/g, "")),
            soilDealType: dropoffFormSoilDealType
          };

          setRegisteredDropoffList(prev => [...prev, newDrop]);

          // Reset forms
          setDropoffFormName("");
          setDropoffFormAddress("");
          setDropoffFormManagers("");
          setDropoffFormCapacity("");
          setDropoffFormSoilDealType("sell");

          alert("신규 하차지가 성공적으로 신청 및 등록되었습니다.");
        };

        const handleDeleteDrop = (id: number) => {
          if (confirm("정말로 이 하차지를 삭제하시겠습니까?")) {
            setRegisteredDropoffList(prev => prev.filter(d => d.id !== id));
            alert("삭제되었습니다.");
          }
        };

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">하차지 등록 및 거래구분 관리</h2>
                <p className="text-xs text-slate-500 mt-1">거래 형태(판매/구매) 및 토사 한도 정보를 포함한 하차지를 등록 및 제어합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePath("/dropoff")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs transition-all"
              >
                ← 대시보드로 이동
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Registration Form */}
              <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
                <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">신규 하차지/사토장 등록</h3>
                <form onSubmit={handleRegister} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">하차지/사토장 명칭 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={dropoffFormName}
                      onChange={(e) => setDropoffFormName(e.target.value)}
                      placeholder="예: 경기 김포 고촌 신축 사토장"
                      className="w-full bg-slate-55 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-705 font-bold block">계약 토사 총 용량 (㎥) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={dropoffFormCapacity}
                      onChange={(e) => setDropoffFormCapacity(e.target.value)}
                      placeholder="예: 45,000"
                      className="w-full bg-slate-55 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-705 font-bold block">주소 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={dropoffFormAddress}
                      onChange={(e) => setDropoffFormAddress(e.target.value)}
                      placeholder="예: 경기도 김포시 고촌읍 신곡리 789"
                      className="w-full bg-slate-55 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Transaction Type Choice */}
                  <div className="space-y-1.5">
                    <label className="text-slate-707 font-bold block">토사 거래 방식 구분 <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${dropoffFormSoilDealType === "sell"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold"
                          : "bg-white border-slate-200 text-slate-500"
                        }`}>
                        <input
                          type="radio"
                          name="dealType"
                          checked={dropoffFormSoilDealType === "sell"}
                          onChange={() => setDropoffFormSoilDealType("sell")}
                          className="sr-only"
                        />
                        <span className="text-base mb-1">💰</span>
                        <span>돈 받음 (판매)</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${dropoffFormSoilDealType === "buy"
                          ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                          : "bg-white border-slate-200 text-slate-500"
                        }`}>
                        <input
                          type="radio"
                          name="dealType"
                          checked={dropoffFormSoilDealType === "buy"}
                          onChange={() => setDropoffFormSoilDealType("buy")}
                          className="sr-only"
                        />
                        <span className="text-base mb-1">💳</span>
                        <span>돈 줌 (구매)</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-707 font-bold block">하차 담당자 연락처</label>
                    <input
                      type="text"
                      value={dropoffFormManagers}
                      onChange={(e) => setDropoffFormManagers(e.target.value)}
                      placeholder="예: 최하차 (010-8888-2222)"
                      className="w-full bg-slate-55 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-500/10 active:scale-95"
                  >
                    하차지 등록 및 신청 완료
                  </button>
                </form>
              </div>

              {/* Right: List & Map */}
              <div className="lg:col-span-2 space-y-6">
                {/* List of registered dropoffs */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">등록된 하차지 목록 및 거래방식</h3>
                  <div className="space-y-3">
                    {registeredDropoffList.map(drop => (
                      <div key={drop.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-sm">{drop.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${drop.soilDealType === "buy"
                                ? "bg-blue-50 text-blue-600 border-blue-205"
                                : "bg-emerald-50 text-emerald-600 border-emerald-205"
                              }`}>
                              {drop.soilDealType === "buy" ? "돈 줌 (구매) 💳" : "돈 받음 (판매) 💰"}
                            </span>
                          </div>
                          <p className="text-slate-500 mt-1">주소: {drop.address} | 허용토종: {drop.soilTypes.join(", ")}</p>
                          <p className="text-[10px] text-slate-600 font-bold mt-1">용량: {drop.capacity.toLocaleString()} ㎥ | 담당자: {drop.managers.join(", ")}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDrop(drop.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock Map Preview */}
                {renderMockMap("하차지/사토장", dropoffFormAddress || "지도상의 매립 위치를 매핑합니다.", !!dropoffFormAddress)}
              </div>
            </div>
          </div>
        );
      };

      if (activePath === "/dropoff/register") {
        return renderDropoffRegister();
      }

        if (activePath !== "/dropoff") {
          return (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-16 space-y-4">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">준비 중인 화면</h3>
              <p className="text-sm text-slate-500">'{activePath}' 메뉴는 현재 하차지 연동 점검 중입니다.</p>
              <button type="button" onClick={() => setActivePath("/dropoff")} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs">
                대시보드로 돌아가기
              </button>
            </div>
          );
        }

        // Calculate dynamic values based on interactive verifications
        const verifiedVolume = dropoffVerifiedCount * 20; // 20㎥ per truck
        const totalVolume = 38000 + verifiedVolume;
        const capacityPercentage = Math.min(100, Math.round((totalVolume / 50000) * 100));

        const soilUnitPrice = 8000; // ㎥당 8,000원
        const soilRevenue = totalVolume * soilUnitPrice;

        return (
          <div className="space-y-6">
            {/* Upper Grid: Real-time Capacity Statistics & Soil Settlement */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Capacity Statistics */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                    <h2 className="font-extrabold text-base text-slate-800">하차지 실시간 상태 & 정보 통계</h2>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-cyan-850">
                      실시간 반입 연계
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-650 font-semibold">영종도 매립구역 C-3 구역 (현재 잔여 용량)</span>
                        <span className="font-black text-blue-600">{capacityPercentage}% ({totalVolume.toLocaleString()} / 50,000 ㎥)</span>
                      </div>
                      <div className="w-full h-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 overflow-hidden border border-slate-700/50">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-505"
                          style={{ width: `${capacityPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center mt-2">
                      <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">오전 반입량</p>
                        <p className="text-base font-black text-slate-800 mt-1">2,850 ㎥</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">오늘 추가 반입</p>
                        <p className="text-base font-black text-emerald-400 mt-1">+{verifiedVolume.toLocaleString()} ㎥</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">일일 최대 제한량</p>
                        <p className="text-base font-black text-slate-800 mt-1">8,000 ㎥</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Soil price statistics */}
                <div className="mt-4 p-4 rounded-xl bg-slate-100/40 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">금월 누적 토사 반입량 연동 흙값 정산액</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">₩{soilRevenue.toLocaleString()}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>단가: 8,000원 / ㎥</div>
                    <div className="text-slate-605 font-semibold mt-0.5">정산대장 정상 마감</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Push Notification Receiver Box */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                    <h2 className="font-extrabold text-sm text-slate-800">실시간 운영 알림 수신함</h2>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400 bg-amber-950/50 border border-amber-900/30 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Live Receive
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {[
                      { id: 1, type: "배차알림", content: "삼부토건 인천 검단 3공구에서 사토 덤프 8대 출발 예정", time: "17:15" },
                      { id: 2, type: "용량경고", content: "영종도 C구역 용량 75% 돌파 - 순차 진입 간격 제어 필요", time: "16:48" },
                      { id: 3, type: "정산알림", content: "5월 흙값 정산 세금계산서 청구서가 플랫폼 본부에 승인 완료", time: "09:30" }
                    ].map((alert) => (
                      <div key={alert.id} className="p-3 rounded-lg bg-slate-100/50 border border-slate-200/60 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-cyan-900/30 font-mono">
                            {alert.type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{alert.time}</span>
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed">{alert.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850">
                  알림 수신 환경설정
                </button>
              </div>
            </div>

            {/* Lower Grid: Real-time Inbound verification & New Drop-off Registration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Inbound Verification list */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                    <h3 className="font-extrabold text-base text-slate-800">실시간 반입 확인 및 현장 통제</h3>
                    <p className="text-xs text-slate-505 mt-0.5">게이트 하우스 진입 대기 트럭 반입 완료 승인 처리</p>
                  </div>

                  <div className="space-y-3">
                    {inboundTrucks.map((truck) => (
                      <div key={truck.id} className="p-4 rounded-xl bg-slate-100/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-sm">{truck.plate}</span>
                            <span className="text-[10px] text-slate-600 font-semibold">기사: {truck.driver} | 적재: {truck.weight}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            출발시각: {truck.time} | 적재형태: <strong className="text-slate-650 font-bold">{truck.type}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${truck.status === "반입 완료"
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30"
                              : "bg-amber-950/60 text-amber-400 border-amber-800/30 animate-pulse"
                            }`}>
                            {truck.status}
                          </span>
                          {truck.status === "진입 대기" && (
                            <button
                              type="button"
                              onClick={() => handleVerifyInbound(truck.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-white text-xs shadow-lg shadow-cyan-500/10 transition-all active:scale-95"
                            >
                              반입 승인 완료
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850">
                  전체 반입 완료 대장 조회
                </button>
              </div>

              {/* Pre-registered Drop-off Form (Leftover, styled nicely as a summary/shortcut card) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                    <h3 className="font-extrabold text-sm text-slate-800">사토지/하차지 신속 연동</h3>
                    <span className="text-[9px] text-slate-500 font-bold">B2B 연계</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    현재 영종도 매립구역 C-3 구역이 활성화되어 있습니다. 신규 하차지를 정식 등록하여 거래 방식을 매핑하고 플랫폼에 연동하려면 아래 버튼을 눌러 이동해 주세요.
                  </p>
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium">
                    * 하차지 등록 메뉴에서는 토사 판매/구매 여부 지정 및 한도 정산 관리가 지원됩니다.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePath("/dropoff/register")}
                  className="w-full mt-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                >
                  하차지 등록 및 관리 화면으로 이동
                </button>
            </div>
          </div>
        </div>
      );
    };

    // 4. 차주/운송사 대시보드 렌더링 함수
    const renderOwner = (): React.ReactNode => {
      // 1. 운송사 대시보드 메인 (/owner)
      if (activePath === "/owner") {
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">소속 등록 트럭</h3>
                <p className="text-3xl font-black text-slate-900 mt-2">18 대</p>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mt-2">
                  15대 정상 가동 중
                </span>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">이번 달 정산 예정액</h3>
                <p className="text-3xl font-black text-blue-600 mt-2">₩18,240,000</p>
                <span className="text-[10px] text-slate-500 font-semibold inline-block mt-2">
                  지급 예정일: 2026-06-10
                </span>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">완료 배차 건수 (월간)</h3>
                <p className="text-3xl font-black text-slate-900 mt-2">248 건</p>
                <span className="text-[10px] text-slate-500 font-semibold inline-block mt-2 font-mono">
                  배차 수락률 98.4%
                </span>
              </div>
            </div>

            {/* Quick Schedule summary & Fleet Operational statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800">소속 차량 운행 트렌드</h3>
                    <p className="text-xs text-slate-500">주간 배차 실적 시계열</p>
                  </div>
                  <button onClick={() => setActivePath("/owner/statistics")} className="text-xs text-blue-600 font-bold hover:underline">상세 분석 대장 →</button>
                </div>
                <div className="h-32 flex items-end justify-around gap-2 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <span className="text-[10px] text-slate-600 font-bold">52회</span>
                    <div className="w-8 h-[52px] bg-slate-400 rounded-t"></div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 1주차</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <span className="text-[10px] text-slate-600 font-bold">61회</span>
                    <div className="w-8 h-[61px] bg-slate-400 rounded-t"></div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 2주차</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <span className="text-[10px] text-slate-600 font-bold">65회</span>
                    <div className="w-8 h-[65px] bg-slate-400 rounded-t"></div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 3주차</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <span className="text-[10px] text-blue-600 font-bold">70회</span>
                    <div className="w-8 h-[70px] bg-blue-600 rounded-t shadow-md"></div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">5월 4주차</span>
                  </div>
                </div>
              </div>

              {/* Quick alert and dispatcher */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-200 pb-2">기사용 공지망 바로가기</h3>
                  <p className="text-xs text-slate-500 mt-2">소속 기사 18명의 모바일 앱으로 비상 지시문이나 대기 명령을 한 번에 브로드캐스트합니다.</p>
                </div>
                <button onClick={() => setActivePath("/owner/notice")} className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/10">
                  기사 긴급 알림 방송실 이동
                </button>
              </div>
            </div>
          </div>
        );
      }

      // 2. 배차 스케줄러 (/owner/schedule)
      if (activePath === "/owner/schedule") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">운송사 소속 차량 배차 스케줄러</h2>
                <p className="text-xs text-slate-500 mt-1">현장별 반출 스케줄에 따라 우리 덤프트럭들의 투입 일정표를 배정합니다.</p>
              </div>
              <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800">인천 검단 3공구 반출 노선 (사토)</span>
                  <p className="text-slate-500 mt-1">운행일자: 2026-06-03 | 소속 덤프 8대 배차 투입 완료 | 대표 기사: 강감찬</p>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-600 rounded font-bold">배차 확정</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800">영종도 A지구 신축 사토 노선 (혼합골재)</span>
                  <p className="text-slate-500 mt-1">운행일자: 2026-06-04 | 소속 덤프 4대 배차 진행 중</p>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 rounded font-bold">대기 중</span>
              </div>
            </div>
          </div>
        );
      }

      // 3. 소속 차량 & 기사 관리 (/owner/fleet)
      if (activePath === "/owner/fleet") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">운송사 소속 차량 및 기사 디렉토리</h2>
                <p className="text-xs text-slate-500 mt-1">법인에 소속되어 배차를 부여받는 덤프트럭 자산과 전문 드라이버 정보망입니다.</p>
              </div>
              <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-850">강감찬 기사 (1종대형면허)</span>
                <p className="text-slate-500 mt-1">차량: 경기 82자 7732 (25.5톤 덤프) | 연락처: 010-1111-2222</p>
                <div className="mt-2.5 flex gap-1.5">
                  <span className="px-2 py-0.2 rounded bg-emerald-50 text-emerald-600 border border-emerald-150">운행 중</span>
                  <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">GPS 정상</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-850">김철수 기사 (1종대형면허)</span>
                <p className="text-slate-500 mt-1">차량: 경기 80바 4531 (25.5톤 덤프) | 연락처: 010-2222-3333</p>
                <div className="mt-2.5 flex gap-1.5">
                  <span className="px-2 py-0.2 rounded bg-emerald-50 text-emerald-600 border border-emerald-150">운행 중</span>
                  <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">GPS 정상</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 4. 운행 통계 조회 (/owner/statistics)
      if (activePath === "/owner/statistics") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">운행 통계 및 성능 실적 분석</h2>
                <p className="text-xs text-slate-500 mt-1">당사의 배차 수락 성공율과 평균 덤프 순환 속도를 요약합니다.</p>
              </div>
              <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-500">배차 수락 성공율</span>
                <p className="text-2xl font-black text-blue-600 mt-1.5">98.4%</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-500">누적 반반출 흙량</span>
                <p className="text-2xl font-black text-slate-800 mt-1.5">4,960 ㎥</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-500">기사당 월간 운행 횟수</span>
                <p className="text-2xl font-black text-slate-800 mt-1.5">13.7 회</p>
              </div>
            </div>
          </div>
        );
      }

      // 5. 매출 및 운반 정산 (/owner/revenues)
      if (activePath === "/owner/revenues") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">월간 배차 운반 수송비 대금 정산서</h2>
                <p className="text-xs text-slate-500 mt-1">공사현장별로 운반을 완료하여 플랫폼 매칭 수수료를 공제한 최종 실지급 예정액입니다.</p>
              </div>
              <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 max-w-md space-y-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">B2B 대금 정산 요약</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">총 매칭 덤프 운임 매출:</span>
                  <span className="font-bold text-slate-800">₩19,840,050</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">덤프링 플랫폼 매칭 수수료 (8% 공제):</span>
                  <span className="font-bold text-rose-500">-₩1,600,050</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 mt-3">
                  <span className="text-slate-700 font-bold text-sm">실 지급 예정 정산액:</span>
                  <span className="font-black text-lg text-blue-600">₩18,240,000</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 6. 알림 센터 (/owner/notice)
      if (activePath === "/owner/notice") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">B2B 파트너 알림 전송 및 수신 센터</h2>
                <p className="text-xs text-slate-500 mt-1">수신된 본부 공지사항을 확인하고, 소속 덤프 기사에게 긴급 알림을 모바일 푸시로 발송합니다.</p>
              </div>
              <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              {/* Broadcaster */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between min-h-[280px]">
                <div>
                  <span className="font-bold text-slate-750 block border-b border-slate-200 pb-2 mb-3">소속 기사 대상 모바일 푸시 발송기</span>
                  {ownerBroadcastSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg mb-3">
                      ✓ 소속 드라이버들의 모바일 앱으로 공지가 즉시 수신 처리되었습니다.
                    </div>
                  )}
                  <textarea
                    placeholder="예: 영종도 매립구역 C-3 게이트 비산 방지용 물세척 장치가 작동 중이오니 천천히 진입하세요."
                    rows={4}
                    disabled={ownerBroadcastSuccess}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
                {!ownerBroadcastSuccess ? (
                  <button onClick={() => setOwnerBroadcastSuccess(true)} className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md">
                    긴급 메시지 푸시 발송
                  </button>
                ) : (
                  <button onClick={() => setOwnerBroadcastSuccess(false)} className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
                    새 공지 작성
                  </button>
                )}
              </div>

              {/* Recipient Feed */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-750 block border-b border-slate-200 pb-2">플랫폼 본부 수신 피드</span>
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-[9px] text-blue-600 font-bold">[긴급]</span>
                  <p className="font-bold text-slate-800 mt-1">인천 영종도 C구역 진입로 토요일 야간 통제 안내</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">작성: 플랫폼 본부 | 2026-05-27</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-20 animate-fadeIn">
          <h2 className="text-lg font-bold text-slate-800">개발 진행 중</h2>
          <p className="text-xs text-slate-500 mt-2">선택하신 {activePath} 메뉴는 추가 개발 연동 대기 중입니다.</p>
        </div>
      );
    };

    // 5. 개발자 대시보드 렌더링 함수
    const renderDeveloper = (): React.ReactNode => {
      // Filter menus based on target system and selected role
      const filteredMenus = developerMenus.filter(
        (m) => m.target === menuTarget && m.role === menuSelectedRole
      );

      // 1. 실시간 APM 모니터링 (/dev/apm)
      if (activePath === "/dev/apm") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">실시간 서버 API APM 관제 대시보드</h3>
                <p className="text-xs text-slate-500 mt-0.5">FastAPI 서버의 자원 소비량 및 API 트래픽 인입 상태를 초단위로 모니터링합니다.</p>
              </div>

              {/* Interactive Load Test Simulation Button */}
              <button
                onClick={() => setApmLoadTesting(!apmLoadTesting)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${apmLoadTesting
                    ? "bg-rose-600 text-white shadow-rose-600/10 animate-pulse"
                    : "bg-emerald-500 text-white shadow-emerald-500/10"
                  }`}
              >
                {apmLoadTesting ? "트래픽 폭주 시뮬레이션 중지 (Stop)" : "트래픽 폭주 시뮬레이션 가동 (Load Test)"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
              {[
                {
                  label: "CPU 사용량",
                  val: apmLoadTesting ? "89.2 %" : "12.4 %",
                  status: apmLoadTesting ? "과부하 경고" : "정상",
                  color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
                  pct: apmLoadTesting ? "w-[89.2%]" : "w-[12.4%]"
                },
                {
                  label: "메모리 사용량",
                  val: apmLoadTesting ? "81.7 %" : "39.5 %",
                  status: apmLoadTesting ? "스왑 발생" : "정상",
                  color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
                  pct: apmLoadTesting ? "w-[81.7%]" : "w-[39.5%]"
                },
                {
                  label: "DB 커넥션 풀",
                  val: apmLoadTesting ? "44 / 50" : "8 / 50",
                  status: apmLoadTesting ? "병목 위험" : "정상",
                  color: apmLoadTesting ? "text-amber-600 bg-amber-50 border border-amber-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
                  pct: apmLoadTesting ? "w-[88%]" : "w-[16%]"
                },
                {
                  label: "API 호출 트래픽 (RPS)",
                  val: apmLoadTesting ? "210.4 RPS" : "24.5 RPS",
                  status: apmLoadTesting ? "동시접속 폭주" : "여유",
                  color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-blue-600 bg-blue-50 border border-blue-200",
                  pct: apmLoadTesting ? "w-[95%]" : "w-[25%]"
                },
                {
                  label: "평균 응답속도 (Latency)",
                  val: apmLoadTesting ? "245 ms" : "32 ms",
                  status: apmLoadTesting ? "지연 누적" : "매우 빠름",
                  color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
                  pct: apmLoadTesting ? "w-[90%]" : "w-[12%]"
                }
              ].map((metric, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-md">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">{metric.label}</span>
                    <div className="flex justify-between items-baseline mt-2">
                      <span className="text-lg font-black text-slate-800">{metric.val}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${metric.color}`}>
                        {metric.status}
                      </span>
                    </div>
                  </div>
                  {/* Visual bar indicator */}
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-3.5">
                    <div className={`h-full rounded-full transition-all duration-500 ${apmLoadTesting ? "bg-rose-500" : "bg-blue-600"
                      }`} style={{ width: metric.pct.match(/\d+/)?.[0] + "%" }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Real-time API Logs Terminal */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2 pl-1">
                <span>인입 API 트래픽 실시간 모니터 (Live Endpoint Hits)</span>
                <span className="text-[10px] font-medium text-slate-500 font-mono">1.0s interval update</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-2.5 text-slate-300 max-h-48 overflow-y-auto">
                {apmLoadTesting ? (
                  <>
                    <div className="flex justify-between text-rose-400 animate-pulse">
                      <span>⚠️ [CRITICAL] 17:45:53 - DB CONNECTION POOL IS REACHING LIMIT! (88% UTILIZATION)</span>
                      <span>503 Service Unavailable</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>➔ 17:45:52 - POST /api/locations/push - 408 Timeout (2000ms delay) - Client IP: 211.23.41.98</span>
                      <span>408 TIMEOUT</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>➔ 17:45:51 - GET /api/dropoff/capacity - 200 OK (210ms) - Client IP: 14.12.80.201</span>
                      <span>200 OK</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-emerald-400">
                      <span>➔ 17:45:53 - GET /api/auth/profile - 200 OK (11ms) - Client User: GD-3-MANAGER</span>
                      <span>200 OK</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>➔ 17:45:52 - POST /api/dropoff/verification - 201 Created (18ms) - Client IP: 182.203.11.23</span>
                      <span>201 CREATED</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>➔ 17:45:50 - GET /api/site/dump-expenses - 200 OK (24ms) - Client User: GD-3-MANAGER</span>
                      <span>200 OK</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }

      // 2. 개발자 대시보드 (/dev)
      if (activePath === "/dev") {
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">시스템 가동상태</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">Active (정상)</p>
                </div>
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
                <span className="text-xs font-bold text-slate-500 block">FastAPI 호스트</span>
                <p className="text-base font-mono font-bold text-slate-800 mt-1">http://localhost:8000</p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
                <span className="text-xs font-bold text-slate-500 block">활성 DB 마이그레이션</span>
                <p className="text-base font-mono font-bold text-emerald-600 mt-1">a4f66f3 (최신)</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
              <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-200 pb-2 mb-4">개발자 빠른 도구 링크</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <button onClick={() => setActivePath("/dev/apm")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">APM 관제실</button>
                <button onClick={() => setActivePath("/dev/menus")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">ACL 메뉴 매핑</button>
                <button onClick={() => setActivePath("/dev/codes")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">공통 코드 관리</button>
                <button onClick={() => setActivePath("/dev/api")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">API 테스트기</button>
              </div>
            </div>
          </div>
        );
      }

      // 3. 앱/웹 통합 메뉴 관리 (/dev/menus)
      if (activePath === "/dev/menus") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">앱 & 웹 권한별 메뉴 관리자 (ACL Configurator)</h3>
                <p className="text-xs text-slate-500 mt-0.5">각 사용자 역할군별로 활성화될 모바일 앱 메뉴 및 통합 웹 화면 접근 권한을 동적으로 매핑합니다.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMenuTarget("web"); setMenuConfigSaveSuccess(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${menuTarget === "web" ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                >
                  관리자웹 메뉴 설정
                </button>
                <button
                  onClick={() => { setMenuTarget("app"); setMenuConfigSaveSuccess(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${menuTarget === "app" ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                >
                  모바일앱 메뉴 설정
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Select Active Role */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">권한 역할군 선택</div>
                {[
                  { id: "site_manager", name: "현장 관리자 (Site Manager)" },
                  { id: "dropoff_manager", name: "하차지 관리자 (Dropoff Manager)" },
                  { id: "platform_admin", name: "플랫폼 관리자 (Platform Admin)" },
                  { id: "owner", name: "차주/운송사 (B2B Owner)" },
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => { setMenuSelectedRole(role.id); setMenuConfigSaveSuccess(false); }}
                    className={`w-full p-2.5 rounded-lg border text-left text-xs font-semibold transition-colors ${menuSelectedRole === role.id
                        ? "bg-blue-50 border-blue-500/30 text-blue-600 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>

              {/* 2. Menu Checklist Configurator */}
              <div className="lg:col-span-2 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between min-h-[250px]">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-wider mb-3.5 pb-2 border-b border-slate-200">
                    <span>허용 메뉴 리스트 매핑</span>
                    <span className="text-[11px] text-blue-600">대상: {menuTarget === "web" ? "통합 웹" : "모바일 앱"}</span>
                  </div>

                  {menuConfigSaveSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4 transition-all">
                      ✓ 지정하신 역할의 메뉴 접근 권한(ACL) 설정이 실시간 데이터베이스 및 권한 라우터 레이어에 안전하게 저장 및 동기화 처리되었습니다!
                    </div>
                  )}

                  <div className="space-y-3">
                    {filteredMenus.length > 0 ? (
                      filteredMenus.map((menu) => (
                        <div
                          key={menu.id}
                          onClick={() => handleToggleMenuAllowed(menu.id)}
                          className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
                        >
                          <span className="text-xs font-bold text-slate-800">{menu.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${menu.allowed ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                              }`}>
                              {menu.allowed ? "활성화" : "비활성화"}
                            </span>
                            <input
                              type="checkbox"
                              checked={menu.allowed}
                              onChange={() => { }} // toggled via parent div click
                              className="w-4 h-4 rounded border-slate-200 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 text-center py-8">
                        이 역할에 대해 해당 시스템 타겟에 등록된 동적 메뉴 데이터가 존재하지 않습니다.
                      </div>
                    )}
                  </div>
                </div>

                {filteredMenus.length > 0 && (
                  <button
                    onClick={() => setMenuConfigSaveSuccess(true)}
                    className="w-full mt-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95"
                  >
                    권한별 메뉴 설정(ACL) 데이터베이스 저장
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }

      // 4. 공통 코드 설정 (/dev/codes)
      if (activePath === "/dev/codes") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">공통 코드 관리 대장</h2>
                <p className="text-xs text-slate-500 mt-1">시스템에서 사용되는 공통 파라미터 및 요율 한도를 정의합니다.</p>
              </div>
              <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 font-bold text-slate-500 pb-2">
                    <th className="py-2">코드 분류</th>
                    <th className="py-2">코드명</th>
                    <th className="py-2">설정값</th>
                    <th className="py-2 text-right">수정일자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 font-semibold text-slate-900">SYSTEM_FEE</td>
                    <td className="py-3">기본 중개 수수료</td>
                    <td className="py-3 font-mono text-blue-600 font-bold">8.5%</td>
                    <td className="py-3 text-right font-mono text-slate-400">2026-06-02</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-slate-900">BASE_TARIFF</td>
                    <td className="py-3">기본 운임</td>
                    <td className="py-3 font-mono text-blue-600 font-bold">180,000 원</td>
                    <td className="py-3 text-right font-mono text-slate-400">2026-06-02</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // 5. API 매핑 제어 (/dev/api)
      if (activePath === "/dev/api") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">백엔드 API 라우트 상태 테스트</h2>
                <p className="text-xs text-slate-500 mt-1">FastAPI 게이트웨이의 라우트 매핑 호출을 직접 트리거해 응답속도를 테스트합니다.</p>
              </div>
              <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                <span className="font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded">GET</span>
                <input
                  type="text"
                  value={inputText || "/api/auth/profile"}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded font-mono text-slate-700"
                />
                <button onClick={() => alert("API Gateway 호출이 성공적으로 완료되었습니다. (Status: 200)")} className="px-4 py-1.5 rounded bg-blue-600 text-white font-bold transition-all">
                  호출 테스트
                </button>
              </div>
            </div>
          </div>
        );
      }

      // 6. DB 테이블 조회 (/dev/db)
      if (activePath === "/dev/db") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">시스템 데이터베이스 스키마 조회</h2>
                <p className="text-xs text-slate-500 mt-1">Supabase PostgreSQL의 활성 물리 스키마 정보와 alembic 마이그레이션 이력입니다.</p>
              </div>
              <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700">물리 테이블 목록</span>
                <div className="space-y-2 mt-3 font-mono text-[10px] text-slate-600">
                  <div>• users (사용자 정보)</div>
                  <div>• drivers (기사 상세 정보)</div>
                  <div>• sites (반출 현장)</div>
                  <div>• dropoff_sites (하차지 정보)</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 md:col-span-2">
                <span className="font-bold text-slate-700">Alembic Migration History</span>
                <div className="mt-3 font-mono text-[10px] text-emerald-600 space-y-1">
                  <div>✓ a4f66f3 - Add commission rate schema (Active)</div>
                  <div>✓ 2c85bfa - Initialize database baseline tables</div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 7. 시스템 로그 분석 (/dev/logs)
      if (activePath === "/dev/logs") {
        return (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">시스템 로깅 센터</h2>
                <p className="text-xs text-slate-500 mt-1">운송 트랜잭션, 푸시 알림, 결제 연동에서 발생하는 시스템 에러/워닝을 모니터링합니다.</p>
              </div>
              <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
                ← 대시보드로 돌아가기
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
              <div>[INFO] 2026-06-02 17:45:10 - Connection Pool established successfully (8/50 active).</div>
              <div>[INFO] 2026-06-02 17:45:11 - GPS Broadcast channel open on port 9002.</div>
              <div className="text-amber-400">[WARN] 2026-06-02 17:45:12 - API response delay detected in /api/locations/push (230ms).</div>
            </div>
          </div>
        );
      }

      return (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-20 animate-fadeIn">
          <h2 className="text-lg font-bold text-slate-800">개발 진행 중</h2>
          <p className="text-xs text-slate-500 mt-2">선택하신 {activePath} 메뉴는 추가 개발 연동 대기 중입니다.</p>
        </div>
      );
    };

    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Header with Title & breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div>
            <div className="text-xs font-bold text-blue-600/80 tracking-widest uppercase mb-1">
              DUMPRING ADMIN PORTAL
            </div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
              통합 관리 콘솔
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              접속 권한: <strong className="text-slate-700 font-bold">{user.roleName}</strong> 계정으로 제어 및 조회 중입니다.
            </p>
          </div>

          {/* Quick Role Select Info Alert */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 max-w-sm">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              하단의 <strong>'권한 빠른 시뮬레이션'</strong>을 눌러 권한을 바꿀 수 있습니다. 실시간으로 좌측 메뉴 구성과 대시보드가 알맞게 변환됩니다.
            </p>
          </div>
        </div>

        {/* Dynamic Content based on User Role */}
        {user.role === "platform_admin" && renderPlatformAdmin()}
        {user.role === "site_manager" && renderSiteManager()}
        {user.role === "dropoff_manager" && renderDropoffManager()}
        {user.role === "owner" && renderOwner()}
        {user.role === "developer" && renderDeveloper()}
      </div>
    );
  }