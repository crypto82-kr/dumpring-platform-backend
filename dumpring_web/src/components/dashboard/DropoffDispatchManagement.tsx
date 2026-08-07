"use client";

import React, { useState } from "react";
import { Truck, MapPin, Search } from "lucide-react";
import { MockMap } from "./MockMap";

interface DropoffDispatchManagementProps {
  user?: any;
  registeredDropoffList?: any[];
  dropoffRequestList?: any[];
  dispatchRequestList?: any[];
  registeredSiteList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffDispatchManagement({
  user,
  registeredDropoffList = [],
  dropoffRequestList = [],
  dispatchRequestList = [],
  registeredSiteList = [],
}: DropoffDispatchManagementProps) {
  const [selectedDropoffFilter, setSelectedDropoffFilter] = useState<string>("");
  const [selectedOrderRequestId, setSelectedOrderRequestId] = useState<number | null>(null);

  // 1. 하차지 관리자의 내 운영 하차지 리스트
  const myDropoffs = registeredDropoffList;

  // 2. 매칭이 완료되어 반입(배차) 진행 중인 배차건 필터링
  const activeMatchedDispatches = dispatchRequestList.filter((req) => {
    // 하차지가 연동되어 매칭완료/배차완료/운행중 상태인 오더만 포함
    const isMatched = req.rawStatus === "OPEN" || req.rawStatus === "CLOSED" || req.status === "매칭완료" || req.status === "배차완료" || Boolean(req.dropoffName);
    if (!isMatched) return false;

    if (!selectedDropoffFilter) return true;
    const filterLower = selectedDropoffFilter.toLowerCase();
    const dropName = (req.dropoffName || "").toLowerCase();
    return dropName.includes(filterLower);
  });

  const activeSelectedId = selectedOrderRequestId || (activeMatchedDispatches.length > 0 ? activeMatchedDispatches[0].id : null);
  const selectedReq = dispatchRequestList.find((r) => r.id === activeSelectedId) || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Title Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">하차지 반입 및 배차 현황 관제</h2>
          <p className="text-xs text-slate-500 mt-1">
            현장과 매칭되어 반입 운행 중인 덤프트럭 차량의 실시간 이동 동선 및 진입 현황을 관제합니다.
          </p>
        </div>
      </div>

      {/* Top Controls: Operating Dropoff Site & Active Order Selector */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full">
          {/* 1. 운영 하차지 선택 */}
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">운영 하차지:</span>
            <select
              value={selectedDropoffFilter || (myDropoffs[0]?.name || "")}
              onChange={(e) => setSelectedDropoffFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              {myDropoffs.map((drop) => (
                <option key={drop.id} value={drop.name || drop.locationName}>
                  {drop.name || drop.locationName} ({drop.address || "운영중"})
                </option>
              ))}
              {myDropoffs.length === 0 && <option value="">등록된 하차지 없음</option>}
            </select>
          </div>

          {/* 2. 진행 중인 반입/배차 오더 선택 */}
          <div className="flex items-center gap-2 min-w-[340px] flex-1">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">반입 진행 오더:</span>
            <select
              value={activeSelectedId || ""}
              onChange={(e) => setSelectedOrderRequestId(Number(e.target.value))}
              className="w-full bg-blue-50/80 border border-blue-200 rounded-xl px-3 py-2 text-xs font-extrabold text-blue-900 focus:outline-none focus:border-blue-600 shadow-sm"
            >
              {activeMatchedDispatches.map((req) => (
                <option key={req.id} value={req.id}>
                  [{req.siteName} ➔ {req.dropoffName || "내 하차지"}] {req.tonTypes?.map((t: string) => t === 'T_25' ? '25톤' : t).join(',')} ({req.truckCount}대)
                </option>
              ))}
              {activeMatchedDispatches.length === 0 && <option value="">진행 중인 반입 배차 오더 없음</option>}
            </select>
          </div>
        </div>
      </div>

      {selectedReq ? (
        <div className="space-y-6">
          {/* Upper Main Section (2-Column Split): Map Left + Details Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Upper Left: Real-time Live GPS Map */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-2 min-h-[380px] flex flex-col">
              {(() => {
                const matchedSiteObj = registeredSiteList.find((s) => s.id === selectedReq.siteId || s.name === selectedReq.siteName);
                const actualSiteAddress = matchedSiteObj?.address || selectedReq.siteName || "현장 주소 미등록";

                if (selectedReq.dropoffName && selectedReq.dropoffAddress) {
                  return (
                    <MockMap 
                      title={`📍 [상차지] ${selectedReq.siteName} ↔ [하차지] ${selectedReq.dropoffName}`} 
                      address={selectedReq.dropoffAddress} 
                      pinned={true} 
                      isRouteMode={true}
                      siteName={selectedReq.siteName}
                      siteAddress={actualSiteAddress}
                      dropoffName={selectedReq.dropoffName}
                      dropoffAddress={selectedReq.dropoffAddress}
                      distance={selectedReq.distance}
                      estimatedTime={selectedReq.estimatedTime}
                    />
                  );
                } else {
                  return (
                    <MockMap 
                      title={`📍 [하차지 위치] ${selectedReq.dropoffName || "하차지"}`} 
                      address={selectedReq.dropoffAddress || "주소 미등록"} 
                      pinned={true} 
                      isRouteMode={false}
                    />
                  );
                }
              })()}
            </div>

            {/* Upper Right: Unified Operational Details Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      {selectedReq.siteName} <span className="text-blue-600 font-black">➔</span> {selectedReq.dropoffName || "하차지"}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      상차지 주소: {registeredSiteList.find((s) => s.name === selectedReq.siteName)?.address || "현장 주소 미등록"}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                    {selectedReq.status || "운행 진행 중"}
                  </span>
                </div>

                {/* 하나의 통합된 배차 작업 스펙 카드 */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">차량 톤수 및 반입 대수</span>
                      <div className="font-black text-slate-900 mt-0.5 text-sm">
                        {selectedReq.tonTypes?.map((t: string) => t === "T_25" ? "25톤" : t === "T_15" ? "15톤" : t).join(", ")} ({selectedReq.truckCount} 대)
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">반입 토사 종류</span>
                      <div className="font-black text-blue-600 mt-0.5 text-sm">
                        {selectedReq.soilType === "GOOD_SOIL" ? "양질토" : selectedReq.soilType === "MUD_SOIL" ? "뻘흙" : selectedReq.soilType}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">단가 / 조건</span>
                      <div className="font-black text-slate-900 mt-0.5 text-sm">
                        {selectedReq.offeredUnitPrice ? `${selectedReq.offeredUnitPrice.toLocaleString()} 원` : "0 원"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">작업 희망일</span>
                      <div className="font-bold text-slate-800 mt-0.5">{selectedReq.startDate}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">지급 주체</span>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {selectedReq.payerType === "SITE_PAYS" ? "현장 지급" : "하차지 지급"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">현장 ↔ 하차지 거리</span>
                      <div className="font-bold text-emerald-600 mt-0.5">
                        {selectedReq.distance ? `${selectedReq.distance} km (${selectedReq.estimatedTime || 0}분)` : "거리 연산 대기"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width Section: Driver List & Inbound Tracking Table */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Truck className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  반입 진입 차량 및 운행 기사 현황 목록
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  해당 오더에 배정되어 현재 하차지로 토사를 운반 중인 차주/기사 명단을 관제합니다.
                </p>
              </div>
            </div>

            {/* Driver Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">기사 성명</th>
                    <th className="py-3 px-4">차량 번호 / 톤수</th>
                    <th className="py-3 px-4">연락처</th>
                    <th className="py-3 px-4">평점</th>
                    <th className="py-3 px-4">운행 상태</th>
                    <th className="py-3 px-4 text-right">반입 상태 확인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  <tr className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      강동원 기사
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      서울 88바 1234 <span className="text-[10px] font-semibold text-slate-400">(25톤 덤프)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">010-8910-1112</td>
                    <td className="py-3.5 px-4 font-bold text-amber-500">★ 4.9</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                        하차지 이동 중
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => alert("[강동원 기사] 토사 반입 확인 처리가 완료되었습니다.")}
                        className="px-3 py-1.5 text-xs font-black rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10"
                      >
                        반입 확인 처리
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      마동석 기사
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      경기 80사 5678 <span className="text-[10px] font-semibold text-slate-400">(25톤 덤프)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">010-5678-1234</td>
                    <td className="py-3.5 px-4 font-bold text-amber-500">★ 4.8</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                        상차 완료 (이동 대기)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-xs text-slate-400 font-bold">운행 이동 중</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            📄
          </div>
          <h3 className="text-sm font-bold text-slate-800">진행 중인 반입 배차 오더가 없습니다</h3>
        </div>
      )}
    </div>
  );
}
