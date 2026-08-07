"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";

interface SiteSoilExpensesManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteSoilExpensesManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
}: SiteSoilExpensesManagementProps) {
  const [payerTypeFilter, setPayerTypeFilter] = useState<string>("ALL");
  const [selectedSiteId, setSelectedSiteId] = useState<number | "">("");

  // 백엔드 JobPost payer_type 상태값 기반 토사 거래 데이터
  const soilExpensesData = [
    {
      id: 1,
      jobPostId: "JOB-#0012",
      workDate: "2026-08-06",
      siteId: registeredSiteList[0]?.id || 1,
      siteName: registeredSiteList[0]?.name || "인천 검단 3공구",
      dropoffName: "신길 사토장",
      soilType: "양질토사",
      payerType: "SITE_PAYS", // 사토 처리비 지출 (현장이 비용 지급)
      unitPrice: 45000,
      truckCount: 10,
      totalAmount: 450000,
      status: "수령 확인",
    },
    {
      id: 2,
      jobPostId: "JOB-#0015",
      workDate: "2026-08-05",
      siteId: registeredSiteList[0]?.id || 1,
      siteName: registeredSiteList[0]?.name || "인천 검단 3공구",
      dropoffName: "김포 고촌 사토장",
      soilType: "성토용 토사",
      payerType: "SITE_RECEIVES", // 토사 판매 수입 (현장이 비용 수취)
      unitPrice: 30000,
      truckCount: 8,
      totalAmount: 240000,
      status: "정산 검토",
    },
    {
      id: 3,
      jobPostId: "JOB-#0018",
      workDate: "2026-08-04",
      siteId: registeredSiteList[1]?.id || 2,
      siteName: registeredSiteList[1]?.name || "신길동 아파트 현장",
      dropoffName: "영종도 매립지",
      soilType: "일반 암버럭",
      payerType: "FREE", // 무상 처리
      unitPrice: 0,
      truckCount: 15,
      totalAmount: 0,
      status: "마감 완료",
    },
  ];

  const filteredData = soilExpensesData.filter((item) => {
    if (selectedSiteId && item.siteId !== Number(selectedSiteId)) return false;
    if (payerTypeFilter !== "ALL" && item.payerType !== payerTypeFilter) return false;
    return true;
  });

  const totalExpense = filteredData
    .filter((d) => d.payerType === "SITE_PAYS")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const totalIncome = filteredData
    .filter((d) => d.payerType === "SITE_RECEIVES")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장 흙값 정산 관리</h2>
          <p className="text-xs text-slate-500 mt-1">
            현장 사토 처리비 지출(SITE_PAYS) 및 토사 판매 수입(SITE_RECEIVES) 흙값 거래 내역을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert("흙값 거래 정산 대장이 엑셀 파일로 출력되었습니다.")}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
        >
          흙값 정산 대장 엑셀
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">사토 처리비 지출액 (SITE_PAYS)</span>
          <div className="text-2xl font-black text-rose-600">₩ {totalExpense.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-semibold">현장 지급 흙값 총액</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">토사 판매 수입액 (SITE_RECEIVES)</span>
          <div className="text-2xl font-black text-emerald-600">₩ {totalIncome.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-semibold">현장 수취 흙값 총액</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">순 흙값 정산 잔액</span>
          <div className="text-2xl font-black text-blue-600">
            ₩ {(totalIncome - totalExpense).toLocaleString()}
          </div>
          <p className="text-[10px] text-blue-500 font-bold">정산 잔액 정상</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-3">
            <h4 className="font-extrabold text-sm text-slate-900">토사 정산 대장</h4>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : "")}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="">전체 현장 선택</option>
              {registeredSiteList.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPayerTypeFilter("ALL")}
              className={`px-3 py-1 text-xs font-bold rounded-lg ${
                payerTypeFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setPayerTypeFilter("SITE_PAYS")}
              className={`px-3 py-1 text-xs font-bold rounded-lg ${
                payerTypeFilter === "SITE_PAYS" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              사토 처리비 지출
            </button>
            <button
              type="button"
              onClick={() => setPayerTypeFilter("SITE_RECEIVES")}
              className={`px-3 py-1 text-xs font-bold rounded-lg ${
                payerTypeFilter === "SITE_RECEIVES" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              토사 판매 수입
            </button>
            <button
              type="button"
              onClick={() => setPayerTypeFilter("FREE")}
              className={`px-3 py-1 text-xs font-bold rounded-lg ${
                payerTypeFilter === "FREE" ? "bg-slate-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              무상 처리
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">오더 번호</th>
                <th className="py-3 px-4">작업 일자</th>
                <th className="py-3 px-4">현장명</th>
                <th className="py-3 px-4">하차 사토장</th>
                <th className="py-3 px-4">토사 종류</th>
                <th className="py-3 px-4">거래 구분 (PayerType)</th>
                <th className="py-3 px-4">단가 / 수량</th>
                <th className="py-3 px-4">총 흙값 정산액</th>
                <th className="py-3 px-4 text-right">정산 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{row.jobPostId}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{row.workDate}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{row.siteName}</td>
                  <td className="py-3.5 px-4 text-slate-700">{row.dropoffName}</td>
                  <td className="py-3.5 px-4 font-bold text-blue-600">{row.soilType}</td>
                  <td className="py-3.5 px-4">
                    {row.payerType === "SITE_PAYS" && (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-rose-50 text-rose-600 border border-rose-200">
                        사토 처리비 지출
                      </span>
                    )}
                    {row.payerType === "SITE_RECEIVES" && (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                        토사 판매 수입
                      </span>
                    )}
                    {row.payerType === "FREE" && (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-slate-100 text-slate-600 border border-slate-300">
                        무상 처리
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {row.unitPrice.toLocaleString()}원 / {row.truckCount}대
                  </td>
                  <td
                    className={`py-3.5 px-4 font-mono font-black ${
                      row.payerType === "SITE_RECEIVES"
                        ? "text-emerald-600"
                        : row.payerType === "SITE_PAYS"
                        ? "text-rose-600"
                        : "text-slate-500"
                    }`}
                  >
                    {row.payerType === "SITE_RECEIVES" ? "+" : row.payerType === "SITE_PAYS" ? "-" : ""}
                    {row.totalAmount.toLocaleString()} 원
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded border ${
                        row.status === "정산 마감"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : row.status === "수령 확인"
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : row.status === "송금 완료"
                          ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                      }`}
                    >
                      {row.status}
                    </span>
                    {row.status === "정산 검토" && (
                      <button
                        type="button"
                        onClick={() => {
                          row.status = "송금 완료";
                          alert(`[${row.jobPostId}] 흙값 거래에 대한 송금 완료 알림을 상대측에 전송했습니다.`);
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                      >
                        송금 처리
                      </button>
                    )}
                    {row.status === "송금 완료" && (
                      <span className="text-[11px] text-indigo-600 font-bold">상대 수령 확인 대기</span>
                    )}
                    {row.status === "수령 확인" && (
                      <button
                        type="button"
                        onClick={() => {
                          row.status = "정산 마감";
                          alert(`[${row.jobPostId}] 흙값 정산 건이 상호 확인 완료되어 최종 마감되었습니다.`);
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                      >
                        최종 마감
                      </button>
                    )}
                    {row.status === "정산 마감" && (
                      <span className="text-[11px] text-slate-400 font-bold">마감 완료</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    해당 거래 조건의 흙값 정산 내역이 없습니다.
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
