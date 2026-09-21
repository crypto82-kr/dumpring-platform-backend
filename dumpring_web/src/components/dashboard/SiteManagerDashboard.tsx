import React, { useState } from "react";
import { PlusCircle, Search, AlertCircle, Truck, MapPin, Clock } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";
import { MockMap } from "./MockMap";
import { MatchStatusCard } from "./MatchStatusCard";

interface SiteManagerDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  siteFormName: string;
  setSiteFormName: (val: string) => void;
  siteFormCompanyName: string;
  setSiteFormCompanyName: (val: string) => void;
  siteFormAddress: string;
  setSiteFormAddress: (val: string) => void;
  siteFormRoadDesc: string;
  setSiteFormRoadDesc: (val: string) => void;
  siteFormManagers: string;
  setSiteFormManagers: (val: string) => void;
  siteFormSearchQuery: string;
  setSiteFormSearchQuery: (val: string) => void;
  registeredSiteList: any[];
  setRegisteredSiteList: React.Dispatch<React.SetStateAction<any[]>>;
  dispatchFormSiteId: number | "";
  setDispatchFormSiteId: (val: number | "") => void;
  dispatchFormTonTypes: string[];
  setDispatchFormTonTypes: React.Dispatch<React.SetStateAction<string[]>>;
  dispatchFormTruckCount: number;
  setDispatchFormTruckCount: (val: number) => void;
  dispatchFormSoilType: string;
  setDispatchFormSoilType: (val: string) => void;
  dispatchFormStartDate: string;
  setDispatchFormStartDate: (val: string) => void;
  dispatchFormEndDate: string;
  setDispatchFormEndDate: (val: string) => void;
  dispatchFormDropoffMode: "direct" | "search" | "none";
  setDispatchFormDropoffMode: (val: "direct" | "search" | "none") => void;
  dispatchFormDropoffName: string;
  setDispatchFormDropoffName: (val: string) => void;
  dispatchFormDropoffAddress: string;
  setDispatchFormDropoffAddress: (val: string) => void;
  dispatchFormDropoffCapacity: string;
  setDispatchFormDropoffCapacity: (val: string) => void;
  dispatchFormDropoffSoilType: string;
  setDispatchFormDropoffSoilType: (val: string) => void;
  dispatchRequestMode: "list" | "create" | "edit" | "detail";
  setDispatchRequestMode: (val: "list" | "create" | "edit" | "detail") => void;
  editingDispatchRequestId: number | null;
  setEditingDispatchRequestId: (val: number | null) => void;
  dispatchRequestSearchQuery: string;
  setDispatchRequestSearchQuery: (val: string) => void;
  dispatchRequestList: any[];
  setDispatchRequestList: React.Dispatch<React.SetStateAction<any[]>>;
  registeredDropoffList: any[];
  dropoffRequestList?: any[];
  taxInvoiceApproved: boolean;
  setTaxInvoiceApproved: (val: boolean) => void;
  handleCreateSite: (site: { name: string; companyName: string; address: string; roadDesc: string; managers: string; bizRegNo: string; biz_license_url?: string; dust_report_url?: string }) => Promise<boolean>;
  handleUpdateSite: (id: number, site: { name: string; companyName: string; address: string; roadDesc: string; managers: string; bizRegNo: string; biz_license_url?: string; dust_report_url?: string }) => Promise<boolean>;
  handleDeleteSite: (id: number) => Promise<boolean>;
  handleCreateDispatch: (formData: {
    siteId: number;
    materialType: string;
    truckType: string;
    workDate: string;
    requiredTrucks: number;
    offeredUnitPrice: number;
    payerType: string;
    memo: string;
    dropOffRequestId?: number;
  }) => Promise<{ success: boolean; message?: string }>;
  handleUpdateDispatch: (id: number, formData: {
    materialType?: string;
    truckType?: string;
    workDate?: string;
    requiredTrucks?: number;
    offeredUnitPrice?: number;
    payerType?: string;
    memo?: string;
    dropOffRequestId?: number | null;
  }) => Promise<boolean>;
  handleDeleteDispatch: (id: number) => Promise<boolean>;
  fetchDispatchRequests: () => Promise<void>;
  dispatchFormPayerType: string;
  setDispatchFormPayerType: (val: string) => void;
  dispatchFormOfferedUnitPrice: number;
  setDispatchFormOfferedUnitPrice: (val: number) => void;
  handleConfirmMatchJobPost?: (id: number) => Promise<boolean>;
  handleRejectMatchJobPost?: (id: number, reason: string) => Promise<boolean>;
  handleResetMatchJobPost?: (id: number) => Promise<boolean>;
}

export function SiteManagerDashboard({
  activePath,
  setActivePath,
  siteFormName,
  setSiteFormName,
  siteFormCompanyName,
  setSiteFormCompanyName,
  siteFormAddress,
  setSiteFormAddress,
  siteFormRoadDesc,
  setSiteFormRoadDesc,
  siteFormManagers,
  setSiteFormManagers,
  siteFormSearchQuery,
  setSiteFormSearchQuery,
  registeredSiteList,
  setRegisteredSiteList,
  dispatchFormSiteId,
  setDispatchFormSiteId,
  dispatchFormTonTypes,
  setDispatchFormTonTypes,
  dispatchFormTruckCount,
  setDispatchFormTruckCount,
  dispatchFormSoilType,
  setDispatchFormSoilType,
  dispatchFormStartDate,
  setDispatchFormStartDate,
  dispatchFormEndDate,
  setDispatchFormEndDate,
  dispatchFormDropoffMode,
  setDispatchFormDropoffMode,
  dispatchFormDropoffName,
  setDispatchFormDropoffName,
  dispatchFormDropoffAddress,
  setDispatchFormDropoffAddress,
  dispatchFormDropoffCapacity,
  setDispatchFormDropoffCapacity,
  dispatchFormDropoffSoilType,
  setDispatchFormDropoffSoilType,
  dispatchRequestMode,
  setDispatchRequestMode,
  editingDispatchRequestId,
  setEditingDispatchRequestId,
  dispatchRequestSearchQuery,
  setDispatchRequestSearchQuery,
  dispatchRequestList,
  setDispatchRequestList,
  registeredDropoffList,
  dropoffRequestList = [],
  taxInvoiceApproved,
  setTaxInvoiceApproved,
  handleCreateSite,
  handleUpdateSite,
  handleDeleteSite,
  handleCreateDispatch,
  handleUpdateDispatch,
  handleDeleteDispatch,
  fetchDispatchRequests,
  dispatchFormPayerType,
  setDispatchFormPayerType,
  dispatchFormOfferedUnitPrice,
  setDispatchFormOfferedUnitPrice,
  handleConfirmMatchJobPost,
  handleRejectMatchJobPost,
  handleResetMatchJobPost,
}: SiteManagerDashboardProps) {
  // 현장 수정을 위한 로컬 상태 정의
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  // Match Rejection Modal States
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejectingJobId, setRejectingJobId] = useState<number | null>(null);
  const [siteFormBizRegNo, setSiteFormBizRegNo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [siteFormBizLicenseUrl, setSiteFormBizLicenseUrl] = useState("");
  const [siteFormDustReportUrl, setSiteFormDustReportUrl] = useState("");
  const [isUploadingBizLicense, setIsUploadingBizLicense] = useState(false);
  const [isUploadingDustReport, setIsUploadingDustReport] = useState(false);

  const uploadDocumentFile = async (file: File, docType: "biz_license" | "dust_report") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "documents");

    if (docType === "biz_license") setIsUploadingBizLicense(true);
    else setIsUploadingDustReport(true);

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/files/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (docType === "biz_license") {
          setSiteFormBizLicenseUrl(data.url);
          alert("사업자등록증 서류가 업로드되었습니다.");
        } else {
          setSiteFormDustReportUrl(data.url);
          alert("비산먼지 배출신고 필증 서류가 업로드되었습니다.");
        }
      } else {
        alert("서류 파일 업로드에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("파일 업로드 중 에러가 발생했습니다.");
    } finally {
      if (docType === "biz_license") setIsUploadingBizLicense(false);
      else setIsUploadingDustReport(false);
    }
  };

  // Dispatch Request States (Split Screen UI)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isSiteQrModalOpen, setIsSiteQrModalOpen] = useState(false);
  const [dropoffSearchQuery, setDropoffSearchQuery] = useState("");
  const [dispatchFormMemo, setDispatchFormMemo] = useState("");

  // Find active site from the list to pull baseline corporate details
  const activeSite = registeredSiteList && registeredSiteList.length > 0 ? registeredSiteList[0] : null;

  // Load Daum Postcode Script dynamically on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, []);

  // Fetch common codes from backend for dynamic dropdowns (Tonnage / Soil type)
  const [dbCommonCodes, setDbCommonCodes] = useState<any[]>([]);
  React.useEffect(() => {
    const fetchCodes = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/common-codes`);
        if (res.ok) {
          const data = await res.json();
          setDbCommonCodes(data);
        }
      } catch (e) {
        console.error("Failed to load common codes inside SiteManagerDashboard", e);
      }
    };
    fetchCodes();
  }, []);

  // 마운트 시 배차 요청 데이터를 미리 불러와 매칭 상태 및 정보 수정 버튼 제약 상태를 즉시 동기화
  React.useEffect(() => {
    fetchDispatchRequests();
  }, []);

  // Auto populate company details in modal on open (React Hook moved to top-level to satisfy Rules of Hooks)
  React.useEffect(() => {
    if (isModalOpen) {
      try {
        const storedProfile = localStorage.getItem("userProfile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (editingSiteId === null) {
            const defaultCompany = activeSite?.companyName || parsed.company_name || "";
            const defaultBizNo = activeSite?.bizRegNo || parsed.business_number || "";
            if (defaultCompany) setSiteFormCompanyName(defaultCompany);
            if (defaultBizNo) setSiteFormBizRegNo(defaultBizNo);
          }
        }
      } catch (e) {
        console.error("Failed to read userProfile for auto-population", e);
      }
    }
  }, [isModalOpen, editingSiteId, activeSite, setSiteFormCompanyName]);

  const handleAddressSearch = () => {
    if (typeof window !== "undefined" && (window as any).daum && (window as any).daum.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          const roadAddr = data.roadAddress || data.address;
          setSiteFormAddress(roadAddr);
          setSiteFormSearchQuery(roadAddr);
        },
      }).open();
    } else {
      alert("우편번호 검색 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const renderSiteRegister = () => {
    const selectedSite = registeredSiteList.find(s => s.id === editingSiteId) || null;
    const isWorkerRole = typeof window !== "undefined" && localStorage.getItem("userProfile")
      ? JSON.parse(localStorage.getItem("userProfile")!).role === "site_worker"
      : false;

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!siteFormName || !siteFormAddress) {
        alert("현장명과 현장 주소는 필수 입력 항목입니다.");
        return;
      }

      const payload = {
        name: siteFormName,
        companyName: siteFormCompanyName || activeSite?.companyName || "담다건설",
        address: siteFormAddress,
        roadDesc: siteFormRoadDesc,
        managers: siteFormManagers,
        bizRegNo: siteFormBizRegNo || activeSite?.bizRegNo || "120-81-45678",
        biz_license_url: siteFormBizLicenseUrl,
        dust_report_url: siteFormDustReportUrl,
      };

      let success = false;
      if (editingSiteId !== null) {
        success = await handleUpdateSite(editingSiteId, payload);
      } else {
        success = await handleCreateSite(payload);
      }

      if (success) {
        alert(editingSiteId !== null ? "현장 정보가 성공적으로 수정되었습니다." : "신규 현장이 성공적으로 등록되었습니다.");
        setSiteFormName("");
        setSiteFormCompanyName("");
        setSiteFormAddress("");
        setSiteFormRoadDesc("");
        setSiteFormManagers("");
        setSiteFormBizRegNo("");
        setSiteFormBizLicenseUrl("");
        setSiteFormDustReportUrl("");
        setEditingSiteId(null);
        setIsModalOpen(false);
      } else {
        alert("처리에 실패했습니다. 입력 값이나 서버 로그를 확인해주세요.");
      }
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Top Title Section */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">B2B 공사 현장 승인 및 정보 관리</h2>
            <p className="text-xs text-slate-500 mt-1">
              등록된 B2B 공사 현장의 세부 계약 내용과 사업자등록정보를 검증하고 수정/등록합니다.
            </p>
          </div>
          {!isWorkerRole && (
            <button
              type="button"
              onClick={() => {
                setSiteFormName("");
                setSiteFormCompanyName(activeSite?.companyName || "");
                setSiteFormAddress("");
                setSiteFormRoadDesc("");
                setSiteFormManagers("");
                setSiteFormBizRegNo(activeSite?.bizRegNo || "");
                setEditingSiteId(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
            >
              + 신규 B2B 현장 등록
            </button>
          )}
        </div>

        {/* Master-Detail Split Screen Layout (Platform Admin style) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Sites List (Master) */}
          <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 min-h-[740px] max-h-[calc(100vh-180px)] overflow-y-auto">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">공사 현장 목록 ({registeredSiteList.length})</h3>
            <div className="space-y-2">
              {registeredSiteList.map((site) => {
                const isSelected = editingSiteId === site.id;
                return (
                  <div
                    key={site.id}
                    onClick={() => {
                      setEditingSiteId(site.id);
                      setSiteFormName(site.name);
                      setSiteFormCompanyName(site.companyName || "");
                      setSiteFormAddress(site.address);
                      setSiteFormRoadDesc(site.roadDesc || "");
                      setSiteFormManagers(site.managers?.join(", ") || "");
                      setSiteFormBizRegNo(site.bizRegNo || "");
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-300 shadow-md"
                        : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-350"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                        {site.name} <span className="text-[10px] text-slate-400 font-normal">({site.companyName})</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100/60 text-blue-700">
                        {site.siteKey || "GD-3-DUMP"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold truncate">{site.address}</p>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                      <span>사업자: {site.bizRegNo || "미등록"}</span>
                      <span className="text-slate-500 font-medium">담당자: {site.managers?.[0] || "지정대기"}</span>
                    </div>
                  </div>
                );
              })}
              {registeredSiteList.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-250">
                  등록된 B2B 현장이 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Site Form & Map Preview / Verification Details (Detail Card - Clean ReadOnly Panel) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSite ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      [{selectedSite.name}] 현장 상세 내역
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">실물 서류 대조 및 지오펜싱 관제 상세</p>
                  </div>
                  <div className="flex gap-2">
                    {(() => {
                      const hasActiveJob = dispatchRequestList.some(
                        job => job.siteId === selectedSite.id && (job.rawStatus === "OPEN" || job.rawStatus === "WAITING_APPROVAL")
                      );
                      return isWorkerRole ? (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">
                          조회 전용 (담당자 권한)
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={hasActiveJob}
                            onClick={() => {
                              if (hasActiveJob) {
                                alert("현재 매칭 완료(기사 모집 중)이거나 승인 대기 중인 오더가 있어 현장 기본 정보를 수정할 수 없습니다.\n진행 중인 오더를 정리 후 시도해 주십시오.");
                                return;
                              }
                              setSiteFormName(selectedSite.name);
                              setSiteFormCompanyName(selectedSite.companyName || "");
                              setSiteFormAddress(selectedSite.address);
                              setSiteFormRoadDesc(selectedSite.roadDesc || "");
                              setSiteFormManagers(selectedSite.managers?.join(", ") || "");
                              setSiteFormBizRegNo(selectedSite.bizRegNo || "");
                              setSiteFormBizLicenseUrl(selectedSite.bizLicenseUrl || "");
                              setSiteFormDustReportUrl(selectedSite.dustReportUrl || "");
                              setIsModalOpen(true);
                            }}
                            title={hasActiveJob ? "매칭 진행 중/승인 대기 오더 존재 시 현장 수정 불가" : "현장 정보 수정"}
                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                              hasActiveJob
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                                : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 active:scale-95 cursor-pointer"
                            }`}
                          >
                            정보 수정
                          </button>
                          <button
                            type="button"
                            disabled={hasActiveJob}
                            onClick={async () => {
                              if (hasActiveJob) {
                                alert("현재 매칭 완료(기사 모집 중)이거나 승인 대기 중인 오더가 있어 현장을 삭제할 수 없습니다.");
                                return;
                              }
                              if (confirm(`[${selectedSite.name}] 현장을 정말 삭제 처리하시겠습니까?`)) {
                                const ok = await handleDeleteSite(selectedSite.id);
                                if (ok) {
                                  alert("현장이 삭제되었습니다.");
                                  setEditingSiteId(null);
                                }
                              }
                            }}
                            title={hasActiveJob ? "매칭 진행 중/승인 대기 오더 존재 시 현장 삭제 불가" : "현장 삭제"}
                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                              hasActiveJob
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Left Specs */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">공사 현장명</span>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedSite.name}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">소속 건설업체</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedSite.companyName || "미지정"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">사업자등록번호</span>
                        <div className="text-xs font-mono font-semibold text-slate-700 mt-0.5">{selectedSite.bizRegNo || "미등록"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">현장 구분 인증키</span>
                        <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">{selectedSite.siteKey}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">소재지 주소</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedSite.address}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">현장 진입 가이드</span>
                        <div className="text-xs font-semibold text-slate-650 mt-0.5">{selectedSite.roadDesc || "등록된 가이드가 없습니다."}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">담당자</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedSite.managers?.join(", ") || "지정 대기"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Verification Status */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">지오펜싱 관제 지도</span>
                      <MockMap
                        title="현장"
                        address={selectedSite.address}
                        pinned={true}
                        onPinClick={() => {}}
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">실물 서류 및 본사 검증 진행 상태</span>
                      <div className="space-y-2.5 text-xs font-semibold">
                        {/* 1. 사업자등록증 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedSite.bizLicenseUrl ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : (
                              <span className="text-amber-500 font-bold">!</span>
                            )}
                            <span className={selectedSite.bizLicenseUrl ? "text-slate-700 font-bold" : "text-slate-500"}>
                              1. 사업자등록증 서류
                            </span>
                          </div>
                          {selectedSite.bizLicenseUrl ? (
                            <a
                              href={`http://127.0.0.1:8000${selectedSite.bizLicenseUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                              📄 열람하기
                            </a>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              미첨부 (수정에서 등록)
                            </span>
                          )}
                        </div>

                        {/* 2. 비산먼지 배출신고 필증 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedSite.dustReportUrl ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : (
                              <span className="text-amber-500 font-bold">!</span>
                            )}
                            <span className={selectedSite.dustReportUrl ? "text-slate-700 font-bold" : "text-slate-500"}>
                              2. 비산먼지 배출신고 필증
                            </span>
                          </div>
                          {selectedSite.dustReportUrl ? (
                            <a
                              href={`http://127.0.0.1:8000${selectedSite.dustReportUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                              📄 열람하기
                            </a>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              미첨부 (수정에서 등록)
                            </span>
                          )}
                        </div>

                        {/* 3. 플랫폼 관리자 최종 승인 상태 */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span className="text-slate-700 font-bold">3. 플랫폼 관리자 최종 승인</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            최종 승인 완료
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  📄
                </div>
                <h3 className="text-sm font-bold text-slate-800">선택된 현장 정보가 없습니다</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  좌측 현장 목록에서 상세 조회를 희망하는 공사 현장을 선택하거나, 우측 상단의 등록 버튼을 눌러 신규 B2B 현장 검증 절차를 진행해 주세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ==================== CREATE/EDIT MODAL POPUP ==================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col my-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {editingSiteId !== null ? `[${siteFormName}] 현장 정보 수정` : "신규 B2B 공사 현장 등록"}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">현장의 고유 운영 정보와 비산먼지 주소를 정확히 작성해 주세요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSiteFormName("");
                    setSiteFormCompanyName("");
                    setSiteFormAddress("");
                    setSiteFormRoadDesc("");
                    setSiteFormManagers("");
                    setSiteFormBizRegNo("");
                    setEditingSiteId(null);
                    setIsModalOpen(false);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-650 flex items-center justify-center font-bold text-xs active:scale-90 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleRegister} className="p-6 text-xs overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Specs & File Uploads */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-slate-700 font-bold block">현장명 <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={siteFormName}
                          onChange={(e) => setSiteFormName(e.target.value)}
                          placeholder="예: 검단 3공구 신축공사"
                          className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-700 font-bold block">소속 건설사 <span className="text-slate-400 font-normal">(고정)</span></label>
                        <input
                          type="text"
                          value={siteFormCompanyName || activeSite?.companyName || "담다건설"}
                          readOnly
                          disabled
                          className="w-full bg-slate-100 border border-slate-205 rounded-lg px-3 py-2 text-slate-500 font-bold cursor-not-allowed select-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-700 font-bold block">사업자등록번호 <span className="text-slate-400 font-normal">(고정)</span></label>
                        <input
                          type="text"
                          value={siteFormBizRegNo || activeSite?.bizRegNo || "120-81-45678"}
                          readOnly
                          disabled
                          className="w-full bg-slate-100 border border-slate-205 rounded-lg px-3 py-2 text-slate-500 font-bold cursor-not-allowed select-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-700 font-bold block">담당자 (성명/연락처)</label>
                        <input
                          type="text"
                          value={siteFormManagers}
                          onChange={(e) => setSiteFormManagers(e.target.value)}
                          placeholder="예: 홍길동 (010-1234-5678)"
                          className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">현장 주소 (비산먼지 배출신고지 기준) <span className="text-rose-500">*</span></label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={siteFormAddress}
                          onChange={(e) => setSiteFormAddress(e.target.value)}
                          placeholder="예: 인천광역시 서구 검단동 123-45"
                          className="flex-1 bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleAddressSearch}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-750 font-bold text-white rounded-lg transition-colors active:scale-95 whitespace-nowrap"
                        >
                          주소 조회
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">진입 가이드 (기사용 진입 안내문)</label>
                      <input
                        type="text"
                        value={siteFormRoadDesc}
                        onChange={(e) => setSiteFormRoadDesc(e.target.value)}
                        placeholder="예: 정문 차단기 통과 후 우회전하여 100m 진입"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* 실물 증빙 서류 파일 업로드 구역 (PDF 및 이미지 지원) */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <span className="text-xs font-black text-slate-800 block">📑 현장 개설 실물 증빙 서류 첨부 (PDF / 이미지 파일)</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* 1. 사업자등록증 */}
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-700">1. 사업자등록증</span>
                            {siteFormBizLicenseUrl ? (
                              <span className="text-[8.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                ✓ 첨부 완료
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                미첨부
                              </span>
                            )}
                          </div>
                          <label className="flex items-center justify-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all border border-slate-250">
                            {isUploadingBizLicense ? "업로드 중..." : siteFormBizLicenseUrl ? "서류 파일 변경" : "📄 PDF/이미지 선택"}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  uploadDocumentFile(e.target.files[0], "biz_license");
                                }
                              }}
                            />
                          </label>
                          {siteFormBizLicenseUrl && (
                            <a
                              href={`http://127.0.0.1:8000${siteFormBizLicenseUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9.5px] text-blue-600 font-bold hover:underline block truncate"
                            >
                              🔗 서류 보기: {siteFormBizLicenseUrl.split('/').pop()}
                            </a>
                          )}
                        </div>

                        {/* 2. 비산먼지 배출신고 필증 */}
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-700">2. 비산먼지 필증</span>
                            {siteFormDustReportUrl ? (
                              <span className="text-[8.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                ✓ 첨부 완료
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                미첨부
                              </span>
                            )}
                          </div>
                          <label className="flex items-center justify-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all border border-slate-250">
                            {isUploadingDustReport ? "업로드 중..." : siteFormDustReportUrl ? "서류 파일 변경" : "📄 PDF/이미지 선택"}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  uploadDocumentFile(e.target.files[0], "dust_report");
                                }
                              }}
                            />
                          </label>
                          {siteFormDustReportUrl && (
                            <a
                              href={`http://127.0.0.1:8000${siteFormDustReportUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9.5px] text-blue-600 font-bold hover:underline block truncate"
                            >
                              🔗 서류 보기: {siteFormDustReportUrl.split('/').pop()}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive Kakao Map Pinning */}
                  <div className="space-y-2.5 flex flex-col">
                    <label className="text-slate-700 font-bold block">현장 지오펜싱 관제 구역 지정 (지도 핀찍기)</label>
                    <div className="flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                      <MockMap
                        title="현장 등록용"
                        address={siteFormAddress || siteFormSearchQuery || "현장 주소를 입력 후 검색하거나 지도를 탭하세요"}
                        pinned={!!siteFormSearchQuery || !!siteFormAddress}
                        interactive={true}
                        onLocationSelect={(newLat, newLng, newAddress) => {
                          setSiteFormAddress(newAddress);
                          setSiteFormSearchQuery(newAddress);
                        }}
                        onPinClick={() => {
                          if (!siteFormAddress) {
                            alert("먼저 현장 주소를 입력한 후 지도 핀을 지정해 주세요.");
                            return;
                          }
                          setSiteFormSearchQuery(siteFormAddress);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSiteFormName("");
                      setSiteFormCompanyName("");
                      setSiteFormAddress("");
                      setSiteFormRoadDesc("");
                      setSiteFormManagers("");
                      setSiteFormBizRegNo("");
                      setEditingSiteId(null);
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 active:scale-95 transition-all"
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
                  >
                    {editingSiteId !== null ? "정보 갱신 완료" : "B2B 현장 개설 신청"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };


  if (activePath === "/site/request") {
    return renderSiteRegister();
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

  const displaySiteName = activeSite ? activeSite.name : "인천 검단 3공구";
  const displaySiteKey = activeSite ? activeSite.siteKey : "GD-3-DUMP";

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">[{displaySiteName}] 현장 관리 본부</h2>
          <p className="text-xs text-slate-600 mt-1">현장 고유 인증 코드: <span className="text-blue-600 font-mono font-bold">{displaySiteKey}</span></p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
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
              setDispatchRequestMode("create");
              setActivePath("/site/dispatch-request");
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold text-white text-xs shadow-lg shadow-blue-500/10 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            신규 배차 신청서 작성
          </button>
        </div>
      </div>

      {/* Main Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-205">
          <h3 className="font-extrabold text-sm text-slate-707 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" /> 오늘 배차 요청 현황
          </h3>
          <div className="text-3xl font-black text-slate-900">12 / 20 대</div>
          <p className="text-xs text-slate-500 mt-1">오전 배차 100% 완료, 오후 추가 대기 중</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-205">
          <h3 className="font-extrabold text-sm text-slate-707 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" /> 현재 하차 지정지
          </h3>
          <div className="text-base font-extrabold text-slate-900">인천 영종도 신공항 북측 매립지</div>
          <p className="text-xs text-slate-500 mt-1">경로 정체 지체 지연 없음 (운행 소요 35분)</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-205">
          <h3 className="font-extrabold text-sm text-slate-707 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-450" /> 실시간 평균 대기 시간
          </h3>
          <div className="text-3xl font-black text-rose-450">14 분</div>
          <p className="text-xs text-slate-500 mt-1">전년 동월 대비 8분 단축</p>
        </div>
      </div>

      {/* 덤프비 / 흙값 정산 및 세금계산서 업무 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dump & Soil Settlement */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-205 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-base text-slate-800">금월 현장 정산 및 단가 관리</h3>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                실시간 단가 연동
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dump truck expenses */}
              <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                <span className="text-[10px] text-slate-505 font-bold uppercase tracking-wider block">덤프비 정산 확인 (운송료)</span>
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
                  <span className="text-emerald-650 font-bold">㎥당 단가: 8,000원</span>
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
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850"
            >
              덤프 운송 정산서 보기
            </button>
            <button
              type="button"
              onClick={() => setActivePath("/site/soil-expenses")}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850"
            >
              사토/흙값 정산 대장
            </button>
          </div>
        </div>

        {/* Tax Invoice Module */}
        <div className="p-6 rounded-2xl bg-white border border-slate-205 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">세금계산서 발행 및 증빙</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${taxInvoiceApproved
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-amber-50 text-amber-600 border-amber-205"
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

              <div className="text-[10px] text-slate-500 leading-relaxed">
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
            <p className="text-xs text-slate-505 mt-0.5">인천 검단 3공구 현장 출발 실시간 배차 목록</p>
          </div>
          <button type="button" className="text-xs font-bold text-blue-600 hover:underline">
            전체 운행 로그 파일(CSV) 다운로드 →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-505 font-bold">
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
                  <td className="py-3 px-1 text-right font-bold text-emerald-600">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
