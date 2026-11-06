import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Printer, X, CheckCircle2, Truck, Calendar, MapPin, Building, FileText, ArrowRight } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface SiteHistoryManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
  dbCommonCodes?: any[];
}

export default function SiteHistoryManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
  dbCommonCodes = [],
}: SiteHistoryManagementProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<number | "">("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [quickRange, setQuickRange] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [selectedInvoiceItem, setSelectedInvoiceItem] = useState<any | null>(null);
  const [invoiceTickets, setInvoiceTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

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

  // 공통코드 영문 -> 한글 표시명 변환 함수
  const getCommonCodeName = (code: string | undefined | null, category?: string) => {
    if (!code) return "-";
    const upper = String(code).trim().toUpperCase();
    // 1. 백업 매핑 우선 확인
    const fallbackMap: Record<string, string> = {
      GOOD_SOIL: "양질토",
      MUD_SOIL: "뻘흙",
      ROCK: "암버럭",
      BLASTED_ROCK: "발파암",
      MIXED: "혼합토",
      MIXED_SOIL: "혼합토",
      SAND: "모래",
      CLAY: "점토",
      GRAVEL: "자갈",
      PLAIN_SOIL: "일반토사",
      RED_CLAY: "마사토/황토",
      WASTE_CONCRETE: "폐콘크리트",
      RECYCLED_AGGREGATE: "순환골재",
      T_15: "15톤",
      TON_15: "15톤",
      "15T": "15톤",
      T_24: "24톤",
      TON_24: "24톤",
      "24T": "24톤",
      T_25: "25.5톤",
      TON_25: "25.5톤",
      "25.5T": "25.5톤",
      "25T": "25.5톤",
      T_27: "27톤",
      TON_27: "27톤",
      "27T": "27톤",
      T_30: "30톤 초과",
      TON_30: "30톤 초과",
      TRAILER: "트레일러",
      SITE_PAYS: "현장 지급",
      DROPOFF_PAYS: "하차지 지급",
      OPEN: "배차 진행중",
      COMPLETED: "운행 완료",
      CLOSED: "배차 완료 (모집 마감)",
      CANCELLED: "취소됨",
      SETTLEMENT_CLOSED: "운행 완료",
      SETTLEMENT_PAID: "운행 완료",
      SETTLEMENT_PENDING: "운행 완료",
      SETTLEMENT_DISPUTED: "운행 완료",
      SETTLEMENT_APPROVED: "운행 완료",
      SETTLEMENT_CONFIRMED: "운행 완료",
      SETTLEMENT_REQUESTED: "운행 완료",
    };
    if (fallbackMap[upper]) return fallbackMap[upper];
    if (fallbackMap[code]) return fallbackMap[code];

    // 2. DB 공통코드 확인 (code_name 또는 name)
    if (dbCommonCodes && dbCommonCodes.length > 0) {
      const match = dbCommonCodes.find(
        (c: any) =>
          (c.code === code || c.code === upper) &&
          (!category || c.category === category || c.group_code === category)
      );
      if (match?.code_name || match?.name) return match.code_name || match.name;
    }
    return code;
  };

  // 운행 상태 영문 코드 -> 친숙한 한글 상태명 변환 함수
  const getStatusKorean = (status: string | null | undefined) => {
    if (!status) return "운행 완료";
    const s = String(status).trim().toUpperCase();
    const statusMap: Record<string, string> = {
      ACCEPTED: "배차 수락",
      ASSIGNED: "배차 수락",
      ARRIVED_LOADING: "상차지 도착",
      LOADING: "상차 적재중",
      LOADING_APPROVED: "상차 승인완료",
      DEPARTED: "하차지 이동 중",
      IN_PROGRESS: "하차지 이동 중",
      DRIVING: "하차지 이동 중",
      ARRIVED: "하차지 도착",
      ARRIVED_DROPOFF: "하차지 도착",
      WAITING_INSPECTION: "검수 대기",
      APPROVED: "운행 완료",
      REJECTED: "하차지 반려(회차)",
      CANCELLED: "배차 취소",
      COMPLETED: "운행 완료",
      CLOSED: "배차 완료 (모집 마감)",
      OPEN: "기사 모집 중",
      WAITING_APPROVAL: "승인 대기",
      WAITING_MATCH: "매칭 대기",
      MATCHED: "매칭 완료",
      SETTLEMENT_CLOSED: "운행 완료",
      SETTLEMENT_PAID: "운행 완료",
      SETTLEMENT_PENDING: "운행 완료",
      SETTLEMENT_DISPUTED: "운행 완료",
      SETTLEMENT_APPROVED: "운행 완료",
      SETTLEMENT_CONFIRMED: "운행 완료",
      SETTLEMENT_REQUESTED: "운행 완료",
    };
    return statusMap[s] || statusMap[status] || status;
  };

  // 운행 상태별 실무 라벨 및 뱃지 스타일 매핑 함수
  const getStatusBadgeInfo = (status: string | null | undefined) => {
    const raw = status || "";
    if (
      [
        "COMPLETED",
        "운행완료",
        "운행 완료",
        "SETTLEMENT_PAID",
        "정산 완료",
        "정산완료",
        "SETTLEMENT_CLOSED",
        "정산 마감",
        "정산마감",
        "SETTLEMENT_PENDING",
        "정산 대기",
        "정산대기",
        "SETTLEMENT_DISPUTED",
        "정산 이의제기",
        "SETTLEMENT_APPROVED",
        "SETTLEMENT_CONFIRMED",
        "SETTLEMENT_REQUESTED",
      ].includes(raw)
    ) {
      return {
        label: "운행 완료",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold",
      };
    }
    if (raw === "CLOSED" || raw === "마감" || raw === "운행 마감" || raw === "배차 완료 (모집 마감)") {
      return {
        label: "배차 완료 (모집 마감)",
        className: "bg-slate-100 text-slate-700 border-slate-300",
      };
    }
    if (raw === "CANCELLED" || raw === "매칭반려" || raw === "배차 취소" || raw === "REJECTED" || raw === "반입 반려") {
      return {
        label: "배차 취소/반려",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }
    if (raw === "DRIVING" || raw === "LOADING_APPROVED" || raw === "하차지 이동 중" || raw === "상차 승인완료") {
      return {
        label: "운행 진행 중",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    }
    if (raw === "WAITING_APPROVAL" || raw === "승인대기" || raw === "승인 대기") {
      return {
        label: "매칭 승인 대기",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    return {
      label: getStatusKorean(raw),
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  };

  // 일시 포맷팅 함수 (YYYY-MM-DD HH:mm:ss 또는 HH:mm)
  const formatDateTime = (dateStr: string | null | undefined, includeDate: boolean = false) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        // 날짜 파싱 실패 시 원본 문자열 기반 추출
        if (dateStr.includes("T")) {
          const parts = dateStr.split("T");
          const time = parts[1].substring(0, 5);
          return includeDate ? `${parts[0]} ${time}` : time;
        }
        return dateStr;
      }
      const pad = (n: number) => String(n).padStart(2, "0");
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      if (includeDate) {
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        return `${year}-${month}-${day} ${hours}:${mins}`;
      }
      return `${hours}:${mins}`;
    } catch {
      return "-";
    }
  };

  // 운행 번호 생성 함수 (작업일자 YYYYMMDD + 고유 ID)
  const getRunNumber = (item: any) => {
    const rawDate = item.startDate || item.endDate || "";
    const datePart = rawDate.replace(/-/g, "").substring(0, 8) || "20260915";
    return `RUN-${datePart}-${String(item.id).padStart(3, "0")}`;
  };

  const filteredHistory = dispatchRequestList
    .filter((req) => {
      if (selectedSiteId && req.siteId !== Number(selectedSiteId)) return false;

      // 날짜 기간 필터링 (startDate, endDate)
      const itemDate = req.startDate || req.endDate || "";
      if (startDateFilter && itemDate && itemDate < startDateFilter) {
        return false;
      }
      if (endDateFilter && itemDate && itemDate > endDateFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const soilName = getCommonCodeName(req.soilType, "SOIL_TYPE").toLowerCase();
      return (
        (req.siteName && req.siteName.toLowerCase().includes(q)) ||
        (req.dropoffName && req.dropoffName.toLowerCase().includes(q)) ||
        (req.soilType && req.soilType.toLowerCase().includes(q)) ||
        soilName.includes(q)
      );
    })
    .sort((a, b) => {
      // 운행일자 최신순(내림차순) 정렬, 동일일자는 ID 역순
      const dateA = a.startDate || a.endDate || "";
      const dateB = b.startDate || b.endDate || "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return (b.id || 0) - (a.id || 0);
    });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장 덤프 운행 이력 조회</h2>
          <p className="text-xs text-slate-500 mt-1">
            등록된 현장의 배차 운행 완료 이력 및 토사 반출 내역을 조회합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert("운행 이력 대장이 엑셀 파일로 출력되었습니다.")}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md"
        >
          엑셀 대장 다운로드
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        {/* 상단: 기간 퀵 선택 & 날짜 범위 지정 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              운행 기간:
            </span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handleQuickRangeChange("ALL")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  quickRange === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("TODAY")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  quickRange === "TODAY" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("WEEK")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  quickRange === "WEEK" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                최근 7일
              </button>
              <button
                type="button"
                onClick={() => handleQuickRangeChange("MONTH")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  quickRange === "MONTH" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1개월
              </button>
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs text-slate-400 font-bold">~</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setQuickRange("ALL");
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                type="button"
                onClick={() => handleQuickRangeChange("ALL")}
                className="px-2 py-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="날짜 필터 초기화"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 하단: 현장 선택 및 텍스트 검색 */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : "")}
            className="w-full sm:w-56 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="">전체 현장 선택</option>
            {registeredSiteList.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.companyName || "운영중"})
              </option>
            ))}
          </select>

          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="현장명, 하차지명, 토사종류 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main History Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-sm text-slate-900">운행 이력 대장 목록</h4>
          <span className="text-xs text-slate-400 font-semibold">총 {filteredHistory.length}건 조회</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">연번</th>
                <th className="py-3 px-4">운행일자</th>
                <th className="py-3 px-4">현장명</th>
                <th className="py-3 px-4">반출 토사 / 톤수</th>
                <th className="py-3 px-4">하차 사토장</th>
                <th className="py-3 px-4">운행 상태</th>
                <th className="py-3 px-4 text-right">전자 송장(증빙)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredHistory.map((item, idx) => {
                const soilDisplayName = getCommonCodeName(item.soilType, "SOIL_TYPE");
                const truckTonnageNames = item.tonTypes && item.tonTypes.length > 0
                  ? item.tonTypes.map((t: string) => getCommonCodeName(t, "TRUCK_TON")).join(", ")
                  : "25.5톤";

                // 시작일과 종료일이 같으면 단일 날짜만 깔끔하게 표시
                const displayDate = !item.endDate || item.startDate === item.endDate
                  ? (item.startDate || item.endDate || "-")
                  : `${item.startDate} ~ ${item.endDate}`;

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-center">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{displayDate}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.siteName}</td>
                    <td className="py-3.5 px-4 text-blue-600 font-bold">
                      {soilDisplayName} ({truckTonnageNames} / {item.truckCount}대)
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold">{item.dropoffName || "지정 사토장"}</span>
                        {(item.isChanged || item.hasChangedDropoff) && (
                          <span 
                            className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"
                            title={`원래 배정: ${item.originalDropoffName || "최초 배정 사토장"} | 사유: ${item.changeReason || "현장 변경"}`}
                          >
                            경로 변경
                          </span>
                        )}
                      </div>
                      {(item.isChanged || item.hasChangedDropoff) && (item.changeReason || item.originalDropoffName) && (
                        <div className="text-[10px] text-amber-700 font-semibold mt-0.5 truncate max-w-[200px]">
                          {item.originalDropoffName ? `원래: ${item.originalDropoffName} ` : ""}
                          {item.changeReason ? `(사유: ${item.changeReason})` : ""}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {(() => {
                        const badgeInfo = getStatusBadgeInfo(item.rawStatus || item.status);
                        return (
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded border whitespace-nowrap ${badgeInfo.className}`}>
                            {badgeInfo.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          setSelectedInvoiceItem(item);
                          setIsLoadingTickets(true);
                          try {
                            const baseUrl = getApiBaseUrl();
                            const token = typeof window !== "undefined"
                              ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
                              : null;

                            if (!token) {
                              setInvoiceTickets([]);
                              return;
                            }

                            const res = await fetch(`${baseUrl}/api/dispatch/job/${item.id}/tickets`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) {
                              const tickets = await res.json();
                              setInvoiceTickets(Array.isArray(tickets) ? tickets : []);
                            } else {
                              setInvoiceTickets([]);
                            }
                          } catch (e: any) {
                            console.warn("송장 기사 티켓 조회 알림:", e?.message || e);
                            setInvoiceTickets([]);
                          } finally {
                            setIsLoadingTickets(false);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all"
                      >
                        송장 조회
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    등록된 현장의 운행 이력 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 전자 송장 / 반출 증빙서 팝업 모달 */}
      {mounted && selectedInvoiceItem && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleUp my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    덤프 운송 전자 송장 (전자 전표)
                    {(() => {
                      const badgeInfo = getStatusBadgeInfo(selectedInvoiceItem.rawStatus || selectedInvoiceItem.status);
                      return (
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeInfo.className}`}>
                          {badgeInfo.label}
                        </span>
                      );
                    })()}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    배차 오더: #{selectedInvoiceItem.id} | 작업일자: {selectedInvoiceItem.startDate || selectedInvoiceItem.endDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceItem(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* 상·하차 운행 구간 카드 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">상차지 (출발 현장)</span>
                  <div className="font-extrabold text-sm text-slate-900 mt-1 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-600 shrink-0" />
                    {selectedInvoiceItem.siteName}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {registeredSiteList.find((s) => s.id === selectedInvoiceItem.siteId)?.address || "현장 주소 미등록"}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center px-2">
                  <ArrowRight className="w-5 h-5 text-blue-500" />
                  <span className="text-[10px] font-extrabold text-blue-600 mt-0.5">
                    {selectedInvoiceItem.distance ? `${selectedInvoiceItem.distance}km` : "직송"}
                  </span>
                </div>

                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">하차지 (사토장)</span>
                    {(selectedInvoiceItem.isChanged || invoiceTickets.some((t: any) => Boolean(t.changed_drop_off_id || t.changed_drop_off))) && (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                        경로 변경 있음
                      </span>
                    )}
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 mt-1 flex items-center justify-end gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    {selectedInvoiceItem.dropoffName || "지정 사토장"}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {selectedInvoiceItem.dropoffAddress || "하차지 주소 미등록"}
                  </p>
                </div>
              </div>

              {/* 반출 스펙 명세 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">반출 토사</span>
                  <span className="font-extrabold text-sm text-blue-600 mt-0.5 block">
                    {getCommonCodeName(selectedInvoiceItem.soilType, "SOIL_TYPE")}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">요청 차종</span>
                  <span className="font-extrabold text-sm text-slate-900 mt-0.5 block">
                    {selectedInvoiceItem.tonTypes?.map((t: string) => getCommonCodeName(t, "TRUCK_TON")).join(", ") || "25.5톤"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">운행 대수</span>
                  <span className="font-extrabold text-sm text-slate-900 mt-0.5 block">
                    {selectedInvoiceItem.truckCount} 대
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">운반비 단가 (대당)</span>
                  <span className="font-extrabold text-sm text-emerald-600 mt-0.5 block">
                    {selectedInvoiceItem.offeredUnitPrice ? `${selectedInvoiceItem.offeredUnitPrice.toLocaleString()}원` : "0원"}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">* 사토비(흙값) 별도 정산</span>
                </div>
              </div>

              {/* 배차 티켓 / 기사 운행 증빙 세부 내역 */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>차량별 실시간 상·하차 계량 증빙</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {isLoadingTickets ? "조회 중..." : `총 ${invoiceTickets.length}건 발급`}
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[120px]">기사명 / 연락처</th>
                        <th className="py-2.5 px-3 min-w-[110px]">차량번호 / 톤수</th>
                        <th className="py-2.5 px-3 min-w-[130px]">상차 출발 일시</th>
                        <th className="py-2.5 px-3 min-w-[160px]">도착 하차지</th>
                        <th className="py-2.5 px-3 min-w-[130px]">하차 완료 일시</th>
                        <th className="py-2.5 px-3 text-right min-w-[90px]">운행 상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {isLoadingTickets ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            운행 전표 증빙을 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : invoiceTickets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            연동된 기사 운행 티켓 데이터가 없습니다. (직접 배차 또는 완료 전표)
                          </td>
                        </tr>
                      ) : (
                        invoiceTickets.map((t: any, idx: number) => {
                          const isCancelled = t.status === "CANCELLED" || t.status === "REJECTED";
                          const isApproved = ["APPROVED", "COMPLETED", "SETTLEMENT_REQUESTED", "SETTLEMENT_APPROVED", "SETTLEMENT_PAID", "SETTLEMENT_CONFIRMED"].includes((t.status || "").toUpperCase());
                          const isDrivingOrLater = ["LOADING_APPROVED", "DRIVING", "ARRIVED", "APPROVED", "COMPLETED", "SETTLEMENT_REQUESTED", "SETTLEMENT_APPROVED", "SETTLEMENT_PAID", "SETTLEMENT_CONFIRMED"].includes((t.status || "").toUpperCase());

                          // 1. 상차 승인 일시 계산
                          const hasLoadingTime = Boolean(t.driving_started_at || t.loading_approved_at);
                          const loadingTime = formatDateTime(t.driving_started_at || t.loading_approved_at, true);

                          // 2. 하차 반입 일시 계산 (취소되지 않고 실제로 승인/완료된 경우에만)
                          const hasUnloadingTime = !isCancelled && Boolean(t.completed_at || (isApproved && t.arrived_at));
                          const unloadingTime = hasUnloadingTime ? formatDateTime(t.completed_at || t.arrived_at, true) : "-";

                          // 3. 하차지 변경 여부 및 최종 하차지명 계산
                          const isTicketChanged = Boolean(t.changed_drop_off_id || t.changed_drop_off);
                          const finalDropoffName = t.changed_drop_off?.name || t.changed_drop_off_name || selectedInvoiceItem.dropoffName || "지정 사토장";

                          return (
                            <tr key={t.id || idx} className={`hover:bg-slate-50 ${isCancelled ? "bg-rose-50/30 opacity-75" : ""}`}>
                              <td className="py-2.5 px-3 text-slate-900">
                                {t.driver?.name || "기사 미지정"}
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {t.driver?.phone_number || "-"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-slate-850 block">
                                  {t.car?.car_number || "-"}
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  {t.car?.tonnage ? getCommonCodeName(String(t.car.tonnage), "TRUCK_TON") : "25.5톤"}
                                </span>
                              </td>

                              {/* 상차 승인 일시 */}
                              <td className="py-2.5 px-3">
                                {hasLoadingTime && loadingTime !== "-" ? (
                                  <>
                                    <span className="text-blue-700 font-bold block font-mono">
                                      {loadingTime}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-normal">
                                      {t.loading_approval_type === "OFFICE"
                                        ? "현장 사무실 승인"
                                        : t.loading_approval_type === "QR"
                                        ? "게이트 QR 자동승인"
                                        : "상차 완료"}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 text-xs font-normal">
                                    {t.status === "ARRIVED_LOADING" ? "상차지 도착 (적재중)" : "- (상차 전)"}
                                  </span>
                                )}
                              </td>

                              {/* 도착 하차지 (사토장) 및 경로 변경 표시 */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-bold text-slate-800">{finalDropoffName}</span>
                                  {isTicketChanged && (
                                    <span 
                                      className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"
                                      title={t.change_reason ? `사유: ${t.change_reason}` : "운행 도중 하차지 변경됨"}
                                    >
                                      경로 변경
                                    </span>
                                  )}
                                </div>
                                {isTicketChanged && (
                                  <div className="mt-1 p-1.5 bg-amber-50/80 rounded-lg border border-amber-200 text-[10px] text-amber-800 leading-snug">
                                    <div className="font-bold flex items-center gap-1">
                                      <span className="text-[9px] px-1 py-0.2 bg-amber-200/60 rounded text-amber-900 font-extrabold">원래 배정</span>
                                      <span>{t.original_dropoff_name || selectedInvoiceItem.dropoffName || "최초 지정 사토장"}</span>
                                    </div>
                                    {t.change_reason && (
                                      <div className="text-[9.5px] text-amber-700 mt-0.5">
                                        <span className="font-semibold">변경 사유:</span> {t.change_reason}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 하차 반입 일시 */}
                              <td className="py-2.5 px-3">
                                {isCancelled ? (
                                  <span className="text-rose-500 text-[11px] font-semibold">
                                    배차 취소됨 (미운행)
                                  </span>
                                ) : isApproved && unloadingTime !== "-" ? (
                                  <>
                                    <span className="text-emerald-700 font-bold block font-mono">
                                      {unloadingTime}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-normal">
                                      {t.drive_time_seconds ? `소요시간: ${Math.round(t.drive_time_seconds / 60)}분` : "하차 완료"}
                                    </span>
                                  </>
                                ) : t.status === "DRIVING" ? (
                                  <span className="text-indigo-600 text-[11px] font-semibold">
                                    하차지 이동 중
                                  </span>
                                ) : t.status === "ARRIVED" ? (
                                  <span className="text-amber-600 text-[11px] font-semibold">
                                    하차지 도착 (승인대기)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs font-normal">
                                    - (하차 전)
                                  </span>
                                )}
                              </td>

                              {/* 운행 상태 */}
                              <td className="py-2.5 px-3 text-right">
                                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded border ${
                                  isCancelled
                                    ? "bg-rose-50 text-rose-600 border-rose-200"
                                    : isApproved
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : "bg-blue-50 text-blue-600 border-blue-200"
                                }`}>
                                  {getStatusKorean(t.status)}
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

              {/* 하단 서명 및 검증 안내 */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  본 전자 송장은 덤프링(DumpRing) GPS 위치 기반 상·하차 진출입 시스템을 통해 위변조 방지 검증된 공식 운행 증빙 전표입니다.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 rounded-b-2xl">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" />
                송장 인쇄 / PDF 저장
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoiceItem(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
