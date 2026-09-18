"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Building, Calendar, RefreshCw, Truck, FileText, CheckCircle2, X, AlertTriangle } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface SiteDumpExpensesManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteDumpExpensesManagement({
  registeredSiteList = [],
}: SiteDumpExpensesManagementProps) {
  const [activeTab, setActiveTab] = useState<"SITE" | "DRIVER">("SITE");
  const [selectedSiteId, setSelectedSiteId] = useState<number | "">("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 팝업 모달: 특정 현장의 기사별 상세 정산 내역 보기
  const [modalSite, setModalSite] = useState<any | null>(null);

  // 정산 처리 다중 선택 및 처리 상태
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 분쟁(이의제기) 모달 관리 상태 (현장관리자 정산 보류/이의제기 및 기사 분쟁 상세 확인용)
  const [disputeModalTicket, setDisputeModalTicket] = useState<any | null>(null);
  const [disputeModalMode, setDisputeModalMode] = useState<"SITE_DISPUTE" | "DRIVER_VIEW">("SITE_DISPUTE");
  const [disputeInputReason, setDisputeInputReason] = useState<string>("현장 대기시간 불일치 및 회차 미인정");
  const [disputeInputAmount, setDisputeInputAmount] = useState<string>("");

  const handleUpdateSettlementStatus = async (
    ticketIds: number[], 
    targetStatus: string, 
    extraData?: { dispute_reason?: string; dispute_amount?: number; dispute_type?: "SITE" | "DRIVER" }
  ) => {
    if (ticketIds.length === 0) {
      alert("처리할 정산 건을 선택해주세요.");
      return;
    }

    const actionName =
      targetStatus === "SETTLEMENT_APPROVED"
        ? "정산 승인"
        : targetStatus === "SETTLEMENT_PAID"
        ? "지급(송금) 완료"
        : targetStatus === "SETTLEMENT_CONFIRMED"
        ? "정산 완료 확정"
        : targetStatus === "SETTLEMENT_DISPUTED"
        ? (extraData?.dispute_type === "SITE" ? "현장관리자 정산 보류(이의제기)" : "분쟁 접수 (이의제기)")
        : "상태 변경";

    if (!confirm(`선택한 ${ticketIds.length}건에 대해 [${actionName}] 처리를 진행하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      const res = await fetch(`${baseUrl}/api/dispatch/settlements/tickets/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_ids: ticketIds,
          target_status: targetStatus,
          dispute_type: extraData?.dispute_type || (targetStatus === "SETTLEMENT_DISPUTED" ? "SITE" : undefined),
          dispute_reason: extraData?.dispute_reason,
          dispute_amount: extraData?.dispute_amount,
        }),
      });

      if (res.ok) {
        alert(`${ticketIds.length}건의 [${actionName}] 처리가 완료되었습니다.`);
        setSelectedTicketIds([]);
        setDisputeModalTicket(null);
        await fetchSettlementData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "정산 처리 중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error("정산 상태 업데이트 오류:", e);
      alert("정산 처리 통신에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<any>({
    totalAmount: 0,
    driverCount: 0,
    companyCount: 0,
    completedTrips: 0,
    pendingSettlementTrips: 0
  });
  const [siteSummaries, setSiteSummaries] = useState<any[]>([]);
  const [driverExpenses, setDriverExpenses] = useState<any[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<any[]>([]);

  // 백엔드 실제 DB 덤프비 정산 데이터 로드
  const fetchSettlementData = useCallback(async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedSiteId) queryParams.append("site_id", String(selectedSiteId));
      if (startDateFilter) queryParams.append("start_date", startDateFilter);
      if (endDateFilter) queryParams.append("end_date", endDateFilter);

      const url = `${baseUrl}/api/dispatch/settlements/site-dump-expenses${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSummaryData(data.summary || {});
        setSiteSummaries(data.siteSummaries || []);
        setDriverExpenses(data.driverExpenses || []);
        setCompanyExpenses(data.companyExpenses || []);
      } else {
        console.warn("덤프비 정산 API 응답 상태:", res.status);
        setSummaryData({ totalAmount: 0, driverCount: 0, companyCount: 0, completedTrips: 0, pendingSettlementTrips: 0 });
        setSiteSummaries([]);
        setDriverExpenses([]);
        setCompanyExpenses([]);
      }
    } catch (e) {
      console.warn("덤프비 정산 조회 알림:", e);
      setSiteSummaries([]);
      setDriverExpenses([]);
      setCompanyExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSiteId, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchSettlementData();
  }, [fetchSettlementData]);

  // 검색어 필터링
  const filteredDriverData = driverExpenses.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.driverName && item.driverName.toLowerCase().includes(q)) ||
      (item.carPlate && item.carPlate.toLowerCase().includes(q)) ||
      (item.companyName && item.companyName.toLowerCase().includes(q)) ||
      (item.siteName && item.siteName.toLowerCase().includes(q))
    );
  });

  const filteredCompanyData = companyExpenses.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.companyName && item.companyName.toLowerCase().includes(q)) ||
      (item.siteName && item.siteName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장 덤프비 정산 확인</h2>
          <p className="text-xs text-slate-500 mt-1">
            실제 배차 운행 완료 데이터(DB)를 바탕으로 공사현장별, 개별 기사/차주별 운반비 정산 대장을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSettlementData}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => alert("덤프비 정산 대장 엑셀 출력이 완료되었습니다.")}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10"
          >
            덤프비 정산 대장 엑셀
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">정산 누적 총액</span>
          <div className="text-2xl font-black text-slate-900">₩ {(summaryData.totalAmount || 0).toLocaleString()}</div>
          <p className="text-[10px] text-emerald-600 font-bold">운행 완료 티켓 기준</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">운행 완료 횟수</span>
          <div className="text-2xl font-black text-blue-600">{(summaryData.completedTrips || 0).toLocaleString()} 회</div>
          <p className="text-[10px] text-blue-500 font-bold">진행 중: {summaryData.pendingSettlementTrips || 0}건</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">투입 기사 수</span>
          <div className="text-2xl font-black text-indigo-600">{summaryData.driverCount || 0} 명</div>
          <p className="text-[10px] text-indigo-500 font-bold">개별 차주/기사 집계</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          {/* 현장 선택 */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : "")}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">전체 현장 보기</option>
              {registeredSiteList && registeredSiteList.length > 0 ? (
                registeredSiteList.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name || site.site_name || site.company_name || `현장 #${site.id}`}
                  </option>
                ))
              ) : (
                siteSummaries.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.siteName}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 운행 기간 필터 & 퀵버튼 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setQuickRange("ALL");
                }}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
              />
              <span className="text-slate-400 text-xs">~</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setQuickRange("ALL");
                }}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleQuickRangeChange("ALL")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  quickRange === "ALL" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("TODAY")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  quickRange === "TODAY" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("WEEK")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  quickRange === "WEEK" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                최근 7일
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("MONTH")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  quickRange === "MONTH" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1개월
              </button>
            </div>
            {(startDateFilter || endDateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setStartDateFilter("");
                  setEndDateFilter("");
                  setQuickRange("ALL");
                }}
                className="text-[11px] text-rose-500 font-bold hover:underline ml-1"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {activeTab !== "SITE" && (
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "DRIVER" ? "기사명, 차량번호, 현장명 검색..." : "운송사명, 현장명 검색..."}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Main Table Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        {/* Navigation Tabs */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("SITE")}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                activeTab === "SITE"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              현장별 정산 요약
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DRIVER")}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                activeTab === "DRIVER"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              기사별 상세 정산 내역 ({driverExpenses.length}건)
            </button>
          </div>

          {/* DRIVER 탭 일괄 정산 액션 툴바 */}
          {activeTab === "DRIVER" && (
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  선택 <strong className="text-blue-600 font-extrabold">{selectedTicketIds.length}</strong>건
                </span>
                {selectedTicketIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTicketIds([])}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline ml-1"
                  >
                    선택 해제
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessing || selectedTicketIds.length === 0}
                  onClick={() => handleUpdateSettlementStatus(selectedTicketIds, "SETTLEMENT_APPROVED")}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg transition-all active:scale-95 shadow-sm"
                >
                  선택 정산 승인
                </button>
                <button
                  type="button"
                  disabled={isProcessing || selectedTicketIds.length === 0}
                  onClick={() => handleUpdateSettlementStatus(selectedTicketIds, "SETTLEMENT_PAID")}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg transition-all active:scale-95 shadow-sm"
                >
                  선택 지급(송금) 완료
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1. Tab: Site Summary (현장별 정산 정보) */}
        {activeTab === "SITE" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">No.</th>
                  <th className="py-3 px-4">현장명</th>
                  <th className="py-3 px-4">시공사/업체명</th>
                  <th className="py-3 px-4 text-center">운행 기간</th>
                  <th className="py-3 px-4 text-center">완료 운행 횟수</th>
                  <th className="py-3 px-4 text-center">투입 기사 수</th>
                  <th className="py-3 px-4 text-right">총 발생 덤프비</th>
                  <th className="py-3 px-4 text-center">상세 내역</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {siteSummaries.map((site, idx) => (
                  <tr key={site.siteId} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      {site.siteName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{site.companyName || "본사 직영"}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                        {site.workDatePeriod || "-"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600">
                      {site.tripCount} 회
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                      {site.driverCount} 명
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      ₩ {site.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          // 상단 '현장 선택' 검색 조건을 마음대로 변경하지 않고, 모달 팝업으로 해당 현장의 기사별 상세 내역을 즉시 표시
                          setModalSite(site);
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all active:scale-95"
                      >
                        기사별 상세 보기
                      </button>
                    </td>
                  </tr>
                ))}
                {siteSummaries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      등록된 현장 및 덤프비 정산 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Tab: Driver-Based Table (개별 기사별 정산) */}
        {activeTab === "DRIVER" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={
                        filteredDriverData.length > 0 &&
                        filteredDriverData
                          .filter((r) => r.rawStatus !== "CANCELLED" && r.rawStatus !== "REJECTED")
                          .every((r) => selectedTicketIds.includes(r.rawTicketId))
                      }
                      onChange={(e) => {
                        const validIds = filteredDriverData
                          .filter((r) => r.rawStatus !== "CANCELLED" && r.rawStatus !== "REJECTED")
                          .map((r) => r.rawTicketId);
                        if (e.target.checked) {
                          setSelectedTicketIds(Array.from(new Set([...selectedTicketIds, ...validIds])));
                        } else {
                          setSelectedTicketIds(selectedTicketIds.filter((id) => !validIds.includes(id)));
                        }
                      }}
                    />
                  </th>
                  <th className="py-3 px-3 w-12 text-center">No.</th>
                  <th className="py-3 px-3">티켓 번호</th>
                  <th className="py-3 px-3">운행 일자</th>
                  <th className="py-3 px-3">현장명</th>
                  <th className="py-3 px-3">기사명 / 연락처</th>
                  <th className="py-3 px-3">차량번호 (톤수)</th>
                  <th className="py-3 px-3">정산 수령처 (개인/운송사)</th>
                  <th className="py-3 px-3 text-right">정산 덤프비</th>
                  <th className="py-3 px-3 text-center">정산 진행 상태</th>
                  <th className="py-3 px-3 text-center">처리 작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredDriverData.map((row, idx) => {
                  const isCancelled = row.rawStatus === "CANCELLED" || row.rawStatus === "REJECTED";
                  const isChecked = selectedTicketIds.includes(row.rawTicketId);

                  return (
                    <tr key={row.ticketId || idx} className={`hover:bg-slate-50/80 transition-all ${isChecked ? "bg-blue-50/40" : ""}`}>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          disabled={isCancelled}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTicketIds((prev) => [...prev, row.rawTicketId]);
                            } else {
                              setSelectedTicketIds((prev) => prev.filter((id) => id !== row.rawTicketId));
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                        />
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{row.ticketId}</td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">{row.date || "-"}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">{row.siteName}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900">{row.driverName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{row.phone}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800">{row.carPlate}</td>
                      <td className="py-3.5 px-3">
                        {row.recipientType === "COMPANY" ? (
                          <div>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold mr-1">
                              운송사 수령
                            </span>
                            <span className="font-bold text-slate-800">{row.recipientName || row.companyName}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold mr-1">
                              개인 차주
                            </span>
                            <span className="font-bold text-slate-800">{row.driverName}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                        {isCancelled ? (
                          <span className="text-slate-400 line-through font-normal text-xs">₩ 0</span>
                        ) : (
                          `₩ ${row.totalFare.toLocaleString()}`
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded border ${
                            isCancelled
                              ? "bg-rose-50 text-rose-600 border-rose-200"
                              : row.status === "정산 완료"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : row.status.includes("분쟁") || row.status.includes("이의") || row.status.includes("보류")
                              ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse font-black"
                              : row.status === "송금 완료"
                              ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                              : row.status === "승인 완료"
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {row.status.includes("분쟁") || row.status.includes("이의") || row.status.includes("보류")
                            ? `⚠️ ${row.status}`
                            : row.status}
                        </span>
                        {(row.status.includes("분쟁") || row.status.includes("이의") || row.status.includes("보류")) && row.disputeReason && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1 max-w-[140px] truncate" title={row.disputeReason}>
                            사유: {row.disputeReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {isCancelled ? (
                          <span className="text-[11px] text-slate-400">-</span>
                        ) : row.status === "정산 검토" ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_APPROVED")}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-sm"
                            >
                              정산 승인
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDisputeModalTicket(row);
                                setDisputeModalMode("SITE_DISPUTE");
                                setDisputeInputReason("운행내역 불일치 / 현장 미확인에 따른 지급 보류");
                                setDisputeInputAmount(String(row.totalFare));
                              }}
                              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all active:scale-95"
                              title="현장관리자 정산 보류 및 이의제기 등록"
                            >
                              지급 보류/이의
                            </button>
                          </div>
                        ) : row.status === "승인 완료" ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_PAID")}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 shadow-sm"
                          >
                            지급(송금) 완료
                          </button>
                        ) : row.status === "송금 완료" ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              기사 수령확인 대기
                            </span>
                            {/* [내부 테스트용 기사 앱 기능 주석 - 필요 시 활성화]:
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_CONFIRMED")}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                                title="기사 미확인 시 현장관리자 최종 완료 확정 (테스트용)"
                              >
                                [테스트] 완료 확정
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeModalTicket(row);
                                  setDisputeModalMode("DRIVER_VIEW");
                                  setDisputeInputAmount(String(Math.max(0, row.totalFare - 50000)));
                                }}
                                className="text-[10px] text-rose-500 hover:text-rose-700 underline font-medium"
                              >
                                [테스트] 기사 이의제기
                              </button>
                            </div>
                            */}
                          </div>
                        ) : (row.status.includes("분쟁") || row.status.includes("이의") || row.status.includes("보류")) ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDisputeModalTicket(row);
                                setDisputeModalMode(row.disputeType === "SITE" ? "SITE_DISPUTE" : "DRIVER_VIEW");
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-600 hover:bg-rose-700 text-white transition-all active:scale-95 shadow-sm"
                            >
                              {row.disputeType === "SITE" ? "보류 내역/해제" : "분쟁 내역 확인"}
                            </button>
                            <div className="flex items-center gap-1 mt-0.5">
                              {row.disputeType === "SITE" ? (
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_APPROVED")}
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                                  title="보류 해제 후 승인 단계로 전환"
                                >
                                  보류 해제(승인)
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_PAID")}
                                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                    title="차액 추가 입금 후 재송금 처리"
                                  >
                                    추가송금(재송금)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_CONFIRMED")}
                                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    title="상호 협의 완료 후 정산 종결"
                                  >
                                    협의 완료
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ) : row.status === "정산 완료" ? (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 완료됨
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredDriverData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-bold">
                      조회된 기사별 덤프비 정산 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* 모달 팝업: 특정 현장의 기사별 상세 정산 내역 (검색 조건 훼손 방지) */}
      {modalSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">{modalSite.siteName}</h3>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[11px] font-bold">
                      {modalSite.companyName || "본사 직영"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    운행 기간: <span className="font-semibold text-slate-700">{modalSite.workDatePeriod || "전체"}</span> | 총 운행: <span className="font-semibold text-blue-600">{modalSite.tripCount}회</span> | 총 덤프비: <span className="font-black text-slate-900">₩ {modalSite.totalAmount.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalSite(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 (테이블) */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">No.</th>
                    <th className="py-3 px-3">티켓 번호</th>
                    <th className="py-3 px-3">운행 일자</th>
                    <th className="py-3 px-3">기사명 / 연락처</th>
                    <th className="py-3 px-3">차량번호 (톤수)</th>
                    <th className="py-3 px-3">정산 수령처</th>
                    <th className="py-3 px-3 text-right">정산 덤프비</th>
                    <th className="py-3 px-3 text-center">정산 상태</th>
                    <th className="py-3 px-3 text-center">처리 작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {driverExpenses
                    .filter((item) => item.siteId === modalSite.siteId)
                    .map((row, idx) => {
                      const isCancelled = row.rawStatus === "CANCELLED" || row.rawStatus === "REJECTED";

                      return (
                        <tr key={row.ticketId || idx} className="hover:bg-slate-50/80 transition-all">
                          <td className="py-3 px-3 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.ticketId}</td>
                          <td className="py-3 px-3 font-mono text-slate-600">{row.date || "-"}</td>
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-900">{row.driverName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{row.phone}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">{row.carPlate}</td>
                          <td className="py-3 px-3">
                            {row.recipientType === "COMPANY" ? (
                              <div>
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold mr-1">
                                  운송사
                                </span>
                                <span className="font-bold text-slate-800">{row.recipientName || row.companyName}</span>
                              </div>
                            ) : (
                              <div>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold mr-1">
                                  개인 차주
                                </span>
                                <span className="font-bold text-slate-800">{row.driverName}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                            {isCancelled ? (
                              <span className="text-slate-400 line-through font-normal text-xs">₩ 0</span>
                            ) : (
                              `₩ ${row.totalFare.toLocaleString()}`
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded border ${
                                isCancelled
                                  ? "bg-rose-50 text-rose-600 border-rose-200"
                                  : row.status === "정산 완료"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : row.status.includes("분쟁") || row.status.includes("이의") || row.status.includes("보류")
                                  ? "bg-rose-100 text-rose-700 border-rose-300 font-black animate-pulse"
                                  : row.status === "송금 완료"
                                  ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                  : row.status === "승인 완료"
                                  ? "bg-blue-50 text-blue-600 border-blue-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {row.status.includes("분쟁") || row.status.includes("이의") || row.status.includes("보류")
                                ? `⚠️ ${row.status}`
                                : row.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isCancelled ? (
                              <span className="text-[11px] text-slate-400">-</span>
                            ) : row.status === "정산 검토" ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_APPROVED")}
                                  className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-sm"
                                >
                                  정산 승인
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDisputeModalTicket(row);
                                    setDisputeModalMode("SITE_DISPUTE");
                                    setDisputeInputReason("운행내역 불일치 / 현장 미확인에 따른 지급 보류");
                                    setDisputeInputAmount(String(row.totalFare));
                                  }}
                                  className="px-1.5 py-1 text-[9px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all active:scale-95"
                                  title="현장관리자 정산 보류 및 이의제기 등록"
                                >
                                  보류/이의
                                </button>
                              </div>
                            ) : row.status === "승인 완료" ? (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_PAID")}
                                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 shadow-sm"
                              >
                                지급(송금) 완료
                              </button>
                            ) : row.status === "송금 완료" ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  기사 확인 대기
                                </span>
                                {/* [내부 테스트용 기사 앱 기능 주석 - 필요 시 활성화]:
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateSettlementStatus([row.rawTicketId], "SETTLEMENT_CONFIRMED")}
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                                >
                                  [테스트] 완료 확정
                                </button>
                                */}
                              </div>
                            ) : (row.status.includes("분쟁") || row.status.includes("이의") || row.status.includes("보류")) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeModalTicket(row);
                                  setDisputeModalMode(row.disputeType === "SITE" ? "SITE_DISPUTE" : "DRIVER_VIEW");
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-600 hover:bg-rose-700 text-white transition-all active:scale-95 shadow-sm"
                              >
                                {row.disputeType === "SITE" ? "보류/해제" : "분쟁/조정"}
                              </button>
                            ) : row.status === "정산 완료" ? (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> 완료
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {driverExpenses.filter((item) => item.siteId === modalSite.siteId).length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                        해당 현장의 기사별 운행/정산 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setModalSite(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정산 분쟁 / 이의제기 확인 및 접수 모달 */}
      {disputeModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden animate-scaleUp">
            {/* 모달 헤더 */}
            <div className="p-5 border-b border-rose-100 bg-rose-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                {disputeModalTicket.status.includes("분쟁") || disputeModalTicket.status.includes("이의") || disputeModalTicket.status.includes("보류")
                  ? (disputeModalTicket.disputeType === "SITE" ? "현장관리자 정산 보류 내역 확인" : "정산 분쟁 접수 내역 확인")
                  : disputeModalMode === "SITE_DISPUTE"
                  ? "현장관리자 정산 보류 및 이의제기"
                  : "기사 정산 이의제기 신청 (테스트)"}
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 space-y-4 text-xs">
              {/* 티켓 및 기본 정보 요약 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">티켓 번호</span>
                  <span className="font-mono font-extrabold text-slate-900">{disputeModalTicket.ticketId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">현장명</span>
                  <span className="font-bold text-slate-800">{disputeModalTicket.siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">운행 기사 (차량)</span>
                  <span className="font-bold text-slate-800">
                    {disputeModalTicket.driverName} ({disputeModalTicket.carPlate})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">정산 대상 금액</span>
                  <span className="font-mono font-black text-blue-600 text-sm">
                    ₩ {disputeModalTicket.totalFare.toLocaleString()}
                  </span>
                </div>
              </div>

              {(disputeModalTicket.status.includes("분쟁") || disputeModalTicket.status.includes("이의") || disputeModalTicket.status.includes("보류")) ? (
                /* 이미 분쟁/보류 접수된 건 확인 및 조정 화면 */
                <div className="space-y-3">
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-rose-800 font-bold">
                      <span>접수/보류 일시:</span>
                      <span className="font-mono text-[11px]">{disputeModalTicket.disputedAt || "최근 접수"}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-800 font-bold">
                      <span>이의 제기 주체:</span>
                      <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-800 text-[10px] font-extrabold">
                        {disputeModalTicket.disputeType === "SITE" ? "현장관리자 (정산 보류)" : "덤프 기사 (금액 이의)"}
                      </span>
                    </div>
                    {disputeModalTicket.disputeType !== "SITE" && (
                      <div className="flex justify-between items-center text-rose-800 font-bold">
                        <span>기사 주장 수령/요구액:</span>
                        <span className="font-mono font-black text-rose-700 text-sm">
                          ₩ {(disputeModalTicket.disputeAmount || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-rose-200/60">
                      <span className="text-slate-500 font-bold block mb-1">
                        {disputeModalTicket.disputeType === "SITE" ? "현장관리자 보류/이의 사유:" : "기사 전달 불일치 사유:"}
                      </span>
                      <p className="p-2.5 bg-white rounded-lg border border-rose-200 text-slate-800 font-medium whitespace-pre-wrap">
                        {disputeModalTicket.disputeReason || "사유가 기재되지 않았습니다."}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 <strong>조치 가이드:</strong><br />
                    {disputeModalTicket.disputeType === "SITE" ? (
                      <>
                        - 현장 확인 또는 보정이 완료된 경우: <strong>[보류 해제 및 정산 승인]</strong>을 진행하세요.<br />
                        - 기사 운행 재검토 후 정상 송금 단계로 진입할 수 있습니다.
                      </>
                    ) : (
                      <>
                        - 기사에게 부족한 차액을 추가 송금한 경우: <strong>[차액 추가송금 완료]</strong> 클릭<br />
                        - 기사와 유선 통화 후 오해가 풀렸거나 협의가 완료된 경우: <strong>[상호 협의 완료(정산 종결)]</strong> 클릭
                      </>
                    )}
                  </p>
                </div>
              ) : disputeModalMode === "SITE_DISPUTE" ? (
                /* 현장관리자 정산 보류 / 이의제기 폼 */
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                    ℹ️ 운행 기록(대기 시간, 회차, 공차 여부 등)에 불일치가 있어 <strong>정산 승인을 보류</strong>하고 사실 확인이 필요할 때 작성합니다. 등록 시 기사에게 보류 사유가 안내됩니다.
                  </div>
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      보류 / 이의제기 사유 <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={disputeInputReason}
                      onChange={(e) => setDisputeInputReason(e.target.value)}
                      placeholder="예: 현장 대기시간(2시간) 불일치 및 회차 미승인 건으로 현장소장 확인 필요"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              ) : (
                /* 기사 관점 이의제기 접수 폼 (테스트 및 모바일 대응용) */
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      실제 입금받은 금액 또는 기사 요구 금액 (원)
                    </label>
                    <input
                      type="number"
                      value={disputeInputAmount}
                      onChange={(e) => setDisputeInputAmount(e.target.value)}
                      placeholder="예: 450000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:border-rose-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      정산 계약액: ₩{disputeModalTicket.totalFare.toLocaleString()} | 차액: ₩
                      {Math.max(0, disputeModalTicket.totalFare - Number(disputeInputAmount || 0)).toLocaleString()}원
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">금액 불일치 사유</label>
                    <textarea
                      rows={3}
                      value={disputeInputReason}
                      onChange={(e) => setDisputeInputReason(e.target.value)}
                      placeholder="예: 현장 대기 2시간 분 50,000원이 미포함되어 입금되었습니다."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisputeModalTicket(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                닫기
              </button>

              {(disputeModalTicket.status.includes("분쟁") || disputeModalTicket.status.includes("이의") || disputeModalTicket.status.includes("보류")) ? (
                disputeModalTicket.disputeType === "SITE" ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleUpdateSettlementStatus([disputeModalTicket.rawTicketId], "SETTLEMENT_APPROVED")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/10"
                  >
                    보류 해제 (정산 승인 진행)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleUpdateSettlementStatus([disputeModalTicket.rawTicketId], "SETTLEMENT_PAID")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-indigo-600/10"
                    >
                      차액 추가송금 완료 (재송금)
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleUpdateSettlementStatus([disputeModalTicket.rawTicketId], "SETTLEMENT_CONFIRMED")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/10"
                    >
                      상호 협의 완료 (정산 종결)
                    </button>
                  </>
                )
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    if (!disputeInputReason.trim()) {
                      alert("사유를 입력해주세요.");
                      return;
                    }
                    handleUpdateSettlementStatus(
                      [disputeModalTicket.rawTicketId], 
                      "SETTLEMENT_DISPUTED", 
                      {
                        dispute_type: disputeModalMode === "SITE_DISPUTE" ? "SITE" : "DRIVER",
                        dispute_reason: disputeInputReason,
                        dispute_amount: Number(disputeInputAmount) || 0,
                      }
                    );
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-rose-600/10"
                >
                  {disputeModalMode === "SITE_DISPUTE" ? "정산 보류(이의제기) 등록" : "분쟁 접수 (이의제기) 등록"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
