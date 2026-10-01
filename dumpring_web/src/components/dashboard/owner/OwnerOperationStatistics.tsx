"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Truck,
  Search,
  RotateCcw,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  FileText,
  ZoomIn,
  ZoomOut,
  X,
  Layers,
  ArrowRightLeft,
  Building2,
  MapPin,
  TrendingUp,
  PieChart,
  BarChart3,
  DollarSign,
  Package,
  CheckCircle2
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

// 운행 레코드 인터페이스
interface OperationRecord {
  ticket_id: number;
  date: string;
  time: string;
  driver_id: number;
  driver_name: string;
  car_id: number;
  car_number: string;
  tonnage: number;
  site_id: number;
  site_name: string;
  dropoff_id: number;
  dropoff_name: string;
  material_type: string;
  material_name: string;
  status: string;
  status_name: string;
  fare: number;
  distance_km: number;
  trips: number;
  weight_ton: number;
  proof_photo?: string | null;
}

interface OwnerOperationStatisticsProps {
  setActivePath?: (path: string) => void;
}

export function OwnerOperationStatistics({ setActivePath }: OwnerOperationStatisticsProps) {
  // 오늘 날짜 및 최근 30일 기본값
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  }, []);

  // 1. 필터 상태 관리
  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedDropoffs, setSelectedDropoffs] = useState<string[]>([]);
  const [driverOrCarKeyword, setDriverOrCarKeyword] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("ALL");

  // 드롭다운 열림 상태
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const [isDropoffDropdownOpen, setIsDropoffDropdownOpen] = useState(false);

  // 2. 분석 관점 스위칭 탭 ("SITE" | "DROPOFF")
  const [analysisPerspective, setAnalysisPerspective] = useState<"SITE" | "DROPOFF">("SITE");

  // 3. 데이터 및 로딩 상태
  const [rawRecords, setRawRecords] = useState<OperationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 4. 테이블 내 퀵 검색 & 정렬 & 그룹 접기
  const [tableQuickSearch, setTableQuickSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<keyof OperationRecord>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [secondarySortKey, setSecondarySortKey] = useState<keyof OperationRecord | null>(null);
  const [secondarySortOrder, setSecondarySortOrder] = useState<"asc" | "desc">("asc");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // 5. 증빙 사진 모달 뷰어 상태
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [hoverImage, setHoverImage] = useState<{ url: string; x: number; y: number } | null>(null);

  // 백엔드 API 호출
  const fetchStatistics = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await fetch(`${baseUrl}/api/fleet/statistics/operation?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setRawRecords(data.records || []);
      } else {
        if (res.status === 401) {
          setErrorMsg("로그인이 만료되었습니다. 다시 로그인해 주세요.");
        } else {
          setErrorMsg(`데이터를 불러오는 중 오류가 발생했습니다. (${res.status})`);
        }
      }
    } catch (err: any) {
      console.warn("fetchStatistics error:", err);
      setErrorMsg("백엔드 통신 실패. 네트워크를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  // 전체 데이터셋에서 고유 상차지, 하차지, 품목 리스트 추출
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach(r => {
      if (r.site_name) set.add(r.site_name);
    });
    return Array.from(set).sort();
  }, [rawRecords]);

  const availableDropoffs = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach(r => {
      if (r.dropoff_name) set.add(r.dropoff_name);
    });
    return Array.from(set).sort();
  }, [rawRecords]);

  const availableMaterials = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach(r => {
      if (r.material_name) set.add(r.material_name);
    });
    return Array.from(set).sort();
  }, [rawRecords]);

  // 교차 필터링 적용된 레코드
  const filteredRecords = useMemo(() => {
    return rawRecords.filter(item => {
      // 상차지 다중선택
      if (selectedSites.length > 0 && !selectedSites.includes(item.site_name)) {
        return false;
      }
      // 하차지 다중선택
      if (selectedDropoffs.length > 0 && !selectedDropoffs.includes(item.dropoff_name)) {
        return false;
      }
      // 기사/차량번호
      if (driverOrCarKeyword.trim()) {
        const kw = driverOrCarKeyword.trim().toLowerCase();
        const dMatch = item.driver_name?.toLowerCase().includes(kw);
        const cMatch = item.car_number?.toLowerCase().includes(kw);
        if (!dMatch && !cMatch) return false;
      }
      // 품목
      if (selectedMaterial !== "ALL" && item.material_name !== selectedMaterial) {
        return false;
      }
      return true;
    });
  }, [rawRecords, selectedSites, selectedDropoffs, driverOrCarKeyword, selectedMaterial]);

  // 테이블 내 즉시 검색 (퀵 검색)
  const displayRecords = useMemo(() => {
    if (!tableQuickSearch.trim()) return filteredRecords;
    const kw = tableQuickSearch.trim().toLowerCase();
    return filteredRecords.filter(r =>
      r.driver_name?.toLowerCase().includes(kw) ||
      r.car_number?.toLowerCase().includes(kw) ||
      r.site_name?.toLowerCase().includes(kw) ||
      r.dropoff_name?.toLowerCase().includes(kw) ||
      r.material_name?.toLowerCase().includes(kw) ||
      r.date.includes(kw)
    );
  }, [filteredRecords, tableQuickSearch]);

  // 정렬 적용
  const sortedRecords = useMemo(() => {
    const copy = [...displayRecords];
    copy.sort((a, b) => {
      const valA: string | number = (a[sortKey] ?? "") as any;
      const valB: string | number = (b[sortKey] ?? "") as any;

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;

      // 2차 정렬 (Shift 키를 누르고 클릭한 경우)
      if (secondarySortKey) {
        const secA: string | number = (a[secondarySortKey] ?? "") as any;
        const secB: string | number = (b[secondarySortKey] ?? "") as any;
        if (secA < secB) return secondarySortOrder === "asc" ? -1 : 1;
        if (secA > secB) return secondarySortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
    return copy;
  }, [displayRecords, sortKey, sortOrder, secondarySortKey, secondarySortOrder]);

  // 1차 그룹화 (상차지 중심 or 하차지 중심)
  const groupedData = useMemo(() => {
    const map = new Map<string, OperationRecord[]>();
    sortedRecords.forEach(rec => {
      const groupKey = analysisPerspective === "SITE"
        ? (rec.site_name || "상차지 미지정")
        : (rec.dropoff_name || "하차지 미지정");
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(rec);
    });
    return map;
  }, [sortedRecords, analysisPerspective]);

  // KPI 지표 계산
  const kpis = useMemo(() => {
    const totalFare = filteredRecords.reduce((acc, cur) => acc + (cur.fare || 0), 0);
    const totalTrips = filteredRecords.reduce((acc, cur) => acc + (cur.trips || 1), 0);
    const totalWeight = filteredRecords.reduce((acc, cur) => acc + (cur.weight_ton || cur.tonnage || 0), 0);
    const activeTrucks = new Set(filteredRecords.map(r => r.car_number).filter(Boolean)).size;

    return {
      totalFare,
      totalTrips,
      totalWeight,
      activeTrucks
    };
  }, [filteredRecords]);

  // 차트 A: 기간별 일자 운행/매출 추이 (혼합형)
  const trendChartData = useMemo(() => {
    const dateMap = new Map<string, { date: string; trips: number; fare: number; weight: number }>();
    filteredRecords.forEach(r => {
      if (!dateMap.has(r.date)) {
        dateMap.set(r.date, { date: r.date, trips: 0, fare: 0, weight: 0 });
      }
      const item = dateMap.get(r.date)!;
      item.trips += (r.trips || 1);
      item.fare += (r.fare || 0);
      item.weight += (r.weight_ton || r.tonnage || 0);
    });

    const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-14); // 최근 14개 일자 표시
  }, [filteredRecords]);

  // 차트 B: 상/하차지별 비중 (도넛형)
  const donutChartData = useMemo(() => {
    const countMap = new Map<string, { name: string; trips: number; fare: number; weight: number }>();
    filteredRecords.forEach(r => {
      const key = analysisPerspective === "SITE" ? (r.site_name || "기타 상차지") : (r.dropoff_name || "기타 하차지");
      if (!countMap.has(key)) {
        countMap.set(key, { name: key, trips: 0, fare: 0, weight: 0 });
      }
      const item = countMap.get(key)!;
      item.trips += (r.trips || 1);
      item.fare += (r.fare || 0);
      item.weight += (r.weight_ton || r.tonnage || 0);
    });

    const total = Array.from(countMap.values()).reduce((sum, i) => sum + i.weight, 0);
    const sorted = Array.from(countMap.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5); // 상위 5개

    const palette = [
      "#3b82f6", // blue-500
      "#10b981", // emerald-500
      "#f59e0b", // amber-500
      "#8b5cf6", // purple-500
      "#ec4899", // pink-500
      "#64748b"  // slate-500
    ];

    let currentAngle = 0;
    return sorted.map((item, idx) => {
      const percentage = total > 0 ? (item.weight / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        ...item,
        percentage: percentage.toFixed(1),
        color: palette[idx % palette.length],
        startAngle,
        angle
      };
    });
  }, [filteredRecords, analysisPerspective]);

  // 필터 초기화
  const handleResetFilters = () => {
    setStartDate(thirtyDaysAgoStr);
    setEndDate(todayStr);
    setSelectedSites([]);
    setSelectedDropoffs([]);
    setDriverOrCarKeyword("");
    setSelectedMaterial("ALL");
    setTableQuickSearch("");
    fetchStatistics();
  };

  // 그룹 접기 토글
  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 컬럼 헤더 클릭 정렬 (다중 정렬 지원)
  const handleColumnSort = (key: keyof OperationRecord, e: React.MouseEvent) => {
    if (e.shiftKey && sortKey !== key) {
      if (secondarySortKey === key) {
        setSecondarySortOrder(prev => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSecondarySortKey(key);
        setSecondarySortOrder("asc");
      }
    } else {
      if (sortKey === key) {
        setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortOrder("desc");
        setSecondarySortKey(null);
      }
    }
  };

  // 엑셀 다운로드 (CSV UTF-8 BOM)
  const handleExportExcel = () => {
    if (sortedRecords.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    const headers = ["일자", "시간", "기사명", "차량번호", "상차지", "하차지", "품목", "탕수", "중량(톤)", "운임금액(원)", "거리(km)", "상태"];
    const rows = sortedRecords.map(r => [
      r.date,
      r.time,
      `"${r.driver_name}"`,
      `"${r.car_number}"`,
      `"${r.site_name}"`,
      `"${r.dropoff_name}"`,
      `"${r.material_name}"`,
      r.trips || 1,
      r.weight_ton || r.tonnage || 0,
      r.fare || 0,
      r.distance_km || 0,
      `"${r.status_name}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `운행통계_${analysisPerspective === "SITE" ? "상차지중심" : "하차지중심"}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 통계 리포트 인쇄
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800">
      {/* ========================================================================= */}
      {/* [ 영역 1: 통합 검색 및 교차 필터 바 (화면 최상단 고정 및 카드) ] */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. 조회기간 (달력) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none text-xs"
              />
              <span className="text-slate-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none text-xs"
              />
            </div>

            {/* 2. 상차지 (다중선택 드롭다운) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSiteDropdownOpen(!isSiteDropdownOpen);
                  setIsDropoffDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedSites.length > 0
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>
                  {selectedSites.length === 0
                    ? "상차지 전체"
                    : selectedSites.length === 1
                    ? selectedSites[0]
                    : `상차지 (${selectedSites.length}곳)`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {isSiteDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 text-xs space-y-1 max-h-56 overflow-y-auto">
                  <div className="px-2 py-1 font-bold text-slate-400 text-[10px] uppercase border-b border-slate-100 flex justify-between items-center">
                    <span>상차지 다중 선택</span>
                    {selectedSites.length > 0 && (
                      <button
                        onClick={() => setSelectedSites([])}
                        className="text-blue-600 hover:underline normal-case text-[10px]"
                      >
                        선택해제
                      </button>
                    )}
                  </div>
                  {availableSites.length === 0 ? (
                    <div className="p-2 text-center text-slate-400 text-[11px]">등록된 상차지 없음</div>
                  ) : (
                    availableSites.map(site => (
                      <label
                        key={site}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSites.includes(site)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedSites([...selectedSites, site]);
                            } else {
                              setSelectedSites(selectedSites.filter(s => s !== site));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span className="truncate">{site}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 3. 하차지 (다중선택 드롭다운) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDropoffDropdownOpen(!isDropoffDropdownOpen);
                  setIsSiteDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedDropoffs.length > 0
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {selectedDropoffs.length === 0
                    ? "하차지 전체"
                    : selectedDropoffs.length === 1
                    ? selectedDropoffs[0]
                    : `하차지 (${selectedDropoffs.length}곳)`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {isDropoffDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 text-xs space-y-1 max-h-56 overflow-y-auto">
                  <div className="px-2 py-1 font-bold text-slate-400 text-[10px] uppercase border-b border-slate-100 flex justify-between items-center">
                    <span>하차지 다중 선택</span>
                    {selectedDropoffs.length > 0 && (
                      <button
                        onClick={() => setSelectedDropoffs([])}
                        className="text-emerald-600 hover:underline normal-case text-[10px]"
                      >
                        선택해제
                      </button>
                    )}
                  </div>
                  {availableDropoffs.length === 0 ? (
                    <div className="p-2 text-center text-slate-400 text-[11px]">등록된 하차지 없음</div>
                  ) : (
                    availableDropoffs.map(drop => (
                      <label
                        key={drop}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDropoffs.includes(drop)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedDropoffs([...selectedDropoffs, drop]);
                            } else {
                              setSelectedDropoffs(selectedDropoffs.filter(d => d !== drop));
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span className="truncate">{drop}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 4. 기사/차량번호 입력 */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs w-44">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="기사명 / 차량번호"
                value={driverOrCarKeyword}
                onChange={e => setDriverOrCarKeyword(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none w-full text-xs"
              />
            </div>

            {/* 5. 품목 선택 */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-xl text-xs">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMaterial}
                onChange={e => setSelectedMaterial(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none text-xs cursor-pointer"
              >
                <option value="ALL">품목 전체</option>
                {availableMaterials.map(mat => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 조회 / 초기화 버튼 */}
          <div className="flex items-center gap-2 self-end xl:self-center">
            <button
              onClick={fetchStatistics}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>조회</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          </div>
        </div>

        {/* 선택된 교차 필터 태그 요약 */}
        {(selectedSites.length > 0 || selectedDropoffs.length > 0 || driverOrCarKeyword.trim() || selectedMaterial !== "ALL") && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400">교차 필터 조건:</span>
            {selectedSites.map(s => (
              <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] flex items-center gap-1">
                상차: {s}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSites(selectedSites.filter(x => x !== s))} />
              </span>
            ))}
            {selectedDropoffs.map(d => (
              <span key={d} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] flex items-center gap-1">
                하차: {d}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDropoffs(selectedDropoffs.filter(x => x !== d))} />
              </span>
            ))}
            {driverOrCarKeyword.trim() && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[11px] flex items-center gap-1">
                검색: {driverOrCarKeyword}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setDriverOrCarKeyword("")} />
              </span>
            )}
            {selectedMaterial !== "ALL" && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] flex items-center gap-1">
                품목: {selectedMaterial}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMaterial("ALL")} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* [ 영역 2: 핵심 운행 지표 요약 카드 (KPI 대시보드 블록) ] */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: 총 매출액 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">금월 총 매출액</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              ₩{kpis.totalFare.toLocaleString()}
            </div>
            <span className="text-[10px] text-blue-600 font-semibold inline-flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              조회 기간 누적 운임
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: 총 운행 탕수 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">총 운행 탕수</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {kpis.totalTrips.toLocaleString()} <span className="text-sm font-bold text-slate-500">회</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              정상 배차 완료 회전수
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: 총 운반 물량 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">총 운반 물량</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {kpis.totalWeight.toLocaleString()} <span className="text-sm font-bold text-slate-500">톤</span>
            </div>
            <span className="text-[10px] text-amber-600 font-semibold inline-flex items-center gap-1 mt-1">
              <Package className="w-3 h-3" />
              규격 및 계근 환산 중량
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: 실 운행 차량 수 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">실 운행 차량 수</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {kpis.activeTrucks} <span className="text-sm font-bold text-slate-500">대</span>
            </div>
            <span className="text-[10px] text-purple-600 font-semibold inline-flex items-center gap-1 mt-1">
              <Truck className="w-3 h-3" />
              해당 기간 가동 덤프트럭
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ▶ [ 🔄 상차지 중심 분석 탭 ]   [ 🔄 하차지 중심 분석 탭 ] (스위칭 토글 버튼) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnalysisPerspective("SITE")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              analysisPerspective === "SITE"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🔄 상차지(출발지) 중심 분석 탭</span>
            {analysisPerspective === "SITE" && (
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setAnalysisPerspective("DROPOFF")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              analysisPerspective === "DROPOFF"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>🔄 하차지(도착지) 중심 분석 탭</span>
            {analysisPerspective === "DROPOFF" && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse ml-1" />
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium px-3">
          <span>현재 관점:</span>
          <span className="font-bold text-slate-800">
            {analysisPerspective === "SITE" ? "상차지별 반출 물량 및 출발 거점 집계" : "하차지별 반입 물량 및 도착 매립지 집계"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 메인 분석 그리드: [ 영역 3: 통계 차트 (35%) ] | [ 영역 4: 상세 테이블 (65%) ] */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* --------------------------------------------------------------------- */}
        {/* [ 영역 3: 통계 시각화 차트 (좌측 35% ~ lg:col-span-5) ] */}
        {/* --------------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-6">
          {/* 차트 A: 기간별 운행/매출 추이 (혼합형 바/라인 차트) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  기간별 운행 탕수 / 매출 추이
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">일자별 운행 회전수와 운임 매출액 추세를 표시합니다.</p>
              </div>
            </div>

            {trendChartData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <BarChart3 className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
                표시할 운행 추이 데이터가 없습니다.
              </div>
            ) : (
              <div>
                {/* SVG 차트 영역 */}
                <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 bg-slate-50/60 rounded-xl border border-slate-100">
                  {(() => {
                    const maxTrips = Math.max(...trendChartData.map(d => d.trips), 1);
                    return trendChartData.map(d => {
                      const barHeight = (d.trips / maxTrips) * 110;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* 툴팁 */}
                          <div className="absolute -top-12 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                            <p className="font-bold">{d.date}</p>
                            <p>{d.trips}탕 / ₩{d.fare.toLocaleString()}</p>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-blue-600 group-hover:scale-110 transition-transform">
                            {d.trips}
                          </span>
                          <div
                            style={{ height: `${Math.max(barHeight, 6)}px` }}
                            className="w-full max-w-[20px] bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-md transition-all group-hover:from-blue-500 group-hover:to-indigo-300"
                          />
                          <span className="text-[9px] text-slate-400 truncate w-full text-center">
                            {d.date.slice(5)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex items-center justify-end gap-3 mt-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                    운행 탕수 (회)
                  </span>
                  <span className="text-slate-400 font-mono">최근 {trendChartData.length}일 집계</span>
                </div>
              </div>
            )}
          </div>

          {/* 차트 B: [상/하차지]별 비중 (도넛형) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  {analysisPerspective === "SITE" ? "상차지별 물량 반출 비중" : "하차지별 물량 반입 비중"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {analysisPerspective === "SITE"
                    ? "각 출발 현장/석산별 흙 물량(톤) 점유율 상위 5곳"
                    : "각 도착 사토장/매립지별 흙 물량(톤) 점유율 상위 5곳"}
                </p>
              </div>
            </div>

            {donutChartData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <PieChart className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
                표시할 비중 데이터가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                {/* 도넛 SVG */}
                <div className="flex items-center justify-center py-2">
                  <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                    {donutChartData.map((slice) => {
                      const strokeDasharray = `${(slice.angle / 360) * 283} 283`;
                      const strokeDashoffset = -((slice.startAngle / 360) * 283);
                      return (
                        <circle
                          key={slice.name}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="16"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 hover:opacity-80"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* 범례 */}
                <div className="space-y-2">
                  {donutChartData.map(slice => (
                    <div key={slice.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="truncate font-medium text-slate-700">{slice.name}</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="font-bold text-slate-900">{slice.percentage}%</span>
                        <span className="text-slate-400 ml-1">({slice.weight}t)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* [ 영역 4: 상세 데이터 테이블 그리드 (우측 65% ~ lg:col-span-7) ] */}
        {/* --------------------------------------------------------------------- */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* 테이블 상단 툴바: [엑셀 다운로드] [통계 리포트 인쇄] [테이블 내 즉시검색] */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>운행 내역 상세 대장</span>
                <span className="text-xs font-normal text-slate-500">
                  (총 <strong className="font-mono text-blue-600">{sortedRecords.length}</strong>건)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {analysisPerspective === "SITE" ? "상차지 기준 그룹화" : "하차지 기준 그룹화"} 접기/펼치기 지원 (Shift+클릭 2차 정렬)
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              {/* 테이블 내 즉시검색 */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs w-44">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="대장 내 즉시 검색"
                  value={tableQuickSearch}
                  onChange={e => setTableQuickSearch(e.target.value)}
                  className="bg-transparent border-none text-slate-700 font-medium focus:outline-none w-full text-xs"
                />
              </div>

              {/* 엑셀 다운로드 버튼 */}
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                title="현재 정렬 및 필터 상태로 엑셀(CSV) 저장"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">엑셀 다운로드</span>
              </button>

              {/* 통계 리포트 인쇄 */}
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                title="A4 규격 인쇄"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">리포트 인쇄</span>
              </button>
            </div>
          </div>

          {/* 테이블 그리드 본체 */}
          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 select-none">
                <tr>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={e => handleColumnSort("date", e)}
                  >
                    일자 {sortKey === "date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={e => handleColumnSort("driver_name", e)}
                  >
                    기사(차량) {sortKey === "driver_name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={e => handleColumnSort("site_name", e)}
                  >
                    상차지 {sortKey === "site_name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={e => handleColumnSort("dropoff_name", e)}
                  >
                    하차지 {sortKey === "dropoff_name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="p-3">품목</th>
                  <th
                    className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={e => handleColumnSort("trips", e)}
                  >
                    탕수 {sortKey === "trips" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={e => handleColumnSort("weight_ton", e)}
                  >
                    중량 {sortKey === "weight_ton" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={e => handleColumnSort("fare", e)}
                  >
                    금액 {sortKey === "fare" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="p-3 text-center">증빙</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      운행 통계 데이터를 조회하고 있습니다...
                    </td>
                  </tr>
                ) : groupedData.size === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      선택된 교차 필터 조건에 부합하는 운행 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  Array.from(groupedData.entries()).map(([groupName, groupItems]) => {
                    const isCollapsed = collapsedGroups[groupName];
                    const groupTrips = groupItems.reduce((acc, c) => acc + (c.trips || 1), 0);
                    const groupWeight = groupItems.reduce((acc, c) => acc + (c.weight_ton || c.tonnage || 0), 0);
                    const groupFare = groupItems.reduce((acc, c) => acc + (c.fare || 0), 0);

                    return (
                      <React.Fragment key={groupName}>
                        {/* 1차 그룹화 헤더 행 (트리 구조) */}
                        <tr
                          onClick={() => toggleGroupCollapse(groupName)}
                          className="bg-slate-100/70 hover:bg-slate-150 cursor-pointer font-bold text-slate-800 transition-colors"
                        >
                          <td colSpan={5} className="p-2.5">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                              )}
                              <span className="font-extrabold text-xs text-blue-900">
                                [{analysisPerspective === "SITE" ? "상차지" : "하차지"}] {groupName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({groupItems.length}건 배차)
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-xs">{groupTrips}회</td>
                          <td className="p-2.5 text-right font-mono text-xs">{groupWeight.toFixed(1)}t</td>
                          <td className="p-2.5 text-right font-mono text-xs text-blue-700">
                            ₩{groupFare.toLocaleString()}
                          </td>
                          <td className="p-2.5"></td>
                        </tr>

                        {/* 그룹 내 개별 레코드 행 */}
                        {!isCollapsed &&
                          groupItems.map(row => (
                            <tr key={row.ticket_id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono text-[11px] text-slate-600">
                                {row.date} <span className="text-[10px] text-slate-400">{row.time}</span>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{row.driver_name}</div>
                                <div className="text-[10px] font-mono text-slate-400">{row.car_number}</div>
                              </td>
                              <td className="p-3 font-medium text-slate-700">{row.site_name}</td>
                              <td className="p-3 font-medium text-slate-700">{row.dropoff_name}</td>
                              <td className="p-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  {row.material_name}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-semibold">{row.trips || 1}회</td>
                              <td className="p-3 text-right font-mono font-semibold">
                                {(row.weight_ton || row.tonnage || 0).toFixed(1)}t
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                ₩{(row.fare || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-center relative">
                                {row.proof_photo ? (
                                  <div
                                    className="inline-block relative group"
                                    onMouseEnter={e => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoverImage({
                                        url: row.proof_photo!,
                                        x: rect.left - 120,
                                        y: rect.top - 120
                                      });
                                    }}
                                    onMouseLeave={() => setHoverImage(null)}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setModalImage(row.proof_photo!);
                                        setZoomScale(1);
                                      }}
                                      className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all hover:scale-110"
                                      title="계근표/증빙 사진 클릭하여 확대"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 마우스 Hover 미니 팝업 미리보기 */}
      {/* ========================================================================= */}
      {hoverImage && !modalImage && (
        <div
          style={{ top: `${Math.max(10, hoverImage.y)}px`, left: `${Math.max(10, hoverImage.x)}px` }}
          className="fixed pointer-events-none z-50 p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl animate-fadeIn"
        >
          <img
            src={hoverImage.url}
            alt="증빙 미리보기"
            className="w-48 h-48 object-cover rounded-lg"
          />
          <p className="text-[10px] font-bold text-center text-slate-500 mt-1">
            클릭하여 원본 확대 보기
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [ 영역 3: 현장 증빙 사진 확대 레이어 팝업 (Modal Viewer) ] */}
      {/* ========================================================================= */}
      {modalImage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-extrabold text-sm text-slate-900">현장 계근표 / 송장 원본 증빙 뷰어</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                  className="p-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 transition-colors"
                  title="확대"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 transition-colors"
                  title="축소"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomScale(1)}
                  className="px-2 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-[10px] font-bold text-slate-700 transition-colors"
                >
                  100%
                </button>
                <button
                  onClick={() => setModalImage(null)}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 이미지 컨텐츠 (마우스 휠 줌 지원) */}
            <div
              className="flex-1 overflow-auto p-6 bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing min-h-[400px]"
              onWheel={e => {
                e.preventDefault();
                if (e.deltaY < 0) {
                  setZoomScale(prev => Math.min(prev + 0.1, 3));
                } else {
                  setZoomScale(prev => Math.max(prev - 0.1, 0.5));
                }
              }}
            >
              <img
                src={modalImage}
                alt="현장 증빙 원본"
                style={{ transform: `scale(${zoomScale})` }}
                className="max-h-[70vh] object-contain transition-transform duration-100 rounded"
              />
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>* 마우스 휠 스크롤 또는 상단 줌 버튼으로 이미지를 확대/축소하여 계근표 데이터를 대조하세요.</span>
              <button
                onClick={() => setModalImage(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-lg text-xs"
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
