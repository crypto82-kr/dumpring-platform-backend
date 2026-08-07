"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Search, AlertCircle, MapPin, Building2, Phone, FileText, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";
import { MockMap } from "./MockMap";

export interface RegisteredSiteItem {
  id: number;
  name: string;
  companyName: string;
  address: string;
  roadDesc?: string;
  managers?: string[];
  bizRegNo?: string;
  siteKey: string;
  bizLicenseUrl?: string;
  dustReportUrl?: string;
}

interface SiteInfoManagementProps {
  registeredSiteList: RegisteredSiteItem[];
  dispatchRequestList?: any[];
  handleCreateSite: (siteData: any) => Promise<boolean>;
  handleUpdateSite: (id: number, siteData: any) => Promise<boolean>;
  handleDeleteSite: (id: number) => Promise<boolean>;
}

export default function SiteInfoManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
  handleCreateSite,
  handleUpdateSite,
  handleDeleteSite,
}: SiteInfoManagementProps) {
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [siteFormName, setSiteFormName] = useState("");
  const [siteFormCompanyName, setSiteFormCompanyName] = useState("");
  const [siteFormAddress, setSiteFormAddress] = useState("");
  const [siteFormRoadDesc, setSiteFormRoadDesc] = useState("");
  const [siteFormManagers, setSiteFormManagers] = useState("");
  const [siteFormBizRegNo, setSiteFormBizRegNo] = useState("");
  const [siteFormBizLicenseUrl, setSiteFormBizLicenseUrl] = useState("");
  const [siteFormDustReportUrl, setSiteFormDustReportUrl] = useState("");
  const [isUploadingBizLicense, setIsUploadingBizLicense] = useState(false);
  const [isUploadingDustReport, setIsUploadingDustReport] = useState(false);
  const [siteFormSearchQuery, setSiteFormSearchQuery] = useState("");

  // Load Daum Postcode Script dynamically on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.head.appendChild(script);
      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  const activeSite = registeredSiteList && registeredSiteList.length > 0 ? registeredSiteList[0] : null;
  const selectedSite = registeredSiteList.find((s) => s.id === editingSiteId) || registeredSiteList[0] || null;

  useEffect(() => {
    if (registeredSiteList && registeredSiteList.length > 0 && editingSiteId === null) {
      setEditingSiteId(registeredSiteList[0].id);
    }
  }, [registeredSiteList]);

  const isWorkerRole = typeof window !== "undefined" && localStorage.getItem("userProfile")
    ? JSON.parse(localStorage.getItem("userProfile")!).role === "site_worker"
    : false;

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
          alert("사업자등록증 서류가 성공적으로 업로드되었습니다.");
        } else {
          setSiteFormDustReportUrl(data.url);
          alert("비산먼지 배출신고 필증 서류가 성공적으로 업로드되었습니다.");
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
                            미첨부 (정보 수정에서 파일 선택)
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
                            미첨부 (정보 수정에서 파일 선택)
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
                        value={siteFormCompanyName}
                        onChange={(e) => setSiteFormCompanyName(e.target.value)}
                        placeholder="예: 현대건설(주)"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">공사 현장 주소 <span className="text-rose-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={siteFormAddress}
                        onChange={(e) => setSiteFormAddress(e.target.value)}
                        placeholder="우편번호 주소 검색 버튼을 이용하세요"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="px-3 py-2 bg-slate-800 text-white font-bold text-xs rounded-lg shrink-0 hover:bg-slate-900 active:scale-95 transition-all"
                      >
                        주소 검색
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">진입 도로 및 정문 설명</label>
                    <input
                      type="text"
                      value={siteFormRoadDesc}
                      onChange={(e) => setSiteFormRoadDesc(e.target.value)}
                      placeholder="예: 신길역 3번 출구 방향 500m 진입, 1문 사용"
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">사업자등록번호</label>
                      <input
                        type="text"
                        value={siteFormBizRegNo}
                        onChange={(e) => setSiteFormBizRegNo(e.target.value)}
                        placeholder="예: 120-81-45678"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">현장 담당자 연락처</label>
                      <input
                        type="text"
                        value={siteFormManagers}
                        onChange={(e) => setSiteFormManagers(e.target.value)}
                        placeholder="예: 김과장 (010-1234-5678)"
                        className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-800 block">📄 서류 파일 실물 첨부</span>
                    <div className="grid grid-cols-2 gap-2">
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
                      </div>

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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Map */}
                <div className="space-y-2.5 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">위치 관제 지도 미리보기</span>
                  <div className="h-full min-h-[300px] rounded-xl border border-slate-200 overflow-hidden relative shadow-inner flex-1">
                    <MockMap
                      title="현장"
                      address={siteFormAddress}
                      pinned={true}
                      onPinClick={() => {}}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 active:scale-95 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
                >
                  {editingSiteId !== null ? "정보 수정 완료" : "신규 현장 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
