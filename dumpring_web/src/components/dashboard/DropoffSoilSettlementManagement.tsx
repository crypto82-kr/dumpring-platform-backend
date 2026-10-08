"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  Download,
  Filter,
  Truck,
  Building,
  ShieldCheck,
  ChevronRight,
  Info,
  X
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface DropoffSoilSettlementManagementProps {
  registeredDropoffList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffSoilSettlementManagement({
  registeredDropoffList = [],
}: DropoffSoilSettlementManagementProps) {
  // 메인 상단 탭: "PROCESS"(흙값 정산 처리 워크스페이스 - 메인) vs "HISTORY"(정산 마감 이력 조회 - 순수 이력)
  const [activeMainTab, setActiveMainTab] = useState<"PROCESS" | "HISTORY">("PROCESS");

  // 프로세스 탭 내부 서브 탭: "PENDING"(검토 및 확정 대기) vs "CONFIRMED"(수령/송금 확인 완료 - 마감 대기) vs "DISPUTED"(분쟁 / 정산 보류)
  const [processSubTab, setProcessSubTab] = useState<"PENDING" | "CONFIRMED" | "DISPUTED">("PENDING");

  // 검색 및 필터 상태
  const [selectedDropoffId, setSelectedDropoffId] = useState<number | "">("");
  const [payerTypeFilter, setPayerTypeFilter] = useState<string>("ALL");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [soilSettlementList, setSoilSettlementList] = useState<any[]>([]);

  // 프로세스 워크스페이스 선택된 항목 및 일괄 처리 체크박스
  const [selectedJobItem, setSelectedJobItem] = useState<any | null>(null);
  const [selectedBatchJobIds, setSelectedBatchJobIds] = useState<Set<number>>(new Set());

  // 이력 탭 전용 행 상세 모달 (Row click)
  const [historyDetailModalItem, setHistoryDetailModalItem] = useState<any | null>(null);

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
  const fetchDropoffSettlementData = useCallback(async (signal?: AbortSignal) => {
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
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.soilSettlements) ? data.soilSettlements : [];
        setSoilSettlementList(list);
      } else {
        setSoilSettlementList([]);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setSoilSettlementList([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDropoffId, startDateFilter, endDateFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDropoffSettlementData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchDropoffSettlementData]);

  // 상태 업데이트 핸들러
  const handleUpdateStatus = async (
    jobPostIds: number[],
    targetStatus: string,
    actionName: string,
    extraData?: {
      dispute_type?: string;
      dispute_reason?: string;
      dispute_amount?: number;
    }
  ) => {
    if (!extraData && !confirm(`선택한 ${jobPostIds.length}건에 대해 [${actionName}] 처리를 진행하시겠습니까?`)) {
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
          job_post_ids: jobPostIds,
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
        setSelectedBatchJobIds(new Set());
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

  // 필터링 및 작업일자 최신순 정렬
  const filteredData = useMemo(() => {
    return soilSettlementList
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
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return b.id - a.id;
      });
  }, [soilSettlementList, selectedDropoffId, payerTypeFilter, searchQuery]);

  // 1. [이력용] 마감 완료 건 (최종 COMPLETED 종결건만)
  const historyData = useMemo(() => {
    return filteredData.filter((d) => d.status === "정산 마감");
  }, [filteredData]);

  const historyIncome = useMemo(() => {
    return historyData.filter((d) => d.payerType === "SITE_PAYS").reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [historyData]);

  const historyExpense = useMemo(() => {
    return historyData.filter((d) => d.payerType === "SITE_RECEIVES").reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [historyData]);

  // 2-1. [프로세스용] 1단계: 검토 및 확정 대기 건
  const pendingProcessData = useMemo(() => {
    return filteredData.filter(
      (d) => ["정산 검토", "운행/모집중"].includes(d.status) || (!["정산 마감", "수령 확인", "송금 완료", "이의제기"].includes(d.status))
    );
  }, [filteredData]);

  // 2-2. [프로세스용] 2단계: 수령 및 송금 확인 완료 건 (마감 대기)
  const confirmedProcessData = useMemo(() => {
    return filteredData.filter((d) => ["수령 확인", "송금 완료"].includes(d.status));
  }, [filteredData]);

  const pendingIncome = useMemo(() => {
    return [...pendingProcessData, ...confirmedProcessData]
      .filter((d) => d.payerType === "SITE_PAYS")
      .reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [pendingProcessData, confirmedProcessData]);

  const pendingExpense = useMemo(() => {
    return [...pendingProcessData, ...confirmedProcessData]
      .filter((d) => d.payerType === "SITE_RECEIVES")
      .reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [pendingProcessData, confirmedProcessData]);

  // 2-3. [프로세스용] 분쟁 및 정산 보류 건 (이의제기)
  const disputedProcessData = useMemo(() => {
    return filteredData.filter((d) => d.status === "이의제기");
  }, [filteredData]);

  const disputedTotal = useMemo(() => {
    return disputedProcessData.reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [disputedProcessData]);

  // 현재 프로세스 탭에서 보여줄 데이터 (1단계 대기 vs 2단계 확인완료 vs 3단계 보류)
  const currentProcessList = useMemo(() => {
    if (processSubTab === "PENDING") return pendingProcessData;
    if (processSubTab === "CONFIRMED") return confirmedProcessData;
    return disputedProcessData;
  }, [processSubTab, pendingProcessData, confirmedProcessData, disputedProcessData]);

  // 서브 탭 변경 시 선택 항목 동기화
  useEffect(() => {
    if (currentProcessList.length > 0) {
      if (!selectedJobItem || !currentProcessList.some((item) => item.id === selectedJobItem.id)) {
        setSelectedJobItem(currentProcessList[0]);
      }
    } else {
      setSelectedJobItem(null);
    }
  }, [processSubTab, currentProcessList]);

  // 일괄 선택 토글
  const handleToggleBatchCheck = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBatchJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllBatch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBatchJobIds(new Set(currentProcessList.map((d) => d.id)));
    } else {
      setSelectedBatchJobIds(new Set());
    }
  };

  // 엑셀 다운로드 (정통 숫자 포맷 - 이력 탭 전용)
  const handleExportHistoryExcel = () => {
    if (historyData.length === 0) {
      alert("다운로드할 정산 마감 이력 데이터가 없습니다.");
      return;
    }

    const headers = [
      "오더번호",
      "작업일자",
      "하차사토장명",
      "반입현장명",
      "토사종류",
      "거래구분",
      "계약단가(원)",
      "반입수량(대)",
      "공급가액(원)",
      "부가세(10%)",
      "총정산금액(원)",
      "최종상태"
    ];

    const rows = historyData.map((r) => [
      r.jobPostId || r.id,
      r.workDate,
      `"${(r.dropoffName || "").replace(/"/g, '""')}"`,
      `"${(r.siteName || "").replace(/"/g, '""')}"`,
      `"${(r.soilType || "").replace(/"/g, '""')}"`,
      r.payerType === "SITE_PAYS" ? "사토수수료(수입)" : r.payerType === "SITE_RECEIVES" ? "토사매입비(지출)" : "무상",
      r.unitPrice,
      r.truckCount,
      Math.floor(r.totalAmount / 1.1),
      Math.floor(r.totalAmount - Math.floor(r.totalAmount / 1.1)),
      r.totalAmount,
      `"${r.status}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `하차지_흙값정산_마감이력_${startDateFilter || "전체"}_${endDateFilter || "전체"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-slate-900 min-w-[1024px]">
      {/* ========================================================================= */}
      {/* [ 상단 헤더 & 메인 프로세스 vs 이력 탭 네비게이션 ] */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                하차지(사토장) 흙값 정산 관리
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                사토 수수료 수령액 및 토사 매입비 지출을 검토·확정하고, 마감된 이력을 확인합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 메인 2대 탭: 정산 처리(메인 작업) vs 마감 이력 조회(순수 이력) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
          <button
            onClick={() => setActiveMainTab("PROCESS")}
            className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${
              activeMainTab === "PROCESS"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            흙값 정산 처리 (진행 작업)
            {pendingProcessData.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-extrabold bg-orange-500 text-white rounded-full">
                {pendingProcessData.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainTab("HISTORY")}
            className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${
              activeMainTab === "HISTORY"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            정산 마감 이력 (장부 조회)
            <span className="px-2 py-0.5 text-xs font-extrabold bg-slate-200 text-slate-700 rounded-full">
              {historyData.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [ 3단 분리 KPI 상태 요약 카드 ] */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 카드 1: 정산 마감 완료액 (실제 확정 이력) */}
        <div className="p-5 rounded-2xl bg-white border-2 border-emerald-400 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              정산 마감 완료액 (실제 확정)
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-full">
              {historyData.length}건 마감
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-baseline text-xs font-bold">
              <span className="text-slate-500">실수입액 (사토 수수료 수령):</span>
              <span className="text-base font-black text-emerald-600">₩ {historyIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs font-bold">
              <span className="text-slate-500">실지출액 (토사 매입비 송금):</span>
              <span className="text-base font-black text-rose-600">₩ {historyExpense.toLocaleString()}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-black">
            <span className="text-slate-700">확정 순손익:</span>
            <span className={`text-base ${(historyIncome - historyExpense) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {(historyIncome - historyExpense) >= 0 ? "+" : ""}
              ₩ {(historyIncome - historyExpense).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 카드 2: 정산 대기 예정액 (미확정 검토중) */}
        <div className="p-5 rounded-2xl bg-white border-2 border-amber-300 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              정산 대기 예정액 (검토/진행중)
            </span>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-black rounded-full">
              {pendingProcessData.length}건 대기
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-baseline text-xs font-bold">
              <span className="text-slate-500">수령 예정액 (수수료 청구):</span>
              <span className="text-base font-black text-amber-600">₩ {pendingIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs font-bold">
              <span className="text-slate-500">지급 예정액 (매입비 지급):</span>
              <span className="text-base font-black text-slate-700">₩ {pendingExpense.toLocaleString()}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-black">
            <span className="text-slate-700">예정 순손익:</span>
            <span className="text-base text-amber-700">
              {(pendingIncome - pendingExpense) >= 0 ? "+" : ""}
              ₩ {(pendingIncome - pendingExpense).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 카드 3: 분쟁 / 보류 보관액 */}
        <div className="p-5 rounded-2xl bg-white border-2 border-rose-300 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              분쟁 / 지급 보류 (이의제기)
            </span>
            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-black rounded-full">
              {disputedProcessData.length}건 보류
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-baseline text-xs font-bold">
              <span className="text-slate-500">보류 총금액:</span>
              <span className="text-xl font-black text-rose-600">₩ {disputedTotal.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
              수량/토질/단가 차이로 인해 보류 요청된 건입니다. 협의 완료 후 승인 처리할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [ 통합 검색 및 필터 바 ] */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* 하차 사토장 선택 */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">하차 사토장</label>
            <select
              value={selectedDropoffId}
              onChange={(e) => setSelectedDropoffId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="">모든 사토장 전체</option>
              {registeredDropoffList.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.dropoff_name || `사토장 #${d.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* 거래 구분 필터 */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">거래 및 정산 구분</label>
            <select
              value={payerTypeFilter}
              onChange={(e) => setPayerTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">전체 거래 (수입/지출/무상)</option>
              <option value="SITE_PAYS">현장지급 (하차지 수수료 수취)</option>
              <option value="SITE_RECEIVES">하차지지급 (하차지 토사 매입 지출)</option>
              <option value="FREE">무상 사토</option>
            </select>
          </div>

          {/* 작업 기간 필터 */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-black text-slate-700">작업 일자 범위</label>
              <div className="flex gap-1">
                {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleQuickRangeChange(r)}
                    className={`px-2 py-0.5 text-[10px] font-black rounded-md border transition-all ${
                      quickRange === r
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {r === "ALL" ? "전체" : r === "TODAY" ? "오늘" : r === "WEEK" ? "1주" : "1개월"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setQuickRange("ALL");
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-400 font-bold">~</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setQuickRange("ALL");
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 검색창 및 새로고침 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="현장명, 사토장명, 토사종류 검색..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeMainTab === "HISTORY" && (
              <button
                onClick={handleExportHistoryExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                마감 이력 엑셀 다운로드
              </button>
            )}
            <button
              onClick={() => fetchDropoffSettlementData()}
              disabled={isLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition-all"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [ 탭 1: 흙값 정산 처리 워크스페이스 (실제 작업 탭 - 메인) ] */}
      {/* ========================================================================= */}
      {activeMainTab === "PROCESS" && (
        <div className="space-y-4">
          {/* 서브 탭 & 일괄 처리 액션 바 */}
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setProcessSubTab("PENDING");
                  setSelectedBatchJobIds(new Set());
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  processSubTab === "PENDING"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                1단계: 검토 및 확정 대기
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {pendingProcessData.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setProcessSubTab("CONFIRMED");
                  setSelectedBatchJobIds(new Set());
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  processSubTab === "CONFIRMED"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                2단계: 수령/송금 확인 완료 (마감 대기)
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {confirmedProcessData.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setProcessSubTab("DISPUTED");
                  setSelectedBatchJobIds(new Set());
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  processSubTab === "DISPUTED"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                분쟁 / 정산 보류
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {disputedProcessData.length}
                </span>
              </button>
            </div>

            {/* 일괄 처리 버튼: 1단계에서는 수령/송금확인 처리, 2단계에서는 최종 마감 확정 처리 */}
            {selectedBatchJobIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  선택 <strong className="text-emerald-600 font-black">{selectedBatchJobIds.size}</strong>건
                </span>
                {processSubTab === "PENDING" && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() =>
                      handleUpdateStatus(
                        Array.from(selectedBatchJobIds),
                        "SETTLEMENT_CONFIRMED",
                        "선택 오더 일괄 수령/송금 확인"
                      )
                    }
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    선택 오더 일괄 수령/송금 확인
                  </button>
                )}
                {processSubTab === "CONFIRMED" && (
                  <button
                    type="button"
                    disabled={
                      isProcessing ||
                      !Array.from(selectedBatchJobIds).some((id) =>
                        currentProcessList.find((item) => item.id === id)?.status === "수령 확인"
                      )
                    }
                    onClick={() => {
                      const confirmedIds = Array.from(selectedBatchJobIds).filter((id) =>
                        currentProcessList.find((item) => item.id === id)?.status === "수령 확인"
                      );
                      if (confirmedIds.length === 0) {
                        alert("선택한 오더 중 상대방의 '수령 확인'이 완료된 건이 없습니다.\n상대방이 입금을 확인해야 최종 마감이 가능합니다.");
                        return;
                      }
                      handleUpdateStatus(
                        confirmedIds,
                        "COMPLETED",
                        `수령 확인 완료 ${confirmedIds.length}건 최종 정산 마감`
                      );
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
                      Array.from(selectedBatchJobIds).some((id) =>
                        currentProcessList.find((item) => item.id === id)?.status === "수령 확인"
                      )
                        ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    수령확인 완료 오더 최종 마감 확정 (이력으로 이동)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Split-View 좌우 2분할 레이아웃 */}
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* 좌측: 미처리 오더 목록 (5 cols) */}
            <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col h-[780px]">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentProcessList.length > 0 && selectedBatchJobIds.size === currentProcessList.length}
                    onChange={handleSelectAllBatch}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-black text-slate-800">
                    전체 선택 ({selectedBatchJobIds.size}/{currentProcessList.length})
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  오더 선택 시 우측에 계약·정산 명세 표시
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
                {currentProcessList.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 text-xs">
                    처리 대기 중인 오더가 없습니다. 모두 정산 마감되었습니다.
                  </div>
                ) : (
                  currentProcessList.map((item) => {
                    const isSelected = selectedJobItem?.id === item.id;
                    const isChecked = selectedBatchJobIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedJobItem(item)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? "bg-emerald-50/70 border-emerald-500 shadow-sm"
                            : "bg-white hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onClick={(e) => handleToggleBatchCheck(item.id, e)}
                              onChange={() => {}}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-[11px] font-mono font-black text-slate-600">
                              {item.workDate || "작업일 미정"}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-black rounded bg-slate-100 text-slate-700">
                              오더 #{item.jobPostId || item.id}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black rounded border ${
                              item.status === "이의제기"
                                ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                                : item.status === "정산 검토"
                                ? "bg-purple-50 text-purple-600 border-purple-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-900 truncate">
                              {item.dropoffName}
                            </h4>
                            <span
                              className={`text-xs font-black font-mono ${
                                item.payerType === "SITE_PAYS"
                                  ? "text-emerald-600"
                                  : item.payerType === "SITE_RECEIVES"
                                  ? "text-rose-600"
                                  : "text-slate-600"
                              }`}
                            >
                              {item.payerType === "SITE_PAYS" ? "+" : item.payerType === "SITE_RECEIVES" ? "-" : ""}
                              ₩ {item.totalAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                            <span>반입 현장:</span>
                            <span className="text-slate-800 font-extrabold">{item.siteName}</span>
                            <span>•</span>
                            <span className="text-blue-600">{item.soilType}</span>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono">
                            {item.unitPrice.toLocaleString()}원 × {item.truckCount}대
                          </span>
                          <span className="font-black text-slate-700">
                            {item.payerType === "SITE_PAYS"
                              ? "사토 수수료 수령"
                              : item.payerType === "SITE_RECEIVES"
                              ? "토사 매입 지출"
                              : "무상 사토"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 우측: 계약 및 정산 워크스페이스 상세 패널 (7 cols) */}
            <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border-2 border-slate-300 shadow-md p-6 h-[780px] overflow-y-auto space-y-6">
              {selectedJobItem ? (
                <>
                  {/* 상단 명세 헤더 */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-100 text-emerald-800">
                          오더 #{selectedJobItem.jobPostId || selectedJobItem.id}
                        </span>
                        <h3 className="text-lg font-black text-slate-900">
                          {selectedJobItem.dropoffName} 흙값 정산서
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        작업일자: <strong className="text-slate-800 font-mono">{selectedJobItem.workDate || "-"}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 block">정산 상태</span>
                      <span className="text-sm font-black text-emerald-600">{selectedJobItem.status}</span>
                    </div>
                  </div>

                  {/* 1. 하차 사토장 및 반입 상차 현장 정보 */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      하차 사토장 및 반입 상차 현장 정보
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">하차지 (사토장)</span>
                        <span className="font-black text-slate-800 text-sm">{selectedJobItem.dropoffName}</span>
                        <span className="block text-slate-500 text-[11px] mt-0.5">{selectedJobItem.dropoffAddress || "사토장 위치 정보"}</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px]">반입 현장 (상차지)</span>
                        <span className="font-black text-slate-800 text-sm">{selectedJobItem.siteName}</span>
                        <span className="block text-slate-500 text-[11px] mt-0.5">{selectedJobItem.siteAddress || "현장 주소지 정보"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 토사 스펙 및 대수 산출 명세 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-600" />
                      토사 스펙 및 반입 대수 산출
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-left">토사 종류</th>
                            <th className="py-2.5 px-3 text-left">거래 구분</th>
                            <th className="py-2.5 px-3 text-right">계약 단가</th>
                            <th className="py-2.5 px-3 text-right">반입 대수</th>
                            <th className="py-2.5 px-3 text-right">정산 합계액</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                          <tr>
                            <td className="py-3 px-3 font-bold text-blue-600">{selectedJobItem.soilType}</td>
                            <td className="py-3 px-3">
                              {selectedJobItem.payerType === "SITE_PAYS"
                                ? "현장지급 (수수료 수취)"
                                : selectedJobItem.payerType === "SITE_RECEIVES"
                                ? "하차지지급 (매입비 지출)"
                                : "무상 사토"}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">{selectedJobItem.unitPrice.toLocaleString()}원</td>
                            <td className="py-3 px-3 text-right font-mono font-bold">{selectedJobItem.truckCount}대</td>
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                              ₩ {selectedJobItem.totalAmount.toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. 공급가액 및 세액 명세서 */}
                  <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 space-y-2">
                    <h4 className="text-xs font-black text-emerald-900">정산 금액 회계 명세 (원단위 절사)</h4>
                    <div className="space-y-1.5 text-xs font-bold pt-1">
                      <div className="flex justify-between text-slate-600">
                        <span>공급가액:</span>
                        <span className="font-mono font-black text-slate-800">
                          ₩ {Math.floor(selectedJobItem.totalAmount / 1.1).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>부가가치세 (VAT 10%):</span>
                        <span className="font-mono font-black text-slate-800">
                          ₩ {(selectedJobItem.totalAmount - Math.floor(selectedJobItem.totalAmount / 1.1)).toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm font-black text-emerald-950">
                        <span>총 정산 합계액:</span>
                        <span className="text-lg text-emerald-700 font-mono">
                          ₩ {selectedJobItem.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. 이의제기/분쟁 내역이 있는 경우 사유 알림 */}
                  {selectedJobItem.status === "이의제기" && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-rose-900">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          정산 보류 상태 (이의제기 접수건)
                        </span>
                        <span className="text-[10px] font-mono text-rose-500">{selectedJobItem.disputedAt}</span>
                      </div>
                      <p className="text-xs font-medium bg-white/80 p-3 rounded-lg border border-rose-200 whitespace-pre-wrap">
                        {selectedJobItem.disputeReason || "상세 사유가 기재되지 않았습니다."}
                      </p>
                      {selectedJobItem.disputeAmount ? (
                        <div className="text-xs font-black text-rose-800">
                          이의 정정 요구액: ₩ {selectedJobItem.disputeAmount.toLocaleString()}원
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* 5. 정산 처리 액션 버튼 */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                    {selectedJobItem.status === "정산 검토" && (
                      <>
                        {selectedJobItem.payerType === "SITE_RECEIVES" ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleUpdateStatus([selectedJobItem.id], "SETTLEMENT_PAID", "송금 완료 확인")}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                          >
                            송금 완료 확인
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleUpdateStatus([selectedJobItem.id], "SETTLEMENT_CONFIRMED", "수령 확인")}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95"
                          >
                            수령 확인 (정산 확정)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setDisputeModalItem(selectedJobItem);
                            setDisputeInputReason(selectedJobItem.disputeReason || "");
                            setDisputeInputAmount(selectedJobItem.disputeAmount ? String(selectedJobItem.disputeAmount) : "");
                          }}
                          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-300 text-xs font-black rounded-xl transition-all"
                        >
                          이의제기 / 정산 보류
                        </button>
                      </>
                    )}

                    {/* 송금 완료 상태: 돈을 받는 측(SITE_PAYS: 하차지가 수수료 받는 경우)이면 수령 확인 버튼, 돈을 보낸 측(SITE_RECEIVES: 하차지가 매입비 송금한 경우)이면 대기 안내 */}
                    {selectedJobItem.status === "송금 완료" && (
                      selectedJobItem.payerType === "SITE_PAYS" ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus([selectedJobItem.id], "SETTLEMENT_CONFIRMED", "입금 수령 확인")}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          입금 수령 확인
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          송금 완료됨 (상대방 입금 확인 대기 중)
                        </div>
                      )
                    )}

                    {/* 수령 확인 완료 상태: 양측 입출금 대사가 끝났으므로 최종 마감 확정 가능 */}
                    {selectedJobItem.status === "수령 확인" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus([selectedJobItem.id], "COMPLETED", "최종 정산 마감 확정")}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        최종 마감 확정 (이력으로 이동)
                      </button>
                    )}

                    {selectedJobItem.status === "이의제기" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus([selectedJobItem.id], "CLOSED", "보류 해제 (재검토)")}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all"
                        >
                          보류 해제 (정산 재검토)
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus([selectedJobItem.id], "COMPLETED", "상호 협의 종결 마감")}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all"
                        >
                          협의 종결 (최종 마감)
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <Info className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold">좌측 목록에서 처리할 정산 오더를 선택해 주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [ 탭 2: 정산 마감 이력 조회 (순수 이력/장부 열람 탭 - 조작 기능 없음) ] */}
      {/* ========================================================================= */}
      {activeMainTab === "HISTORY" && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800">
                총 {historyData.length}건의 정산 마감 이력
              </span>
              <span className="text-[11px] text-slate-500">
                (모든 정산 및 입출금이 종결된 데이터입니다. 행 클릭 시 상세 열람 가능)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">No.</th>
                  <th className="py-3 px-3 w-24">작업 일자</th>
                  <th className="py-3 px-3 min-w-[140px]">하차 사토장명</th>
                  <th className="py-3 px-3 min-w-[140px]">반입 현장명</th>
                  <th className="py-3 px-3 w-20">토사 종류</th>
                  <th className="py-3 px-3 min-w-[120px] text-center">거래 구분</th>
                  <th className="py-3 px-3 w-28 text-right whitespace-nowrap">단가 / 수량</th>
                  <th className="py-3 px-3 text-right w-28 whitespace-nowrap">총 흙값 정산액</th>
                  <th className="py-3 px-3 text-center w-24 whitespace-nowrap">최종 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {historyData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      정산 마감 완료된 이력 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  historyData.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => setHistoryDetailModalItem(row)}
                      className="hover:bg-slate-50/80 transition-all cursor-pointer"
                    >
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-400 text-center whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-800 font-bold whitespace-nowrap">
                        {row.workDate || "-"}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">{row.dropoffName}</td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">{row.siteName}</td>
                      <td className="py-3.5 px-3 font-bold text-blue-600 whitespace-nowrap">{row.soilType}</td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {row.payerType === "SITE_PAYS" && (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                            사토수수료 (수입)
                          </span>
                        )}
                        {row.payerType === "SITE_RECEIVES" && (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                            토사매입비 (지출)
                          </span>
                        )}
                        {row.payerType === "FREE" && (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-slate-100 text-slate-600 border border-slate-300 inline-block">
                            무상
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700 text-right whitespace-nowrap">
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
                        <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          마감완료
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [ 이력 전용 상세 모달 (HISTORY 탭에서 클릭 시) ] */}
      {/* ========================================================================= */}
      {historyDetailModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-black rounded bg-emerald-100 text-emerald-800">
                  마감 이력 #{historyDetailModalItem.jobPostId || historyDetailModalItem.id}
                </span>
                <h3 className="text-sm font-black text-slate-900">정산 마감 대장 원본</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDetailModalItem(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">하차 사토장</span>
                  <span className="font-black text-slate-900 text-sm">{historyDetailModalItem.dropoffName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">반입 현장</span>
                  <span className="font-black text-slate-900 text-sm">{historyDetailModalItem.siteName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">작업 일자:</span>
                  <span className="font-mono font-bold text-slate-800">{historyDetailModalItem.workDate || "-"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">토사 종류 / 거래 구분:</span>
                  <span className="font-bold text-blue-600">
                    {historyDetailModalItem.soilType} ({historyDetailModalItem.payerType === "SITE_PAYS" ? "사토수수료 수입" : "토사매입비 지출"})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">계약 단가 및 반입 수량:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {historyDetailModalItem.unitPrice.toLocaleString()}원 × {historyDetailModalItem.truckCount}대
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">공급가액:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ₩ {Math.floor(historyDetailModalItem.totalAmount / 1.1).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">부가가치세 (10%):</span>
                  <span className="font-mono font-bold text-slate-800">
                    ₩ {(historyDetailModalItem.totalAmount - Math.floor(historyDetailModalItem.totalAmount / 1.1)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-sm font-black text-slate-900">
                  <span>최종 마감 확정액:</span>
                  <span className="text-emerald-600 font-mono text-base">
                    ₩ {historyDetailModalItem.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryDetailModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [ 이의제기 및 보류 관리 모달 ] */}
      {/* ========================================================================= */}
      {disputeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn">
            <div className="p-5 bg-rose-50 border-b border-rose-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black text-rose-900">
                  {disputeModalItem.status === "이의제기" ? "정산 보류 내역 및 협의 종결" : "흙값 정산 이의제기 및 보류 등록"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalItem(null)}
                className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>대상 사토장 / 현장:</span>
                  <span className="font-bold text-slate-800">
                    {disputeModalItem.dropoffName} ↔ {disputeModalItem.siteName}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>작업일자 및 거래총액:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {disputeModalItem.workDate || "-"} | ₩ {disputeModalItem.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {disputeModalItem.status === "이의제기" ? (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-[11px]">
                        이의제기 주체:{" "}
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
                    현장 관리자와 유선 협의 및 실제 수량/토질 사양 확인 후 협의가 완료되면 [보류 해제]를 진행하거나 최종 마감 처리할 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                    실제 반입 대수 불일치, 토질 불량 판정 회차, 계약 단가 상이 등으로 정산 진행이 불가할 때 이의를 등록하고 <strong>정산을 보류</strong>합니다.
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
                    onClick={() => handleUpdateStatus([disputeModalItem.id], "CLOSED", "보류 해제 (재검토)")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md"
                  >
                    보류 해제 (재검토)
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleUpdateStatus([disputeModalItem.id], "COMPLETED", "상호 협의 종결 마감")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md"
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
                      [disputeModalItem.id],
                      "SETTLEMENT_DISPUTED",
                      "이의제기 등록 및 정산 보류",
                      {
                        dispute_type: "DROPOFF",
                        dispute_reason: disputeInputReason.trim(),
                        dispute_amount: disputeInputAmount ? Number(disputeInputAmount) : undefined,
                      }
                    );
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md"
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
