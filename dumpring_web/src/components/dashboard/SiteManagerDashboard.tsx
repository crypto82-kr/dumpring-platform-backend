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
}: SiteManagerDashboardProps) {
  // 현장 수정을 위한 로컬 상태 정의
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [siteFormBizRegNo, setSiteFormBizRegNo] = useState("");
  const [isCreatingOrEditingSite, setIsCreatingOrEditingSite] = useState(false);

  const renderSiteRegister = () => {
    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!siteFormName || !siteFormAddress) {
        alert("현장명과 현장 주소는 필수 입력 항목입니다.");
        return;
      }

      const payload = {
        name: siteFormName,
        companyName: siteFormCompanyName,
        address: siteFormAddress,
        roadDesc: siteFormRoadDesc,
        managers: siteFormManagers,
        bizRegNo: siteFormBizRegNo || "000-00-00000"
      };

      let success = false;
      if (editingSiteId !== null) {
        success = await handleUpdateSite(editingSiteId, payload);
      } else {
        success = await handleCreateSite(payload);
      }

      if (success) {
        alert(editingSiteId !== null ? "현장 정보가 성공적으로 수정되었습니다." : "신규 현장이 성공적으로 등록되었습니다.");
        // Clear forms
        setSiteFormName("");
        setSiteFormCompanyName("");
        setSiteFormAddress("");
        setSiteFormRoadDesc("");
        setSiteFormManagers("");
        setSiteFormBizRegNo("");
        setEditingSiteId(null);
        setIsCreatingOrEditingSite(false);
      } else {
        alert("처리에 실패했습니다. 입력 값이나 서버 로그를 확인해주세요.");
      }
    };

    // Find currently selected site for detail panel view
    const selectedSite = registeredSiteList.find(s => s.id === editingSiteId) || null;

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
              setSiteFormCompanyName("");
              setSiteFormAddress("");
              setSiteFormRoadDesc("");
              setSiteFormManagers("");
              setSiteFormBizRegNo("");
              setEditingSiteId(null);
              setIsCreatingOrEditingSite(true);
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
                      setIsCreatingOrEditingSite(false);
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

          {/* Right Column: Site Form & Map Preview / Verification Details (Detail Card) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* If Creating New or editing site form */}
            {(isCreatingOrEditingSite || selectedSite) ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {isCreatingOrEditingSite ? "신규 현장 상세 정보 등록" : `[${selectedSite?.name}] 현장 상세 내역 검증 및 수정`}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">사업자 인증 서류 및 도급 내역 검증</p>
                  </div>
                  {isCreatingOrEditingSite && (
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
                        setIsCreatingOrEditingSite(false);
                      }}
                      className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200"
                    >
                      취소
                    </button>
                  )}
                </div>

                <form onSubmit={handleRegister} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">현장명 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={siteFormName}
                        onChange={(e) => setSiteFormName(e.target.value)}
                        placeholder="예: 검단 3공구 신축공사"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">건설업체명 (회사명) <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={siteFormCompanyName}
                        onChange={(e) => setSiteFormCompanyName(e.target.value)}
                        placeholder="예: 현대건설"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">사업자등록번호 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={siteFormBizRegNo}
                        onChange={(e) => setSiteFormBizRegNo(e.target.value)}
                        placeholder="예: 120-81-45678"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">현장 주소 (비산먼지 배출신고 기준지) <span className="text-rose-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={siteFormAddress}
                        onChange={(e) => setSiteFormAddress(e.target.value)}
                        placeholder="예: 인천광역시 서구 검단동 123-45"
                        className="flex-1 bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-750 font-bold text-white rounded-lg transition-colors"
                      >
                        주소 조회
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">현장 담당자 이메일 / 명단 (쉼표로 구분)</label>
                      <input
                        type="text"
                        value={siteFormManagers}
                        onChange={(e) => setSiteFormManagers(e.target.value)}
                        placeholder="예: billing@dumpring.com"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">진입 가이드 (배차 정보)</label>
                      <input
                        type="text"
                        value={siteFormRoadDesc}
                        onChange={(e) => setSiteFormRoadDesc(e.target.value)}
                        placeholder="예: 정문 차단기 통과 후 우회전하여 진입"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Document & Map Mockup Area (Like Platform Admin Documents checklist) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    
                    {/* Left: Map Preview Box */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">지오펜싱 관제 지도 매칭</span>
                      <MockMap
                        title="현장"
                        address={siteFormAddress || siteFormSearchQuery}
                        pinned={!!siteFormSearchQuery}
                        onPinClick={() => {
                          if (siteFormAddress) setSiteFormSearchQuery(siteFormAddress);
                        }}
                      />
                    </div>

                    {/* Right: Docs Check & Controls */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-blue-600 block uppercase">실물 증빙 서류 대조 체크</span>
                        <div className="space-y-1 text-[11px] font-medium text-slate-600">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span>사업자등록증 원본 대조 완료</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span>비산먼지 배출신고 필증 검증</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked={!!selectedSite} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span>대표 법인 계좌 거래 은행 확인</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/50 flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/10 active:scale-95"
                        >
                          {editingSiteId !== null ? "검증 완료 및 정보 갱신" : "정식 가동 등록 완료"}
                        </button>
                        {editingSiteId !== null && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`[${selectedSite?.name}] 현장을 삭제처리 하시겠습니까?`)) {
                                const ok = await handleDeleteSite(selectedSite!.id);
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
                            className="px-3.5 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs transition-colors"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              // Empty Details Fallback (Platform Admin style)
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
      </div>
    );
  };


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
      const siteNameVal = selectedSite ? selectedSite.name : "알 수 없는 현장";

      if (dispatchRequestMode === "create") {
        const newReq = {
          id: dispatchRequestList.length + 1,
          siteId: Number(dispatchFormSiteId),
          siteName: siteNameVal,
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
              siteName: siteNameVal,
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
                    className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">작업 종료일 <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      value={dispatchFormEndDate}
                      onChange={(e) => setDispatchFormEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
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
              <MockMap
                title="하차지"
                address={dispatchFormDropoffAddress}
                pinned={!!dispatchFormDropoffAddress}
              />
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
            <p className="text-xs text-slate-555 mt-1">현장에 필요한 덤프 배차 요청 목록을 조회하고 신설할 수 있습니다.</p>
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

  // Find active site from the list
  const activeSite = registeredSiteList && registeredSiteList.length > 0 ? registeredSiteList[0] : null;
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
