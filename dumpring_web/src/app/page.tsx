"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";

import { PlatformAdminDashboard } from "@/components/dashboard/PlatformAdminDashboard";
import { SiteManagerDashboard } from "@/components/dashboard/SiteManagerDashboard";
import { DropoffManagerDashboard } from "@/components/dashboard/DropoffManagerDashboard";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { DeveloperDashboard } from "@/components/dashboard/DeveloperDashboard";

export default function Home() {
  const { user, changeRole, activePath, setActivePath } = useAuth();
  const [inputText, setInputText] = useState("");

  const getApiBaseUrl = () => {
    if (typeof window !== "undefined") {
      if (window.location.hostname.includes("vercel.app") || !window.location.hostname.includes("localhost")) {
        return "https://dumpring-api.onrender.com";
      }
    }
    return "http://localhost:8000";
  };
  const API_BASE_URL = getApiBaseUrl();


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
  const [selectedSiteDocTab, setSelectedSiteDocTab] = useState<"BIZ_LICENSE" | "CONSTRUCTION_PROOF" | "BANKBOOK">("BIZ_LICENSE");
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
      const res = await fetch(`${API_BASE_URL}/api/common-codes`);
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

  const fetchPendingMembers = async () => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/pending-members`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // data format: [{id, type, name, phone_number, docs, created_at}]
        const backendDrivers = data
          .filter((item: any) => item.type && item.type.includes("기사"))
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            phone: item.phone_number,
            license: item.docs || "1종대형면허",
            status: "대기"
          }));

        const backendOwners = data
          .filter((item: any) => item.type && item.type.includes("차주"))
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            phone: item.phone_number,
            vehicle: item.docs || "인천 80바 4531 (25.5톤)",
            status: "대기"
          }));

        const backendSites = data
          .filter((item: any) => item.type && item.type.includes("현장"))
          .map((item: any) => ({
            id: item.id,
            name: item.site_name || `${item.name || "미지정"}의 현장`,
            company: item.company_name || "협력 도급사",
            code: `GD-${item.id}-DUMP`,
            status: "대기",
            phone: item.phone_number,
            managerName: item.name || "미지정",
            bizRegNo: item.business_number || "미등록",
            address: item.address || "현장 주소 미등록",
            registeredSites: [item.site_name || `${item.name || "미지정"}의 현장`]
          }));

        const backendDropoffs = data
          .filter((item: any) => item.type && item.type.includes("하차지"))
          .map((item: any) => ({
            id: item.id,
            name: item.location_name || `${item.name || "미지정"}의 사토장`,
            company: item.company_name || "개인지주 법인",
            status: "대기",
            capacity: item.capacity || "80,000 ㎥",
            phone: item.phone_number,
            bizRegNo: item.permit_number || "허가증 미등록",
            address: item.address || "하차지 주소 미등록",
            registeredLandfills: [item.location_name || `${item.name || "미지정"}의 사토장`]
          }));

        setDrivers(backendDrivers);
        setOwners(backendOwners);
        setSites(backendSites);
        setDropoffSites(backendDropoffs);
      }
    } catch (e) {
      console.error("Failed to fetch pending members from backend:", e);
    }
  };

  const fetchRegisteredSites = async () => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/sites/admin-sites`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      console.log("fetchRegisteredSites Status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("fetchRegisteredSites Data:", data);
        // map db ConstructionSite fields to frontend properties
        const mapped = data.map((site: any) => ({
          id: site.id,
          name: site.site_name || "현장명 없음", // 현장명
          companyName: site.company_name || "건설업체명 없음", // 건설업체명
          address: site.site_address || "현장 주소 미등록", // 현장 주소
          roadDesc: site.road_desc || "정문 차단기 통과 후 진입", // 진입로 설명
          managers: [site.billing_email || "billing@dumpring.com"], // 담당자/이메일 리스트
          bizRegNo: site.business_number || "",
          siteKey: site.site_key || ""
        }));
        setRegisteredSiteList(mapped);
      } else {
        const errTxt = await res.text();
        console.warn("fetchRegisteredSites fail txt:", errTxt);
      }
    } catch (e) {
      console.error("Failed to fetch registered sites:", e);
    }
  };

  const handleCreateSite = async (siteData: { name: string; companyName: string; address: string; roadDesc: string; managers: string; bizRegNo: string }) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/sites/admin-sites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          site_name: siteData.name,
          company_name: siteData.companyName,
          business_number: siteData.bizRegNo || "000-00-00000",
          site_address: siteData.address,
          geofencing_radius: 200.0
        })
      });
      if (res.ok) {
        await fetchRegisteredSites();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to create site in DB:", e);
      return false;
    }
  };

  const handleUpdateSite = async (id: number, siteData: { name: string; companyName: string; address: string; roadDesc: string; managers: string; bizRegNo: string }) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/sites/admin-sites/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          site_name: siteData.name,
          company_name: siteData.companyName,
          business_number: siteData.bizRegNo,
          site_address: siteData.address
        })
      });
      if (res.ok) {
        await fetchRegisteredSites();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to update site in DB:", e);
      return false;
    }
  };

  const handleDeleteSite = async (id: number) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/sites/admin-sites/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        await fetchRegisteredSites();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to delete site from DB:", e);
      return false;
    }
  };

  // ──────────────────────────────────────────────
  // 배차 요청(JobPost) API 연동
  // ──────────────────────────────────────────────

  /** 현장관리자 본인의 배차 공고 목록 조회 */
  const fetchDispatchRequests = async () => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/jobs/my-posts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((job: any) => ({
          id: job.id,
          siteId: job.site_id,
          siteName: job.site_name || "현장명 없음",
          tonTypes: job.truck_type ? [job.truck_type] : [],
          truckCount: job.required_trucks || 1,
          soilType: job.material_type || "일반 토사",
          startDate: job.work_date ? job.work_date.substring(0, 10) : "",
          endDate: job.work_date ? job.work_date.substring(0, 10) : "",
          dropoffMode: job.matched_drop_off_id ? "search" : (job.drop_off_request_id ? "search" : "none"),
          dropoffName: job.drop_off_name || "",
          dropoffAddress: job.drop_off_address || "",
          status: (() => {
            switch (job.status) {
              case "OPEN": return "배차완료";
              case "WAITING_APPROVAL": return "승인대기";
              case "WAITING_MATCH": return "매칭대기";
              case "CLOSED": return "마감";
              default: return "대기중";
            }
          })(),
          rawStatus: job.status,
          memo: job.memo || "",
          offeredUnitPrice: job.offered_unit_price || 0,
          distance: job.distance,
          estimatedTime: job.estimated_time,
        }));
        setDispatchRequestList(mapped);
      } else {
        console.warn("fetchDispatchRequests failed:", res.status);
      }
    } catch (e) {
      console.error("fetchDispatchRequests error:", e);
    }
  };

  /** 현재 OPEN 상태인 하차지 수용 공고 목록 조회 (현장관리자가 하차지 선택용으로 사용) */
  const fetchOpenDropOffRequests = async () => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/drop-offs/requests`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((req: any) => ({
          id: req.id,
          // 하차지 수용 공고 ID (흐름 A에서 JobPost 생성 시 drop_off_request_id로 사용)
          dropOffId: req.drop_off_id,
          name: req.drop_off_name || `하차지 #${req.drop_off_id}`,
          address: req.drop_off_address || "",
          soilType: req.material_type || "",
          truckType: req.truck_type || "",
          targetQuantity: req.target_quantity || 0,
          currentQuantity: req.current_quantity || 0,
          unitPrice: req.unit_price || 0,
          payerType: req.payer_type || "",
          startDate: req.start_date ? req.start_date.substring(0, 10) : "",
          endDate: req.end_date ? req.end_date.substring(0, 10) : "",
          soilDealType: req.payer_type === "SITE_PAYS" ? "buy" : "sell",
        }));
        setRegisteredDropoffList(mapped);
      } else {
        console.warn("fetchOpenDropOffRequests failed:", res.status);
      }
    } catch (e) {
      console.error("fetchOpenDropOffRequests error:", e);
    }
  };

  /**
   * [흐름 B] 현장이 먼저 공고 등록 (하차지 미지정) → WAITING_MATCH
   * SiteManagerDashboard의 배차 요청 등록 시 호출
   */
  const handleCreateDispatch = async (formData: {
    siteId: number;
    materialType: string;
    truckType: string;
    workDate: string;
    requiredTrucks: number;
    offeredUnitPrice: number;
    payerType: string;
    memo: string;
    dropOffRequestId?: number; // 흐름 A: 하차지 공고 지정 시
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");

      let endpoint = `${API_BASE_URL}/api/jobs/site-post`;
      let body: any = {
        site_id: formData.siteId,
        material_type: formData.materialType,
        truck_type: formData.truckType,
        work_date: formData.workDate,
        required_trucks: formData.requiredTrucks,
        offered_unit_price: formData.offeredUnitPrice,
        payer_type: formData.payerType,
        memo: formData.memo,
      };

      // 흐름 A: 하차지 수용 공고를 지정한 경우
      if (formData.dropOffRequestId) {
        endpoint = `${API_BASE_URL}/api/jobs`;
        body = {
          site_id: formData.siteId,
          drop_off_request_id: formData.dropOffRequestId,
          work_date: formData.workDate,
          required_trucks: formData.requiredTrucks,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await fetchDispatchRequests();
        return { success: true };
      }
      const errText = await res.text();
      console.error("handleCreateDispatch failed:", res.status, errText);
      try {
        const errJson = JSON.parse(errText);
        return { success: false, message: errJson.detail || "등록 요청 중 오류가 발생했습니다." };
      } catch (parseErr) {
        return { success: false, message: `등록 실패 (상태코드: ${res.status})` };
      }
    } catch (e) {
      console.error("handleCreateDispatch error:", e);
      return { success: false, message: "네트워크 오류가 발생했습니다." };
    }
  };

  /** 배차 공고 수정 */
  const handleUpdateDispatch = async (id: number, formData: {
    materialType?: string;
    truckType?: string;
    workDate?: string;
    requiredTrucks?: number;
    offeredUnitPrice?: number;
    payerType?: string;
    memo?: string;
  }) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...(formData.materialType && { material_type: formData.materialType }),
          ...(formData.truckType && { truck_type: formData.truckType }),
          ...(formData.workDate && { work_date: formData.workDate }),
          ...(formData.requiredTrucks && { required_trucks: formData.requiredTrucks }),
          ...(formData.offeredUnitPrice !== undefined && { offered_unit_price: formData.offeredUnitPrice }),
          ...(formData.payerType && { payer_type: formData.payerType }),
          ...(formData.memo !== undefined && { memo: formData.memo }),
        })
      });
      if (res.ok) {
        await fetchDispatchRequests();
        return true;
      }
      console.error("handleUpdateDispatch failed:", res.status);
      return false;
    } catch (e) {
      console.error("handleUpdateDispatch error:", e);
      return false;
    }
  };

  /** 배차 공고 삭제 (현재 백엔드에 DELETE 엔드포인트 없음 → 로컬 제거만 수행) */
  const handleDeleteDispatch = async (id: number) => {
    // 백엔드 DELETE /api/jobs/jobs/{id} 엔드포인트가 추가될 경우 아래에 API 호출 삽입
    setDispatchRequestList(prev => prev.filter(r => r.id !== id));
    return true;
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchRegisteredSites();
    fetchOpenDropOffRequests();
  }, []);

  useEffect(() => {
    if (activePath === "/admin/codes" || activePath === "/dev/codes") {
      fetchCommonCodes();
    }
    if (activePath === "/admin/approve-driver" || activePath === "/admin/approve-owner" || activePath === "/admin/approve-site" || activePath === "/admin/approve-dropoff" || activePath === "/admin") {
      fetchPendingMembers();
    }
    if (activePath === "/site" || activePath === "/site/request") {
      fetchRegisteredSites();
    }
    if (activePath === "/site/dispatch-request") {
      fetchDispatchRequests();
      fetchOpenDropOffRequests();
    }
  }, [activePath]);

  // FAQ Board States
  const [faqs, setFaqs] = useState([
    { id: 1, category: "기사", q: "제출 서류 심사는 얼마나 걸리나요?", a: "기사 면허 및 화물종사자 자격증 심사는 보통 가입 신청 후 영업일 기준 1~2시간 이내에 완료되며, 결과는 SMS로 즉시 전송됩니다." },
    { id: 2, category: "현장관리자", q: "공사현장 정산코드는 어떻게 발급받나요?", a: "현장관리자 가입 승인 단계에서 비산먼지 배출신고서 및 공사 계약서 검증이 완료되는 즉시 시스템에서 고유 정산코드가 자동 발급됩니다." },
    { id: 3, category: "하차지", q: "매립지 수용량이 꽉 차면 어떻게 되나요?", a: "지정 수용한도 용량에 도달하면 해당 하차지는 배차 시스템에서 자동으로 매칭 비활성화 처리되며, 추가 개발행위 허가 완료 시 한도 수정 등록이 가능합니다." },
    { id: 4, category: "공통", q: "수수료 정산 및 세금계산서 발행 주기가 어떻게 되나요?", a: "플랫폼 수임 수수료 정산은 매월 말일 일괄 집계되며, 익월 5일 영업용 세금계산서가 플랫폼을 통해 자동 전자 발행됩니다." }
  ]);
  const [faqCategoryFilter, setFaqCategoryFilter] = useState("전체");
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);

  // 1:1 Inquiry States
  const [inquiries, setInquiries] = useState([
    { id: 1, title: "정산 데이터 지연 문제", content: "모바일에서 가끔 정산 데이터가 2초 정도 늦게 뜹니다. 검단 3공구 진입 정산 화면 로딩 속도 지연 확인 요청합니다.", author: "삼부 현장 김과장", date: "2026-06-02", status: "대기 중", reply: "" },
    { id: 2, title: "화물종사 자격증 승인 반려 문의", content: "화물종사자 자격증 사진이 선명하게 나왔는데 왜 심사에서 반려되었나요? 재신청 방법 문의드립니다.", author: "박길동 기사", date: "2026-06-01", status: "대기 중", reply: "" },
    { id: 3, title: "정산 세금계산서 자동 발행 시점", content: "B2B 파트너 정산 시 매월 5일에 세금계산서가 발행된다고 나와 있는데 메일로도 같이 수신이 되나요?", author: "대진운송 최 대표", date: "2026-05-30", status: "답변 완료", reply: "네, 대표 이메일로도 세금계산서 XML 파일 및 PDF 사본이 자동으로 동시 발송됩니다." }
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
  const [drivers, setDrivers] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [dropoffSites, setDropoffSites] = useState<any[]>([]);

  // Disputes & Support States
  const [disputes, setDisputes] = useState([
    { id: 1, type: "운임 미지급", desc: "김포 사토장 - 송도 운행 2건 운임 미지급", reporter: "홍길동 차주", status: "대기", date: "2026-05-27" },
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
  const [registeredSiteList, setRegisteredSiteList] = useState<any[]>([]);

  const [dispatchRequestList, setDispatchRequestList] = useState<any[]>([]);

  // Form states for Site Request
  const [siteFormName, setSiteFormName] = useState("");
  const [siteFormCompanyName, setSiteFormCompanyName] = useState("");
  const [siteFormAddress, setSiteFormAddress] = useState("");
  const [siteFormRoadDesc, setSiteFormRoadDesc] = useState("");
  const [siteFormManagers, setSiteFormManagers] = useState("");
  const [siteFormSearchQuery, setSiteFormSearchQuery] = useState("");
  const [siteFormSelectedManager, setSiteFormSelectedManager] = useState("");

  // Form states for Dispatch Request
  const [dispatchFormSiteId, setDispatchFormSiteId] = useState<number | "">("");
  const [dispatchFormTonTypes, setDispatchFormTonTypes] = useState<string[]>([]);
  const [dispatchFormTruckCount, setDispatchFormTruckCount] = useState(1);
  const [dispatchFormSoilType, setDispatchFormSoilType] = useState("GOOD_SOIL");
  const [dispatchFormStartDate, setDispatchFormStartDate] = useState("");
  const [dispatchFormEndDate, setDispatchFormEndDate] = useState("");
  const [dispatchFormDropoffMode, setDispatchFormDropoffMode] = useState<"direct" | "search" | "none">("none");
  const [dispatchFormDropoffName, setDispatchFormDropoffName] = useState("");
  const [dispatchFormDropoffAddress, setDispatchFormDropoffAddress] = useState("");
  const [dispatchFormDropoffCapacity, setDispatchFormDropoffCapacity] = useState("");
  const [dispatchFormDropoffSoilType, setDispatchFormDropoffSoilType] = useState("일반 토사");
  const [dispatchFormPayerType, setDispatchFormPayerType] = useState("SITE_PAYS");
  const [dispatchFormOfferedUnitPrice, setDispatchFormOfferedUnitPrice] = useState<number>(0);
  const [dispatchRequestMode, setDispatchRequestMode] = useState<"list" | "create" | "edit" | "detail">("list");
  const [editingDispatchRequestId, setEditingDispatchRequestId] = useState<number | null>(null);
  const [dispatchRequestSearchQuery, setDispatchRequestSearchQuery] = useState("");

  // --- Dropoff States ---
  const [registeredDropoffList, setRegisteredDropoffList] = useState<any[]>([]);

  // Form states for Dropoff Registration
  const [dropoffFormName, setDropoffFormName] = useState("");
  const [dropoffFormAddress, setDropoffFormAddress] = useState("");
  const [dropoffFormManagers, setDropoffFormManagers] = useState("");
  const [dropoffFormSoilTypes, setDropoffFormSoilTypes] = useState<string[]>(["일반 토사"]);
  const [dropoffFormCapacity, setDropoffFormCapacity] = useState("");
  const [dropoffFormSoilDealType, setDropoffFormSoilDealType] = useState<"buy" | "sell">("sell");

  if (!user) return null;

  const handleApproveDriver = async (id: number) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:8000/api/auth/admin/members/${id}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setDrivers(prev =>
          prev.map(d => d.id === id ? { ...d, status: "승인됨" } : d)
        );
        fetchPendingMembers();
      }
    } catch (e) {
      console.error("Failed to approve member in backend:", e);
    }
  };

  const handleApproveOwner = async (id: number) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:8000/api/auth/admin/members/${id}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setOwners(prev =>
          prev.map(o => o.id === id ? { ...o, status: "승인됨" } : o)
        );
        fetchPendingMembers();
      }
    } catch (e) {
      console.error("Failed to approve member in backend:", e);
    }
  };


  const handleApproveSite = async (id: number) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:8000/api/auth/admin/members/${id}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSites(prev =>
          prev.map(s => s.id === id ? { ...s, status: "승인됨", code: `GD-${id}-DUMP` } : s)
        );
        fetchPendingMembers();
      }
    } catch (e) {
      console.error("Failed to approve site in backend:", e);
    }
  };

  const handleApproveDropoff = async (id: number) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:8000/api/auth/admin/members/${id}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setDropoffSites(prev =>
          prev.map(site => site.id === id ? { ...site, status: "승인됨" } : site)
        );
        fetchPendingMembers();
      }
    } catch (e) {
      console.error("Failed to approve dropoff in backend:", e);
    }
  };

  const handleRejectMember = async (id: number, reason: string) => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:8000/api/auth/admin/members/${id}/reject?reject_reason=${encodeURIComponent(reason)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchPendingMembers();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to reject member in backend:", e);
      return false;
    }
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

      </div>

      {/* Dynamic Content based on User Role */}
      {user.role === "platform_admin" && (
        <PlatformAdminDashboard
          activePath={activePath}
          setActivePath={setActivePath}
          commissionRate={commissionRate}
          setCommissionRate={setCommissionRate}
          baseTariff={baseTariff}
          setBaseTariff={setBaseTariff}
          tonnages={tonnages}
          setTonnages={setTonnages}
          dbCommonCodes={dbCommonCodes}
          setDbCommonCodes={setDbCommonCodes}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          isCodesLoading={isCodesLoading}
          setIsCodesLoading={setIsCodesLoading}
          newGroupCode={newGroupCode}
          setNewGroupCode={setNewGroupCode}
          newCodeVal={newCodeVal}
          setNewCodeVal={setNewCodeVal}
          newCodeName={newCodeName}
          setNewCodeName={setNewCodeName}
          newDisplayOrder={newDisplayOrder}
          setNewDisplayOrder={setNewDisplayOrder}
          faqs={faqs}
          setFaqs={setFaqs}
          faqCategoryFilter={faqCategoryFilter}
          setFaqCategoryFilter={setFaqCategoryFilter}
          expandedFaqId={expandedFaqId}
          setExpandedFaqId={setExpandedFaqId}
          inquiries={inquiries}
          setInquiries={setInquiries}
          expandedInquiryId={expandedInquiryId}
          setExpandedInquiryId={setExpandedInquiryId}
          replyTexts={replyTexts}
          setReplyTexts={setReplyTexts}
          inquiryFilter={inquiryFilter}
          setInquiryFilter={setInquiryFilter}
          notices={notices}
          setNotices={setNotices}
          newNoticeTitle={newNoticeTitle}
          setNewNoticeTitle={setNewNoticeTitle}
          newNoticeTarget={newNoticeTarget}
          setNewNoticeTarget={setNewNoticeTarget}
          newNoticeContent={newNoticeContent}
          setNewNoticeContent={setNewNoticeContent}
          boardActiveTab={boardActiveTab}
          setBoardActiveTab={setBoardActiveTab}
          drivers={drivers}
          setDrivers={setDrivers}
          owners={owners}
          setOwners={setOwners}
          sites={sites}
          setSites={setSites}
          dropoffSites={dropoffSites}
          setDropoffSites={setDropoffSites}
          disputes={disputes}
          setDisputes={setDisputes}
          selectedDriverForVerify={selectedDriverForVerify}
          setSelectedDriverForVerify={setSelectedDriverForVerify}
          verifyZoom={verifyZoom}
          setVerifyZoom={setVerifyZoom}
          selectedDocTab={selectedDocTab}
          setSelectedDocTab={setSelectedDocTab}
          verifyRotate={verifyRotate}
          setVerifyRotate={setVerifyRotate}
          panX={panX}
          setPanX={setPanX}
          panY={panY}
          setPanY={setPanY}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          dragStart={dragStart}
          setDragStart={setDragStart}
          selectedOwnerForVerify={selectedOwnerForVerify}
          setSelectedOwnerForVerify={setSelectedOwnerForVerify}
          selectedSiteForVerify={selectedSiteForVerify}
          setSelectedSiteForVerify={setSelectedSiteForVerify}
          selectedDropoffForVerify={selectedDropoffForVerify}
          setSelectedDropoffForVerify={setSelectedDropoffForVerify}
          selectedOwnerDocTab={selectedOwnerDocTab}
          setSelectedOwnerDocTab={setSelectedOwnerDocTab}
          selectedSiteDocTab={selectedSiteDocTab}
          setSelectedSiteDocTab={setSelectedSiteDocTab}
          selectedDropoffDocTab={selectedDropoffDocTab}
          setSelectedDropoffDocTab={setSelectedDropoffDocTab}
          uploadedFiles={uploadedFiles}
          handleFileUpload={handleFileUpload}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleApproveDriver={handleApproveDriver}
          handleApproveOwner={handleApproveOwner}
          handleApproveSite={handleApproveSite}
          handleApproveDropoff={handleApproveDropoff}
          handleRejectMember={handleRejectMember}
          handleResolveDispute={handleResolveDispute}
          fetchCommonCodes={fetchCommonCodes}
          calcMethod={calcMethod}
          setCalcMethod={setCalcMethod}
          continuousDistanceFare={continuousDistanceFare}
          setContinuousDistanceFare={setContinuousDistanceFare}
          continuousTimeFare={continuousTimeFare}
          setContinuousTimeFare={setContinuousTimeFare}
          overPlanDistanceFare={overPlanDistanceFare}
          setOverPlanDistanceFare={setOverPlanDistanceFare}
          overPlanTimeFare={overPlanTimeFare}
          setOverPlanTimeFare={setOverPlanTimeFare}
          policySaveSuccess={policySaveSuccess}
          setPolicySaveSuccess={setPolicySaveSuccess}
          approvalTab={approvalTab}
          setApprovalTab={setApprovalTab}
          userTab={userTab}
          setUserTab={setUserTab}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          isAddUserModalOpen={isAddUserModalOpen}
          setIsAddUserModalOpen={setIsAddUserModalOpen}
          editingUser={editingUser}
          setEditingUser={setEditingUser}
          viewingUserDetails={viewingUserDetails}
          setViewingUserDetails={setViewingUserDetails}
          userFormName={userFormName}
          setUserFormName={setUserFormName}
          userFormPhone={userFormPhone}
          setUserFormPhone={setUserFormPhone}
          userFormStatus={userFormStatus}
          setUserFormStatus={setUserFormStatus}
          userFormExtra1={userFormExtra1}
          setUserFormExtra1={setUserFormExtra1}
          userFormExtra2={userFormExtra2}
          setUserFormExtra2={setUserFormExtra2}
        />
      )}
      {user.role === "site_manager" && (
        <SiteManagerDashboard
          activePath={activePath}
          setActivePath={setActivePath}
          siteFormName={siteFormName}
          setSiteFormName={setSiteFormName}
          siteFormCompanyName={siteFormCompanyName}
          setSiteFormCompanyName={setSiteFormCompanyName}
          siteFormAddress={siteFormAddress}
          setSiteFormAddress={setSiteFormAddress}
          siteFormRoadDesc={siteFormRoadDesc}
          setSiteFormRoadDesc={setSiteFormRoadDesc}
          siteFormManagers={siteFormManagers}
          setSiteFormManagers={setSiteFormManagers}
          siteFormSearchQuery={siteFormSearchQuery}
          setSiteFormSearchQuery={setSiteFormSearchQuery}
          registeredSiteList={registeredSiteList}
          setRegisteredSiteList={setRegisteredSiteList}
          dispatchFormSiteId={dispatchFormSiteId}
          setDispatchFormSiteId={setDispatchFormSiteId}
          dispatchFormTonTypes={dispatchFormTonTypes}
          setDispatchFormTonTypes={setDispatchFormTonTypes}
          dispatchFormTruckCount={dispatchFormTruckCount}
          setDispatchFormTruckCount={setDispatchFormTruckCount}
          dispatchFormSoilType={dispatchFormSoilType}
          setDispatchFormSoilType={setDispatchFormSoilType}
          dispatchFormStartDate={dispatchFormStartDate}
          setDispatchFormStartDate={setDispatchFormStartDate}
          dispatchFormEndDate={dispatchFormEndDate}
          setDispatchFormEndDate={setDispatchFormEndDate}
          dispatchFormDropoffMode={dispatchFormDropoffMode}
          setDispatchFormDropoffMode={setDispatchFormDropoffMode}
          dispatchFormDropoffName={dispatchFormDropoffName}
          setDispatchFormDropoffName={setDispatchFormDropoffName}
          dispatchFormDropoffAddress={dispatchFormDropoffAddress}
          setDispatchFormDropoffAddress={setDispatchFormDropoffAddress}
          dispatchFormDropoffCapacity={dispatchFormDropoffCapacity}
          setDispatchFormDropoffCapacity={setDispatchFormDropoffCapacity}
          dispatchFormDropoffSoilType={dispatchFormDropoffSoilType}
          setDispatchFormDropoffSoilType={setDispatchFormDropoffSoilType}
          dispatchRequestMode={dispatchRequestMode}
          setDispatchRequestMode={setDispatchRequestMode}
          editingDispatchRequestId={editingDispatchRequestId}
          setEditingDispatchRequestId={setEditingDispatchRequestId}
          dispatchRequestSearchQuery={dispatchRequestSearchQuery}
          setDispatchRequestSearchQuery={setDispatchRequestSearchQuery}
          dispatchRequestList={dispatchRequestList}
          setDispatchRequestList={setDispatchRequestList}
          registeredDropoffList={registeredDropoffList}
          taxInvoiceApproved={taxInvoiceApproved}
          setTaxInvoiceApproved={setTaxInvoiceApproved}
          handleCreateSite={handleCreateSite}
          handleUpdateSite={handleUpdateSite}
          handleDeleteSite={handleDeleteSite}
          handleCreateDispatch={handleCreateDispatch}
          handleUpdateDispatch={handleUpdateDispatch}
          handleDeleteDispatch={handleDeleteDispatch}
          fetchDispatchRequests={fetchDispatchRequests}
          dispatchFormPayerType={dispatchFormPayerType}
          setDispatchFormPayerType={setDispatchFormPayerType}
          dispatchFormOfferedUnitPrice={dispatchFormOfferedUnitPrice}
          setDispatchFormOfferedUnitPrice={setDispatchFormOfferedUnitPrice}
        />
      )}
      {user.role === "dropoff_manager" && (
        <DropoffManagerDashboard
          activePath={activePath}
          setActivePath={setActivePath}
          dropoffFormName={dropoffFormName}
          setDropoffFormName={setDropoffFormName}
          dropoffFormAddress={dropoffFormAddress}
          setDropoffFormAddress={setDropoffFormAddress}
          dropoffFormManagers={dropoffFormManagers}
          setDropoffFormManagers={setDropoffFormManagers}
          dropoffFormSoilTypes={dropoffFormSoilTypes}
          setDropoffFormSoilTypes={setDropoffFormSoilTypes}
          dropoffFormCapacity={dropoffFormCapacity}
          setDropoffFormCapacity={setDropoffFormCapacity}
          dropoffFormSoilDealType={dropoffFormSoilDealType}
          setDropoffFormSoilDealType={setDropoffFormSoilDealType}
          registeredDropoffList={registeredDropoffList}
          setRegisteredDropoffList={setRegisteredDropoffList}
          inboundTrucks={inboundTrucks}
          handleVerifyInbound={handleVerifyInbound}
          dropoffVerifiedCount={dropoffVerifiedCount}
        />
      )}
      {user.role === "owner" && (
        <OwnerDashboard
          activePath={activePath}
          setActivePath={setActivePath}
          ownerBroadcastSuccess={ownerBroadcastSuccess}
          setOwnerBroadcastSuccess={setOwnerBroadcastSuccess}
        />
      )}
      {user.role === "developer" && (
        <DeveloperDashboard
          activePath={activePath}
          setActivePath={setActivePath}
          developerMenus={developerMenus}
          menuTarget={menuTarget}
          setMenuTarget={setMenuTarget}
          menuSelectedRole={menuSelectedRole}
          setMenuSelectedRole={setMenuSelectedRole}
          menuConfigSaveSuccess={menuConfigSaveSuccess}
          setMenuConfigSaveSuccess={setMenuConfigSaveSuccess}
          handleToggleMenuAllowed={handleToggleMenuAllowed}
          apmLoadTesting={apmLoadTesting}
          setApmLoadTesting={setApmLoadTesting}
          inputText={inputText}
          setInputText={setInputText}
          dbCommonCodes={dbCommonCodes}
          fetchCommonCodes={fetchCommonCodes}
        />
      )}
    </div>
  );
}