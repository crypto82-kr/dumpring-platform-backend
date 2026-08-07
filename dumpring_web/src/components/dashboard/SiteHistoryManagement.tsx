"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";

interface SiteHistoryManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteHistoryManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
}: SiteHistoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<number | "">("");

  const filteredHistory = dispatchRequestList.filter((req) => {
    if (selectedSiteId && req.siteId !== Number(selectedSiteId)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (req.siteName && req.siteName.toLowerCase().includes(q)) ||
      (req.dropoffName && req.dropoffName.toLowerCase().includes(q)) ||
      (req.soilType && req.soilType.toLowerCase().includes(q))
    );
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
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : "")}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="">전체 현장 선택</option>
            {registeredSiteList.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.companyName || "운영중"})
              </option>
            ))}
          </select>

          <div className="relative flex-1">
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
                <th className="py-3 px-4">운행 번호</th>
                <th className="py-3 px-4">현장명</th>
                <th className="py-3 px-4">운행 기간</th>
                <th className="py-3 px-4">반출 토사 / 톤수</th>
                <th className="py-3 px-4">하차 사토장</th>
                <th className="py-3 px-4">운행 상태</th>
                <th className="py-3 px-4 text-right">증빙 전송</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredHistory.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-all">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">HIS-202608-{String(item.id).padStart(2, "0")}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{item.siteName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{item.startDate} ~ {item.endDate}</td>
                  <td className="py-3.5 px-4 text-blue-600 font-bold">
                    {item.soilType} ({item.tonTypes?.map((t: string) => t === "T_25" ? "25톤" : t).join(", ") || "25톤"} / {item.truckCount}대)
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{item.dropoffName || "지정 사토장"}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                      {item.status || "운행 완료"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`[${item.siteName}] 전자 송장 내역이 출력되었습니다.`)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                    >
                      송장 확인
                    </button>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
