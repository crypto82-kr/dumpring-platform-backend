"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Calendar, MapPin, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface DropoffSoilSettlementManagementProps {
  registeredDropoffList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffSoilSettlementManagement({
  registeredDropoffList = [],
}: DropoffSoilSettlementManagementProps) {
  const [selectedDropoffId, setSelectedDropoffId] = useState<number | "">("");
  const [payerTypeFilter, setPayerTypeFilter] = useState<string>("ALL");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalCount: 0,
  });
  const [soilSettlementList, setSoilSettlementList] = useState<any[]>([]);

  // 분쟁(이의제기) 모달 관리 상태
  const [disputeModalItem, setDisputeModalItem] = useState<any | null>(null);
  const [disputeInputReason, setDisputeInputReason] = useState<string>("");
  const [disputeInputAmount, setDisputeInputAmount] = useState<string>("");

  // 퀵 날짜 범위 선택
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

  // 백엔드 실제 DB 하차지 흙값 정산 데이터 로드
  const fetchDropoffSettlementData = useCallback(async () => {
    try {
      const baseUrl = getApiBaseUrl();
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

      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedDropoffId) queryParams.append("drop_off_id", String(selectedDropoffId));
      if (startDateFilter) queryParams.append("start_date", startDateFilter);
      if (endDateFilter) queryParams.append("end_date", endDateFilter);

      const url = `${baseUrl}/api/dispatch/settlements/dropoff-soil-settlements${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSummaryData(data.summary || { totalIncome: 0, totalExpense: 0, netBalance: 0, totalCount: 0 });
        setSoilSettlementList(data.soilSettlements || []);
      } else {
        console.warn("하차지 흙값 정산 API 응답 상태:", res.status);
        setSummaryData({ totalIncome: 0, totalExpense: 0, netBalance: 0, totalCount: 0 });
        setSoilSettlementList([]);
      }
    } catch (e) {
      console.warn("하차지 흙값 정산 조회 오류:", e);
      setSummaryData({ totalIncome: 0, totalExpense: 0, netBalance: 0, totalCount: 0 });
      setSoilSettlementList([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDropoffId, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchDropoffSettlementData();
  }, [fetchDropoffSettlementData]);

  // 상태 업데이트 및 이의제기 처리 핸들러
  const handleUpdateStatus = async (
    jobPostId: number,
    targetStatus: string,
    actionName: string,
    extraData?: {
      dispute_type?: string;
      dispute_reason?: string;
      dispute_amount?: number;
    }
  ) => {
    if (!extraData && !confirm(`해당 건에 대해 [${actionName}] 처리를 진행하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("dumpring_token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("token")
          : null;

      const res = await fetch(`${baseUrl}/api/dispatch/settlements/site-soil-expenses/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_post_ids: [jobPostId],
          target_status: targetStatus,
          dispute_type: extraData?.dispute_type || "DROPOFF",
          dispute_reason: extraData?.dispute_reason,
          dispute_amount: extraData?.dispute_amount,
        }),
      });

      if (res.ok) {
        alert(`[${actionName}] 처리가 완료되었습니다.`);
        setDisputeModalItem(null);
        setDisputeInputReason("");
        setDisputeInputAmount("");
        await fetchDropoffSettlementData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "흙값 정산 상태 변경 중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error("흙값 정산 업데이트 통신 실패:", e);
      alert("정산 처리 통신에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 필터링 및 작업일자 기준 최신순 정렬
  const filteredList = soilSettlementList
    .filter((item) => {
      if (selectedDropoffId && item.dropOffId !== Number(selectedDropoffId)) return false;
      if (payerTypeFilter !== "ALL" && item.payerType !== payerTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (item.siteName && item.siteName.toLowerCase().includes(q)) ||
          (item.dropoffName && item.dropoffName.toLowerCase().includes(q)) ||
          (item.soilType && item.soilType.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = a.workDate || "";
      const dateB = b.workDate || "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // 작업일자 내림차순 (최신순)
      }
      return b.id - a.id;
    });

  const totalIncome = filteredList
    .filter((d) => d.payerType === "SITE_PAYS")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const totalExpense = filteredList
    .filter((d) => d.payerType === "SITE_RECEIVES")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">하차지 흙값 정산 관리</h2>
          <p className="text-xs text-slate-500 mt-1">
            실제 매칭 및 운행 오더(DB)를 바탕으로 사토 수수료 수입(현장 지급) 및 토사 매입 지출(하차지 지급) 흙값 대장을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDropoffSettlementData}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => alert("하차지 흙값 정산 대장이 엑셀 파일로 출력되었습니다.")}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10"
          >
            흙값 정산 대장 엑셀
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">사토 수수료 수입액 (SITE_PAYS)</span>
          <div className="text-2xl font-black text-emerald-600">₩ {totalIncome.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-semibold">현장으로부터 수령할 흙값 총액</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">토사 매입 지출액 (SITE_RECEIVES)</span>
          <div className="text-2xl font-black text-rose-600">₩ {totalExpense.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-semibold">현장에 지급해야 할 흙값 총액</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">순 흙값 정산 잔액</span>
          <div className={`text-2xl font-black ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-rose-600"}`}>
            ₩ {(totalIncome - totalExpense).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">
            조회 건수: <strong className="text-slate-800">{filteredList.length}건</strong>
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          {/* 운영 하차지 선택 */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedDropoffId}
              onChange={(e) => setSelectedDropoffId(e.target.value ? Number(e.target.value) : "")}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer w-full"
            >
              <option value="">전체 하차지 보기</option>
              {registeredDropoffList && registeredDropoffList.length > 0
                ? registeredDropoffList.map((drop) => (
                    <option key={drop.id} value={drop.id}>
                      {drop.name || drop.locationName || `하차지 #${drop.id}`}
                    </option>
                  ))
                : null}
            </select>
          </div>

          {/* 작업 기간 필터 & 퀵버튼 */}
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
                  quickRange === "ALL" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("TODAY")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  quickRange === "TODAY" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("WEEK")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  quickRange === "WEEK" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1주일
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("MONTH")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  quickRange === "MONTH" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1개월
              </button>
            </div>
          </div>

          {/* 거래 구분 탭 */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPayerTypeFilter("ALL")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                payerTypeFilter === "ALL" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setPayerTypeFilter("SITE_PAYS")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                payerTypeFilter === "SITE_PAYS" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              현장지급
            </button>
            <button
              type="button"
              onClick={() => setPayerTypeFilter("SITE_RECEIVES")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                payerTypeFilter === "SITE_RECEIVES" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              하차지지급
            </button>
            <button
              type="button"
              onClick={() => setPayerTypeFilter("FREE")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                payerTypeFilter === "FREE" ? "bg-slate-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              무상
            </button>
          </div>
        </div>

        {/* 검색창 */}
        <div className="relative w-full md:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="현장명, 사토장, 토질..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-sm text-slate-900">흙값 정산 상세 거래 내역 (작업일자 최신순)</h4>
          <span className="text-xs text-slate-400 font-semibold">총 {filteredList.length}건</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-3 w-24">작업 일자</th>
                <th className="py-3 px-3 min-w-[140px]">연동 현장</th>
                <th className="py-3 px-3 min-w-[120px]">하차 사토장</th>
                <th className="py-3 px-3 w-20">토사 종류</th>
                <th className="py-3 px-3 min-w-[140px]">거래 구분</th>
                <th className="py-3 px-3 w-28 whitespace-nowrap">단가 / 수량</th>
                <th className="py-3 px-3 text-right w-28 whitespace-nowrap">총 정산 금액</th>
                <th className="py-3 px-3 text-center w-24 whitespace-nowrap">진행 상태</th>
                <th className="py-3 px-3 text-center w-36 whitespace-nowrap">처리 작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredList.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-400 text-center whitespace-nowrap">{idx + 1}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-800 font-bold whitespace-nowrap">{row.workDate || "-"}</td>
                  <td className="py-3.5 px-3 font-bold text-slate-900">{row.siteName}</td>
                  <td className="py-3.5 px-3 text-slate-700 font-medium">{row.dropoffName}</td>
                  <td className="py-3.5 px-3 font-bold text-blue-600 whitespace-nowrap">{row.soilType}</td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {row.payerType === "SITE_PAYS" && (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200 inline-block">
                        현장지급
                      </span>
                    )}
                    {row.payerType === "SITE_RECEIVES" && (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-rose-50 text-rose-600 border border-rose-200 inline-block">
                        하차지지급
                      </span>
                    )}
                    {row.payerType === "FREE" && (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-slate-100 text-slate-600 border border-slate-300 inline-block">
                        무상
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                    {row.unitPrice.toLocaleString()}원 / {row.truckCount}대
                  </td>
                  <td
                    className={`py-3.5 px-3 font-mono font-black text-right text-sm whitespace-nowrap ${
                      row.payerType === "SITE_PAYS"
                        ? "text-emerald-600"
                        : row.payerType === "SITE_RECEIVES"
                        ? "text-rose-600"
                        : "text-slate-500"
                    }`}
                  >
                    {row.payerType === "SITE_PAYS" ? "+" : row.payerType === "SITE_RECEIVES" ? "-" : ""}
                    ₩ {row.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded border inline-block ${
                        row.status === "정산 마감"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : row.status === "수령 확인"
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : row.status === "송금 완료"
                          ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                          : row.status === "이의제기"
                          ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                          : row.status === "정산 검토"
                          ? "bg-purple-50 text-purple-600 border-purple-200"
                          : row.status === "운행/모집중"
                          ? "bg-sky-50 text-sky-600 border-sky-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                      }`}
                    >
                      {row.status}
                    </span>
                    {row.status === "이의제기" && row.disputeType && (
                      <span className="block text-[9px] text-rose-500 font-bold mt-0.5 whitespace-nowrap">
                        [{row.disputeType === "DROPOFF" ? "하차지 제기" : "현장 제기"}]
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {row.status === "운행/모집중" && (
                        <span className="text-[11px] text-sky-600 font-bold">운행 진행 중</span>
                      )}

                      {row.status === "정산 검토" && (
                        <>
                          {/* 하차지가 돈을 지급하는 경우(SITE_RECEIVES): 정산 검토 후 [송금 처리] 또는 수량/단가 문제 시 [이의제기/보류] */}
                          {row.payerType === "SITE_RECEIVES" ? (
                            <>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleUpdateStatus(row.id, "SETTLEMENT_PAID", "송금 처리")}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-sm"
                              >
                                송금 처리
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeModalItem(row);
                                  setDisputeInputReason(row.disputeReason || "");
                                  setDisputeInputAmount(row.disputeAmount ? String(row.disputeAmount) : "");
                                }}
                                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                              >
                                이의제기
                              </button>
                            </>
                          ) : row.payerType === "SITE_PAYS" ? (
                            /* 하차지가 돈을 받는 경우(SITE_PAYS): 아직 현장이 송금하기 전이므로 송금 대기 (이의제기 불가) */
                            <span className="text-[11px] text-amber-600 font-bold">현장 송금 대기</span>
                          ) : (
                            /* 무상 처리 */
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(row.id, "COMPLETED", "최종 마감")}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
                            >
                              정산 마감
                            </button>
                          )}
                        </>
                      )}

                      {row.status === "송금 완료" && (
                        <>
                          {/* 하차지가 돈을 받는 경우(SITE_PAYS): 현장이 송금 완료했으므로 입금 확인 후 [입금 확인] 또는 금액 부족 시 [이의제기] */}
                          {row.payerType === "SITE_PAYS" ? (
                            <>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleUpdateStatus(row.id, "SETTLEMENT_CONFIRMED", "입금 수령 확인")}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
                              >
                                입금 확인
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeModalItem(row);
                                  setDisputeInputReason(row.disputeReason || "");
                                  setDisputeInputAmount(row.disputeAmount ? String(row.disputeAmount) : "");
                                }}
                                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                              >
                                이의제기
                              </button>
                            </>
                          ) : (
                            /* 하차지가 돈을 보낸 경우(SITE_RECEIVES): 상대(현장)가 입금 확인할 때까지 대기 */
                            <span className="text-[11px] text-indigo-600 font-bold">현장 수령 확인 대기</span>
                          )}
                        </>
                      )}

                      {row.status === "수령 확인" && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(row.id, "COMPLETED", "최종 마감")}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
                        >
                          최종 마감
                        </button>
                      )}

                      {row.status === "이의제기" && (
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeModalItem(row);
                            setDisputeInputReason(row.disputeReason || "");
                            setDisputeInputAmount(row.disputeAmount ? String(row.disputeAmount) : "");
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all active:scale-95 shadow-sm"
                        >
                          이의 내역 확인
                        </button>
                      )}

                      {row.status === "정산 마감" && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 마감 완료
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                    해당 검색/기간 조건의 흙값 정산 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 흙값 정산 이의제기 접수 / 내역 확인 모달 */}
      {disputeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {disputeModalItem.status === "이의제기"
                    ? "하차지 흙값 정산 이의제기 상세 내역"
                    : "하차지 흙값 정산 이의제기 / 정산 보류 등록"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalItem(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* 대상 기본 정보 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">오더 번호</span>
                  <span className="font-mono font-bold text-slate-800">{disputeModalItem.jobPostId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">작업 일자</span>
                  <span className="font-mono font-bold text-slate-800">{disputeModalItem.workDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">현장 / 사토장</span>
                  <span className="font-bold text-slate-800">
                    {disputeModalItem.siteName} ➔ {disputeModalItem.dropoffName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">거래 구분 및 금액</span>
                  <span className="font-bold text-slate-900">
                    {disputeModalItem.payerType === "SITE_PAYS"
                      ? "현장지급"
                      : disputeModalItem.payerType === "SITE_RECEIVES"
                      ? "하차지지급"
                      : "무상"}{" "}
                    | ₩ {disputeModalItem.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {disputeModalItem.status === "이의제기" ? (
                /* 이미 이의제기된 상태일 때 상세 뷰 */
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-[11px]">
                        🚨 이의제기 주체:{" "}
                        <strong className="underline">
                          {disputeModalItem.disputeType === "DROPOFF" ? "하차 사토장 관리자" : "상차 현장 관리자"}
                        </strong>
                      </span>
                      <span className="font-mono text-[10px] text-rose-500">{disputeModalItem.disputedAt}</span>
                    </div>
                    {disputeModalItem.disputeAmount ? (
                      <div className="text-[11px] font-bold">
                        이의 조정 요청 금액: ₩ {disputeModalItem.disputeAmount.toLocaleString()}원
                      </div>
                    ) : null}
                    <div className="text-[11px] pt-1">
                      <span className="font-bold block text-rose-700">이의제기 사유:</span>
                      <p className="bg-white/80 p-2 rounded-lg mt-1 text-slate-800 font-medium whitespace-pre-wrap">
                        {disputeModalItem.disputeReason || "상세 사유가 기재되지 않았습니다."}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    현장관리자와 유선 협의 및 실제 수량/토질 사양 확인 후 협의가 완료되면 [보류 해제 및 재검토]를 진행하거나 최종 마감 처리할 수 있습니다.
                  </p>
                </div>
              ) : (
                /* 신규 이의제기 작성 폼 */
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                    ℹ️ 실제 하차 대수 불일치, 토질 불량(뻘흙/건설폐기물 혼입 반출 거부), 수용 단가 상이 등으로 정산 진행이 불가할 때 이의를 등록하고 <strong>정산을 보류</strong>합니다.
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      정정 요구 금액 (원) <span className="text-slate-400 font-normal">(선택)</span>
                    </label>
                    <input
                      type="number"
                      value={disputeInputAmount}
                      onChange={(e) => setDisputeInputAmount(e.target.value)}
                      placeholder={`기존 계약액: ${disputeModalItem.totalAmount}`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      이의제기 및 보류 사유 <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={disputeInputReason}
                      onChange={(e) => setDisputeInputReason(e.target.value)}
                      placeholder="예: 송장에는 20대로 기재되었으나 현장 도착 후 뻘흙 판정으로 3대 회차되어 실제 17대분만 수용 완료됨. 차액 조정 필요."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 모달 하단 버튼 */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisputeModalItem(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                닫기
              </button>

              {disputeModalItem.status === "이의제기" ? (
                <>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleUpdateStatus(disputeModalItem.id, "CLOSED", "보류 해제 (재검토)")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/10"
                  >
                    보류 해제 (정산 재검토)
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleUpdateStatus(disputeModalItem.id, "COMPLETED", "상호 협의 종결 마감")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/10"
                  >
                    협의 완료 (최종 마감)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    if (!disputeInputReason.trim()) {
                      alert("이의제기 사유를 입력해 주세요.");
                      return;
                    }
                    handleUpdateStatus(
                      disputeModalItem.id,
                      "SETTLEMENT_DISPUTED",
                      "이의제기 등록 및 정산 보류",
                      {
                        dispute_type: "DROPOFF",
                        dispute_reason: disputeInputReason.trim(),
                        dispute_amount: disputeInputAmount ? Number(disputeInputAmount) : undefined,
                      }
                    );
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-rose-600/10"
                >
                  이의제기 등록 (정산 보류)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
