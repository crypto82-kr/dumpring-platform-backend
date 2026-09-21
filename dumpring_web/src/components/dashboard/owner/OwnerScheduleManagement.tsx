"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Truck, 
  Users, 
  CheckCircle2, 
  Clock, 
  X, 
  RefreshCw, 
  MapPin, 
  Navigation, 
  FileText,
  Search,
  Filter
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface DriverScheduleItem {
  ticket_id: number;
  driver_id: number;
  driver_name: string;
  car_number: string;
  tonnage: number;
  site_name: string;
  dropoff_name: string;
  status: string;
  status_name?: string;
  material_type: string;
  material_type_name?: string;
  fare: number;
  created_time: string;
}

interface DayScheduleData {
  date: string;
  day: number;
  total_count: number;
  completed_count: number;
  in_progress_count: number;
  cancelled_count?: number;
  drivers: DriverScheduleItem[];
}

interface MonthlyScheduleResponse {
  year_month: string;
  year: number;
  month: number;
  summary: {
    month_total_trips: number;
    month_completed_trips: number;
    active_drivers_count: number;
    registered_trucks_count: number;
  };
  days: DayScheduleData[];
}

interface OwnerScheduleManagementProps {
  setActivePath: (path: string) => void;
}

export function OwnerScheduleManagement({ setActivePath }: OwnerScheduleManagementProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [scheduleData, setScheduleData] = useState<MonthlyScheduleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDayData, setSelectedDayData] = useState<DayScheduleData | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>("");

  const formattedYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const [fetchError, setFetchError] = useState<string | null>(null);

  // 월별 스케줄 데이터 페칭
  const fetchMonthlySchedule = async (ym: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;

      if (!token) {
        setLoading(false);
        return;
      }

      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/fleet/schedule/monthly?year_month=${ym}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data: MonthlyScheduleResponse = await res.json();
        setScheduleData(data);
      } else {
        console.warn("fetchMonthlySchedule res not ok", res.status);
        if (res.status === 401) {
          setFetchError("인증이 만료되었습니다. 다시 로그인해 주세요.");
        } else {
          setFetchError(`데이터를 불러오지 못했습니다 (코드: ${res.status})`);
        }
      }
    } catch (err: any) {
      console.warn("fetchMonthlySchedule network/fetch error:", err?.message || err);
      setFetchError("백엔드 서버에 연결할 수 없습니다. 서버 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySchedule(formattedYearMonth);
  }, [formattedYearMonth]);

  // 이전 달 이동
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  // 다음 달 이동
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // 오늘이 속한 달로 이동
  const handleGoToday = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  // 캘린더 그리드 생성 (요일 및 첫날 오프셋)
  type CalendarItem = 
    | { type: "blank"; id: string }
    | { type: "day"; dayNum: number; data: DayScheduleData };

  const calendarDays = useMemo<CalendarItem[]>(() => {
    const firstDayIndex = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0(일) ~ 6(토)
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    const blanks: CalendarItem[] = Array.from({ length: firstDayIndex }, (_, i) => ({ type: "blank" as const, id: `blank-${i}` }));

    const dayMap = new Map<number, DayScheduleData>();
    if (scheduleData?.days) {
      scheduleData.days.forEach(d => dayMap.set(d.day, d));
    }

    const monthDays: CalendarItem[] = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const data = dayMap.get(dayNum) || {
        date: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
        day: dayNum,
        total_count: 0,
        completed_count: 0,
        in_progress_count: 0,
        drivers: []
      };
      return { type: "day" as const, dayNum, data };
    });

    return [...blanks, ...monthDays];
  }, [selectedYear, selectedMonth, scheduleData]);

  // 토사 종류 공통코드 한글 변환
  const getSoilLabel = (code: string | undefined, name: string | undefined): string => {
    if (name) return name;
    if (!code) return "일반 토사";
    const map: Record<string, string> = {
      GOOD_SOIL: "양질토",
      MUD_SOIL: "뻘흙",
      ROCK: "암버럭",
      MIXED: "혼합토",
      SAND: "모래",
      CLAY: "점토",
      GRAVEL: "자갈"
    };
    return map[code] || code;
  };

  // 운행 상태 한글 변환
  const getStatusLabel = (code: string | undefined, name: string | undefined): string => {
    if (name) return name;
    if (!code) return "대기";
    const map: Record<string, string> = {
      ACCEPTED: "배차 수락",
      ARRIVED_LOADING: "상차지 도착",
      LOADING_APPROVED: "상차 승인완료",
      DRIVING: "하차지 이동 중",
      ARRIVED: "하차지 도착",
      WAITING_ABSENT_APPROVAL: "지주부재 승인대기",
      APPROVED: "반입 승인완료",
      COMPLETED: "운행 완료",
      REJECTED: "반입 반려",
      CANCELLED: "배차 취소",
      SETTLEMENT_REQUESTED: "정산 요청",
      SETTLEMENT_APPROVED: "정산 승인",
      SETTLEMENT_PAID: "지급 완료",
      SETTLEMENT_CONFIRMED: "정산 확정"
    };
    return map[code] || code;
  };

  // 모달 팝업 내부 기사 검색 필터링
  const filteredModalDrivers = useMemo(() => {
    if (!selectedDayData) return [];
    if (!modalSearchQuery.trim()) return selectedDayData.drivers;
    const q = modalSearchQuery.toLowerCase();
    return selectedDayData.drivers.filter(d => 
      d.driver_name.toLowerCase().includes(q) ||
      d.car_number.toLowerCase().includes(q) ||
      d.site_name.toLowerCase().includes(q) ||
      d.dropoff_name.toLowerCase().includes(q) ||
      getSoilLabel(d.material_type, d.material_type_name).toLowerCase().includes(q) ||
      getStatusLabel(d.status, d.status_name).toLowerCase().includes(q)
    );
  }, [selectedDayData, modalSearchQuery]);

  const todayStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
      {/* 1. 상단 타이틀 & 뒤로가기 */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-slate-900">운송사 소속 차량 배차 스케줄러</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              월간 캘린더 관제
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            소속 덤프 기사들의 날짜별 배차 투입 실적과 일정을 달력에서 한눈에 확인하고, 날짜를 클릭하여 상세 운행 대장을 조회합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button 
            type="button"
            onClick={() => fetchMonthlySchedule(formattedYearMonth)}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
          <button 
            type="button"
            onClick={() => setActivePath("/owner")} 
            className="px-3.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl active:scale-95 transition-all"
          >
            ← 대시보드로 돌아가기
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center justify-between">
          <span>⚠️ {fetchError}</span>
          <button 
            type="button" 
            onClick={() => fetchMonthlySchedule(formattedYearMonth)}
            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 rounded-lg text-rose-800 font-bold active:scale-95 transition-all text-[11px]"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 2. 월간 통계 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">이달의 총 배차 건수</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {(scheduleData?.summary.month_total_trips || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">건</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center font-bold">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 block uppercase">운행 완료 건수</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">
              {(scheduleData?.summary.month_completed_trips || 0).toLocaleString()} <span className="text-xs font-semibold text-emerald-600">건</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 block uppercase">소속 운행 기사</span>
            <span className="text-xl font-black text-indigo-800 mt-0.5 block">
              {(scheduleData?.summary.active_drivers_count || 0).toLocaleString()} <span className="text-xs font-semibold text-indigo-600">명</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 block uppercase">등록 보유 차량</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block">
              {(scheduleData?.summary.registered_trucks_count || 0).toLocaleString()} <span className="text-xs font-semibold text-amber-600">대</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            🚛
          </div>
        </div>
      </div>

      {/* 3. 년월 선택기 컨트롤러 (Year-Month Selector) */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 gap-3">
        {/* 년/월 전환 버튼 그룹 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all active:scale-95 shadow-sm"
            title="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* 년도 선택 드롭다운 */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                {yr}년
              </option>
            ))}
          </select>

          {/* 월 선택 드롭다운 */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-blue-700 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all active:scale-95 shadow-sm"
            title="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 오늘 버튼 및 범례(Legend) */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              운행 완료
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse"></span>
              운행 진행 중
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
              배차 대기
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-extrabold active:scale-95 transition-all shadow-sm"
          >
            오늘({currentMonth}월 {today.getDate()}일)
          </button>
        </div>
      </div>

      {/* 4. 월간 달력 그리드 (Monthly Calendar Grid) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center py-2.5 text-xs font-black text-slate-600">
          <div className="text-rose-600">일 (SUN)</div>
          <div>월 (MON)</div>
          <div>화 (TUE)</div>
          <div>수 (WED)</div>
          <div>목 (THU)</div>
          <div>금 (FRI)</div>
          <div className="text-blue-600">토 (SAT)</div>
        </div>

        {/* 날짜 셀 그리드 */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {calendarDays.map((item, idx) => {
            if (item.type === "blank") {
              return (
                <div key={item.id} className="min-h-[105px] bg-slate-50/50 p-2 border-slate-100"></div>
              );
            }

            const dayData = item.data!;
            const isToday = dayData.date === todayStr;
            const hasDispatches = dayData.total_count > 0;
            const dayOfWeek = idx % 7; // 0=일, 6=토

            return (
              <div
                key={dayData.date}
                onClick={() => setSelectedDayData(dayData)}
                className={`min-h-[105px] p-2 transition-all flex flex-col justify-between cursor-pointer group hover:bg-blue-50/40 relative ${
                  isToday ? "bg-blue-50/20 font-black ring-1 ring-inset ring-blue-400" : "bg-white"
                }`}
              >
                {/* 상단 날짜 및 뱃지 */}
                <div className="flex justify-between items-start">
                  <span
                    className={`text-xs font-bold rounded-lg px-1.5 py-0.5 ${
                      isToday
                        ? "bg-blue-600 text-white shadow-sm"
                        : dayOfWeek === 0
                        ? "text-rose-600 group-hover:text-rose-700"
                        : dayOfWeek === 6
                        ? "text-blue-600 group-hover:text-blue-700"
                        : "text-slate-700"
                    }`}
                  >
                    {item.dayNum}
                  </span>

                  {hasDispatches && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-900 text-white shadow-xs">
                      {dayData.total_count}대
                    </span>
                  )}
                </div>

                {/* 중앙 기사 요약: 1명이면 "홍길동", 2명 이상이면 "홍길동 외 N명" */}
                <div className="my-1.5 flex-1 flex flex-col justify-center">
                  {hasDispatches ? (
                    (() => {
                      // 고유 기사 목록 추출
                      const uniqueDriverNames = Array.from(
                        new Set(dayData.drivers.map((d) => d.driver_name.trim()))
                      );
                      const primaryName = uniqueDriverNames[0] || dayData.drivers[0]?.driver_name || "기사";
                      const othersCount = uniqueDriverNames.length - 1;

                      return (
                        <div className="px-2 py-1.5 bg-slate-50 group-hover:bg-blue-50/60 rounded-xl border border-slate-200/70 group-hover:border-blue-200 transition-all text-center">
                          <div className="text-[11px] font-extrabold text-slate-800 truncate">
                            {primaryName}
                            {othersCount > 0 && (
                              <span className="text-blue-600 font-bold ml-1">
                                외 {othersCount}명
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold mt-0.5 group-hover:text-blue-600">
                            상세보기 →
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] text-slate-400 font-bold">+ 상세</span>
                    </div>
                  )}
                </div>

                {/* 하단 진행상태 요약 */}
                {hasDispatches && (
                  <div className="flex items-center justify-between text-[9px] font-bold pt-1 border-t border-slate-100">
                    <span className="text-slate-500 font-mono">총 {dayData.total_count}건</span>
                    <div className="flex gap-1.5">
                      {dayData.completed_count > 0 && (
                        <span className="text-emerald-600">완료 {dayData.completed_count}</span>
                      )}
                      {dayData.in_progress_count > 0 && (
                        <span className="text-blue-600">운행 {dayData.in_progress_count}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 날짜 클릭 시 상세정보 모달 팝업 (Detail Modal Popup) */}
      {selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* 팝업 헤더 */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                  {selectedDayData.day}일
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>{selectedDayData.date} 배차 및 소속 기사 운행 내역</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      총 {selectedDayData.total_count}건 운행
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    해당 일자에 투입된 소속 덤프 기사들의 상·하차지 노선, 토사 종류 및 실시간 운행 상태입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDayData(null);
                  setModalSearchQuery("");
                }}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 팝업 서브 컨트롤러 (검색 & 요약) */}
            <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="기사명, 차량번호, 현장명 검색..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  완료: {selectedDayData.completed_count}건
                </span>
                <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  운행중: {selectedDayData.in_progress_count}건
                </span>
                {(selectedDayData.cancelled_count || 0) > 0 && (
                  <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    취소: {selectedDayData.cancelled_count}건
                  </span>
                )}
              </div>
            </div>

            {/* 팝업 본문 (기사 운행 테이블) */}
            <div className="flex-1 overflow-y-auto p-5">
              {filteredModalDrivers.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
                    🚚
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">해당 일자에 등록된 배차 운행 내역이 없습니다</h4>
                  <p className="text-xs text-slate-400">
                    {modalSearchQuery ? "검색 조건과 일치하는 기사/차량이 없습니다." : "배차 공고에 투입된 소속 기사 내역이 없습니다."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3.5">기사명 / 차번</th>
                        <th className="py-3 px-3.5">톤수</th>
                        <th className="py-3 px-3.5">상차지 (출발)</th>
                        <th className="py-3 px-3.5">하차지 (도착)</th>
                        <th className="py-3 px-3.5">토사 종류</th>
                        <th className="py-3 px-3.5">운행 상태</th>
                        <th className="py-3 px-3.5 text-right">운임 금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredModalDrivers.map((driver) => {
                        const isCancelled = driver.status === "CANCELLED" || driver.status === "REJECTED";
                        const isCompleted = driver.status.includes("COMPLETED") || driver.status.includes("SETTLEMENT") || driver.status === "APPROVED";
                        const isInProgress = driver.status.includes("DRIVING") || driver.status.includes("ARRIVED") || driver.status.includes("ACCEPTED") || driver.status.includes("LOADING");

                        const soilText = getSoilLabel(driver.material_type, driver.material_type_name);
                        const statusText = getStatusLabel(driver.status, driver.status_name);

                        return (
                          <tr key={driver.ticket_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3.5">
                              <span className="font-extrabold text-slate-900 block">{driver.driver_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{driver.car_number}</span>
                            </td>
                            <td className="py-3 px-3.5 font-bold text-slate-700">
                              {driver.tonnage}톤
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1 text-slate-800 font-bold">
                                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="truncate max-w-[150px]">{driver.site_name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1 text-slate-800 font-bold">
                                <Navigation className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[150px]">{driver.dropoff_name || "하차지 미지정"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-blue-50/80 border border-blue-200/80 text-blue-800 text-[11px] font-extrabold inline-block">
                                {soilText}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${
                                  isCancelled
                                    ? "bg-rose-50 text-rose-600 border-rose-200"
                                    : isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isInProgress
                                    ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {isCancelled ? `✕ ${statusText}` : isCompleted ? `✓ ${statusText}` : `● ${statusText}`}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900">
                              {isCancelled ? (
                                <span className="text-slate-400 font-normal">-</span>
                              ) : driver.fare > 0 ? (
                                `${driver.fare.toLocaleString()}원`
                              ) : isCompleted ? (
                                <span className="text-amber-600 font-semibold text-[11px]">정산 대기</span>
                              ) : (
                                <span className="text-slate-400 font-normal text-[11px]">운행 중</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 팝업 푸터 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDayData(null);
                  setModalSearchQuery("");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer"
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
