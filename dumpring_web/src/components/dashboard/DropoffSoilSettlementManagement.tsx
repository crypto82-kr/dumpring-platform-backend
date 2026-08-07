"use client";

import React, { useState } from "react";
import { DollarSign, Search, Filter, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface DropoffSoilSettlementManagementProps {
  registeredDropoffList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffSoilSettlementManagement({
  registeredDropoffList = [],
}: DropoffSoilSettlementManagementProps) {
  const [selectedDropoff, setSelectedDropoff] = useState<string>("");
  const [dealTypeFilter, setDealTypeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">하차지 흙값 정산 관리</h2>
          <p className="text-xs text-slate-500 mt-1">
            하차지 토사 거래(구입/매각) 내역 및 현장별 흙값 정산 입출금 현황을 통합 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert("흙값 정산 내역 엑셀 다운로드 요청이 처리되었습니다.")}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10"
        >
          📊 정산 내역 엑셀 다운로드
        </button>
      </div>

      {/* Top Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">운영 하차지:</span>
            <select
              value={selectedDropoff}
              onChange={(e) => setSelectedDropoff(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="">전체 하차지 보기</option>
              {registeredDropoffList.map((drop) => (
                <option key={drop.id} value={drop.name || drop.locationName}>
                  {drop.name || drop.locationName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">거래 구분:</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDealTypeFilter("ALL")}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${dealTypeFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setDealTypeFilter("BUY")}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${dealTypeFilter === "BUY" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500"}`}
              >
                토사 매입(입금)
              </button>
              <button
                type="button"
                onClick={() => setDealTypeFilter("SELL")}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${dealTypeFilter === "SELL" ? "bg-amber-600 text-white shadow-sm" : "text-slate-500"}`}
              >
                토사 판매(출금)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">총 정산 완료 금액</span>
          <div className="text-2xl font-black text-slate-900">₩ 28,450,000</div>
          <p className="text-[10px] text-emerald-600 font-bold">당월 거래 성공 18건</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">정산 미수금 (입금 대기)</span>
          <div className="text-2xl font-black text-blue-600">₩ 4,200,000</div>
          <p className="text-[10px] text-blue-500 font-bold">확인 대기 오더 3건</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">정산 지급 예정액</span>
          <div className="text-2xl font-black text-amber-600">₩ 1,500,000</div>
          <p className="text-[10px] text-amber-600 font-bold">말일 정산 집계 예정</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h4 className="font-extrabold text-sm text-slate-900">흙값 정산 상세 거래 내역</h4>
          <span className="text-xs text-slate-400 font-semibold">최근 거래순 정렬</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">정산 번호</th>
                <th className="py-3 px-4">거래 일자</th>
                <th className="py-3 px-4">연동 현장 / 하차지</th>
                <th className="py-3 px-4">토사 종류 / 대수</th>
                <th className="py-3 px-4">단가</th>
                <th className="py-3 px-4">총 정산 금액</th>
                <th className="py-3 px-4">정산 상태</th>
                <th className="py-3 px-4 text-right">처리 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              <tr className="hover:bg-slate-50/80 transition-all">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">STL-202608-001</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">2026-08-05</td>
                <td className="py-3.5 px-4 font-bold text-slate-800">강남 재건축 현장 ➔ 신길 사토장</td>
                <td className="py-3.5 px-4 text-blue-600 font-bold">양질토 (15대)</td>
                <td className="py-3.5 px-4 font-mono">45,000원</td>
                <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">675,000원</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                    정산 완료
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => alert("세금계산서 및 명세서가 출력되었습니다.")}
                    className="px-3 py-1.5 text-xs font-black rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    명세서 보기
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80 transition-all">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">STL-202608-002</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">2026-08-06</td>
                <td className="py-3.5 px-4 font-bold text-slate-800">서초 현장 ➔ 신길 사토장</td>
                <td className="py-3.5 px-4 text-blue-600 font-bold">양질토 (20대)</td>
                <td className="py-3.5 px-4 font-mono">50,000원</td>
                <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">1,000,000원</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                    입금 확인 대기
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => alert("입금 확인 처리가 완료되었습니다.")}
                    className="px-3 py-1.5 text-xs font-black rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10"
                  >
                    입금 확인
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
