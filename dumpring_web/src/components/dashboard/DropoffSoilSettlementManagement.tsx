"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";

interface DropoffSoilSettlementManagementProps {
  registeredDropoffList?: any[];
  dbCommonCodes?: any[];
}

export default function DropoffSoilSettlementManagement({
  registeredDropoffList = [],
}: DropoffSoilSettlementManagementProps) {
  const [selectedDropoff, setSelectedDropoff] = useState<string>("");
  const [payerTypeFilter, setPayerTypeFilter] = useState<string>("ALL");

  // 백엔드 데이터 구조 기반 하차지 흙값 정산 목록
  const [soilSettlementList, setSoilSettlementList] = useState([
    {
      id: 1,
      jobPostId: "JOB-#0012",
      workDate: "2026-08-05",
      siteName: "강남 재건축 현장",
      dropoffName: registeredDropoffList[0]?.name || "신길 사토장",
      soilType: "양질토 (15대)",
      payerType: "SITE_PAYS", // 사토 처리비 수수 (하차지 수입)
      unitPrice: 45000,
      truckCount: 15,
      totalAmount: 675000,
      status: "수령 확인",
    },
    {
      id: 2,
      jobPostId: "JOB-#0015",
      workDate: "2026-08-06",
      siteName: "서초 현장",
      dropoffName: registeredDropoffList[0]?.name || "신길 사토장",
      soilType: "성토용 토사 (20대)",
      payerType: "SITE_RECEIVES", // 토사 매입 비용 지급 (하차지 지출)
      unitPrice: 50000,
      truckCount: 20,
      totalAmount: 1000000,
      status: "정산 검토",
    },
    {
      id: 3,
      jobPostId: "JOB-#0018",
      workDate: "2026-08-04",
      siteName: "인천 검단 현장",
      dropoffName: registeredDropoffList[1]?.name || "김포 고촌 사토장",
      soilType: "일반 암버럭 (10대)",
      payerType: "FREE",
      unitPrice: 0,
      truckCount: 10,
      totalAmount: 0,
      status: "정산 마감",
    },
  ]);

  const filteredList = soilSettlementList.filter((item) => {
    if (selectedDropoff && item.dropoffName !== selectedDropoff) return false;
    if (payerTypeFilter !== "ALL" && item.payerType !== payerTypeFilter) return false;
    return true;
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
            하차지 관점의 사토 수수료 수입(SITE_PAYS) 및 토사 매입 지출(SITE_RECEIVES) 흙값 정산 대장을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert("하차지 흙값 정산 대장이 엑셀 파일로 출력되었습니다.")}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10"
        >
          흙값 정산 대장 엑셀
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-none shadow-sm"
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
                onClick={() => setPayerTypeFilter("ALL")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${payerTypeFilter === "ALL" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setPayerTypeFilter("SITE_PAYS")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${payerTypeFilter === "SITE_PAYS" ? "bg-emerald-600 text-white" : "text-slate-600"}`}
              >
                사토 수수료 수입
              </button>
              <button
                type="button"
                onClick={() => setPayerTypeFilter("SITE_RECEIVES")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${payerTypeFilter === "SITE_RECEIVES" ? "bg-rose-600 text-white" : "text-slate-600"}`}
              >
                토사 매입 지출
              </button>
              <button
                type="button"
                onClick={() => setPayerTypeFilter("FREE")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${payerTypeFilter === "FREE" ? "bg-slate-500 text-white" : "text-slate-600"}`}
              >
                무상 처리
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">금월 사토 수수료 수입액</span>
          <div className="text-2xl font-black text-emerald-600">₩ {totalIncome.toLocaleString()}</div>
          <p className="text-[10px] text-emerald-600 font-bold">하차 수수료 입금 집계</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">금월 토사 매입 지출액</span>
          <div className="text-2xl font-black text-rose-600">₩ {totalExpense.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-semibold">양질토 매입 지급 집계</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">하차지 순 흙값 잔액</span>
          <div className="text-2xl font-black text-blue-600">
            ₩ {(totalIncome - totalExpense).toLocaleString()}
          </div>
          <p className="text-[10px] text-blue-500 font-bold">정산 상태 정상</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-sm text-slate-900">흙값 정산 상세 거래 내역</h4>
          <span className="text-xs text-slate-400 font-semibold">총 {filteredList.length}건</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">오더 번호</th>
                <th className="py-3 px-4">작업 일자</th>
                <th className="py-3 px-4">연동 현장 / 하차지</th>
                <th className="py-3 px-4">토사 종류 / 대수</th>
                <th className="py-3 px-4">단가</th>
                <th className="py-3 px-4">총 정산 금액</th>
                <th className="py-3 px-4">정산 상태</th>
                <th className="py-3 px-4 text-right">상태 처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredList.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{row.jobPostId}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{row.workDate}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {row.siteName} ➔ {row.dropoffName}
                  </td>
                  <td className="py-3.5 px-4 text-blue-600 font-bold">{row.soilType}</td>
                  <td className="py-3.5 px-4 font-mono">{row.unitPrice.toLocaleString()}원</td>
                  <td
                    className={`py-3.5 px-4 font-mono font-black ${
                      row.payerType === "SITE_PAYS"
                        ? "text-emerald-600"
                        : row.payerType === "SITE_RECEIVES"
                        ? "text-rose-600"
                        : "text-slate-500"
                    }`}
                  >
                    {row.payerType === "SITE_PAYS" ? "+" : row.payerType === "SITE_RECEIVES" ? "-" : ""}
                    {row.totalAmount.toLocaleString()} 원
                  </td>
                  <td className="py-3.5 px-4">
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
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {row.status === "정산 검토" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSoilSettlementList((prev) =>
                            prev.map((item) => (item.id === row.id ? { ...item, status: "송금 완료" } : item))
                          );
                          alert(`[${row.jobPostId}] 송금 처리 및 상대측 수령 확인 요청을 전송했습니다.`);
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
                          setSoilSettlementList((prev) =>
                            prev.map((item) => (item.id === row.id ? { ...item, status: "정산 마감" } : item))
                          );
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
                    <button
                      type="button"
                      onClick={() => alert(`[${row.jobPostId}] 명세서가 출력되었습니다.`)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      명세서
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
