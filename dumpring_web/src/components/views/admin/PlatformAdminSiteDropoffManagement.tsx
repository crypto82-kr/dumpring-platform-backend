import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  MapPin,
  Calendar,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Send,
  X,
  Truck,
  Sparkles,
  RefreshCw,
  Phone,
  User,
  ShieldCheck,
  Check,
  Filter
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface SiteItem {
  id: number;
  site_name: string;
  company_name: string;
  business_number: string;
  site_address: string;
  manager_name: string;
  manager_phone: string;
  latitude?: number;
  longitude?: number;
  is_proxy?: boolean;
  matched_dropoff_name?: string | null;
  matched_dropoff_id?: number | null;
  active_jobs_count?: number;
}

interface DropoffItem {
  id: number;
  name: string;
  address: string;
  permit_number: string;
  owner_id: number;
  owner_name?: string;
  owner_phone?: string;
  status: string;
  latitude?: number;
  longitude?: number;
  is_proxy?: boolean;
  matched_sites_count?: number;
  connected_sites?: string[];
}

interface PlatformAdminSiteDropoffManagementProps {
  setActivePath: (path: string) => void;
}

export function PlatformAdminSiteDropoffManagement({ setActivePath }: PlatformAdminSiteDropoffManagementProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 통합 검색어 및 대리 등록 필터
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterProxyOnly, setFilterProxyOnly] = useState<boolean>(false);

  // 마스터 데이터
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [dropoffs, setDropoffs] = useState<DropoffItem[]>([]);

  // 선택된 현장 (하단 슬라이드 패널 연동)
  const [selectedSite, setSelectedSite] = useState<SiteItem | null>(null);

  // 매칭 대행 폼 상태
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [selectedDropoffId, setSelectedDropoffId] = useState<number | null>(null);
  const [dropoffSearchTerm, setDropoffSearchTerm] = useState<string>("");
  const [isDropoffDropdownOpen, setIsDropoffDropdownOpen] = useState<boolean>(false);
  const [soilType, setSoilType] = useState<string>("GOOD_SOIL");
  const [truckType, setTruckType] = useState<string>("T_25");
  const [requiredTrucks, setRequiredTrucks] = useState<number>(10);
  const [unitPrice, setUnitPrice] = useState<number>(50000);
  const [payerType, setPayerType] = useState<string>("SITE_PAYS");
  const [memo, setMemo] = useState<string>("플랫폼 관리자 대행 1일 유효 매칭 등록");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // 대리등록 모달 상태
  const [isSiteModalOpen, setIsSiteModalOpen] = useState<boolean>(false);
  const [isDropoffModalOpen, setIsDropoffModalOpen] = useState<boolean>(false);

  // 신규 현장 대리등록 폼
  const [newSiteName, setNewSiteName] = useState<string>("");
  const [newSiteCompany, setNewSiteCompany] = useState<string>("");
  const [newSiteBizNum, setNewSiteBizNum] = useState<string>("");
  const [newSiteAddress, setNewSiteAddress] = useState<string>("");
  const [newSiteManagerName, setNewSiteManagerName] = useState<string>("");
  const [newSiteManagerPhone, setNewSiteManagerPhone] = useState<string>("");

  // 신규 하차지 대리등록 폼
  const [newDropoffName, setNewDropoffName] = useState<string>("");
  const [newDropoffAddress, setNewDropoffAddress] = useState<string>("");
  const [newDropoffPermit, setNewDropoffPermit] = useState<string>("");
  const [newDropoffOwnerName, setNewDropoffOwnerName] = useState<string>("");
  const [newDropoffOwnerPhone, setNewDropoffOwnerPhone] = useState<string>("");

  // DB 공통코드 마스터 상태
  const [soilOptions, setSoilOptions] = useState<Array<{ code: string; name: string }>>([
    { code: "GOOD_SOIL", name: "양질토" },
    { code: "SOIL", name: "일반토사" },
    { code: "ROCK", name: "암버럭/풍화암" },
    { code: "MUD_SOIL", name: "갯벌/뻘흙" },
    { code: "MIXED", name: "혼합골재" },
    { code: "SAND", name: "모래" },
    { code: "CLAY", name: "점토" }
  ]);

  const [truckOptions, setTruckOptions] = useState<Array<{ code: string; name: string; tariff: number }>>([
    { code: "T_15", name: "15톤", tariff: 140000 },
    { code: "T_25", name: "25.5톤", tariff: 180000 },
    { code: "T_27", name: "27톤", tariff: 220000 }
  ]);

  // 1. 데이터 로드 (현장 목록, 하차지 목록, 배차 공고, 공통코드)
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 현장, 하차지, 활성 공고, 공통코드, 요금정책 병렬 조회
      const [sitesRes, dropoffsRes, jobsRes, codesRes, pricingRes] = await Promise.all([
        fetch(`${baseUrl}/api/sites/admin-sites`, { headers }),
        fetch(`${baseUrl}/api/drop-offs/all`, { headers }),
        fetch(`${baseUrl}/api/dispatch/job-posts?limit=100`, { headers }),
        fetch(`${baseUrl}/api/common-codes`),
        fetch(`${baseUrl}/api/common-codes/pricing-policy`)
      ]);

      let rawSites: any[] = [];
      let rawDropoffs: any[] = [];
      let rawJobs: any[] = [];

      if (sitesRes.ok) rawSites = await sitesRes.json();
      if (dropoffsRes.ok) rawDropoffs = await dropoffsRes.json();
      if (jobsRes.ok) rawJobs = await jobsRes.json();

      // 공통코드 및 단가 정책 적용
      if (codesRes.ok) {
        const allCodes: any[] = await codesRes.json();
        const dbSoils = allCodes
          .filter((c: any) => c.group_code === "MATERIAL_TYPE" && c.is_active)
          .map((c: any) => ({ code: c.code, name: c.code_name }));
        if (dbSoils.length > 0) setSoilOptions(dbSoils);
      }

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        if (pricingData.tonnage_tariffs && pricingData.tonnage_tariffs.length > 0) {
          const dbTrucks = pricingData.tonnage_tariffs.map((t: any) => ({
            code: t.code,
            name: t.name || `${t.code.replace("T_", "")}톤`,
            tariff: t.base_tariff || 180000
          }));
          setTruckOptions(dbTrucks);
          // 기본 선택 차량의 기본 운임 단가 반영
          const matched = dbTrucks.find((t: any) => t.code === "T_25") || dbTrucks[0];
          if (matched) {
            setUnitPrice((prev) => (prev === 50000 ? matched.tariff : prev));
          }
        }
      }

      // 하차지별 연결 현장 집계 맵
      const dropoffConnectionsMap: Record<number, Set<string>> = {};
      const siteMatchMap: Record<number, { dropoffName: string; dropoffId: number; count: number }> = {};

      rawJobs.forEach((j: any) => {
        const dId = j.matched_drop_off_id || (j.matched_drop_off ? j.matched_drop_off.id : null);
        const dName = j.matched_drop_off?.name || "사토장";
        const sId = j.site_id;
        const sName = j.site?.site_name || j.site?.company_name || `현장 #${sId}`;

        if (dId) {
          if (!dropoffConnectionsMap[dId]) dropoffConnectionsMap[dId] = new Set();
          dropoffConnectionsMap[dId].add(sName);
        }

        if (sId && dName && ["OPEN", "WAITING_APPROVAL", "IN_PROGRESS", "ACCEPTED"].includes(j.status)) {
          siteMatchMap[sId] = {
            dropoffName: dName,
            dropoffId: dId,
            count: (siteMatchMap[sId]?.count || 0) + 1
          };
        }
      });

      // 현장 마스터 정제
      const parsedSites: SiteItem[] = (rawSites || []).map((s: any) => {
        const matchInfo = siteMatchMap[s.id];
        return {
          id: s.id,
          site_name: s.site_name || s.company_name || `현장 #${s.id}`,
          company_name: s.company_name || "-",
          business_number: s.business_number || "-",
          site_address: s.site_address || "주소 미등록",
          manager_name: s.manager_name || (s.creator ? s.creator.name : "담당자 미지정"),
          manager_phone: s.manager_phone || (s.creator ? s.creator.phone_number : "-"),
          latitude: s.latitude,
          longitude: s.longitude,
          is_proxy: s.site_name?.startsWith("[대리]") || s.company_name?.startsWith("[대리]"),
          matched_dropoff_name: matchInfo ? matchInfo.dropoffName : null,
          matched_dropoff_id: matchInfo ? matchInfo.dropoffId : null,
          active_jobs_count: matchInfo ? matchInfo.count : 0
        };
      });

      // 하차지 마스터 정제
      const parsedDropoffs: DropoffItem[] = (rawDropoffs || []).map((d: any) => {
        const connectedSet = dropoffConnectionsMap[d.id] || new Set();
        return {
          id: d.id,
          name: d.name,
          address: d.address || "주소 미등록",
          permit_number: d.permit_number || "-",
          owner_id: d.owner_id,
          status: d.status,
          latitude: d.latitude,
          longitude: d.longitude,
          is_proxy: d.name?.startsWith("[대리]"),
          matched_sites_count: connectedSet.size,
          connected_sites: Array.from(connectedSet)
        };
      });

      setSites(parsedSites);
      setDropoffs(parsedDropoffs);

      // 사용자가 직접 클릭하기 전까지 첫 번째 항목 자동선택 금지 (기존 선택이 있을 때만 갱신)
      setSelectedSite((prev) => {
        if (prev) {
          return parsedSites.find((s) => s.id === prev.id) || null;
        }
        return null;
      });
    } catch (err) {
      console.error("현장/하차지 마스터 로드 오류:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 검색 및 대리등록 필터링된 현장 리스트
  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (filterProxyOnly && !s.is_proxy) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.site_name.toLowerCase().includes(q) ||
        s.company_name.toLowerCase().includes(q) ||
        s.manager_name.toLowerCase().includes(q) ||
        s.site_address.toLowerCase().includes(q) ||
        (s.matched_dropoff_name && s.matched_dropoff_name.toLowerCase().includes(q))
      );
    });
  }, [sites, searchQuery, filterProxyOnly]);

  // 검색 및 대리등록 필터링된 하차지 리스트
  const filteredDropoffs = useMemo(() => {
    return dropoffs.filter((d) => {
      if (filterProxyOnly && !d.is_proxy) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q) ||
        d.permit_number.toLowerCase().includes(q) ||
        (d.connected_sites && d.connected_sites.some((cs) => cs.toLowerCase().includes(q)))
      );
    });
  }, [dropoffs, searchQuery, filterProxyOnly]);

  // 하차지 선택 드롭다운용 필터
  const dropoffDropdownOptions = useMemo(() => {
    if (!dropoffSearchTerm) return dropoffs;
    const term = dropoffSearchTerm.toLowerCase();
    return dropoffs.filter(
      (d) => d.name.toLowerCase().includes(term) || d.address.toLowerCase().includes(term)
    );
  }, [dropoffs, dropoffSearchTerm]);

  // 선택된 하차지 객체
  const selectedDropoffObj = useMemo(() => {
    return dropoffs.find((d) => d.id === selectedDropoffId) || null;
  }, [dropoffs, selectedDropoffId]);

  // 매칭 대행 등록 및 공고 오픈 저장
  const handleSaveMatching = async () => {
    if (!selectedSite) {
      alert("매칭을 생성할 현장을 좌측 목록에서 선택해 주세요.");
      return;
    }
    if (!selectedDropoffId) {
      alert("현장과 연결할 하차지(사토장)를 선택해 주세요.");
      return;
    }
    if (!targetDate) {
      alert("작업 유효 날짜를 지정해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const payload = {
        site_id: selectedSite.id,
        drop_off_id: selectedDropoffId,
        work_date: targetDate,
        material_type: soilType,
        truck_type: truckType,
        required_trucks: Number(requiredTrucks) || 10,
        unit_price: Number(unitPrice) || 50000,
        payer_type: payerType,
        memo: memo || `플랫폼 관리자 대행 매칭 (${targetDate})`
      };

      const res = await fetch(`${baseUrl}/api/admin/match-proxy`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "매칭 데이터 저장 실패");
      }

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3500);
      alert(`[대행 매칭 완료]\n현장 '${selectedSite.site_name}'과 하차지 '${selectedDropoffObj?.name}' 간의 ${targetDate} 1일 유효 배차 공고가 정식 개설되었습니다.`);
      
      // 목록 새로고침
      await fetchData();
    } catch (err: any) {
      alert(`오류: ${err.message || "매칭 저장 중 문제가 발생했습니다."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 현장 대리 등록 제출
  const handleCreateProxySite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteCompany || !newSiteBizNum) {
      alert("현장명, 건설사명, 사업자번호는 필수 입력 항목입니다.");
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const finalSiteName = newSiteName.startsWith("[대리]") ? newSiteName : `[대리] ${newSiteName}`;

      const res = await fetch(`${baseUrl}/api/sites`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          site_name: finalSiteName,
          company_name: newSiteCompany,
          business_number: newSiteBizNum,
          site_address: newSiteAddress || "서울/수도권",
          latitude: 37.5665,
          longitude: 126.978,
          geofencing_radius: 200,
          managers: `${newSiteManagerName || "담당소장"} (${newSiteManagerPhone || "010-0000-0000"})`
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "현장 대리 등록 실패");
      }

      alert("현장이 [대리] 등록으로 성공적으로 개설되었습니다.");
      setIsSiteModalOpen(false);
      setNewSiteName("");
      setNewSiteCompany("");
      setNewSiteBizNum("");
      setNewSiteAddress("");
      setNewSiteManagerName("");
      setNewSiteManagerPhone("");
      await fetchData();
    } catch (err: any) {
      alert(`오류: ${err.message || "현장 등록에 실패했습니다."}`);
    }
  };

  // 하차지 대리 등록 제출
  const handleCreateProxyDropoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDropoffName || !newDropoffAddress) {
      alert("하차지명과 주소는 필수 입력 항목입니다.");
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const finalDropoffName = newDropoffName.startsWith("[대리]") ? newDropoffName : `[대리] ${newDropoffName}`;
      const permit = newDropoffPermit || `PERMIT-PROXY-${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await fetch(`${baseUrl}/api/drop-offs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: finalDropoffName,
          address: newDropoffAddress,
          permit_number: permit,
          latitude: 37.4563,
          longitude: 126.7052,
          radius_meter: 200
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "하차지 대리 등록 실패");
      }

      alert("하차지(사토장)가 [대리] 등록으로 성공적으로 개설되었습니다.");
      setIsDropoffModalOpen(false);
      setNewDropoffName("");
      setNewDropoffAddress("");
      setNewDropoffPermit("");
      setNewDropoffOwnerName("");
      setNewDropoffOwnerPhone("");
      await fetchData();
    } catch (err: any) {
      alert(`오류: ${err.message || "하차지 등록에 실패했습니다."}`);
    }
  };

  return (
    <div className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* 1. 상단 바: 대시보드 헤더 및 전체 통계 지표 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
              PLATFORM ADMIN MASTER CONTROL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            현장/하차지 마스터 조회 및 매칭 대행
            <span className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg">
              RELATION PROXY
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            전국 현장과 하차지 등록 현황을 통합 관리하고, 1일 기준 유효한 정식 매칭(Relation)을 대행 등록하여 배차 공고를 즉시 오픈합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
            <Building2 className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-[11px] font-bold text-blue-700">전체 등록 현장</div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {sites.length} <span className="text-xs font-normal text-slate-400">개소</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3 shadow-xs">
            <MapPin className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="text-[11px] font-bold text-emerald-700">전체 등록 하차지</div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {dropoffs.length} <span className="text-xs font-normal text-slate-400">개소</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            title="데이터 새로고침"
            className="p-3 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. 통합 검색 바 & 필터 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="현장명, 하차지명, 담당자명, 주소 검색..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-xs hover:bg-slate-50 transition-all">
            <input
              type="checkbox"
              checked={filterProxyOnly}
              onChange={(e) => setFilterProxyOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>대리 등록 건만 필터</span>
          </label>
        </div>
      </div>

      {/* 3. 중앙 그리드 (50% : 50% 분할 레이아웃) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* [좌측 구역: 현장 마스터 리스트] */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black text-slate-900">
                현장(출발지) 마스터 리스트 ({filteredSites.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsSiteModalOpen(true)}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              현장 대리등록
            </button>
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">현장명</th>
                  <th className="py-2.5 px-3">담당자</th>
                  <th className="py-2.5 px-3">현재 매칭 상태</th>
                  <th className="py-2.5 px-2 text-center">선택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSites.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      등록된 공사현장 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSites.map((s) => {
                    const isSelected = selectedSite?.id === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSite(s)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/80 font-bold text-blue-900 ring-1 ring-inset ring-blue-300"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {s.is_proxy && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                                대리
                              </span>
                            )}
                            <span className="font-bold text-slate-900">{s.site_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {s.site_address}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900">{s.manager_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{s.manager_phone}</div>
                        </td>
                        <td className="py-3 px-3">
                          {s.matched_dropoff_name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {s.matched_dropoff_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              미매칭
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSite(s);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {isSelected ? "선택됨" : "매칭지정"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* [우측 구역: 하차지 마스터 리스트] */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900">
                하차지(목적지) 마스터 리스트 ({filteredDropoffs.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsDropoffModalOpen(true)}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              하차지 대리등록
            </button>
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">하차지명</th>
                  <th className="py-2.5 px-3">인허가/소유</th>
                  <th className="py-2.5 px-3">연결현황</th>
                  <th className="py-2.5 px-2 text-center">선택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDropoffs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      등록된 하차지(사토장) 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDropoffs.map((d) => {
                    const isTarget = selectedDropoffId === d.id;
                    const hasConnections = (d.matched_sites_count || 0) > 0;
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedDropoffId(d.id)}
                        className={`cursor-pointer transition-colors ${
                          isTarget
                            ? "bg-emerald-50/80 font-bold text-emerald-900 ring-1 ring-inset ring-emerald-300"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {d.is_proxy && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                                대리
                              </span>
                            )}
                            <span className="font-bold text-slate-900">{d.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {d.address}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          <div>{d.permit_number}</div>
                          <div className="text-[10px] text-slate-400">지주 ID: {d.owner_id}</div>
                        </td>
                        <td className="py-3 px-3">
                          {hasConnections ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-bold">
                              현장 {d.matched_sites_count}개소
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[11px]">
                              미연결
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDropoffId(d.id);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isTarget
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {isTarget ? "지정됨" : "하차지선택"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. 하단 슬라이드 패널: 선택된 현장의 요약 정보 및 매칭 대행 설정 */}
      <div className="bg-slate-50 border-2 border-blue-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        {/* 요약 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
              🏗️
            </div>
            <div>
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                SELECTED CONSTRUCTION SITE
              </div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {selectedSite ? selectedSite.site_name : "선택된 현장 없음"}
                {selectedSite?.is_proxy && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold">
                    대리 등록 현장
                  </span>
                )}
              </h3>
            </div>
          </div>

          {selectedSite ? (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>담당자: <strong>{selectedSite.manager_name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{selectedSite.manager_phone}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{selectedSite.site_address}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">위 좌측 테이블에서 매칭을 진행할 현장을 클릭하세요.</p>
          )}
        </div>

        {/* 매칭 대행 및 공고 설정 폼 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>매칭 대행 및 배차 공고 오픈 설정 (1일 단위 유효 데이터 생성)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {/* 1. 작업 날짜 선택 (1일 기준 캘린더 피커) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                1. 작업 날짜 선택 (1일 기준)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                * 자정이 지나면 시스템에 의해 자동 만료 처리됩니다.
              </span>
            </div>

            {/* 2. 연결할 하차지 검색 및 선택 */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                2. 연결할 하차지(사토장)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedDropoffObj ? `${selectedDropoffObj.name} (${selectedDropoffObj.address})` : dropoffSearchTerm}
                  onChange={(e) => {
                    setDropoffSearchTerm(e.target.value);
                    setSelectedDropoffId(null);
                    setIsDropoffDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropoffDropdownOpen(true)}
                  placeholder="하차지명 검색 후 선택..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                />
                {selectedDropoffObj ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDropoffId(null);
                      setDropoffSearchTerm("");
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                )}
              </div>

              {/* 하차지 드롭다운 목록 */}
              {isDropoffDropdownOpen && !selectedDropoffObj && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                  {dropoffDropdownOptions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">일치하는 하차지가 없습니다.</div>
                  ) : (
                    dropoffDropdownOptions.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDropoffId(d.id);
                          setIsDropoffDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 text-xs transition-colors"
                      >
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>{d.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{d.permit_number}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{d.address}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 3. 토사 종류 및 덤프 규격 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-600" />
                3. 토사 종류 및 차량 규격
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                >
                  {soilOptions.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={truckType}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setTruckType(newCode);
                    const selectedOpt = truckOptions.find((t) => t.code === newCode);
                    if (selectedOpt && selectedOpt.tariff) {
                      setUnitPrice(selectedOpt.tariff);
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                >
                  {truckOptions.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} (기준 {t.tariff ? `${t.tariff.toLocaleString()}원` : ""})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. 필요 대수 및 단가 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                4. 모집 대수 / 탕 단가 (원)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={requiredTrucks}
                  onChange={(e) => setRequiredTrucks(Number(e.target.value))}
                  placeholder="대수"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-900"
                />
                <input
                  type="number"
                  step={1000}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  placeholder="단가"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 저장 및 배차 공고 즉시 오픈 버튼 바 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              💡 저장 시 <strong>정식 매칭 관계(Relation)</strong>가 체결되며, 기사들이 즉시 배차 지원할 수 있는{" "}
              <strong className="text-blue-600 font-bold">기사 모집(OPEN)</strong> 공고가 동시 생성됩니다.
            </div>

            <button
              type="button"
              disabled={isSubmitting || !selectedSite || !selectedDropoffId}
              onClick={handleSaveMatching}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>매칭 데이터 저장 중...</span>
                </>
              ) : (
                <>
                  <span>🚀 매칭 데이터 저장 및 배차 공고 오픈</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. [모달 1]: 현장 대리 등록 팝업 */}
      {/* ======================================================== */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">현장 마스터 대리 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSiteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProxySite} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">공사 현장명 *</label>
                <input
                  type="text"
                  required
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="예: 강동아파트 신축 현장 (자동으로 [대리] 접두어가 붙습니다)"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">건설사/상호 *</label>
                  <input
                    type="text"
                    required
                    value={newSiteCompany}
                    onChange={(e) => setNewSiteCompany(e.target.value)}
                    placeholder="예: 덤프건설(주)"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">사업자등록번호 *</label>
                  <input
                    type="text"
                    required
                    value={newSiteBizNum}
                    onChange={(e) => setNewSiteBizNum(e.target.value)}
                    placeholder="000-00-00000"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">현장 주소 (상차지)</label>
                <input
                  type="text"
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  placeholder="예: 서울 강동구 천호대로 1024"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">현장 담당자 성명</label>
                  <input
                    type="text"
                    value={newSiteManagerName}
                    onChange={(e) => setNewSiteManagerName(e.target.value)}
                    placeholder="김소장"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">담당자 연락처</label>
                  <input
                    type="text"
                    value={newSiteManagerPhone}
                    onChange={(e) => setNewSiteManagerPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  현장 대리 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. [모달 2]: 하차지 대리 등록 팝업 */}
      {/* ======================================================== */}
      {isDropoffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">하차지(사토장) 마스터 대리 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDropoffModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProxyDropoff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">하차지(사토장) 명칭 *</label>
                <input
                  type="text"
                  required
                  value={newDropoffName}
                  onChange={(e) => setNewDropoffName(e.target.value)}
                  placeholder="예: 삼패동 야적장 (자동으로 [대리] 접두어가 붙습니다)"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">하차지 주소 (도착지) *</label>
                <input
                  type="text"
                  required
                  value={newDropoffAddress}
                  onChange={(e) => setNewDropoffAddress(e.target.value)}
                  placeholder="예: 경기 남양주시 삼패동 100-1"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">인허가 번호 (개발행위/매립)</label>
                <input
                  type="text"
                  value={newDropoffPermit}
                  onChange={(e) => setNewDropoffPermit(e.target.value)}
                  placeholder="미입력 시 시스템 임의 인허가코드 자동 발급"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDropoffModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  하차지 대리 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
