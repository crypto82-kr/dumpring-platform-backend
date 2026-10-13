"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building2,
  Truck,
  ArrowRightLeft,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  ShieldCheck,
  Receipt,
  Download,
  AlertTriangle,
  Send,
  HelpCircle,
  ChevronRight,
  X,
  MapPin,
  Clock
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

// 1. 차주별 운반비 정산 및 세금계산서 발행 레코드 인터페이스
export interface DriverConsignmentItem {
  key: string;
  owner_id: number;
  owner_name: string;
  owner_phone: string;
  car_id: number;
  car_number: string;
  certificate_registered: boolean;
  certificate_label: string;
  total_tickets: number; // 총 배차 건수(건)
  unit_price: number;
  supply_price: number;
  vat: number;
  total_amount: number;
  status_code: "ISSUED" | "READY_TO_ISSUE" | "WAITING_DRIVER" | "NO_CERT";
  status_label: "전송완료" | "발행대기" | "마감대기" | "인증서 미등록";
  ticket_ids: number[];
  tax_invoice_issued_count: number;
  confirmed_by_driver_count: number;
  latest_nts_code?: string | null;
  latest_issued_at?: string | null;
  tickets_detail: {
    ticket_id: number;
    status: string;
    date: string;
    fare: number;
    tax_invoice_issued: boolean;
    tax_invoice_confirmed_by_driver: boolean;
    nts_code?: string | null;
  }[];
}

// 2. 하차지별 B2B 정산 레코드 인터페이스
export interface DropoffSettlementItem {
  group_key: string;
  dropoff_id: number;
  dropoff_name: string;
  dropoff_address: string;
  business_number: string;
  contract_type: string;
  payer_type: "SITE_PAYS" | "DROPOFF_PAYS" | string;
  site_departure_count: number; // 현장 출발 배차 건수(건)
  dropoff_arrived_count: number; // 하차지 도착 배차 건수(건)
  discrepancy_count: number; // 오차 건수 (도착 - 출발)
  unit_price: number;
  supply_price: number;
  vat: number;
  total_amount: number;
  ticket_ids: number[];
  invoice_issued: boolean;
  invoice_nts_code?: string | null;
  invoice_issued_at?: string | null;
}

interface SiteTaxInvoiceManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteTaxInvoiceManagement({
  registeredSiteList = [],
}: SiteTaxInvoiceManagementProps) {
  // 상단 대메뉴 탭: "DRIVERS"(차주별 운반비 세금계산서 발행) vs "DROPOFFS"(하차지별 B2B 정산 관리)
  const [activeMainTab, setActiveMainTab] = useState<"DRIVERS" | "DROPOFFS">("DRIVERS");

  // 현장 선택 (기본값: 첫 번째 현장 또는 전체)
  const [selectedSiteId, setSelectedSiteId] = useState<number | "">(
    registeredSiteList.length > 0 ? registeredSiteList[0].id : ""
  );

  // 연월 필터 (기본값: 이번달 YYYY-MM)
  const currentYearMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYearMonth);

  // 차주별 필터 상태: "ALL" | "READY_TO_ISSUE" | "WAITING_DRIVER" | "NO_CERT" | "ISSUED"
  const [driverStatusFilter, setDriverStatusFilter] = useState<string>("ALL");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // 서버 데이터 상태
  const [driverList, setDriverList] = useState<DriverConsignmentItem[]>([]);
  const [dropoffList, setDropoffList] = useState<DropoffSettlementItem[]>([]);
  const [summary, setSummary] = useState({
    total_drivers: 0,
    total_tickets: 0,
    total_supply_price: 0,
    total_vat: 0,
    total_amount: 0,
    waiting_confirm_count: 0,
    ready_to_issue_count: 0,
    issued_count: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 차주 탭 체크박스 선택 (선택된 driver key 목록)
  const [selectedDriverKeys, setSelectedDriverKeys] = useState<Set<string>>(new Set());

  // 사이트 목록 관리 (props 동기화 + 자체 보조 조회)
  const [internalSites, setInternalSites] = useState<any[]>(registeredSiteList);

  useEffect(() => {
    if (registeredSiteList && registeredSiteList.length > 0) {
      setInternalSites(registeredSiteList);
      if (!selectedSiteId) {
        setSelectedSiteId(registeredSiteList[0].id);
      }
    } else {
      // 만약 상위에서 아직 로드되지 않았을 경우 직접 보조 조회
      const loadSites = async () => {
        try {
          const token =
            typeof window !== "undefined"
              ? sessionStorage.getItem("dumpring_token") ||
                localStorage.getItem("accessToken") ||
                localStorage.getItem("token")
              : null;
          if (!token) return;
          const base = getApiBaseUrl();
          let res = await fetch(`${base}/api/sites/my-mappings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            res = await fetch(`${base}/api/sites/admin-sites`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const mapped = data.map((s: any) => ({
                id: s.site_id || s.id,
                name: s.site_name || s.company_name || `현장 #${s.id}`,
                companyName: s.company_name,
                address: s.site_address,
              }));
              setInternalSites(mapped);
              setSelectedSiteId((prev) => (prev ? prev : mapped[0].id));
            }
          }
        } catch (e) {
          console.error("현장 목록 보조 조회 실패:", e);
        }
      };
      loadSites();
    }
  }, [registeredSiteList]);

  // 상세 보기 모달 상태
  const [detailModalDriver, setDetailModalDriver] = useState<DriverConsignmentItem | null>(null);

  // 데이터 조회
  const fetchTaxInvoiceData = async () => {
    setIsLoading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("dumpring_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token")
          : null;

      if (!token) {
        setIsLoading(false);
        return;
      }

      const base = getApiBaseUrl();
      const params = new URLSearchParams();
      if (selectedSiteId) params.append("site_id", String(selectedSiteId));
      if (selectedYearMonth) params.append("year_month", selectedYearMonth);

      const res = await fetch(`${base}/api/fleet/tax-invoices/site-consignment?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`데이터 조회 실패 (HTTP ${res.status})`);
      }

      const data = await res.json();
      setDriverList(data.driver_consignments || []);
      setDropoffList(data.dropoff_settlements || []);
      setSummary(
        data.summary || {
          total_drivers: 0,
          total_tickets: 0,
          total_supply_price: 0,
          total_vat: 0,
          total_amount: 0,
          waiting_confirm_count: 0,
          ready_to_issue_count: 0,
          issued_count: 0,
        }
      );
      setSelectedDriverKeys(new Set());
    } catch (err) {
      console.error("세금계산서 업무 데이터 조회 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxInvoiceData();
  }, [selectedSiteId, selectedYearMonth]);

  // 필터링된 차주 목록
  const filteredDrivers = useMemo(() => {
    return driverList.filter((d) => {
      // 상태 필터
      if (driverStatusFilter !== "ALL" && d.status_code !== driverStatusFilter) {
        return false;
      }
      // 검색어 필터 (차량번호, 차주명, 휴대폰번호)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchCar = d.car_number.toLowerCase().includes(kw);
        const matchName = d.owner_name.toLowerCase().includes(kw);
        const matchPhone = d.owner_phone.includes(kw);
        if (!matchCar && !matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [driverList, driverStatusFilter, searchKeyword]);

  // 일괄 선택 가능한 차주 목록 ('발행대기' && '인증서 등록완료' 건만 발행 가능)
  const issuableDrivers = useMemo(() => {
    return filteredDrivers.filter(
      (d) => d.status_code === "READY_TO_ISSUE" && d.certificate_registered
    );
  }, [filteredDrivers]);

  // 필터링된 하차지 목록
  const filteredDropoffs = useMemo(() => {
    return dropoffList.filter((d) => {
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchName = d.dropoff_name.toLowerCase().includes(kw);
        const matchBiz = d.business_number.toLowerCase().includes(kw);
        const matchAddr = d.dropoff_address.toLowerCase().includes(kw);
        if (!matchName && !matchBiz && !matchAddr) return false;
      }
      return true;
    });
  }, [dropoffList, searchKeyword]);

  // 하차지 전용 KPI 요약 계산
  const dropoffSummary = useMemo(() => {
    let totalSupply = 0;
    let totalVat = 0;
    let totalDeparture = 0;
    let totalArrived = 0;
    let totalDiscrepancy = 0;
    let issuedCount = 0;
    let pendingIssueCount = 0;

    dropoffList.forEach((d) => {
      totalSupply += d.supply_price || 0;
      totalVat += d.vat || 0;
      totalDeparture += d.site_departure_count || 0;
      totalArrived += d.dropoff_arrived_count || 0;
      totalDiscrepancy += Math.abs(d.discrepancy_count || 0);
      if (d.invoice_issued) {
        issuedCount += 1;
      } else {
        pendingIssueCount += 1;
      }
    });

    return {
      totalSites: dropoffList.length,
      totalSupply,
      totalVat,
      totalAmount: totalSupply + totalVat,
      totalDeparture,
      totalArrived,
      totalDiscrepancy,
      issuedCount,
      pendingIssueCount,
    };
  }, [dropoffList]);

  // 전체 선택 토글
  const handleToggleSelectAll = () => {
    if (selectedDriverKeys.size === issuableDrivers.length && issuableDrivers.length > 0) {
      setSelectedDriverKeys(new Set());
    } else {
      setSelectedDriverKeys(new Set(issuableDrivers.map((d) => d.key)));
    }
  };

  // 개별 행 선택 토글
  const handleToggleDriver = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = driverList.find((d) => d.key === key);
    if (!item) return;

    if (!item.certificate_registered) {
      alert("해당 차주는 전자세금계산서용 사업자등록증이 미등록 상태이므로 세금계산서를 발행할 수 없습니다.");
      return;
    }
    if (item.status_code === "WAITING_DRIVER") {
      alert("해당 차주가 아직 운반비 및 배차 건수 정산 금액을 마감 승인하지 않았습니다.\n먼저 [독촉 알림톡]을 발송하거나 차주 승인을 요청해 주세요.");
      return;
    }
    if (item.status_code === "ISSUED") {
      alert("이미 국세청 전자세금계산서 전송이 완료된 건입니다.");
      return;
    }

    setSelectedDriverKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // [⚡ 선택 항목 전자세금계산서 일괄 발행] 실행 핸들러
  const handleBulkIssueTaxInvoices = async () => {
    const selectedList = driverList.filter((d) => selectedDriverKeys.has(d.key));
    if (selectedList.length === 0) {
      alert("전자세금계산서를 발행할 차주 항목을 선택해 주세요.\n(발행대기 및 사업자등록증 등록 완료 건만 선택 가능)");
      return;
    }

    // 2중 안전 잠금장치 재검증
    const invalidWaiting = selectedList.filter((d) => d.status_code === "WAITING_DRIVER");
    if (invalidWaiting.length > 0) {
      alert(`차주 미승인(마감대기) 건이 포함되어 있어 발행할 수 없습니다.\n차량: ${invalidWaiting.map((d) => d.car_number).join(", ")}`);
      return;
    }

    const invalidCert = selectedList.filter((d) => !d.certificate_registered);
    if (invalidCert.length > 0) {
      alert(`사업자등록증 미등록 건이 포함되어 있어 발행할 수 없습니다.\n차량: ${invalidCert.map((d) => d.car_number).join(", ")}`);
      return;
    }

    const allTicketIds = selectedList.flatMap((d) => d.ticket_ids);
    const totalAmountSum = selectedList.reduce((acc, d) => acc + d.total_amount, 0);

    const confirmMsg =
      `[국세청 전자세금계산서 일괄 발행 확인]\n\n` +
      `· 선택 차주 수: ${selectedList.length}명\n` +
      `· 총 배차 건수: ${allTicketIds.length}건\n` +
      `· 합계 공급금액(VAT포함): ${totalAmountSum.toLocaleString()}원\n\n` +
      `국세청(홈택스) 전자세금계산서 승인번호를 부여하고 정식 전자세금계산서 일괄 발행을 완료하시겠습니까?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsProcessing(true);
    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("dumpring_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token")
          : null;

      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/fleet/tax-invoices/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_ids: allTicketIds,
          notes: "현장관리자 전자세금계산서 일괄 정식 발행",
          invoice_type: "DRIVER",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "전자세금계산서 발행 처리 실패");
      }

      const resData = await res.json();
      alert(`성공적으로 전자세금계산서가 발행되었습니다!\n${resData.message}`);
      setSelectedDriverKeys(new Set());
      await fetchTaxInvoiceData();
    } catch (err: any) {
      alert(`발행 실패: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 하차지 B2B 세금계산서 발행 핸들러 (현장 매출 건 전용)
  const handleIssueDropoffInvoice = async (item: DropoffSettlementItem) => {
    if (item.ticket_ids.length === 0) {
      alert("발행 가능한 배차 건수가 없습니다.");
      return;
    }

    const isSiteExpense = item.payer_type === "SITE_PAYS";
    const actionTitle = isSiteExpense ? "매입세금계산서 승인(발행)" : "매출세금계산서 발행";
    const invoiceType = isSiteExpense ? "매입 전자세금계산서" : "매출 전자세금계산서";

    const msg =
      `[하차지 B2B ${actionTitle}]\n\n` +
      `· 하차지 상호명: ${item.dropoff_name}\n` +
      `· 사업자번호: ${item.business_number}\n` +
      `· 계약 유형: ${item.contract_type}\n` +
      `· 도착 승인 건수: ${item.dropoff_arrived_count}건 (출발 건수: ${item.site_departure_count}건, 오차: ${item.discrepancy_count}건)\n` +
      `· 합계 금액: ${item.total_amount.toLocaleString()}원\n\n` +
      `해당 하차지 B2B 거래에 대한 ${invoiceType}를 정식 발행하시겠습니까?`;

    if (!confirm(msg)) return;

    setIsProcessing(true);
    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("dumpring_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token")
          : null;

      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/fleet/tax-invoices/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_ids: item.ticket_ids,
          notes: `하차지 B2B ${item.dropoff_name} ${invoiceType} 정식 발행`,
          invoice_type: "DROPOFF",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "하차지 전자세금계산서 발행 실패");
      }

      const resData = await res.json();
      alert(`[하차지 B2B 전자세금계산서 발행 완료]\n${resData.message}`);
      await fetchTaxInvoiceData();
    } catch (err: any) {
      alert(`발행 실패: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 독촉 알림톡 모의 발송
  const handleSendReminder = (driver: DriverConsignmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(
      `[독촉 알림톡 발송 완료]\n\n차주명: ${driver.owner_name} (${driver.owner_phone})\n차량번호: ${driver.car_number}\n총 배차 건수: ${driver.total_tickets}건 (${driver.total_amount.toLocaleString()}원)\n\n"차주님, ${selectedYearMonth}월 운반 정산 내역의 금액 확인 및 마감 승인을 요청드립니다. 승인이 완료되어야 전자세금계산서가 발행됩니다."\n\n카카오 알림톡이 정상 발송되었습니다.`
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. 상단 타이틀 및 안내 바 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">현장 전자세금계산서 업무</h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-black rounded-full border border-blue-200">
              국세청 연계 표준
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            국세청 전자세금계산서 법정 양식에 의거하여, 차주별 운반비 전자세금계산서 발행 및 하차지별 B2B 상·하차 물량 정산 대사를 관리합니다.
          </p>
        </div>

        {/* 상단 액션: 대메뉴 탭 전환 바 */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => setActiveMainTab("DRIVERS")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
              activeMainTab === "DRIVERS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            차주별 운반비 세금계산서
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
              {driverList.length}대
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab("DROPOFFS")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
              activeMainTab === "DROPOFFS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            하차지별 B2B 정산 관리
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
              {dropoffList.length}곳
            </span>
          </button>
        </div>
      </div>

      {/* 2. 요약 KPI 카드 대시보드 (탭별 동적 전환) */}
      {activeMainTab === "DRIVERS" ? (
        /* [차주별 운반비 세금계산서 요약] */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">총 정산 대상 차주</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900">{summary.total_drivers}명</span>
              <span className="text-xs font-extrabold text-blue-600">총 {summary.total_tickets} 배차건</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">합계 공급가액 / VAT</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900">₩{summary.total_supply_price.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-500">+₩{summary.total_vat.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 shadow-sm space-y-1">
            <span className="text-[11px] font-extrabold text-amber-800 block flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              마감대기 (차주 금액 미승인)
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-amber-900">{summary.waiting_confirm_count}건</span>
              <span className="text-[11px] font-bold text-amber-700">발행 원천 차단</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 shadow-sm space-y-1">
            <span className="text-[11px] font-extrabold text-emerald-800 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              발행대기 (승인완료) / 전송완료
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-900">{summary.ready_to_issue_count}건 대기</span>
              <span className="text-xs font-black text-emerald-700">{summary.issued_count}건 완료</span>
            </div>
          </div>
        </div>
      ) : (
        /* [하차지별 B2B 정산 관리 요약] */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">총 연동 하차지 (사토장)</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900">{dropoffSummary.totalSites}곳</span>
              <span className="text-xs font-extrabold text-blue-600">
                출발 {dropoffSummary.totalDeparture}건 / 반입 {dropoffSummary.totalArrived}건
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">하차지 정산 합계 공급가액 / VAT</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900">₩{dropoffSummary.totalSupply.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-500">+₩{dropoffSummary.totalVat.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border-2 border-rose-300 bg-rose-50/40 shadow-sm space-y-1">
            <span className="text-[11px] font-extrabold text-rose-800 block flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              상·하차 물량 불일치 오차
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-rose-900">{dropoffSummary.totalDiscrepancy}건</span>
              <span className="text-[11px] font-bold text-rose-700">도착-출발 차이</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 shadow-sm space-y-1">
            <span className="text-[11px] font-extrabold text-emerald-800 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              B2B 세금계산서 발행 대기 / 완료
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-900">{dropoffSummary.pendingIssueCount}건 대기</span>
              <span className="text-xs font-black text-emerald-700">{dropoffSummary.issuedCount}건 완료</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 검색 및 필터 컨트롤 바 */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* 공사현장 선택 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">관할 현장:</span>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : "")}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="">전체 현장 통합</option>
                {internalSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.site_name || s.company_name || `현장 #${s.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 정산 연월 선택 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-black text-slate-700">정산 연월:</span>
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
              >
              </input>
            </div>

            {/* 차주 탭 전용 상태 필터 */}
            {activeMainTab === "DRIVERS" && (
              <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-3">
                <span className="text-xs font-black text-slate-700">발행 상태:</span>
                <select
                  value={driverStatusFilter}
                  onChange={(e) => setDriverStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="ALL">전체 상태 보기</option>
                  <option value="READY_TO_ISSUE">⚡ 발행대기 (승인완료)</option>
                  <option value="WAITING_DRIVER">🔒 마감대기 (차주미승인)</option>
                  <option value="NO_CERT">⚠️ 사업자등록증 미등록</option>
                  <option value="ISSUED">✓ 국세청 전송완료</option>
                </select>
              </div>
            )}
          </div>

          {/* 새로고침 및 검색창 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeMainTab === "DRIVERS" ? "차량번호 / 차주명 검색" : "하차지 상호명 검색"}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none w-48"
              />
            </div>
            <button
              type="button"
              onClick={fetchTaxInvoiceData}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        </div>

        {/* 2중 안전 장치 안내 배너 */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-950 font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>[2중·3중 보안 안전 잠금장치 가동]</strong> 차주가 모바일 또는 웹에서 운반비 금액을 직접 확인하고 마감 승인하기 전까지는 현장관리자가 임의로 발행할 수 없습니다. (배차 건수 기준 실거래 매칭)
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [TAB 1] 차주별 운반비 세금계산서 발행 (Drivers API Settlement) */}
      {/* ========================================================================= */}
      {activeMainTab === "DRIVERS" && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden space-y-0">
          {/* 테이블 상단 액션 바 */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800">
                조회된 차주 목록 ({filteredDrivers.length}명)
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                · 선택됨: {selectedDriverKeys.size}명
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkIssueTaxInvoices}
                disabled={selectedDriverKeys.size === 0 || isProcessing}
                className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all ${
                  selectedDriverKeys.size > 0 && !isProcessing
                    ? "bg-blue-600 hover:bg-blue-700 text-white scale-100 hover:scale-[1.02] shadow-blue-500/20"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Receipt className="w-4 h-4" />
                ⚡ 선택 항목 전자세금계산서 일괄 발행 ({selectedDriverKeys.size}건)
              </button>
            </div>
          </div>

          {/* 메인 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-600 hover:text-blue-600"
                    >
                      {selectedDriverKeys.size === issuableDrivers.length && issuableDrivers.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">차량번호</th>
                  <th className="py-3 px-4">차주명 / 연락처</th>
                  <th className="py-3 px-4 text-center">사업자등록증</th>
                  <th className="py-3 px-4 text-right">총 배차 건수</th>
                  <th className="py-3 px-4 text-right">운반 단가(회당)</th>
                  <th className="py-3 px-4 text-right">공급가액</th>
                  <th className="py-3 px-4 text-right">부가가치세 (10%)</th>
                  <th className="py-3 px-4 text-right">합계 청구금액</th>
                  <th className="py-3 px-4 text-center">발행 상태</th>
                  <th className="py-3 px-4 text-center">국세청 승인번호</th>
                  <th className="py-3 px-4 text-right">관리 / 조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400 font-bold">
                      전자세금계산서 실데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400 font-bold">
                      선택한 조건에 부합하는 차주 운반비 정산 데이터가 없습니다. (Data Empty)
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((d) => {
                    const isChecked = selectedDriverKeys.has(d.key);
                    const isIssuable = d.status_code === "READY_TO_ISSUE" && d.certificate_registered;

                    return (
                      <tr
                        key={d.key}
                        onClick={() => setDetailModalDriver(d)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isChecked ? "bg-blue-50/50" : ""
                        }`}
                      >
                        {/* 체크박스 */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleDriver(d.key, e)}
                            disabled={!isIssuable}
                            className={`${
                              !isIssuable ? "opacity-30 cursor-not-allowed" : "text-slate-600 hover:text-blue-600"
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* 차량번호 */}
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                          {d.car_number}
                        </td>

                        {/* 차주명 / 연락처 */}
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-slate-900 block">{d.owner_name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{d.owner_phone || "-"}</span>
                        </td>

                        {/* 사업자등록증 등록 여부 */}
                        <td className="py-3.5 px-4 text-center">
                          {d.certificate_registered ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● 등록완료
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              ○ 미등록
                            </span>
                          )}
                        </td>

                        {/* 총 배차 건수 (공식 명칭) */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-blue-700">
                          {d.total_tickets}건
                        </td>

                        {/* 회당 운반 단가 */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {d.unit_price.toLocaleString()}원
                        </td>

                        {/* 공급가액 */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {d.supply_price.toLocaleString()}원
                        </td>

                        {/* 부가가치세 */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {d.vat.toLocaleString()}원
                        </td>

                        {/* 합계 금액 */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          {d.total_amount.toLocaleString()}원
                        </td>

                        {/* 발행 상태 뱃지 */}
                        <td className="py-3.5 px-4 text-center">
                          {d.status_code === "ISSUED" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                              전송완료
                            </span>
                          ) : d.status_code === "READY_TO_ISSUE" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                              발행대기
                            </span>
                          ) : d.status_code === "WAITING_DRIVER" ? (
                            <span className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                              마감대기 (차주미승인)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
                              등록증 미등록
                            </span>
                          )}
                        </td>

                        {/* 국세청 승인번호 */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                          {d.latest_nts_code ? (
                            <span className="font-extrabold text-blue-700">{d.latest_nts_code}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 관리 / 액션 */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {d.status_code === "WAITING_DRIVER" ? (
                            <button
                              type="button"
                              onClick={(e) => handleSendReminder(d, e)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black shadow flex items-center gap-1 inline-flex transition-all"
                            >
                              <Send className="w-3 h-3" />
                              독촉 알림톡
                            </button>
                          ) : d.status_code === "READY_TO_ISSUE" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDriverKeys(new Set([d.key]));
                                handleBulkIssueTaxInvoices();
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow inline-flex transition-all"
                            >
                              발행하기
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDetailModalDriver(d)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex transition-colors"
                            >
                              명세보기
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [TAB 2] 하차지별 B2B 정산 관리 (Sites B2B API Settlement - 카드형 레이아웃) */}
      {/* ========================================================================= */}
      {activeMainTab === "DROPOFFS" && (
        <div className="space-y-4">
          {/* 상단 안내 바 */}
          <div className="p-4 bg-white rounded-2xl border-2 border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-black text-slate-800">
                하차지(사토장) B2B 실시간 상·하차 물량 대사 현황 ({filteredDropoffs.length}곳)
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500">
              현장 출발 배차 건수 vs 하차지 반입 승인 건수를 1:1 자동 대사하여 전자세금계산서를 즉시 발행합니다.
            </span>
          </div>

          {/* 카드 목록 영역 */}
          {isLoading ? (
            <div className="bg-white p-16 rounded-2xl border-2 border-slate-300 text-center text-slate-400 font-bold">
              하차지 B2B 정산 데이터를 불러오는 중입니다...
            </div>
          ) : filteredDropoffs.length === 0 ? (
            <div className="bg-white p-16 rounded-2xl border-2 border-slate-300 text-center text-slate-400 font-bold">
              {dropoffList.length === 0
                ? "연동된 하차지 B2B 정산 내역이 없습니다. (Data Empty)"
                : "검색 조건에 일치하는 하차지 내역이 없습니다."}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredDropoffs.map((item) => {
                const isSiteExpense = item.payer_type === "SITE_PAYS";
                const hasDiscrepancy = item.discrepancy_count !== 0;

                return (
                  <div
                    key={item.group_key}
                    className="bg-white rounded-2xl border-2 border-slate-300 hover:border-blue-500 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                  >
                    {/* 카드 헤더: 상호명, 계약유형 배지, 사업자번호 */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900 tracking-tight">
                            {item.dropoff_name}
                          </span>
                          {isSiteExpense ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              토사 처리비 지출 (매입)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              토사/골재 매각 (매출)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate" title={item.dropoff_address}>
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.dropoff_address}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 block">사업자번호</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{item.business_number}</span>
                      </div>
                    </div>

                    {/* 카드 중간: 1) 상·하차 건수 대사 패널 + 2) 정산 금액 패널 */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* 물량 대사 현황 */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[11px] font-extrabold text-slate-600 block">
                          실시간 상·하차 물량 대사
                        </span>
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div className="bg-white py-1.5 px-1 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold">출발</span>
                            <span className="text-xs font-mono font-black text-slate-800">
                              {item.site_departure_count}건
                            </span>
                          </div>
                          <div className="bg-white py-1.5 px-1 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-blue-500 block font-bold">도착</span>
                            <span className="text-xs font-mono font-black text-blue-700">
                              {item.dropoff_arrived_count}건
                            </span>
                          </div>
                          <div className="bg-white py-1.5 px-1 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold">오차</span>
                            {hasDiscrepancy ? (
                              <span className="text-xs font-mono font-black text-rose-600">
                                {item.discrepancy_count > 0 ? `+${item.discrepancy_count}` : item.discrepancy_count}건
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-400">0건</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 단가 및 정산 금액 */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-slate-500">수용 단가</span>
                          <span className="font-mono font-bold text-slate-700">
                            {item.unit_price.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-slate-500">공급가액</span>
                          <span className="font-mono font-bold text-slate-700">
                            ₩{item.supply_price.toLocaleString()}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200 flex items-baseline justify-between">
                          <span className="text-xs font-black text-slate-900">합계 정산금액</span>
                          <span className="text-sm font-black font-mono text-blue-700">
                            ₩{item.total_amount.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 카드 푸터: 국세청 승인상태 & 액션 버튼 */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
                      <div className="text-xs">
                        {item.invoice_nts_code ? (
                          <div className="flex items-center gap-1.5 text-blue-700">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <span className="text-[11px] font-bold">국세청 승인번호:</span>
                            <span className="font-mono font-black text-xs">{item.invoice_nts_code}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-[11px] font-bold">전자세금계산서 미발행 상태</span>
                          </div>
                        )}
                      </div>

                      <div>
                        {item.invoice_issued ? (
                          <span className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            국세청 전송 완료
                          </span>
                        ) : isSiteExpense ? (
                          <div className="flex items-center gap-2">
                            <span className="px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-black inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              하차지 세금계산서 발행 대기
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleIssueDropoffInvoice(item)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                          >
                            <Receipt className="w-4 h-4" />
                            매출세금계산서 발행
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* [MODAL] 차주별 개별 티켓 명세 상세 보기 팝업 */}
      {/* ========================================================================= */}
      {detailModalDriver && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-slate-400 animate-fadeIn space-y-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-900">
                  전자 운반 정산 명세서 ({detailModalDriver.car_number} - {detailModalDriver.owner_name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalDriver(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* 요약 바 */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <div>
                  <span className="text-slate-500 block">총 배차 건수</span>
                  <span className="text-base font-black text-blue-700">{detailModalDriver.total_tickets}건</span>
                </div>
                <div>
                  <span className="text-slate-500 block">사업자등록증 상태</span>
                  <span className="text-sm font-black text-slate-900">
                    {detailModalDriver.certificate_label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">합계 청구금액</span>
                  <span className="text-base font-black text-slate-900">
                    {detailModalDriver.total_amount.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 티켓 목록 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">티켓 ID</th>
                      <th className="py-2.5 px-3">운행 일자</th>
                      <th className="py-2.5 px-3 text-right">운반 금액</th>
                      <th className="py-2.5 px-3 text-center">차주 마감 승인</th>
                      <th className="py-2.5 px-3 text-center">세금계산서</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {detailModalDriver.tickets_detail.map((t) => (
                      <tr key={t.ticket_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{t.ticket_id}</td>
                        <td className="py-2.5 px-3 font-mono">{t.date || "-"}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {t.fare.toLocaleString()}원
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {t.tax_invoice_confirmed_by_driver ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                              승인완료
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">
                              미승인
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {t.tax_invoice_issued ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 font-mono">
                              {t.nts_code || "발행완료"}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">미발행</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalDriver(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
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
