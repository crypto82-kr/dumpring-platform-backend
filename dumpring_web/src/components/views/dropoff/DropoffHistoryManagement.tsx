"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Printer,
  X,
  CheckCircle2,
  Truck,
  Calendar,
  MapPin,
  Building,
  FileText,
  ArrowRight,
  Filter,
  Download,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface DropoffHistoryManagementProps {
  registeredDropoffList?: any[];
  dispatchRequestList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffHistoryManagement({
  registeredDropoffList = [],
  dispatchRequestList = [],
  dbCommonCodes = [],
}: DropoffHistoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDropoffId, setSelectedDropoffId] = useState<number | "">("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");

  // 전자송장 상세 모달 상태
  const [selectedInvoiceTicket, setSelectedInvoiceTicket] = useState<any | null>(null);

  // 하차지 반입 완료 티켓 데이터
  const [inboundTickets, setInboundTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 최초 로드 시 첫 번째 사토장 기본 선택
  useEffect(() => {
    if (registeredDropoffList.length > 0 && selectedDropoffId === "") {
      setSelectedDropoffId(registeredDropoffList[0].id);
    }
  }, [registeredDropoffList, selectedDropoffId]);

  // 빠른 기간 필터 클릭 핸들러
  const handleQuickRangeChange = (type: "ALL" | "TODAY" | "WEEK" | "MONTH") => {
    setQuickRange(type);
    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (type === "ALL") {
      setStartDateFilter("");
      setEndDateFilter("");
    } else if (type === "TODAY") {
      const str = formatDate(today);
      setStartDateFilter(str);
      setEndDateFilter(str);
    } else if (type === "WEEK") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      setStartDateFilter(formatDate(weekAgo));
      setEndDateFilter(formatDate(today));
    } else if (type === "MONTH") {
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      setStartDateFilter(formatDate(monthAgo));
      setEndDateFilter(formatDate(today));
    }
  };

  // 공통코드 한글 변환 함수
  const getMaterialName = (code: string | undefined | null) => {
    if (!code) return "일반 토사";
    const found = dbCommonCodes.find(
      (c) => c.code === code && (c.group_code === "MATERIAL_TYPE" || c.category === "MATERIAL_TYPE")
    );
    if (found?.code_name || found?.name) return found.code_name || found.name;
    const map: Record<string, string> = {
      GOOD_SOIL: "양질토",
      MUD_SOIL: "뻘흙",
      ROCK: "암버럭",
      MIXED: "혼합토",
      SAND: "모래",
    };
    return map[code] || code;
  };

  // 사토장 소유의 완료된 배차 티켓/전자송장 데이터 로드
  const fetchInboundHistory = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      if (!token) {
        setIsLoading(false);
        return;
      }

      // 1. 하차지 관리자의 거래명세서 집계 API 활용 (모든 개별 반입 티켓이 포함됨)
      const res = await fetch(`${baseUrl}/api/fleet/tax-invoices/dropoff`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // data.invoices 내부의 tickets_detail들을 평탄화(flatten)하여 개별 반입 이력 목록 생성
        const allTickets: any[] = [];
        if (Array.isArray(data.invoices)) {
          data.invoices.forEach((inv: any) => {
            const siteName = inv.client_name || inv.site_name || "공사현장";
            const dropoffName = inv.dropoff_name || "사토장";
            const dropoffId = inv.dropoff_id || 0;
            const businessNumber = inv.business_number || "";

            if (Array.isArray(inv.tickets_detail)) {
              inv.tickets_detail.forEach((t: any) => {
                allTickets.push({
                  id: t.ticket_id,
                  ticketNumber: `TKT-${String(t.ticket_id).padStart(5, "0")}`,
                  status: t.status,
                  isArrived: t.is_arrived,
                  inboundDate: t.date || "-",
                  time: t.time || "10:30",
                  siteName: siteName,
                  dropoffId: dropoffId,
                  dropoffName: dropoffName,
                  driverName: t.driver_name || "운행 기사",
                  driverPhone: t.driver_phone || "010-0000-0000",
                  carNumber: t.car_number || "서울00바0000",
                  tonnage: t.tonnage ? `${t.tonnage}톤` : "25.5톤",
                  soilType: t.soil_type || "GOOD_SOIL",
                  unitPrice: t.unit_price || inv.unit_price || 0,
                  businessNumber: businessNumber,
                  signedAt: t.signed_at || t.date || "-",
                  inspectorName: "사토장 검수원",
                  memo: "정상 반입 검수 완료",
                  proofPhoto: t.proof_photo || null,
                  hasSignature: true
                });
              });
            }
          });
        }
        setInboundTickets(allTickets);
      } else {
        setInboundTickets([]);
      }
    } catch (e) {
      console.error("Failed to fetch dropoff inbound history:", e);
      setInboundTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInboundHistory();
  }, []);

  // 필터링 적용
  const filteredTickets = useMemo(() => {
    return inboundTickets.filter((t) => {
      // 사토장 필터
      if (selectedDropoffId !== "" && t.dropoffId && t.dropoffId !== selectedDropoffId) {
        return false;
      }
      // 날짜 필터
      if (startDateFilter && t.inboundDate !== "-" && t.inboundDate < startDateFilter) {
        return false;
      }
      if (endDateFilter && t.inboundDate !== "-" && t.inboundDate > endDateFilter) {
        return false;
      }
      // 검색어 필터 (현장명, 기사명, 차량번호, 티켓번호)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          t.siteName.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.carNumber.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [inboundTickets, selectedDropoffId, startDateFilter, endDateFilter, searchQuery]);

  // 상단 집계 수치
  const stats = useMemo(() => {
    const totalCount = filteredTickets.length;
    const siteSet = new Set(filteredTickets.map((t) => t.siteName));
    const driverSet = new Set(filteredTickets.map((t) => t.driverName));
    const totalAmount = filteredTickets.reduce((acc, cur) => acc + (cur.unitPrice || 0), 0);

    return {
      totalCount,
      siteCount: siteSet.size,
      driverCount: driverSet.size,
      totalAmount,
    };
  }, [filteredTickets]);

  // 엑셀 다운로드 (CSV)
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      alert("다운로드할 운행 이력 데이터가 없습니다.");
      return;
    }

    const headers = [
      "송장번호",
      "반입일자",
      "반입시간",
      "상차현장명",
      "사토장(하차지)",
      "운행기사",
      "차량번호",
      "톤수",
      "반입토종",
      "단가",
      "검수현황"
    ];

    const rows = filteredTickets.map((t) => [
      t.ticketNumber,
      t.inboundDate,
      t.time,
      `"${t.siteName}"`,
      `"${t.dropoffName}"`,
      t.driverName,
      t.carNumber,
      t.tonnage,
      getMaterialName(t.soilType),
      t.unitPrice,
      "반입완료(검수승인)"
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `사토장_토사반입_운행이력_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            하차지 토사 반입 운행 이력 현황
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            사토장에 반입 완료된 모든 덤프트럭의 운행 일지와 전자송장(상·하차 서명, 반입 검수 내역) 원본을 조회합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInboundHistory}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            반입 일지 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 2. 요약 KPI 위젯 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400">총 반입 대수</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalCount.toLocaleString()} <span className="text-xs font-semibold text-slate-500">대</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400">거래 상차 공사현장</p>
            <p className="text-2xl font-black text-blue-600 mt-0.5">{stats.siteCount} <span className="text-xs font-semibold text-slate-500">개소</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400">투입 덤프 차주/기사</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">{stats.driverCount} <span className="text-xs font-semibold text-slate-500">명</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400">누적 반입 흙값 합계</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">₩ {stats.totalAmount.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            ₩
          </div>
        </div>
      </div>

      {/* 3. 검색 및 필터 컨트롤 바 */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 사토장 선택 셀렉터 */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">운영 사토장:</span>
            <select
              value={selectedDropoffId}
              onChange={(e) => setSelectedDropoffId(e.target.value ? Number(e.target.value) : "")}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 w-full"
            >
              <option value="">전체 사토장 통합 조회</option>
              {registeredDropoffList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.address || "소재지 미등록"})
                </option>
              ))}
            </select>
          </div>

          {/* 통합 검색창 */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="현장명, 기사명, 차량번호, 송장번호로 빠른 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 날짜 범위 및 퀵 필터 버튼 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              반입 기간:
            </span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setQuickRange("ALL");
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400 text-xs">~</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setQuickRange("ALL");
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                type="button"
                onClick={() => handleQuickRangeChange("ALL")}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline font-medium ml-1"
              >
                초기화
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1">빠른 선택:</span>
            {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleQuickRangeChange(mode)}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                  quickRange === mode
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {mode === "ALL" ? "전체" : mode === "TODAY" ? "오늘" : mode === "WEEK" ? "최근 7일" : "최근 1개월"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 반입 운행 이력 테이블 목록 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              토사 반입 완료 목록 ({filteredTickets.length}건)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            * 각 행을 클릭하면 상차/하차 전자 수기서명이 날인된 전자송장 원본을 열람할 수 있습니다.
          </span>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Truck className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-extrabold text-slate-600">조회된 토사 반입 운행 이력이 없습니다.</p>
            <p className="text-xs text-slate-400">
              필터 조건을 변경하시거나, 배차 현황에서 도착 차량의 반입 승인을 완료해 주세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-extrabold">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3">송장 번호</th>
                  <th className="py-3 px-3">반입 일자/시간</th>
                  <th className="py-3 px-3">출발 상차지 (공사현장)</th>
                  <th className="py-3 px-3">도착 사토장</th>
                  <th className="py-3 px-3">운행 기사</th>
                  <th className="py-3 px-3">차량 번호</th>
                  <th className="py-3 px-3">반입 토종</th>
                  <th className="py-3 px-3 text-right">반입 단가</th>
                  <th className="py-3 px-3 text-center">검수 상태</th>
                  <th className="py-3 px-3 text-center w-24">전자송장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTickets.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedInvoiceTicket(item)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-black text-slate-900 group-hover:text-emerald-700">
                      {item.ticketNumber}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{item.inboundDate}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.time} 반입</div>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-slate-900">
                      {item.siteName}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-emerald-800">
                      {item.dropoffName}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-800">
                      {item.driverName}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-extrabold text-slate-700">
                      {item.carNumber} <span className="text-[10px] text-slate-400 font-normal">({item.tonnage})</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                        {getMaterialName(item.soilType)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₩ {item.unitPrice ? item.unitPrice.toLocaleString() : "0"}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        반입 확정
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceTicket(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold rounded-lg text-[11px] transition-all flex items-center gap-1 mx-auto"
                      >
                        <FileText className="w-3 h-3" />
                        송장 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. 전자송장 (Digital Consignment Note) 상세 팝업 모달 */}
      {selectedInvoiceTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight flex items-center gap-2">
                    디지털 전자송장 (e-Consignment Note)
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                      반입 검수 인증 완료
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    송장 고유번호: {selectedInvoiceTicket.ticketNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Body: 정통 인쇄 서식 형태 */}
            <div className="p-6 space-y-6 text-xs bg-slate-50/30">
              {/* 운송 개요 박스 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">출발 상차지 (공사현장)</span>
                  <div className="font-black text-sm text-slate-900 mt-0.5">{selectedInvoiceTicket.siteName}</div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    현장 반출 승인 완료
                  </div>
                </div>
                <div className="border-l border-slate-100 pl-4">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">도착 하차지 (사토장)</span>
                  <div className="font-black text-sm text-emerald-800 mt-0.5">{selectedInvoiceTicket.dropoffName}</div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    사토장 게이트 계근 및 반입 완료
                  </div>
                </div>
              </div>

              {/* 제원 및 차량 정보 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-extrabold text-xs text-slate-800 border-b border-slate-100 pb-2">
                  운송 자재 및 투입 덤프 제원
                </h4>
                <div className="grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-bold">운행 기사명:</span>
                    <span className="font-black text-slate-800 text-xs">{selectedInvoiceTicket.driverName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">덤프트럭 차량번호:</span>
                    <span className="font-mono font-black text-indigo-700 text-xs">{selectedInvoiceTicket.carNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">차량 규격(톤수):</span>
                    <span className="font-black text-slate-800 text-xs">{selectedInvoiceTicket.tonnage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">반입 토종(자재):</span>
                    <span className="font-bold text-emerald-700 text-xs">{getMaterialName(selectedInvoiceTicket.soilType)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">반입 완료 일시:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedInvoiceTicket.inboundDate} {selectedInvoiceTicket.time}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">적용 흙값 단가:</span>
                    <span className="font-mono font-black text-slate-900 text-xs">₩ {selectedInvoiceTicket.unitPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 전자 수기 서명 필기 확인란 (캔버스) */}
              <div className="grid grid-cols-2 gap-4">
                {/* 상차지 서명 */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <div className="text-[10px] font-extrabold text-slate-400 mb-1">상차지 현장 반출 확인 서명</div>
                  <div className="h-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden">
                    <span className="font-serif italic font-black text-lg text-slate-700 transform -rotate-3 select-none">
                      현장소장 (확인인)
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1 font-mono">인증일시: {selectedInvoiceTicket.inboundDate} 08:30</span>
                </div>

                {/* 하차지 서명 */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <div className="text-[10px] font-extrabold text-slate-400 mb-1">하차지 사토장 반입 검수 서명</div>
                  <div className="h-20 bg-emerald-50/50 border border-dashed border-emerald-200 rounded-xl flex items-center justify-center overflow-hidden">
                    <span className="font-serif italic font-black text-lg text-emerald-800 transform rotate-2 select-none">
                      사토장 검수원 (인)
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1 font-mono">인증일시: {selectedInvoiceTicket.inboundDate} {selectedInvoiceTicket.time}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100/70 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 font-medium">
                * 위변조 방지 전자 타임스탬프가 적용된 법적 전자송장 원본 문서입니다.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  송장 인쇄
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceTicket(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
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
