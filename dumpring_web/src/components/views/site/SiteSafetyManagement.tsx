"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  HardHat,
  AlertTriangle,
  AlertCircle,
  Info,
  Send,
  Users,
  Phone,
  Clock,
  Building,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Truck
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface SiteSafetyManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteSafetyManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
}: SiteSafetyManagementProps) {
  // 선택된 관리 공사현장
  const [selectedSiteId, setSelectedSiteId] = useState<number | "">("");

  // 공지 작성 폼 상태
  const [alertLevel, setAlertLevel] = useState<"EMERGENCY" | "WARNING" | "NORMAL">("WARNING");
  const [noticeContent, setNoticeContent] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);


  // 최초 로드 시 첫 현장 자동 선택 및 비상연락처 초기화
  useEffect(() => {
    if (registeredSiteList.length > 0 && selectedSiteId === "") {
      const firstSite = registeredSiteList[0];
      setSelectedSiteId(firstSite.id);
      if (firstSite.phone) {
        setContactPhone(firstSite.phone);
      }
    }
  }, [registeredSiteList, selectedSiteId]);

  // 현장 변경 시 해당 현장 정보 반영
  const activeSite = useMemo(() => {
    return registeredSiteList.find((s) => s.id === selectedSiteId) || registeredSiteList[0] || null;
  }, [registeredSiteList, selectedSiteId]);

  // 현장 변경 시 해당 현장의 전화번호로 자동 설정
  useEffect(() => {
    if (activeSite && activeSite.phone) {
      setContactPhone(activeSite.phone);
    }
  }, [activeSite]);

  // 선택된 현장의 오늘 실시간 운행 중인 실제 기사(차량) 수 및 목록
  const [activeDriverTickets, setActiveDriverTickets] = useState<any[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState<boolean>(false);

  // 현장 선택 변경 시, 해당 현장에 속한 배차 공고들의 실시간 티켓(기사) 조회
  useEffect(() => {
    let isCancelled = false;

    const fetchActiveDrivers = async () => {
      if (!selectedSiteId) {
        setActiveDriverTickets([]);
        return;
      }

      const siteIdNum = Number(selectedSiteId);
      // 1. 해당 현장에 속한 배차 공고 중 오늘 일자(YYYY-MM-DD)이면서 현재 진행 중인 공고만 필터
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const matchingJobs = dispatchRequestList.filter((job: any) => {
        const isSameSite = Number(job.siteId) === siteIdNum;
        const jobDate = (job.startDate || job.endDate || "").substring(0, 10);
        // 오늘 날짜 일치 여부 확인
        const isToday = jobDate === todayStr;
        // 완료, 마감, 정산완료, 취소 공고 제외
        const isClosed = [
          "COMPLETED", "CLOSED", "CANCELLED", 
          "SETTLEMENT_PAID", "SETTLEMENT_CLOSED", "SETTLEMENT_CONFIRMED"
        ].includes(job.rawStatus);

        return isSameSite && isToday && !isClosed;
      });

      if (matchingJobs.length === 0) {
        setActiveDriverTickets([]);
        return;
      }

      setIsLoadingDrivers(true);
      try {
        const token = typeof window !== "undefined"
          ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
          : null;
        if (!token) {
          setActiveDriverTickets([]);
          setIsLoadingDrivers(false);
          return;
        }

        const baseUrl = getApiBaseUrl();
        // 각 공고별 실제 배차 티켓 목록 병렬 조회
        const ticketPromises = matchingJobs.map(async (job: any) => {
          try {
            const res = await fetch(`${baseUrl}/api/dispatch/job/${job.id}/tickets`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              return Array.isArray(data) ? data : [];
            }
          } catch {
            return [];
          }
          return [];
        });

        const results = await Promise.all(ticketPromises);
        const allTickets = results.flat();

        // 2. 오늘 실제 기사가 수락하여 현재 운행 중인 상태만 필터링 (ACCEPTED, ARRIVED_LOADING, LOADING_APPROVED, DRIVING, ARRIVED)
        const activeTickets = allTickets.filter((t: any) => {
          const st = t.status || "";
          return ["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED"].includes(st);
        });

        if (!isCancelled) {
          setActiveDriverTickets(activeTickets);
        }
      } catch (err) {
        console.error("Failed to fetch active driver tickets:", err);
        if (!isCancelled) setActiveDriverTickets([]);
      } finally {
        if (!isCancelled) setIsLoadingDrivers(false);
      }
    };

    fetchActiveDrivers();

    return () => {
      isCancelled = true;
    };
  }, [selectedSiteId, dispatchRequestList]);

  // 실제 현재 운행 중인 차량 대수
  const activeDriversCount = activeDriverTickets.length;

  // 현장별 공지 발송 이력 (백엔드 실제 DB 연동)
  const [noticeHistory, setNoticeHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // 선택된 현장의 안전 공지 이력 백엔드 DB 조회
  const fetchNoticeHistory = async (siteId: number) => {
    try {
      setIsLoadingHistory(true);
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;
      if (!token) {
        setNoticeHistory([]);
        return;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/sites/${siteId}/safety-notices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNoticeHistory(Array.isArray(data) ? data : []);
      } else {
        setNoticeHistory([]);
      }
    } catch (err) {
      console.error("공지 이력 조회 실패:", err);
      setNoticeHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedSiteId) {
      fetchNoticeHistory(Number(selectedSiteId));
    } else {
      setNoticeHistory([]);
    }
  }, [selectedSiteId]);

  // 공지 발송 핸들러 (백엔드 실제 DB 저장)
  const handleSendNotice = async () => {
    if (!selectedSiteId) {
      alert("공지를 발송할 현장을 먼저 선택해 주세요.");
      return;
    }

    if (!noticeContent.trim()) {
      alert("기사님들께 전달할 안전 공지 내용을 입력해 주세요.");
      return;
    }

    if (activeDriversCount === 0) {
      const confirmSend = confirm(
        `현재 [${activeSite?.name || activeSite?.site_name || "선택된 현장"}]에 실시간 운행 중인 차량이 없습니다 (0대).\n그래도 공지 내역을 등록하시겠습니까?`
      );
      if (!confirmSend) return;
    }

    setIsSending(true);
    try {
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;
      if (!token) {
        alert("로그인 세션이 만료되었습니다.");
        setIsSending(false);
        return;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/sites/${selectedSiteId}/safety-notices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          level: alertLevel,
          content: noticeContent.trim(),
          contact_phone: contactPhone.trim(),
          target_drivers_count: activeDriversCount
        })
      });

      if (res.ok) {
        const savedNotice = await res.json();
        setNoticeHistory((prev) => [savedNotice, ...prev]);
        setNoticeContent("");
        const levelKo = alertLevel === "EMERGENCY" ? "긴급" : alertLevel === "WARNING" ? "주의" : "일반";
        alert(`🚀 [${levelKo}] 안전 공지가 서버 DB에 저장되었으며, 현장 기사 앱으로 실시간 전파되었습니다!\n(발송 대상: ${activeDriversCount}대)`);
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.detail || "안전 공지 발송 처리에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("공지 발송 에러:", err);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  // 공지 내역 삭제 핸들러 (백엔드 실제 DB 삭제)
  const handleDeleteNotice = async (noticeId: number) => {
    if (!confirm("해당 공지 기록을 삭제하시겠습니까?")) return;

    try {
      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken") || localStorage.getItem("token"))
        : null;
      if (!token || !selectedSiteId) return;

      const res = await fetch(`${getApiBaseUrl()}/api/sites/${selectedSiteId}/safety-notices/${noticeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setNoticeHistory((prev) => prev.filter((item) => item.id !== noticeId));
      } else {
        alert("공지 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("공지 삭제 오류:", err);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. 상단 타이틀 & 현장 선택 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <HardHat className="w-6 h-6 text-amber-500" />
            현장 안전 공지
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            배차 등록 시 작성된 기본 현장 공지 외에, <strong>당일 작업 중 발생하는 실시간 돌발 상황(우회로 변경, 작업 일시정지, 진입로 혼잡 등)</strong>을 현재 운행 중인 차량에 즉시 전파합니다.
          </p>
        </div>

        {/* 대상 현장 선택 셀렉트박스 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-600 flex items-center gap-1 whitespace-nowrap">
            <Building className="w-4 h-4 text-slate-400" />
            선택 현장:
          </span>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : "")}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
          >
            {registeredSiteList.length > 0 ? (
              registeredSiteList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.site_name || s.companyName || `현장 #${s.id}`}
                </option>
              ))
            ) : (
              <option value="">등록된 현장 없음</option>
            )}
          </select>
        </div>
      </div>

      {/* 2. 안전 공지 작성 패널 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                [{activeSite?.name || activeSite?.site_name || "현장 미선택"}] 안전 공지 작성
              </h3>
              <p className="text-[11px] text-slate-400">
                해당 현장에서 현재 운행 중인 차량을 대상으로 공지가 전달됩니다.
              </p>
            </div>
          </div>

          {/* 현재 현장 운행 중인 기사 수 뱃지 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Truck className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-600">현재 현장 운행 차량:</span>
            {isLoadingDrivers ? (
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <span className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                조회 중...
              </span>
            ) : (
              <span className={`font-black font-mono ${activeDriversCount > 0 ? "text-blue-600" : "text-slate-400"}`}>
                {activeDriversCount}대
              </span>
            )}
          </div>
        </div>

        {/* 1) 중요도 등급 선택 (긴급 / 주의 / 일반) */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700">1. 공지 중요도 등급</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 긴급 */}
            <button
              type="button"
              onClick={() => setAlertLevel("EMERGENCY")}
              className={`py-3 px-4 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
                alertLevel === "EMERGENCY"
                  ? "bg-rose-500 text-white border-rose-600 shadow-md font-black"
                  : "bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200 font-bold"
              }`}
            >
              <AlertCircle className={`w-4 h-4 ${alertLevel === "EMERGENCY" ? "text-white" : "text-rose-500"}`} />
              <span className="text-xs">긴급</span>
            </button>

            {/* 주의 */}
            <button
              type="button"
              onClick={() => setAlertLevel("WARNING")}
              className={`py-3 px-4 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
                alertLevel === "WARNING"
                  ? "bg-amber-400 text-slate-950 border-amber-500 shadow-md font-black"
                  : "bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200 font-bold"
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${alertLevel === "WARNING" ? "text-slate-950" : "text-amber-500"}`} />
              <span className="text-xs">주의</span>
            </button>

            {/* 일반 */}
            <button
              type="button"
              onClick={() => setAlertLevel("NORMAL")}
              className={`py-3 px-4 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
                alertLevel === "NORMAL"
                  ? "bg-blue-600 text-white border-blue-700 shadow-md font-black"
                  : "bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200 font-bold"
              }`}
            >
              <Info className={`w-4 h-4 ${alertLevel === "NORMAL" ? "text-white" : "text-blue-500"}`} />
              <span className="text-xs">일반</span>
            </button>
          </div>
        </div>

        {/* 2) 공지 내용 입력 */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black text-slate-700">
              2. 실시간 현장 안내 내용 <span className="text-rose-500">*</span>
            </label>
            <span className={`text-[11px] font-mono ${noticeContent.length > 180 ? "text-rose-500 font-bold" : "text-slate-400"}`}>
              {noticeContent.length} / 200자
            </span>
          </div>
          <textarea
            rows={3}
            maxLength={200}
            value={noticeContent}
            onChange={(e) => setNoticeContent(e.target.value)}
            placeholder="예: 정문 배수로 굴착으로 B게이트 우회 진입 바랍니다 / 14:00~14:30 상차장 장비 점검으로 진입 일시 대기..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white leading-relaxed resize-none"
          />
        </div>

        {/* 3) 비상 연락처 */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            3. 현장 안전실 / 담당자 비상 연락처
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="예: 010-0000-0000"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>

        {/* 4) 발송 버튼 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500">
            * 발송 대상: <strong className="text-slate-800">[{activeSite?.name || activeSite?.site_name || "선택 현장"}]</strong> 현재 운행 차량 <span className="font-mono font-bold text-blue-600">{activeDriversCount}대</span>
          </div>
          <button
            type="button"
            disabled={isSending}
            onClick={handleSendNotice}
            className={`px-6 py-3 rounded-xl font-black text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${
              alertLevel === "EMERGENCY"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : alertLevel === "WARNING"
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-slate-950 font-black"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
            }`}
          >
            {isSending ? (
              <span>처리 중...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>공지 발송</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. 최근 공지 발송 내역 히스토리 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            [{activeSite?.name || activeSite?.site_name || "선택 현장"}] 공지 발송 이력 ({noticeHistory.length}건)
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            * 선택된 현장에 발송된 공지만 표시됩니다.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-extrabold">
                <th className="py-3 px-3 text-center w-14">No</th>
                <th className="py-3 px-3 w-24">등급</th>
                <th className="py-3 px-3">공지 내용</th>
                <th className="py-3 px-3 w-32">비상 연락처</th>
                <th className="py-3 px-3 text-center w-24">대상 대수</th>
                <th className="py-3 px-3 w-32">발송 일시</th>
                <th className="py-3 px-3 text-center w-16">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {noticeHistory.length > 0 ? (
                noticeHistory.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      {item.level === "EMERGENCY" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                          긴급
                        </span>
                      ) : item.level === "WARNING" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          주의
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">
                          일반
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {item.content}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {item.contactPhone || "-"}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-600">
                      {item.targetDriversCount}대
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {item.sentAt}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(item.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    등록된 현장 안전 공지 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
