"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Search,
  Building2,
  Calendar,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  MapPin,
  Truck,
  Printer
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

export interface DropoffTaxInvoiceItem {
  group_key: string;
  dropoff_id: number;
  dropoff_name: string;
  dropoff_address?: string;
  permit_number?: string;
  site_id: number;
  site_name: string;
  site_address?: string;
  company_name: string;
  business_number: string;
  billing_email: string;
  payer_type: "SITE_PAYS" | "DROPOFF_PAYS" | string;
  tax_type: "SALES" | "PURCHASE";
  tax_type_label: string;
  btn_action_label: string;
  unit_price: number;
  site_departure_count: number; // 상차지 출발 건수
  dropoff_arrived_count: number; // 하차지 도착 승인 건수
  discrepancy_count: number; // 오차 건수
  supply_price: number;
  vat: number;
  total_amount: number;
  ticket_ids: number[];
  invoice_issued: boolean;
  invoice_nts_code?: string | null;
  invoice_issued_at?: string | null;
  tickets_detail: {
    ticket_id: number;
    status: string;
    is_arrived?: boolean;
    date: string;
    soil_type?: string;
    unit_price?: number;
    invoice_issued: boolean;
    nts_code?: string | null;
  }[];
}

interface DropoffTaxInvoiceManagementProps {
  registeredDropoffList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffTaxInvoiceManagement({
  registeredDropoffList = [],
}: DropoffTaxInvoiceManagementProps) {
  // 상단 탭: "ALL"(전체 내역) vs "PENDING"(발행/승인 대기) vs "ISSUED"(국세청 전송완료)
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "ISSUED">("ALL");

  // 거래 유형 필터: "ALL" | "SALES"(매출) | "PURCHASE"(매입)
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>("ALL");

  // 하차지 선택 필터
  const [selectedDropoffId, setSelectedDropoffId] = useState<number | "">(
    registeredDropoffList.length > 0 ? registeredDropoffList[0].id : ""
  );

  // 연월 필터
  const currentYearMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYearMonth);
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const [invoiceList, setInvoiceList] = useState<DropoffTaxInvoiceItem[]>([]);
  const [summary, setSummary] = useState({
    total_dropoffs: 0,
    total_sites: 0,
    total_tickets: 0,
    total_supply_price: 0,
    total_vat: 0,
    total_amount: 0,
    issued_count: 0,
    pending_count: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detailModalItem, setDetailModalItem] = useState<DropoffTaxInvoiceItem | null>(null);

  const fetchDropoffTaxInvoices = async () => {
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
      if (selectedDropoffId) params.append("dropoff_id", String(selectedDropoffId));
      if (selectedYearMonth) params.append("year_month", selectedYearMonth);

      const res = await fetch(`${base}/api/fleet/tax-invoices/dropoff-summary?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`데이터 조회 실패 (HTTP ${res.status})`);
      }

      const data = await res.json();
      setInvoiceList(data.invoices || []);
      setSummary(
        data.summary || {
          total_dropoffs: 0,
          total_sites: 0,
          total_tickets: 0,
          total_supply_price: 0,
          total_vat: 0,
          total_amount: 0,
          issued_count: 0,
          pending_count: 0,
        }
      );
    } catch (err) {
      console.error("하차지 세금계산서 조회 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDropoffTaxInvoices();
  }, [selectedDropoffId, selectedYearMonth]);

  // 필터링 적용
  const filteredInvoices = useMemo(() => {
    return invoiceList.filter((item) => {
      // 탭 필터
      if (activeTab === "PENDING" && item.invoice_issued) return false;
      if (activeTab === "ISSUED" && !item.invoice_issued) return false;

      // 거래 유형 필터
      if (taxTypeFilter !== "ALL" && item.tax_type !== taxTypeFilter) return false;

      // 검색어 필터 (상차지명, 건설사명, 사업자번호)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchSite = item.site_name.toLowerCase().includes(kw);
        const matchCompany = item.company_name.toLowerCase().includes(kw);
        const matchBiz = item.business_number.includes(kw);
        if (!matchSite && !matchCompany && !matchBiz) return false;
      }

      return true;
    });
  }, [invoiceList, activeTab, taxTypeFilter, searchKeyword]);

  // 세금계산서 발행 처리 핸들러
  const handleIssueInvoice = async (item: DropoffTaxInvoiceItem) => {
    if (item.ticket_ids.length === 0) {
      alert("정산 대상 티켓이 없습니다.");
      return;
    }

    const isSales = item.tax_type === "SALES";
    const invoiceTitle = isSales ? "매출 전자세금계산서" : "매입 전자세금계산서";

    const confirmMsg =
      `[하차지 B2B ${invoiceTitle} 발행]\n\n` +
      `· 거래처: ${item.company_name} (${item.site_name})\n` +
      `· 사업자번호: ${item.business_number}\n` +
      `· 거래 구분: ${item.tax_type_label}\n` +
      `· 도착 승인 건수: ${item.dropoff_arrived_count}건 (출발 건수: ${item.site_departure_count}건, 오차: ${item.discrepancy_count}건)\n` +
      `· 합계 금액: ₩${item.total_amount.toLocaleString()}원\n\n` +
      `국세청 전자세금계산서 승인번호를 부여하고 정식 발행을 완료하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

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
          notes: `하차지 B2B ${item.site_name} ${invoiceTitle} 발행`,
          invoice_type: "DROPOFF",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "전자세금계산서 발행 실패");
      }

      const resData = await res.json();
      alert(`[전자세금계산서 발행 완료]\n${resData.message}`);
      await fetchDropoffTaxInvoices();
    } catch (err: any) {
      alert(`발행 실패: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. 상단 타이틀 및 안내 바 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">하차지 반입 거래명세서 관리</h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-black rounded-full border border-blue-200">
              e-Ticket 실거래 검증
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            상차지(공사현장)별 토사 반입 물량 대사를 바탕으로 정산 거래명세서를 조회하고 인쇄할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 2. KPI 대시보드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">정산 연계 상차지(현장)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{summary.total_sites}개 현장</span>
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

        <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">총 정산 합계금액</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-700">₩{summary.total_amount.toLocaleString()}원</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 shadow-sm space-y-1">
          <span className="text-[11px] font-extrabold text-emerald-800 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            반입 실거래 대사 완료
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-900">{summary.total_sites}곳 완료</span>
            <span className="text-xs font-black text-emerald-700">명세서 출력 가능</span>
          </div>
        </div>
      </div>

      {/* 3. 검색 및 필터 컨트롤 바 */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* 하차지 선택 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">관할 사토장:</span>
              <select
                value={selectedDropoffId}
                onChange={(e) => setSelectedDropoffId(e.target.value ? Number(e.target.value) : "")}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="">전체 사토장 통합</option>
                {registeredDropoffList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.location_name || d.site_name || d.company_name || `사토장 #${d.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 정산 연월 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-black text-slate-700">정산 연월:</span>
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* 거래 유형 필터 */}
            <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-3">
              <span className="text-xs font-black text-slate-700">거래 구분:</span>
              <select
                value={taxTypeFilter}
                onChange={(e) => setTaxTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="ALL">전체 구분</option>
                <option value="SALES">매출</option>
                <option value="PURCHASE">매입</option>
              </select>
            </div>
          </div>

          {/* 검색창 및 새로고침 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="상차지 / 건설사명 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:outline-none w-48"
              />
            </div>
            <button
              type="button"
              onClick={fetchDropoffTaxInvoices}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        </div>

        {/* 안내 배너 */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-950 font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>[실시간 상·하차 물량 자동 대사]</strong> 상차지 출발 배차 건수와 하차지 도착 승인 건수를 1:1 비교 검증한 후 전자세금계산서가 발행됩니다.
            </span>
          </div>
        </div>
      </div>

      {/* 4. 메인 테이블 */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black text-slate-800">
            상차지(공사현장)별 B2B 정산 및 전자세금계산서 목록 ({filteredInvoices.length}개 현장)
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            행을 클릭하면 개별 반입 티켓 상세 명세를 확인할 수 있습니다.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1120px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-4 min-w-[140px]">상차지(공사현장)</th>
                <th className="py-3 px-4 min-w-[160px]">발주 건설사</th>
                <th className="py-3 px-4 min-w-[120px]">관할 사토장</th>
                <th className="py-3 px-4 min-w-[90px]">거래 구분</th>
                <th className="py-3 px-3 text-center min-w-[80px]">출발 건수</th>
                <th className="py-3 px-3 text-center min-w-[80px]">도착 승인</th>
                <th className="py-3 px-3 text-center min-w-[70px]">오차 건수</th>
                <th className="py-3 px-4 text-right min-w-[105px]">수용 단가</th>
                <th className="py-3 px-4 text-right min-w-[115px]">공급가액</th>
                <th className="py-3 px-4 text-right min-w-[125px]">합계 정산금액</th>
                <th className="py-3 px-4 text-right min-w-[140px]">거래명세서 출력</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 font-bold">
                    하차지 거래명세서 실데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 font-bold">
                    조회 조건에 해당하는 B2B 정산 및 거래명세서 내역이 없습니다. (Data Empty)
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((item) => {
                  const hasDiscrepancy = item.discrepancy_count !== 0;

                  return (
                    <tr
                      key={item.group_key}
                      onClick={() => setDetailModalItem(item)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">{item.site_name}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 block">{item.company_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">{item.dropoff_name}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold whitespace-nowrap">
                        {item.tax_type_label}
                      </td>

                      {/* 현장 출발 배차 건수 */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                        {item.site_departure_count}건
                      </td>

                      {/* 하차지 도착 승인 배차 건수 */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-blue-700 whitespace-nowrap">
                        {item.dropoff_arrived_count}건
                      </td>

                      {/* 오차 건수 */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                        {hasDiscrepancy ? (
                          <span className="text-rose-600 font-extrabold">
                            {item.discrepancy_count > 0 ? `+${item.discrepancy_count}` : item.discrepancy_count}건
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-bold whitespace-nowrap">
                        {item.unit_price.toLocaleString()}원
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.supply_price.toLocaleString()}원
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {item.total_amount.toLocaleString()}원
                      </td>

                      {/* 액션 버튼 */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDetailModalItem(item)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow inline-flex items-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          명세서 출력
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

      {/* 5. 개별 반입 티켓 상세 명세 팝업 모달 */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-slate-400 animate-fadeIn space-y-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    토사 반입 거래명세서 (e-Ticket 집계표)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    GPS 상·하차 전표 실거래 검증 기반 토사 반입 실적 및 정산 내역입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* 1. 거래 기본 정보 (상차지 vs 하차지) */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black text-slate-700 block border-b border-slate-200 pb-1">
                    공사현장 (상차지)
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">현장명:</span>
                    <span className="font-extrabold text-slate-900">{detailModalItem.site_name || "현장"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">발주사:</span>
                    <span className="font-extrabold text-slate-900">{detailModalItem.company_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">사업자번호:</span>
                    <span className="font-mono font-bold text-slate-800">{detailModalItem.business_number || "-"}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-black text-slate-700 block border-b border-slate-200 pb-1">
                    사토장 (하차지)
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">하차 사토장명:</span>
                    <span className="font-extrabold text-slate-900">{detailModalItem.dropoff_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">사토 인허가 번호:</span>
                    <span className="font-mono font-bold text-blue-700">{detailModalItem.permit_number || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">거래 구분:</span>
                    <span className="font-black text-slate-900">{detailModalItem.tax_type_label}</span>
                  </div>
                </div>
              </div>

              {/* 2. 인허가 및 운행 팩트 실적 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">지자체 사토 인허가 번호:</span>
                  <span className="font-mono font-black text-slate-900 text-sm bg-white px-2.5 py-0.5 rounded border border-slate-300">
                    {detailModalItem.permit_number || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-slate-600">
                  <span>하차지 주소:</span>
                  <span className="font-semibold text-slate-800">{detailModalItem.dropoff_address || "-"}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>상·하차 대사 실적:</span>
                  <span className="font-mono font-bold text-slate-800">
                    출발 {detailModalItem.site_departure_count}건 / 도착 {detailModalItem.dropoff_arrived_count}건 (오차 {detailModalItem.discrepancy_count}건)
                  </span>
                </div>
              </div>

              {/* 3. 확정 정산 금액 명세 */}
              <div className="border-2 border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-black text-xs text-slate-800">
                  정산 명세 내역
                </div>
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-4 font-bold text-slate-600 bg-slate-50 w-1/2">
                        반입 승인 건수
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                        {detailModalItem.dropoff_arrived_count}건
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-bold text-slate-600 bg-slate-50">
                        단가
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                        {detailModalItem.unit_price.toLocaleString()}원
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-bold text-slate-600 bg-slate-50">
                        공급가액
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                        ₩{detailModalItem.supply_price.toLocaleString()}원
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-bold text-slate-600 bg-slate-50">
                        부가가치세 (VAT 10%)
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-600">
                        ₩{detailModalItem.vat.toLocaleString()}원
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-black">
                      <td className="py-2.5 px-4 text-slate-900 text-sm">
                        합계 정산금액
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-base text-blue-700">
                        ₩{detailModalItem.total_amount.toLocaleString()}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. 개별 운행/반입 티켓 목록 */}
              <div className="space-y-1.5">
                <span className="text-xs font-black text-slate-800 block">
                  개별 반입 티켓 대사 목록 ({detailModalItem.tickets_detail.length}건)
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 z-10">
                      <tr className="text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-3">티켓 ID</th>
                        <th className="py-2 px-3">반입 일자</th>
                        <th className="py-2 px-3">토사 종류</th>
                        <th className="py-2 px-3 text-right">단가</th>
                        <th className="py-2 px-3 text-center">반입 검수 및 도착 상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {detailModalItem.tickets_detail.map((t) => (
                        <tr key={t.ticket_id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">#{t.ticket_id}</td>
                          <td className="py-2 px-3 font-mono">{t.date || "-"}</td>
                          <td className="py-2 px-3 font-bold text-slate-700">{t.soil_type || "일반 토사"}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {((t.unit_price ?? detailModalItem.unit_price) || 0).toLocaleString()}원
                          </td>
                          <td className="py-2 px-3 text-center">
                            {t.is_arrived !== false ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                ✓ 도착 승인 완료 (실거래 검증)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                미도착 (물량 오차)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 하단 한 줄 안내 */}
              <p className="text-[11px] text-slate-400 text-center font-medium">
                ※ 본 문서는 플랫폼 e-Ticket 기반 실거래 검증 명세표이며, 세무 처리는 각 사의 회계 기준에 따릅니다.
              </p>
            </div>

            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 font-mono">
                출력 일자: 2026-10-15
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  명세서 인쇄 (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
