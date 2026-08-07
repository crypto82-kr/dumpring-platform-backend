"use client";

import React, { useState } from "react";
import { Receipt, Search, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface SiteTaxInvoiceManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteTaxInvoiceManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
}: SiteTaxInvoiceManagementProps) {
  const [activeTab, setActiveTab] = useState<"ISSUE" | "HISTORY">("ISSUE");

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장 세금계산서 업무</h2>
          <p className="text-xs text-slate-500 mt-1">
            덤프 운반비 및 토사 거래에 대한 전자세금계산서 발행, 승인 및 국세청 전송 이력을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert("신규 전자세금계산서 발행 신청 모달이 호출되었습니다.")}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
        >
          + 세금계산서 발행 신청
        </button>
      </div>

      {/* Main Table Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("ISSUE")}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                activeTab === "ISSUE" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-slate-100 text-slate-600"
              }`}
            >
              발행 대기 및 승인 (2건)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("HISTORY")}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                activeTab === "HISTORY" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-slate-100 text-slate-600"
              }`}
            >
              국세청 전송 완료 이력
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">승인 번호</th>
                <th className="py-3 px-4">발행 일자</th>
                <th className="py-3 px-4">공급자 (발행처)</th>
                <th className="py-3 px-4">공급받는 자</th>
                <th className="py-3 px-4">공급가액</th>
                <th className="py-3 px-4">부가세 (VAT)</th>
                <th className="py-3 px-4">합계 금액</th>
                <th className="py-3 px-4">전송 상태</th>
                <th className="py-3 px-4 text-right">업무 제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              <tr className="hover:bg-slate-50/80 transition-all">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">20260805-4100123</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">2026-08-05</td>
                <td className="py-3.5 px-4 font-bold text-slate-800">(주)대진운송</td>
                <td className="py-3.5 px-4 font-bold text-slate-800">현장건설(주) 인천공구</td>
                <td className="py-3.5 px-4 font-mono">4,500,000원</td>
                <td className="py-3.5 px-4 font-mono">450,000원</td>
                <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">4,950,000원</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-amber-50 text-amber-600 border border-amber-200">
                    승인 대기
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => alert("세금계산서 발행 승인 처리되었습니다.")}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    발행 승인
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
