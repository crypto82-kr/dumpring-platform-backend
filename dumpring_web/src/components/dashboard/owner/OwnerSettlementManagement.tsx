"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Search,
  RotateCcw,
  Download,
  FileText,
  CheckSquare,
  Square,
  Building2,
  DollarSign,
  Receipt,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Filter,
  Info,
  ShieldCheck,
  Navigation,
  MapPin,
  ChevronRight,
  X
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

// 덤프링 운반 및 정산 티켓 레코드 인터페이스 (실제 시스템 기준)
export interface SettlementRecord {
  ticket_id: number;
  date: string;              // YYYY-MM-DD
  time: string;              // HH:mm
  driver_id: number;
  driver_name: string;
  car_id: number;
  car_number: string;
  tonnage: number;
  site_id: number;
  site_name: string;
  company_name: string;      // 건설사명 (공급받는자)
  business_number: string;   // 거래처 사업자등록번호
  billing_email: string;     // 세금계산서 청구 이메일
  client_display: string;    // "현대건설 (검단 3공구)"
  dropoff_name: string;
  material_type: string;
  material_name: string;     // 사토(양질토), 모래, 자갈 등
  trips: number;             // 당일 총 운행 횟수 (회)
  unit_price: number;        // 회당 운반 단가 (KRW)
  supply_price: number;      // 공급가액 (단가 × 횟수)
  vat: number;               // 부가세 10% (원단위 절사)
  total_amount: number;      // 합계금액 (공급가액 + 부가세)
  raw_status: string;
  settlement_status: "SETTLEMENT_CONFIRMED" | "SETTLEMENT_REVIEW" | "SETTLEMENT_DISPUTED";
  settlement_label: "정산완료" | "정산대기" | "미정산";
  tax_invoice_issued: boolean;
  loading_approval_type?: string | null;  // 'QR' | 'OFFICE' (상차 승인 방식)
  driving_started_at?: string | null;     // 상차 승인 일시
  completed_at?: string | null;           // 하차 반입 승인 일시
  drive_distance_km?: number;             // GPS 실주행 거리
  drive_time_seconds?: number;            // 운행 소요 시간(초)
  proof_photo?: string | null;
}

// 거래처(현장)별 합산 그룹 인터페이스
export interface ClientSummaryGroup {
  groupKey: string;
  company_name: string;
  site_name: string;
  business_number: string;
  billing_email: string;
  tickets: SettlementRecord[];
  totalTrips: number;
  totalSupplyPrice: number;
  totalVat: number;
  totalAmount: number;
  isAllSelected: boolean;
}

interface OwnerSettlementManagementProps {
  setActivePath?: (path: string) => void;
}

export function OwnerSettlementManagement({ setActivePath }: OwnerSettlementManagementProps) {
  // 상단 탭 전환: "GRID"(운반 및 정산 통합 내역) vs "INVOICE"(세금계산서 발행 관리)
  const [activeMainTab, setActiveMainTab] = useState<"GRID" | "INVOICE">("GRID");

  // 세금계산서 탭 내부 하위 탭: "UNISSUED"(정산완료 미발행) vs "ISSUED"(발행 완료 이력)
  const [invoiceSubTab, setInvoiceSubTab] = useState<"UNISSUED" | "ISSUED">("UNISSUED");

  // 데이터 로딩 및 상태
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 날짜 필터 (오늘, 이번주, 이번달, 3개월)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  // 화면 1: 상태 필터 (전체, 정산대기, 정산완료, 미정산)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "정산대기",
    "정산완료",
    "미정산"
  ]);

  // 검색어 입력 (거래처명 또는 현장명)
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // 화면 1: 체크박스 일괄 선택 (티켓 ID 목록)
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());

  // 행 상세 모달 (Row Click 시 팝업)
  const [detailModalRecord, setDetailModalRecord] = useState<SettlementRecord | null>(null);

  // 화면 2: 전자 운행전표 상세 검수 (선택된 항목)
  const [selectedInvoiceTicket, setSelectedInvoiceTicket] = useState<SettlementRecord | null>(null);

  // 1. 데이터 조회 API 호출
  const fetchSettlementData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      if (!token) {
        setErrorMessage("로그인이 필요한 서비스입니다. 다시 로그인해 주세요.");
        setIsLoading(false);
        return;
      }

      const base = getApiBaseUrl();
      const res = await fetch(
        `${base}/api/fleet/settlements/revenues?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해 주세요. (HTTP 401)");
        }
        if (res.status === 403) {
          throw new Error("차주 권한이 필요한 메뉴입니다. (HTTP 403)");
        }
        throw new Error(`데이터 조회 실패 (HTTP ${res.status})`);
      }

      const data = await res.json();
      const list: SettlementRecord[] = data.records || [];
      setRecords(list);

      // 선택된 인보이스 티켓 활성화
      if (list.length > 0 && !selectedInvoiceTicket) {
        // 정산완료 건 우선 선택
        const confirmedFirst = list.find(r => r.settlement_label === "정산완료") || list[0];
        setSelectedInvoiceTicket(confirmedFirst);
      }
    } catch (err: any) {
      console.error("차주 정산 데이터 호출 오류:", err);
      setErrorMessage(err.message || "정산 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlementData();
  }, [startDate, endDate]);

  // 퀵 기간 검색 핸들러
  const handleQuickPeriod = (type: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "3_MONTHS") => {
    const end = new Date();
    const start = new Date();

    if (type === "TODAY") {
      // 오늘
    } else if (type === "THIS_WEEK") {
      const day = end.getDay();
      const diff = end.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (type === "THIS_MONTH") {
      start.setDate(1);
    } else if (type === "3_MONTHS") {
      start.setMonth(start.getMonth() - 3);
    }

    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  // 상태 체크박스 토글
  const toggleStatusFilter = (status: "정산대기" | "정산완료" | "미정산") => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // 화면 1: 그리드 필터링 목록
  const filteredGridRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(r.settlement_label)) {
        return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const clientMatch = (r.company_name || "").toLowerCase().includes(kw);
        const siteMatch = (r.site_name || "").toLowerCase().includes(kw);
        const driverMatch = (r.driver_name || "").toLowerCase().includes(kw);
        const carMatch = (r.car_number || "").toLowerCase().includes(kw);
        if (!clientMatch && !siteMatch && !driverMatch && !carMatch) {
          return false;
        }
      }
      return true;
    });
  }, [records, selectedStatuses, searchKeyword]);

  // 화면 1: 체크박스 전체 선택 / 해제
  const handleSelectAllGrid = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredGridRecords.map(r => r.ticket_id));
      setSelectedTicketIds(allIds);
    } else {
      setSelectedTicketIds(new Set());
    }
  };

  const handleToggleSelectRow = (ticketId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicketIds(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  // 엑셀 다운로드 (정통 숫자 포맷 및 공급가액/부가세 분리)
  const handleExportExcel = () => {
    if (filteredGridRecords.length === 0) {
      alert("다운로드할 운반 정산 내역이 없습니다.");
      return;
    }

    const headers = [
      "티켓번호",
      "운반일자",
      "운반시간",
      "거래처(건설사)",
      "공사현장명",
      "하차지명",
      "토사/자재종류",
      "차량번호",
      "기사명",
      "운행횟수(회)",
      "단가(KRW)",
      "공급가액(KRW)",
      "부가세(KRW)",
      "합계금액(KRW)",
      "정산상태",
      "상차승인방식",
      "운행소요시간(분)",
      "주행거리(km)"
    ];

    const rows = filteredGridRecords.map(r => [
      r.ticket_id,
      r.date,
      r.time,
      `"${(r.company_name || "").replace(/"/g, '""')}"`,
      `"${(r.site_name || "").replace(/"/g, '""')}"`,
      `"${(r.dropoff_name || "").replace(/"/g, '""')}"`,
      `"${(r.material_name || "").replace(/"/g, '""')}"`,
      `"${(r.car_number || "").replace(/"/g, '""')}"`,
      `"${(r.driver_name || "").replace(/"/g, '""')}"`,
      r.trips || 1,
      r.unit_price,
      r.supply_price,
      r.vat,
      r.total_amount,
      `"${r.settlement_label}"`,
      r.loading_approval_type === "OFFICE" ? "현장사무실" : (r.loading_approval_type === "QR" ? "게이트QR" : "앱자동"),
      r.drive_time_seconds ? Math.round(r.drive_time_seconds / 60) : 0,
      r.drive_distance_km || 0
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `덤프링_운반정산_통합내역_${startDate}_${endDate}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // 화면 2: 세금계산서 관리 (★ 확정 규칙: 정산완료/대금입금확정 건만 대상)
  // =========================================================================

  // 미발행 건: "정산완료" 상태이면서 아직 세금계산서가 발행되지 않은 건 (돈 받고 영수 세금계산서 발행)
  const unissuedRecords = useMemo(() => {
    return records.filter(r => r.settlement_label === "정산완료" && !r.tax_invoice_issued);
  }, [records]);

  // 발행 완료 건: 세금계산서가 이미 발행된 건
  const issuedRecords = useMemo(() => {
    return records.filter(r => r.tax_invoice_issued);
  }, [records]);

  const activeInvoiceList = useMemo(() => {
    return invoiceSubTab === "UNISSUED" ? unissuedRecords : issuedRecords;
  }, [invoiceSubTab, unissuedRecords, issuedRecords]);

  // 현장별 합산 그룹 생성
  const siteGroupMap = useMemo(() => {
    const map = new Map<string, ClientSummaryGroup>();

    activeInvoiceList.forEach(r => {
      const groupKey = `${r.company_name}___${r.site_name}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          company_name: r.company_name || "건설사 미등록",
          site_name: r.site_name || "현장 미지정",
          business_number: r.business_number || "000-00-00000",
          billing_email: r.billing_email || "-",
          tickets: [],
          totalTrips: 0,
          totalSupplyPrice: 0,
          totalVat: 0,
          totalAmount: 0,
          isAllSelected: false
        });
      }
      const group = map.get(groupKey)!;
      group.tickets.push(r);
      group.totalTrips += (r.trips || 1);
      group.totalSupplyPrice += r.supply_price;
      group.totalVat += r.vat;
      group.totalAmount += r.total_amount;
    });

    return Array.from(map.values());
  }, [activeInvoiceList]);

  // 세금계산서 일괄 발행용 선택 티켓
  const [invoiceSelectedTicketIds, setInvoiceSelectedTicketIds] = useState<Set<number>>(new Set());

  // 탭 변경 시 선택 항목 동기화
  useEffect(() => {
    if (activeInvoiceList.length > 0) {
      if (!selectedInvoiceTicket || !activeInvoiceList.some(r => r.ticket_id === selectedInvoiceTicket.ticket_id)) {
        setSelectedInvoiceTicket(activeInvoiceList[0]);
      }
    } else {
      setSelectedInvoiceTicket(null);
    }
  }, [invoiceSubTab, activeInvoiceList]);

  // 현장 그룹 전체 토글
  const handleToggleGroup = (group: ClientSummaryGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    const groupTicketIds = group.tickets.map(t => t.ticket_id);
    const isAllChecked = groupTicketIds.every(id => invoiceSelectedTicketIds.has(id));

    setInvoiceSelectedTicketIds(prev => {
      const next = new Set(prev);
      if (isAllChecked) {
        groupTicketIds.forEach(id => next.delete(id));
      } else {
        groupTicketIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // 개별 티켓 토글
  const handleToggleInvoiceTicket = (ticketId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceSelectedTicketIds(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  // 세금계산서 일괄 발행 처리
  const handleIssueTaxInvoices = async () => {
    const ticketIdsToIssue = Array.from(invoiceSelectedTicketIds);
    if (ticketIdsToIssue.length === 0) {
      alert("세금계산서를 발행할 운반 항목을 1개 이상 선택해 주세요.");
      return;
    }

    if (!confirm(`선택한 정산완료 ${ticketIdsToIssue.length}건에 대해 국세청 전자세금계산서(영수)를 일괄 발행하시겠습니까?`)) {
      return;
    }

    try {
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      if (!token) {
        alert("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }

      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/fleet/tax-invoices/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ticket_ids: ticketIdsToIssue,
          notes: "덤프링 차주 플랫폼 전자세금계산서 일괄 발행"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "세금계산서 발행 처리 중 오류가 발생했습니다.");
      }

      const resData = await res.json();
      alert(resData.message || "성공적으로 발행되었습니다.");
      setInvoiceSelectedTicketIds(new Set());
      await fetchSettlementData();
      setInvoiceSubTab("ISSUED");
    } catch (err: any) {
      alert(`발행 실패: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-900 min-w-[1024px]">
      {/* ========================================================================= */}
      {/* [ 상단 헤더 & 모드 전환 네비게이션 바 ] */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                차주 운반 및 정산 관리
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                앱 실시간 GPS 연동 전자 운행전표 기반 공급가액·부가세 산출 및 국세청 전자세금계산서 관리
              </p>
            </div>
          </div>
        </div>

        {/* 메인 탭 전환 스위처 */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
          <button
            onClick={() => setActiveMainTab("GRID")}
            className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${
              activeMainTab === "GRID"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            운반 및 정산 통합 내역
          </button>
          <button
            onClick={() => setActiveMainTab("INVOICE")}
            className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${
              activeMainTab === "INVOICE"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            세금계산서 발행 관리
            {unissuedRecords.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-extrabold bg-blue-500 text-white rounded-full">
                {unissuedRecords.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [ 공통 검색 및 필터 바 (Search Filter Component) ] */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border-2 border-slate-300 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 기간 검색 퀵 버튼 + Date Range Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              조회 기간
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => handleQuickPeriod("TODAY")}
                className="px-2.5 py-1 text-xs font-bold rounded text-slate-700 hover:bg-white hover:text-blue-600 transition-colors"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => handleQuickPeriod("THIS_WEEK")}
                className="px-2.5 py-1 text-xs font-bold rounded text-slate-700 hover:bg-white hover:text-blue-600 transition-colors"
              >
                이번주
              </button>
              <button
                type="button"
                onClick={() => handleQuickPeriod("THIS_MONTH")}
                className="px-2.5 py-1 text-xs font-bold rounded text-slate-700 hover:bg-white hover:text-blue-600 transition-colors"
              >
                이번달
              </button>
              <button
                type="button"
                onClick={() => handleQuickPeriod("3_MONTHS")}
                className="px-2.5 py-1 text-xs font-bold rounded text-slate-700 hover:bg-white hover:text-blue-600 transition-colors"
              >
                3개월
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <span className="text-slate-500 font-black">~</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* 우측 정렬: 새로고침 및 엑셀 다운로드 */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSettlementData}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              조회
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              엑셀 다운로드 (XLSX)
            </button>
          </div>
        </div>

        {/* 하단 세부 필터 (상태 체크박스 그룹 + 거래처/현장명 텍스트 검색창) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              정산 상태:
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={
                    selectedStatuses.includes("정산대기") &&
                    selectedStatuses.includes("정산완료") &&
                    selectedStatuses.includes("미정산")
                  }
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedStatuses(["정산대기", "정산완료", "미정산"]);
                    } else {
                      setSelectedStatuses([]);
                    }
                  }}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
                전체
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-orange-700 select-none">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes("정산대기")}
                  onChange={() => toggleStatusFilter("정산대기")}
                  className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                정산대기
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-700 select-none">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes("정산완료")}
                  onChange={() => toggleStatusFilter("정산완료")}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                정산완료
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-rose-700 select-none">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes("미정산")}
                  onChange={() => toggleStatusFilter("미정산")}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                미정산
              </label>
            </div>
          </div>

          <div className="relative min-w-[300px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="거래처명(건설사) 또는 공사현장명 검색..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-bold bg-slate-50 border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [ 화면 1: 운반 및 정산 통합 내역 조회 (Grid 목록 화면) ] */}
      {/* ========================================================================= */}
      {activeMainTab === "GRID" && (
        <div className="space-y-4">
          {/* 상단 통계 요약 위젯 바 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500">필터 검색 건수</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {filteredGridRecords.length.toLocaleString()}{" "}
                <span className="text-xs font-bold text-slate-500">건</span>
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500">총 공급가액 합계</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                ₩
                {filteredGridRecords
                  .reduce((sum, r) => sum + r.supply_price, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500">총 부가세 합계 (10%)</span>
              <p className="text-xl font-black text-slate-700 mt-1">
                ₩
                {filteredGridRecords
                  .reduce((sum, r) => sum + r.vat, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-50/60 rounded-xl p-4 border-2 border-blue-200 shadow-sm">
              <span className="text-xs font-bold text-blue-700">총 합계 금액 (VAT 포함)</span>
              <p className="text-2xl font-black text-blue-700 mt-0.5">
                ₩
                {filteredGridRecords
                  .reduce((sum, r) => sum + r.total_amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>

          {/* 메인 데이터 그리드 테이블 */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-black">
                    <th className="py-3.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredGridRecords.length > 0 &&
                          selectedTicketIds.size === filteredGridRecords.length
                        }
                        onChange={handleSelectAllGrid}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap">운반 일자</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">거래처 / 현장명</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">하차지</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">토사/자재 종류</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">운행 횟수</th>
                    <th className="py-3.5 px-3 text-right whitespace-nowrap">단가 (KRW)</th>
                    <th className="py-3.5 px-3 text-right whitespace-nowrap">공급가액 (KRW)</th>
                    <th className="py-3.5 px-3 text-right whitespace-nowrap">부가세 (10%)</th>
                    <th className="py-3.5 px-3 text-right whitespace-nowrap font-black text-blue-900">
                      합계 금액 (KRW)
                    </th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">정산 상태</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">전자 전표</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-slate-500 font-bold">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>운반 및 정산 내역을 불러오는 중입니다...</span>
                        </div>
                      </td>
                    </tr>
                  ) : errorMessage ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-rose-600 font-bold">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <AlertCircle className="w-8 h-8 text-rose-500" />
                          <span>{errorMessage}</span>
                          <button
                            onClick={fetchSettlementData}
                            className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            다시 시도
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredGridRecords.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-slate-500 font-bold">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Info className="w-8 h-8 text-slate-400" />
                          <span>해당 조건에 일치하는 운반 및 정산 내역이 없습니다.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredGridRecords.map(r => {
                      const isSelected = selectedTicketIds.has(r.ticket_id);
                      return (
                        <tr
                          key={r.ticket_id}
                          onClick={() => setDetailModalRecord(r)}
                          className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${
                            isSelected ? "bg-blue-50/70" : ""
                          }`}
                        >
                          <td
                            className="py-3 px-3 text-center"
                            onClick={e => handleToggleSelectRow(r.ticket_id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          <td className="py-3 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                            {r.date}
                            <span className="text-[11px] font-semibold text-slate-500 ml-1.5">
                              {r.time}
                            </span>
                          </td>

                          <td className="py-3 px-3 max-w-[200px] truncate">
                            <div className="font-extrabold text-slate-900">
                              {r.company_name}
                            </div>
                            <div className="text-xs font-semibold text-slate-600 truncate">
                              {r.site_name}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-semibold">
                            {r.dropoff_name || "사토장 미지정"}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-slate-800">
                              {r.material_name}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-extrabold text-slate-900 whitespace-nowrap">
                            {r.trips || 1}회
                          </td>

                          <td className="py-3 px-3 text-right font-extrabold text-slate-700 whitespace-nowrap">
                            ₩{r.unit_price.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                            ₩{r.supply_price.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-slate-600 whitespace-nowrap">
                            ₩{r.vat.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right font-black text-blue-700 text-sm whitespace-nowrap">
                            ₩{r.total_amount.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {r.settlement_label === "정산완료" && (
                              <span className="px-2.5 py-1 text-xs font-black bg-blue-100 text-blue-700 rounded-md border border-blue-300">
                                정산완료
                              </span>
                            )}
                            {r.settlement_label === "정산대기" && (
                              <span className="px-2.5 py-1 text-xs font-black bg-orange-100 text-orange-700 rounded-md border border-orange-300">
                                정산대기
                              </span>
                            )}
                            {r.settlement_label === "미정산" && (
                              <span className="px-2.5 py-1 text-xs font-black bg-rose-100 text-rose-700 rounded-md border border-rose-300">
                                미정산
                              </span>
                            )}
                          </td>

                          {/* 전자 전표 보기 버튼 */}
                          <td
                            className="py-3 px-3 text-center whitespace-nowrap"
                            onClick={e => {
                              e.stopPropagation();
                              setDetailModalRecord(r);
                            }}
                          >
                            <span className="px-2.5 py-1 text-xs font-extrabold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 inline-flex items-center gap-1 transition-colors">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              전자전표 확인
                            </span>
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
      )}

      {/* ========================================================================= */}
      {/* [ 화면 2: 세금계산서 발행 관리 (정산완료 건만 발행) ] */}
      {/* ========================================================================= */}
      {activeMainTab === "INVOICE" && (
        <div className="space-y-4">
          {/* 상단 정책 안내 배너 */}
          <div className="p-3.5 bg-blue-50 border-2 border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold">
                정산 정책 안내: 현장과의 대금 검토가 완료되어 <strong>[정산완료(입금확정)]</strong>된 운반 건에 한하여 국세청 전자세금계산서(영수)를 안전하게 발행합니다.
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
              미정산/분쟁 건 발행 원천 차단
            </span>
          </div>

          {/* 세금계산서 하위 탭 메뉴: [정산완료 미발행] | [발행 완료 이력] */}
          <div className="flex items-center justify-between border-b-2 border-slate-300 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setInvoiceSubTab("UNISSUED")}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                  invoiceSubTab === "UNISSUED"
                    ? "bg-slate-900 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                정산완료 건 (계산서 발행 대상)
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white">
                  {unissuedRecords.length}
                </span>
              </button>

              <button
                onClick={() => setInvoiceSubTab("ISSUED")}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                  invoiceSubTab === "ISSUED"
                    ? "bg-slate-900 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Clock className="w-4 h-4 text-emerald-400" />
                발행 완료 이력
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white">
                  {issuedRecords.length}
                </span>
              </button>
            </div>

            {invoiceSubTab === "UNISSUED" && (
              <button
                onClick={handleIssueTaxInvoices}
                disabled={invoiceSelectedTicketIds.size === 0}
                className={`px-6 py-2.5 rounded-xl text-sm font-black shadow-lg flex items-center gap-2 transition-all ${
                  invoiceSelectedTicketIds.size > 0
                    ? "bg-blue-600 hover:bg-blue-700 text-white scale-100 hover:scale-[1.02]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <FileText className="w-4 h-4" />
                선택 항목 국세청 세금계산서 일괄 발행 ({invoiceSelectedTicketIds.size}건)
              </button>
            )}
          </div>

          {/* 좌우 2분할 레이아웃 (Split-View) */}
          <div className="grid grid-cols-12 gap-6 min-h-[600px]">
            {/* 좌측 리스트 영역: 거래처/현장별 정산완료 합산 목록 (7 cols) */}
            <div className="col-span-7 bg-white rounded-2xl border-2 border-slate-300 shadow-sm p-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  정산확정 거래처/현장 목록 ({siteGroupMap.length}개 현장)
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  항목 클릭 시 우측에 덤프링 공인 전자운행전표가 노출됩니다.
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {siteGroupMap.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-400" />
                    <span>
                      {invoiceSubTab === "UNISSUED"
                        ? "세금계산서 발행 대상인 [정산완료] 내역이 없습니다."
                        : "발행 완료된 세금계산서 내역이 없습니다."}
                    </span>
                  </div>
                ) : (
                  siteGroupMap.map(group => {
                    const groupTicketIds = group.tickets.map(t => t.ticket_id);
                    const isGroupAllChecked = groupTicketIds.every(id =>
                      invoiceSelectedTicketIds.has(id)
                    );
                    const isGroupPartiallyChecked =
                      groupTicketIds.some(id => invoiceSelectedTicketIds.has(id)) &&
                      !isGroupAllChecked;

                    return (
                      <div
                        key={group.groupKey}
                        className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 hover:border-blue-400 transition-colors"
                      >
                        <div className="p-3 bg-slate-100 flex items-center justify-between border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            {invoiceSubTab === "UNISSUED" && (
                              <button
                                onClick={e => handleToggleGroup(group, e)}
                                className="text-slate-600 hover:text-blue-600"
                              >
                                {isGroupAllChecked ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : isGroupPartiallyChecked ? (
                                  <div className="w-5 h-5 bg-blue-100 border-2 border-blue-600 rounded flex items-center justify-center">
                                    <div className="w-2.5 h-1 bg-blue-600 rounded-sm"></div>
                                  </div>
                                ) : (
                                  <Square className="w-5 h-5 text-slate-400" />
                                )}
                              </button>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-slate-900">
                                  {group.company_name}
                                </span>
                                <span className="text-xs font-bold text-slate-600">
                                  · {group.site_name}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500">
                                사업자: {group.business_number} | 수신처: {group.billing_email}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] font-bold text-slate-500 block">
                              확정 {group.tickets.length}건 ({group.totalTrips}회)
                            </span>
                            <span className="text-sm font-black text-blue-700">
                              ₩{group.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-200 bg-white">
                          {group.tickets.map(t => {
                            const isTicketChecked = invoiceSelectedTicketIds.has(t.ticket_id);
                            const isCurrentlyViewed =
                              selectedInvoiceTicket?.ticket_id === t.ticket_id;

                            return (
                              <div
                                key={t.ticket_id}
                                onClick={() => setSelectedInvoiceTicket(t)}
                                className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                                  isCurrentlyViewed
                                    ? "bg-blue-100/70 border-l-4 border-blue-600"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {invoiceSubTab === "UNISSUED" && (
                                    <button
                                      onClick={e => handleToggleInvoiceTicket(t.ticket_id, e)}
                                      className="text-slate-600 hover:text-blue-600"
                                    >
                                      {isTicketChecked ? (
                                        <CheckSquare className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-400" />
                                      )}
                                    </button>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-xs text-slate-900">
                                        {t.date}
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                                        {t.material_name}
                                      </span>
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        {t.car_number} ({t.driver_name})
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500">
                                      단가: ₩{t.unit_price.toLocaleString()} × {t.trips}회
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-black text-slate-900 block">
                                    ₩{t.total_amount.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    공급가: ₩{t.supply_price.toLocaleString()} | VAT: ₩
                                    {t.vat.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 우측 영역: 덤프링 공인 전자 운행 전표 명세 (5 cols) */}
            <div className="col-span-5 bg-white rounded-2xl border-2 border-slate-300 shadow-sm p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    덤프링 공인 전자 운행 전표
                  </h3>
                </div>
                {selectedInvoiceTicket && (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-black border border-blue-200">
                    전표 #{selectedInvoiceTicket.ticket_id}
                  </span>
                )}
              </div>

              {selectedInvoiceTicket ? (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {/* 상차지 및 하차지 운행 경로 */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                      운행 구간 및 승인 정보
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">
                            {selectedInvoiceTicket.company_name} · {selectedInvoiceTicket.site_name}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            상차 승인: {selectedInvoiceTicket.driving_started_at || selectedInvoiceTicket.date} (
                            {selectedInvoiceTicket.loading_approval_type === "OFFICE"
                              ? "현장 사무실 승인"
                              : selectedInvoiceTicket.loading_approval_type === "QR"
                              ? "게이트 QR 인증"
                              : "앱 자동 인증"}
                            )
                          </span>
                        </div>
                      </div>

                      <div className="border-l-2 border-dashed border-slate-300 ml-2 pl-4 py-1 text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        <span>GPS 실주행 거리: {selectedInvoiceTicket.drive_distance_km || 0} km</span>
                        <span>· 소요시간: {selectedInvoiceTicket.drive_time_seconds ? Math.round(selectedInvoiceTicket.drive_time_seconds / 60) : 0}분</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">
                            {selectedInvoiceTicket.dropoff_name || "사토장 (하차지)"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            하차 반입: {selectedInvoiceTicket.completed_at || "반입 승인완료"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 차량 및 기사 상세 */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[10px] block font-semibold">배정 덤프차량</span>
                      <span className="font-extrabold text-slate-900">{selectedInvoiceTicket.car_number}</span>
                      <span className="text-[10px] text-slate-500 block">({selectedInvoiceTicket.tonnage}톤)</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[10px] block font-semibold">담당 기사</span>
                      <span className="font-extrabold text-slate-900">{selectedInvoiceTicket.driver_name}</span>
                      <span className="text-[10px] text-slate-500 block">품목: {selectedInvoiceTicket.material_name}</span>
                    </div>
                  </div>

                  {/* 세무 금액 명세 */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between font-bold text-slate-700">
                      <span>공급가액</span>
                      <span className="font-black text-slate-900">₩{selectedInvoiceTicket.supply_price.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-white border-b border-slate-200 flex justify-between font-bold text-slate-700">
                      <span>부가가치세 (10%)</span>
                      <span className="font-black text-slate-900">₩{selectedInvoiceTicket.vat.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-blue-50 flex justify-between font-black text-blue-900 text-sm">
                      <span>합계 청구금액</span>
                      <span className="text-blue-700">₩{selectedInvoiceTicket.total_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 위변조 방지 인증 뱃지 */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      덤프링 GPS 위치 기반 상·하차 진출입 시스템을 통해 데이터 위변조가 방지된 전산 확인증입니다.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
                  <FileText className="w-10 h-10 text-slate-300 mb-2" />
                  <span className="text-xs font-bold">
                    좌측 목록에서 항목을 선택하면 공인 전자 운행전표가 노출됩니다.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [ 모달 1: 전자 운행전표 상세 팝업 (Row Click Modal) ] */}
      {/* ========================================================================= */}
      {detailModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-slate-400 animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-900">
                  덤프링 공인 전자 운행전표 (티켓 #{detailModalRecord.ticket_id})
                </h3>
              </div>
              <button
                onClick={() => setDetailModalRecord(null)}
                className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-bold text-slate-800">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">거래처 (건설사)</span>
                  <span className="text-sm font-black text-slate-900">{detailModalRecord.company_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">공사 현장명</span>
                  <span className="text-sm font-black text-slate-900">{detailModalRecord.site_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">운반 일자 및 시간</span>
                  <span className="text-slate-900">{detailModalRecord.date} {detailModalRecord.time}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">사토 / 자재 품목</span>
                  <span className="text-slate-900">{detailModalRecord.material_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">배정 차량 / 기사</span>
                  <span className="text-slate-900">{detailModalRecord.car_number} ({detailModalRecord.driver_name})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">당일 총 운행 횟수</span>
                  <span className="text-slate-900">{detailModalRecord.trips || 1} 회</span>
                </div>
              </div>

              {/* 금액 매칭 테이블 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-3 text-slate-600 font-semibold">회당 운반 단가</td>
                      <td className="p-3 text-right font-black text-slate-900">
                        ₩{detailModalRecord.unit_price.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 text-slate-600 font-semibold">공급가액 (단가 × 횟수)</td>
                      <td className="p-3 text-right font-black text-slate-900">
                        ₩{detailModalRecord.supply_price.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 text-slate-600 font-semibold">부가가치세 (10% 절사)</td>
                      <td className="p-3 text-right font-bold text-slate-700">
                        ₩{detailModalRecord.vat.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-blue-50 text-blue-900">
                      <td className="p-3 font-black text-sm">합계 금액</td>
                      <td className="p-3 text-right font-black text-base text-blue-700">
                        ₩{detailModalRecord.total_amount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  본 운행 전표는 덤프링 GPS 위치 기반 시스템에 의해 전산 저장·검증된 공식 디지털 인수증입니다.
                </span>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDetailModalRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-black text-xs transition-colors"
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
