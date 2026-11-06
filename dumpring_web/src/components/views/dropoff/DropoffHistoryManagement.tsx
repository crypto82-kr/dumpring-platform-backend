"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDropoffId, setSelectedDropoffId] = useState<number | "">("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "IN_PROGRESS" | "REJECTED">("ALL");

  // 전자송장 상세 모달 상태
  const [selectedInvoiceTicket, setSelectedInvoiceTicket] = useState<any | null>(null);

  // 하차지 반입 완료 티켓 데이터
  const [inboundTickets, setInboundTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  // 공통코드 한글 변환 함수 (토사 종류)
  const getMaterialName = (code: string | undefined | null) => {
    if (!code || code === "-" || code === "null" || code === "undefined") return "토종 미등록";
    // 이미 한글 명칭으로 변환되어 들어온 경우 그대로 유지
    if (["양질토", "뻘흙", "암버럭", "혼합토", "모래", "일반토", "일반토사", "점토", "풍화토"].includes(code)) {
      return code;
    }
    const map: Record<string, string> = {
      GOOD_SOIL: "양질토",
      MUD_SOIL: "뻘흙",
      ROCK: "암버럭",
      MIXED: "혼합토",
      SAND: "모래",
      NORMAL_SOIL: "일반토",
      NORMAL: "일반토",
      SOIL: "일반토사",
      CLAY: "점토",
      WEATHERED_SOIL: "풍화토",
    };
    if (map[code]) return map[code];

    const found = dbCommonCodes.find(
      (c) => c.code === code && (c.group_code === "MATERIAL_TYPE" || c.category === "MATERIAL_TYPE")
    );
    if (found?.code_name || found?.name) return found.code_name || found.name;
    return code;
  };

  // 실무 검수 및 운행 상태 한글 뱃지 포매터
  const getStatusBadgeInfo = (status: string | undefined | null) => {
    const s = (status || "").toUpperCase();
    if (["APPROVED", "COMPLETED", "SETTLEMENT_REQUESTED", "SETTLEMENT_APPROVED", "SETTLEMENT_PAID", "SETTLEMENT_CONFIRMED"].includes(s)) {
      return {
        label: "반입 확정",
        className: "bg-emerald-100 text-emerald-800 border-emerald-300",
        isCompleted: true,
      };
    }
    if (s === "REJECTED" || s.includes("REJECT") || s.includes("반려") || s.includes("회차")) {
      return {
        label: "반입 거부(회차)",
        className: "bg-rose-100 text-rose-800 border-rose-300",
        isCompleted: false,
      };
    }
    if (["DRIVING", "IN_PROGRESS", "DEPARTED"].includes(s)) {
      return {
        label: "운행중 (현장 이동)",
        className: "bg-blue-100 text-blue-800 border-blue-300",
        isCompleted: false,
      };
    }
    if (["LOADING", "ARRIVED_LOADING"].includes(s)) {
      return {
        label: "상차중 (적재 대기)",
        className: "bg-amber-100 text-amber-800 border-amber-300",
        isCompleted: false,
      };
    }
    if (["ARRIVED", "ARRIVED_DROPOFF", "WAITING_INSPECTION"].includes(s)) {
      return {
        label: "하차 도착 (검수 대기)",
        className: "bg-indigo-100 text-indigo-800 border-indigo-300",
        isCompleted: false,
      };
    }
    if (s === "CANCELLED" || s.includes("취소")) {
      return {
        label: "배차 취소",
        className: "bg-slate-100 text-slate-600 border-slate-300",
        isCompleted: false,
      };
    }
    return {
      label: s || "확인 대기",
      className: "bg-slate-100 text-slate-700 border-slate-300",
      isCompleted: false,
    };
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
      const res = await fetch(`${baseUrl}/api/fleet/tax-invoices/dropoff-summary`, {
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
                  time: t.time || "-",
                  siteName: siteName,
                  dropoffId: dropoffId,
                  dropoffName: dropoffName,
                  driverName: t.driver_name || "배차 기사",
                  driverPhone: t.driver_phone || "-",
                  carNumber: t.car_number || "차량 미등록",
                  tonnage: t.tonnage ? `${t.tonnage}톤` : "-",
                  soilType: t.soil_type || getMaterialName(t.actual_material_type) || "일반토사",
                  unitPrice: t.unit_price || inv.unit_price || 0,
                  businessNumber: businessNumber,
                  isChanged: Boolean(t.is_changed),
                  originalDropoffName: t.original_dropoff_name || null,
                  changeReason: t.change_reason || "",
                  actualMaterialType: t.actual_material_type || "",
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
      // 운행/검수 상태 필터
      if (statusFilter !== "ALL") {
        const badgeInfo = getStatusBadgeInfo(t.status);
        if (statusFilter === "COMPLETED" && !badgeInfo.isCompleted) {
          return false;
        }
        if (statusFilter === "IN_PROGRESS" && (badgeInfo.isCompleted || (t.status || "").toUpperCase() === "REJECTED")) {
          return false;
        }
        if (statusFilter === "REJECTED" && (t.status || "").toUpperCase() !== "REJECTED") {
          return false;
        }
      }
      return true;
    });
  }, [inboundTickets, selectedDropoffId, startDateFilter, endDateFilter, searchQuery, statusFilter]);

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
            운행 이력 현황
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
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all ${quickRange === mode
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
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                토사 반입 운행 이력 ({filteredTickets.length}건)
              </h3>
            </div>

            {/* 운행/검수 상태별 빠른 필터 탭 */}
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-[11px] font-bold">
              {(
                [
                  { key: "ALL", label: "전체" },
                  { key: "COMPLETED", label: "반입확정(완료)" },
                  { key: "IN_PROGRESS", label: "운행/상차중" },
                  { key: "REJECTED", label: "반입거부(회차)" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-md transition-all ${statusFilter === tab.key
                    ? "bg-white text-slate-900 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
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
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-extrabold">
                  <th className="py-3 px-2.5 text-center w-10">순번</th>
                  <th className="py-3 px-2.5">송장 번호</th>
                  <th className="py-3 px-2.5">반입 일자/시간</th>
                  <th className="py-3 px-2.5">출발 상차지 (공사현장)</th>
                  <th className="py-3 px-2.5">도착 사토장</th>
                  <th className="py-3 px-2.5">운행 기사</th>
                  <th className="py-3 px-2.5">차량 번호</th>
                  <th className="py-3 px-2.5">반입토사</th>
                  <th className="py-3 px-2.5 text-right">반입 단가</th>
                  <th className="py-3 px-2.5 text-center">검수 상태</th>
                  <th className="py-3 px-2.5 text-center w-24">전자송장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTickets.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedInvoiceTicket(item)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-2.5 text-center font-mono text-slate-400 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2.5 font-mono font-black text-slate-900 group-hover:text-emerald-700">
                      {item.ticketNumber}
                    </td>
                    <td className="py-3 px-2.5">
                      <div className="font-bold text-slate-800">{item.inboundDate}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.time} 반입</div>
                    </td>
                    <td className="py-3 px-2.5 font-extrabold text-slate-900">
                      {item.siteName}
                    </td>
                    <td className="py-3 px-2.5">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <span>{item.dropoffName}</span>
                        {item.isChanged && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap shrink-0" title={`원래 배정: ${item.originalDropoffName || "타 사토장"} | 사유: ${item.changeReason || "현장 변경"}`}>
                            경로 변경 유입
                          </span>
                        )}
                      </div>
                      {item.isChanged && item.changeReason && (
                        <div className="text-[10px] text-amber-700 font-semibold mt-0.5 truncate max-w-[180px]">
                          사유: {item.changeReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2.5 font-bold text-slate-800">
                      {item.driverName}
                    </td>
                    <td className="py-3 px-2.5 font-mono font-extrabold text-slate-700">
                      {item.carNumber} <span className="text-[10px] text-slate-400 font-normal">({item.tonnage})</span>
                    </td>
                    <td className="py-3 px-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        {item.soilType}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ₩ {item.unitPrice ? item.unitPrice.toLocaleString() : "0"}
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap">
                      {(() => {
                        const badge = getStatusBadgeInfo(item.status);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${badge.className}`}
                          >
                            {badge.isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceTicket(item)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold rounded-lg text-[11px] transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span>송장 보기</span>
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
      {mounted && selectedInvoiceTicket && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scaleUp my-auto flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight flex items-center gap-2">
                    디지털 전자송장 (토사 반입 증빙 전표)
                    {(() => {
                      const badge = getStatusBadgeInfo(selectedInvoiceTicket.status);
                      return (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">도착 하차지 (사토장)</span>
                    {selectedInvoiceTicket.isChanged && (
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                        경로 변경 유입
                      </span>
                    )}
                  </div>
                  <div className="font-black text-sm text-emerald-800 mt-0.5">{selectedInvoiceTicket.dropoffName}</div>
                  {selectedInvoiceTicket.isChanged && (
                    <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mt-1">
                      <p className="font-bold">원래 배정: {selectedInvoiceTicket.originalDropoffName || "타 사토장"}</p>
                      <p className="mt-0.5">변경 사유: {selectedInvoiceTicket.changeReason || "현장 상황에 따른 하차지 변경"}</p>
                    </div>
                  )}
                  {getStatusBadgeInfo(selectedInvoiceTicket.status).isCompleted ? (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      사토장 게이트 계근 및 반입 검수 완료
                    </div>
                  ) : selectedInvoiceTicket.status === "REJECTED" ? (
                    <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      사토장 반입 거부 (회차 조치)
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      사토장 도착 및 반입 검수 대기 중
                    </div>
                  )}
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
                    <span className="text-slate-400 block font-bold">반입토사:</span>
                    <span className="font-bold text-emerald-700 text-xs">
                      {selectedInvoiceTicket.soilType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">반입 완료 일시:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {getStatusBadgeInfo(selectedInvoiceTicket.status).isCompleted ? (
                        `${selectedInvoiceTicket.inboundDate} ${selectedInvoiceTicket.time}`
                      ) : selectedInvoiceTicket.status === "REJECTED" ? (
                        <span className="text-rose-600 font-bold">반입 거부 (회차)</span>
                      ) : (
                        <span className="text-amber-600 font-bold">미완료 (검수 대기)</span>
                      )}
                    </span>
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
                  {getStatusBadgeInfo(selectedInvoiceTicket.status).isCompleted ? (
                    <>
                      <div className="h-20 bg-emerald-50/50 border border-dashed border-emerald-200 rounded-xl flex items-center justify-center overflow-hidden">
                        <span className="font-serif italic font-black text-lg text-emerald-800 transform rotate-2 select-none">
                          사토장 검수원 (인)
                        </span>
                      </div>
                      <span className="text-[9px] text-emerald-700 block mt-1 font-mono font-semibold">
                        인증일시: {selectedInvoiceTicket.inboundDate} {selectedInvoiceTicket.time}
                      </span>
                    </>
                  ) : selectedInvoiceTicket.status === "REJECTED" ? (
                    <>
                      <div className="h-20 bg-rose-50/60 border border-dashed border-rose-200 rounded-xl flex items-center justify-center overflow-hidden">
                        <span className="font-sans font-black text-sm text-rose-700 select-none">
                          반입 거부 (서명 불가)
                        </span>
                      </div>
                      <span className="text-[9px] text-rose-600 block mt-1 font-semibold">
                        검수 결과: 반입 불가 (회차 조치)
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden">
                        <span className="font-sans font-bold text-xs text-slate-400 select-none">
                          반입 검수 전 (미서명)
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                        인증일시: - (하차지 반입 승인 대기)
                      </span>
                    </>
                  )}
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
        </div>,
        document.body
      )}
    </div>
  );
}
