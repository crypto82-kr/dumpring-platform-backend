"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Truck, ShieldCheck, AlertCircle, Loader2, Check, RefreshCw, LogOut } from "lucide-react";

export default function ApprovalRequestScreen() {
  const { user, logout, updateApprovalStatus } = useAuth();
  
  const getApiBaseUrl = () => {
    if (typeof window !== "undefined") {
      if (window.location.hostname.includes("vercel.app") || !window.location.hostname.includes("localhost")) {
        return "https://dumpring-api.onrender.com";
      }
    }
    return "http://localhost:8000";
  };
  const API_BASE_URL = getApiBaseUrl();

  // 폼 입력 상태
  const [companyName, setCompanyName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  
  // 필수 서류 관리 상태
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [missingDocs, setMissingDocs] = useState<any[]>([]);
  const [uploadingDocCode, setUploadingDocCode] = useState<string | null>(null);

  // 현장관리자(site_manager)일 경우 불필요한 운전자 서류(LICENSE, QUALIFICATION) 제외
  const filteredMissingDocs = user?.role === "site_manager"
    ? missingDocs.filter((d) => d.code !== "LICENSE" && d.code !== "QUALIFICATION")
    : missingDocs;

  const filteredUploadedDocs = user?.role === "site_manager"
    ? uploadedDocs.filter((code) => code !== "LICENSE" && code !== "QUALIFICATION")
    : uploadedDocs;
  
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  
  const [isDirectDriver, setIsDirectDriver] = useState(false);

  // 지도 핀 찍기용 임시 상태
  const [pinX, setPinX] = useState(50);
  const [pinY, setPinY] = useState(50);
  const mapRef = React.useRef<HTMLDivElement>(null);

  // 화면 상태 및 메시지
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  // 회원 상태 확인 (서버 호출)
  const checkMemberStatus = async (showLoading = false) => {
    if (showLoading) setChecking(true);
    setErrorMsg("");
    
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        setChecking(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/member-status`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("checkMemberStatus raw response data:", data);

        // 1. 이미 승인 완료된 경우 즉시 대시보드로 유입
        if (data.is_approved) {
          updateApprovalStatus(true);
          return;
        }
        
        setRejectReason(data.reject_reason || null);
        setUploadedDocs(data.uploaded_documents || []);
        setMissingDocs(data.missing_documents || []);

        // 2. 백엔드에서 정보 입력 제출(is_submitted) 처리가 완전히 완료되었는지 감지
        if (data.is_submitted) {
          console.log("Setting isSubmitted to TRUE based on backend is_submitted status");
          setIsSubmitted(true);
        } else {
          console.log("Setting isSubmitted to FALSE based on backend is_submitted status");
          setIsSubmitted(false);
        }
      }
    } catch (e) {
      console.error("checkMemberStatus fetch error:", e);
      setErrorMsg("서버로부터 회원 상태 정보를 불러오지 못했습니다.");
    } finally {
      setChecking(false);
    }
  };

  // 필수 서류 업로드 핸들러
  const handleUploadDocument = async (docCode: string, file: File) => {
    setErrorMsg("");
    setSuccessMsg("");
    setUploadingDocCode(docCode);

    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        setErrorMsg("인증 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/upload-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_code: docCode,
          file_name: file.name,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`${file.name} 서류 등록이 임시 완료되었습니다.`);
        await checkMemberStatus(false);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "서류 제출 등록에 실패했습니다.");
      }
    } catch (e) {
      setErrorMsg("서버 통신에 실패했습니다.");
    } finally {
      setUploadingDocCode(null);
    }
  };

  // 이미 프로필이 생성되어 있는지 체크하는 함수
  const checkExistingProfile = async () => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      // profiles 조회 API가 별도로 없으므로 member-status API 결과를 활용하거나
      // user 객체의 기본 데이터를 분석합니다.
      // 가가입 유저 상태에 대해 check
      return false; // 기본값은 입력 양식 노출
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      checkMemberStatus(true);
    }
  }, [user]);

  useEffect(() => {
    // Daum 우편번호 검색 스크립트 동적 로드
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleAddressSearch = () => {
    if (typeof window !== "undefined" && (window as any).daum && (window as any).daum.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          setAddress(data.roadAddress || data.address);
          // 주소 기반 임시 위경도 지정 (서울/인천 인근 임시 난수 좌표)
          const randomLat = (37.5665 + (Math.random() - 0.5) * 0.05).toFixed(6);
          const randomLng = (126.9780 + (Math.random() - 0.5) * 0.05).toFixed(6);
          setLatitude(randomLat);
          setLongitude(randomLng);
        },
      }).open();
    } else {
      alert("우편번호 검색 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    // 필수 서류 제출 여부 사전 검증
    if (filteredMissingDocs.length > 0) {
      setErrorMsg(`필수 서류를 모두 업로드하셔야 승인 요청이 가능합니다. 미제출 서류: ${filteredMissingDocs.map(d => d.code_name).join(", ")}`);
      setLoading(false);
      return;
    }

    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken");
      if (!token) {
        setErrorMsg("인증 세션이 만료되었습니다. 다시 로그인해 주세요.");
        setLoading(false);
        return;
      }

      // 역할별 파라미터 구성
      const body: any = {};
      if (user?.role === "site_manager") {
        if (!companyName.trim() || !siteName.trim() || !businessNumber.trim() || !address.trim()) {
          setErrorMsg("모든 필수 항목(건설사, 공사현장명, 사업자번호, 주소)을 입력해 주세요.");
          setLoading(false);
          return;
        }
        body.company_name = companyName.trim();
        body.site_name = siteName.trim();
        body.business_number = businessNumber.trim();
        body.address = address.trim();
        body.detail_address = detailAddress.trim();
        body.latitude = latitude ? parseFloat(latitude) : 37.5665;
        body.longitude = longitude ? parseFloat(longitude) : 126.9780;
      } else if (user?.role === "dropoff_manager") {
        if (!locationName.trim() || !address.trim() || !permitNumber.trim()) {
          setErrorMsg("모든 필수 항목을 입력해 주세요.");
          setLoading(false);
          return;
        }
        body.location_name = locationName.trim();
        body.address = address.trim();
        body.permit_number = permitNumber.trim();
      } else if (user?.role === "owner") {
        body.is_direct_driver = isDirectDriver;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/submit-approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMsg("승인 요청 제출이 완료되었습니다! 어드민 검토 후 승인 처리됩니다.");
        setIsSubmitted(true);
        setRejectReason(null);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "승인 요청 제출 중 에러가 발생했습니다.");
      }
    } catch (e) {
      setErrorMsg("서버 전송에 실패했습니다. 백엔드 연결 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };



  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">회원 승인 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl mt-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <div>
          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/35">
            {user?.roleName} 가가입 상태
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
            {isSubmitted ? "승인 심사 대기 중" : "승인 요청 및 상세 정보 제출"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            정식 플랫폼 대시보드 사용을 위해 필수 상세 정보를 입력하고 승인을 요청해야 합니다.
          </p>
        </div>
        
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 font-bold text-slate-700 dark:text-slate-300 rounded-xl transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>

      {rejectReason && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl flex items-start gap-3 text-rose-600 dark:text-rose-450 text-xs font-semibold leading-relaxed">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">이전 승인 신청이 반려되었습니다:</p>
            <p className="mt-1 text-rose-500 dark:text-rose-400">{rejectReason}</p>
            <p className="mt-2 text-[10px] text-slate-400 font-medium">아래 정보를 올바르게 수정하여 재신청해 주시기 바랍니다.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-450 text-xs font-semibold">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isSubmitted ? (
        /* ------------------ Submitted / Pending View ------------------ */
        <div className="text-center py-10 space-y-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/35">
            <RefreshCw className="w-8 h-8 animate-spin-slow" />
          </div>
          
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">어드민 승인을 기다리는 중입니다</h3>
            <p className="text-xs text-slate-550 leading-relaxed dark:text-slate-450">
              제출하신 정보와 필수 제출 서류를 심사역이 실시간으로 확인하고 있습니다. 승인이 완료되면 자동으로 대시보드로 진입 가능합니다.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={() => checkMemberStatus(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10 flex items-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>새로고침 (승인 확인)</span>
            </button>
          </div>
        </div>
      ) : (
        /* ------------------ Form Submission View ------------------ */
        <form onSubmit={handleSubmitApproval} className="space-y-5">
          
          {/* Site Manager Form */}
          {user?.role === "site_manager" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">건설사 / 상호명</label>
                <input
                  type="text"
                  placeholder="예: 현대건설, 삼부토건"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">소속 공사현장명</label>
                <input
                  type="text"
                  placeholder="예: 인천 검단 3공구 현장"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">사업자등록번호</label>
                <input
                  type="text"
                  placeholder="10자리 번호 입력 (예: 120-81-45678)"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>

              {/* 주소 검색 */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">현장 주소 (검색)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    placeholder="주소 검색 버튼을 눌러주세요"
                    value={address}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    className="px-4 bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shrink-0"
                  >
                    주소 검색
                  </button>
                </div>
              </div>

              {/* 상세 주소 */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">상세 주소</label>
                <input
                  type="text"
                  placeholder="예: 3층 현장사무실, A구역 등"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>

              {/* 임시 지도 컨테이너 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block">현장 핀 위치 지정 (위경도)</label>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/35">
                    ⚠️ 지도 API Key 미설정 (임시 시뮬레이션 모드)
                  </span>
                </div>
                
                <p className="text-[10.5px] text-slate-450 leading-relaxed px-1">
                  주소를 검색하면 중심부 근처에 핀이 활성화됩니다. 아래 영역 내 임의의 위치를 클릭하시면 핀이 이동하고 위도, 경도 정보가 자동으로 계산됩니다.
                </p>

                <div
                  ref={mapRef}
                  onClick={(e) => {
                    if (mapRef.current) {
                      const rect = mapRef.current.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const pctX = (x / rect.width) * 100;
                      const pctY = (y / rect.height) * 100;
                      setPinX(pctX);
                      setPinY(pctY);

                      const baseLat = parseFloat(latitude) || 37.5665;
                      const baseLng = parseFloat(longitude) || 126.9780;
                      const newLat = (baseLat + ((50 - pctY) * 0.0005)).toFixed(6);
                      const newLng = (baseLng + ((pctX - 50) * 0.0005)).toFixed(6);
                      setLatitude(newLat);
                      setLongitude(newLng);
                    }
                  }}
                  className="w-full h-48 rounded-2xl bg-slate-900 border border-slate-350 dark:border-slate-800 relative cursor-crosshair overflow-hidden shadow-inner flex items-center justify-center select-none"
                >
                  <div className="absolute inset-0 bg-white/5 opacity-40 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                  
                  <div className="absolute text-[9px] text-slate-500 font-mono top-2 left-3 font-semibold pointer-events-none">
                    MAP PERSPECTIVE (SIMULATED)
                  </div>

                  <div
                    style={{ left: `${pinX}%`, top: `${pinY}%` }}
                    className="absolute -translate-x-1/2 -translate-y-full transition-all duration-300 pointer-events-none flex flex-col items-center"
                  >
                    <div className="bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-md mb-1 whitespace-nowrap">
                      공사현장 핀 📍
                    </div>
                    <MapPin className="w-5 h-5 text-blue-500 drop-shadow-md animate-bounce" />
                  </div>

                  <span className="text-[10px] text-slate-450 font-bold pointer-events-none select-none text-center px-4 max-w-xs z-10">
                    {address ? "지도를 클릭해 정확한 핀의 위치를 조정하세요" : "먼저 우측 '주소 검색' 버튼을 통해 현장 주소를 등록해 주세요"}
                  </span>
                </div>
              </div>

              {/* 위도 경도 텍스트 표기 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">위도 (Latitude)</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="37.5665"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">경도 (Longitude)</label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="126.9780"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dropoff Manager Form */}
          {user?.role === "dropoff_manager" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">하차지 / 사토장 명칭</label>
                <input
                  type="text"
                  placeholder="예: 송도 남측 매립지 B구역"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">하차지 상세 주소</label>
                <input
                  type="text"
                  placeholder="도로명 또는 지번 주소 입력"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">토사반입 허가증 번호</label>
                <input
                  type="text"
                  placeholder="개발행위허가증 번호 입력"
                  value={permitNumber}
                  onChange={(e) => setPermitNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>
            </div>
          )}

          {/* Owner / Carrier Form */}
          {user?.role === "owner" && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4">
              <span className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block">차주 기사 겸직 여부</span>
              <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isDirectDriver}
                  onChange={(e) => setIsDirectDriver(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-350 dark:border-slate-750 focus:ring-blue-500"
                />
                <span>차주 사장님이 직접 덤프 트럭을 몰고 현장에서 운행하십니까?</span>
              </label>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-semibold">
                * 체크할 경우, 차주 권한 외에 '기사 권한'도 함께 승인되어 오더 수락 및 미터기 관제가 가능해집니다.
              </p>
            </div>
          )}

          {/* Document Upload Section */}
          {(filteredMissingDocs.length > 0 || filteredUploadedDocs.length > 0) && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-4">
              <span className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block px-1">
                필수 서류 제출 목록 ({filteredUploadedDocs.length} / {filteredUploadedDocs.length + filteredMissingDocs.length})
              </span>
              
              <div className="space-y-3">
                {/* Uploaded Documents */}
                {filteredUploadedDocs.map((docCode) => (
                  <div key={docCode} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl text-xs shadow-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-slate-700 dark:text-slate-350">
                        {docCode === "BIZ_LICENSE"
                          ? "사업자등록증"
                          : docCode === "CONSTRUCTION_PROOF"
                          ? "공사현장 증빙서류"
                          : docCode === "BANKBOOK"
                          ? "은행 통장 사본"
                          : docCode}
                      </span>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                        등록 완료 (제출됨)
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/35 text-emerald-605 dark:text-emerald-400 text-[10px] font-bold">
                      제출 완료
                    </span>
                  </div>
                ))}

                {/* Missing Documents */}
                {filteredMissingDocs.map((doc) => (
                  <div key={doc.code} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl text-xs shadow-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-slate-750 dark:text-slate-250">
                        {doc.code_name}
                      </span>
                      <span className="text-[10px] text-rose-500 font-mono font-bold">
                        필수 서류 미제출
                      </span>
                    </div>
                    
                    <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-750 text-white text-[10px] font-extrabold rounded-lg cursor-pointer active:scale-95 transition-all shrink-0 flex items-center gap-1.5 shadow-sm">
                      {uploadingDocCode === doc.code ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>등록 중...</span>
                        </>
                      ) : (
                        <span>파일 선택</span>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingDocCode !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadDocument(doc.code, file);
                          }
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex flex-col gap-2 pt-6 border-t border-slate-100 dark:border-slate-800">
            {filteredMissingDocs.length > 0 && (
              <p className="text-[10px] text-rose-500 font-bold text-center">
                * 가입 승인을 신청하려면 모든 필수 서류 파일(위 목록)을 먼저 업로드해 주셔야 합니다.
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/15 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>제출 처리 중...</span>
                </>
              ) : (
                <span>최종 승인 요청 제출</span>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
