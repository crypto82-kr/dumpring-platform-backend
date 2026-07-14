import React, { useState } from "react";
import { PlusCircle, Search, AlertCircle, Truck, MapPin, Clock } from "lucide-react";
import { MockMap } from "./MockMap";

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
  taxInvoiceApproved: boolean;
  setTaxInvoiceApproved: (val: boolean) => void;
  handleCreateSite: (site: { name: string; companyName: string; address: string; roadDesc: string; managers: string; bizRegNo: string }) => Promise<boolean>;
  handleUpdateSite: (id: number, site: { name: string; companyName: string; address: string; roadDesc: string; managers: string; bizRegNo: string }) => Promise<boolean>;
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
  }) => Promise<boolean>;
  handleUpdateDispatch: (id: number, formData: {
    materialType?: string;
    truckType?: string;
    workDate?: string;
    requiredTrucks?: number;
    offeredUnitPrice?: number;
    payerType?: string;
    memo?: string;
  }) => Promise<boolean>;
  handleDeleteDispatch: (id: number) => Promise<boolean>;
  fetchDispatchRequests: () => Promise<void>;
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
  taxInvoiceApproved,
  setTaxInvoiceApproved,
  handleCreateSite,
  handleUpdateSite,
  handleDeleteSite,
  handleCreateDispatch,
  handleUpdateDispatch,
  handleDeleteDispatch,
  fetchDispatchRequests,
}: SiteManagerDashboardProps) {
  // 현장 수정을 위한 로컬 상태 정의
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [siteFormBizRegNo, setSiteFormBizRegNo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dispatch Request States (Split Screen UI)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

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
        const res = await fetch("http://localhost:8000/api/common-codes");
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
        bizRegNo: siteFormBizRegNo || activeSite?.bizRegNo || "120-81-45678"
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
        </div>

        {/* Master-Detail Split Screen Layout (Platform Admin style) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Sites List (Master) */}
          <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 max-h-[640px] overflow-y-auto">
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
                      <span className="text-slate-500 font-medium">관리자: {site.managers?.[0] || "지정대기"}</span>
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
                    <button
                      type="button"
                      onClick={() => {
                        setSiteFormName(selectedSite.name);
                        setSiteFormCompanyName(selectedSite.companyName || "");
                        setSiteFormAddress(selectedSite.address);
                        setSiteFormRoadDesc(selectedSite.roadDesc || "");
                        setSiteFormManagers(selectedSite.managers?.join(", ") || "");
                        setSiteFormBizRegNo(selectedSite.bizRegNo || "");
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-black rounded-lg border border-blue-200 active:scale-95 transition-all"
                    >
                      정보 수정
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`[${selectedSite.name}] 현장을 정말 삭제처리 하시겠습니까?`)) {
                          const ok = await handleDeleteSite(selectedSite.id);
                          if (ok) {
                            alert("현장이 정상 삭제되었습니다.");
                            setSiteFormName("");
                            setSiteFormAddress("");
                            setSiteFormRoadDesc("");
                            setSiteFormManagers("");
                            setSiteFormBizRegNo("");
                            setEditingSiteId(null);
                          } else {
                            alert("삭제 처리에 실패했습니다.");
                          }
                        }
                      }}
                      className="px-3 py-1.5 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-lg border border-rose-200 active:scale-95 transition-all"
                    >
                      삭제
                    </button>
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
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">담당자 연락처</span>
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

                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
                      <span className="text-[10px] font-bold text-blue-700 uppercase block">실물 서류 검증 체크 상태</span>
                      <div className="space-y-2 text-[11px] text-slate-600 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>사업자등록증 사본 검증 완료</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>비산먼지 배출신고 필증 일치</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>대표 거래 법인계좌 검토 통과</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleUp">
              {/* Modal Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
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
              <form onSubmit={handleRegister} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <label className="text-slate-700 font-bold block">소속 건설사 (소속 고정) <span className="text-slate-400 font-normal">(수정 불가)</span></label>
                    <input
                      type="text"
                      value={siteFormCompanyName || activeSite?.companyName || "담다건설"}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 border border-slate-205 rounded-lg px-3 py-2 text-slate-500 font-bold cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-slate-700 font-bold block">사업자등록번호 <span className="text-slate-400 font-normal">(수정 불가)</span></label>
                    <input
                      type="text"
                      value={siteFormBizRegNo || activeSite?.bizRegNo || "120-81-45678"}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 border border-slate-205 rounded-lg px-3 py-2 text-slate-500 font-bold cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-slate-700 font-bold block">담당자 연락처 (성명/연락처)</label>
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-750 font-bold text-white rounded-lg transition-colors active:scale-95"
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

                {/* Interactive MockMap inside Modal */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-slate-700 font-bold block">현장 지오펜싱 관제 구역 지정 (지도 핀찍기)</label>
                  <MockMap
                    title="현장 등록용"
                    address={siteFormAddress || siteFormSearchQuery || "현장 주소를 입력 후 검색하거나 지도를 탭하세요"}
                    pinned={!!siteFormSearchQuery || !!siteFormAddress}
                    onPinClick={() => {
                      if (!siteFormAddress) {
                        alert("먼저 현장 주소를 입력한 후 지도 핀을 지정해 주세요.");
                        return;
                      }
                      setSiteFormSearchQuery(siteFormAddress);
                      alert(`[${siteFormAddress}] 위치에 지오펜싱 중앙 관제 핀이 지정되었습니다!`);
                    }}
                  />
                </div>

                {/* Document checklist mockup for modal */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-blue-600 block uppercase mb-1">실물 증빙 서류 지침</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    * 신규 개설 시 제출하신 소장님 가입 서류(사업자등록증, 비산먼지 필증)와 본사 등록 내역이 플랫폼 관리자 검토를 통해 확인 대조됩니다.
                  </p>
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
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


  const renderSiteDispatchRequest = () => {
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

      // 하차지 수용 공고 선택 여부 확인 (흐름 A vs 흐름 B)
      const selectedDropoff = registeredDropoffList.find(
        d => d.name === dispatchFormDropoffName
      );

      const formData = {
        siteId: Number(dispatchFormSiteId),
        materialType: dispatchFormSoilType || "GOOD_SOIL",
        truckType: dispatchFormTonTypes[0] || "T_25",
        workDate: dispatchFormStartDate ? `${dispatchFormStartDate}T00:00:00` : new Date().toISOString(),
        requiredTrucks: Number(dispatchFormTruckCount),
        offeredUnitPrice: 0,
        payerType: "SITE_PAYS",
        memo: "",
        ...(selectedDropoff?.id && { dropOffRequestId: selectedDropoff.id }),
      };

      let success = false;
      if (dispatchRequestMode === "create") {
        success = await handleCreateDispatch(formData);
        if (success) alert("배차 요청이 등록되었습니다.");
        else alert("배차 요청 등록에 실패했습니다. 다시 시도해 주세요.");
      } else if (dispatchRequestMode === "edit" && editingDispatchRequestId !== null) {
        success = await handleUpdateDispatch(editingDispatchRequestId, {
          materialType: formData.materialType,
          truckType: formData.truckType,
          workDate: formData.workDate,
          requiredTrucks: formData.requiredTrucks,
        });
        if (success) alert("배차 요청이 수정되었습니다.");
        else alert("배차 요청 수정에 실패했습니다. 다시 시도해 주세요.");
      }

      if (success) {
        resetDispatchForm();
        setIsDispatchModalOpen(false);
      }
    };

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

    const filteredRequests = dispatchRequestList.filter(req => {
      const matchSearch = req.siteName.includes(dispatchRequestSearchQuery) ||
        req.soilType.includes(dispatchRequestSearchQuery) ||
        (req.dropoffName && req.dropoffName.includes(dispatchRequestSearchQuery));
      return matchSearch;
    });

    const activeSelectedId = selectedRequestId || (filteredRequests.length > 0 ? filteredRequests[0].id : null);
    const selectedReq = dispatchRequestList.find(r => r.id === activeSelectedId) || null;

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-905">배차 요청 관리</h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 max-h-[640px] overflow-y-auto">
            <div className="space-y-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={dispatchRequestSearchQuery}
                  onChange={(e) => setDispatchRequestSearchQuery(e.target.value)}
                  placeholder="현장명, 토사 종류 등으로 검색..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-205 rounded-lg text-[11px] font-semibold text-slate-888 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mt-3 mb-2">배차 요청 목록 ({filteredRequests.length})</h3>
            <div className="space-y-2">
              {filteredRequests.map((req) => {
                const isSelected = activeSelectedId === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => {
                      setSelectedRequestId(req.id);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-205 group active:scale-98 ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-300 shadow-md"
                        : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-350"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                        {req.siteName}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        req.status === "배차완료"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-250"
                          : "bg-amber-50 text-amber-600 border-amber-250"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-505 mt-2 font-semibold truncate">토사 종류: {req.soilType}</p>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                      <span>차종: {req.tonTypes.join(", ")} ({req.truckCount}대)</span>
                      <span className="text-slate-500 font-mono">{req.startDate}</span>
                    </div>
                  </div>
                );
              })}
              {filteredRequests.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-250">
                  배차 요청 내역이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedReq ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      [{selectedReq.siteName}] 배차 요청 상세 내역
                    </h3>
                    <p className="text-[11px] text-slate-550 mt-0.5">요청번호: DREQ-00{selectedReq.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(selectedReq)}
                      className="px-3 py-1.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-707 font-black rounded-lg border border-blue-200 active:scale-95 transition-all"
                    >
                      정보 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedReq.id)}
                      className="px-3 py-1.5 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-606 font-black rounded-lg border border-rose-200 active:scale-95 transition-all"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">요청 현장명</span>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedReq.siteName}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">요청 차량 톤수</span>
                          <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedReq.tonTypes.join(", ")}</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">요청 대수</span>
                          <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedReq.truckCount} 대</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">반출 토사 종류</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedReq.soilType}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">작업 일정</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedReq.startDate} ~ {selectedReq.endDate}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">지정 하차지 명칭</span>
                        <div className="text-xs font-bold text-blue-600 mt-0.5">
                          {selectedReq.dropoffName ? `${selectedReq.dropoffName} (${selectedReq.dropoffMode === "search" ? "덤프링 연동" : "직접등록"})` : "하차지 미지정"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">하차지 상세 주소</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedReq.dropoffAddress || "주소 정보 없음"}</div>
                      </div>
                    </div>

                    {selectedReq.dropoffAddress && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-550 block uppercase">하차지 매핑 위치</span>
                        <MockMap
                          title="배차 하차지"
                          address={selectedReq.dropoffAddress}
                          pinned={true}
                          onPinClick={() => {}}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  📄
                </div>
                <h3 className="text-sm font-bold text-slate-808">선택된 배차 요청이 없습니다</h3>
                <p className="text-xs text-slate-555 max-w-sm leading-relaxed">
                  좌측 목록에서 상세 조원을 원하는 배차 공고를 선택하거나, 우측 상단의 등록 버튼을 눌러 신규 차량 배차를 요청해 주세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {isDispatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleUp">
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {editingDispatchRequestId !== null ? "배차 요청서 수정" : "신규 차량 배차 요청 등록"}
                  </h3>
                  <p className="text-[10px] text-slate-505 mt-0.5">현장에 배정할 덤프링 차량의 조건과 목적지 하차지를 지정합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetDispatchForm();
                    setIsDispatchModalOpen(false);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-202 text-slate-655 flex items-center justify-center font-bold text-xs active:scale-90 transition-all"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRequest} className="p-6 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">요청 현장 선택 <span className="text-rose-500">*</span></label>
                  <select
                    value={dispatchFormSiteId}
                    onChange={(e) => setDispatchFormSiteId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-808 font-semibold focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">현장을 선택해 주세요</option>
                    {registeredSiteList.map(site => (
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
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-808 font-bold focus:outline-none focus:border-blue-550"
                      required
                    >
                      <option value="">톤수를 선택해 주세요</option>
                      {dbCommonCodes
                        .filter(codeItem => codeItem.group_code === "TRUCK_TYPE")
                        .map(codeItem => (
                          <option key={codeItem.code} value={codeItem.code_name}>
                            {codeItem.code_name}
                          </option>
                        ))}
                      {dbCommonCodes.filter(codeItem => codeItem.group_code === "TRUCK_TYPE").length === 0 && (
                        <>
                          <option value="15톤">15톤</option>
                          <option value="25톤">25톤</option>
                          <option value="27톤">27톤</option>
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
                      value={dispatchFormTruckCount}
                      onChange={(e) => setDispatchFormTruckCount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-808 font-semibold focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-808 font-semibold focus:outline-none focus:border-blue-550"
                      required
                    >
                      {dbCommonCodes
                        .filter(codeItem => codeItem.group_code === "MATERIAL_TYPE")
                        .map(codeItem => (
                          <option key={codeItem.code} value={codeItem.code_name}>
                            {codeItem.code_name}
                          </option>
                        ))}
                      {dbCommonCodes.filter(codeItem => codeItem.group_code === "MATERIAL_TYPE").length === 0 && (
                        <>
                          <option value="양질토">양질토</option>
                          <option value="갯벌/뻘흙">갯벌/뻘흙</option>
                          <option value="풍화암/돌">풍화암/돌</option>
                          <option value="혼합골재">혼합골재</option>
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
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* 하차지 정보 */}
                <div className="space-y-2.5 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-700 font-bold block">하차지 정보 등록 <span className="text-rose-500">*</span></label>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">등록 하차지 검색 자동 강제</span>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-slate-600 font-bold block">하차지 검색 &amp; 선택</label>
                    <select
                      value={registeredDropoffList.find(d => d.name === dispatchFormDropoffName)?.id || ""}
                      onChange={(e) => {
                        const drop = registeredDropoffList.find(d => d.id === Number(e.target.value));
                        if (drop) {
                          setDispatchFormDropoffMode("search");
                          setDispatchFormDropoffName(drop.name);
                          setDispatchFormDropoffAddress(drop.address);
                        } else {
                          setDispatchFormDropoffMode("none");
                          setDispatchFormDropoffName("");
                          setDispatchFormDropoffAddress("");
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="">하차지를 검색/선택해 주세요</option>
                      {registeredDropoffList.map(drop => (
                        <option key={drop.id} value={drop.id}>
                          {drop.name} ({drop.soilDealType === "buy" ? "구매/돈 줌" : "판매/돈 받음"}) - {drop.address}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-500/10 active:scale-95"
                  >
                    {editingDispatchRequestId !== null ? "수정 완료" : "배차 요청 등록하기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetDispatchForm();
                      setIsDispatchModalOpen(false);
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs"
                  >
                    취소
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
