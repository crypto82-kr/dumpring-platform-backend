"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";

interface SiteDumpExpensesManagementProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
}

export default function SiteDumpExpensesManagement({
  registeredSiteList = [],
  dispatchRequestList = [],
}: SiteDumpExpensesManagementProps) {
  const [activeTab, setActiveTab] = useState<"DRIVER" | "COMPANY">("DRIVER");
  const [selectedSiteId, setSelectedSiteId] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 기사별 실제 덤프비 정산 목록 (DispatchTicket 기반 데이터 구조)
  const driverExpensesData = [
    {
      ticketId: "TICKET-#0458",
      date: "2026-08-06",
      driverName: "강동원 기사",
      carPlate: "서울 88바 1234 (25톤)",
      companyName: "(주) 대진운송",
      phone: "010-8910-1112",
      tripCount: 4,
      unitPrice: 450000,
      totalFare: 1800000,
      status: "수령 확인",
      siteId: registeredSiteList[0]?.id || 1,
      siteName: registeredSiteList[0]?.name || "인천 검단 3공구",
    },
    {
      ticketId: "TICKET-#0459",
      date: "2026-08-06",
      driverName: "유재석 기사",
      carPlate: "인천 82가 9999 (25톤)",
      companyName: "개인 차주",
      phone: "010-1234-9999",
      tripCount: 3,
      unitPrice: 450000,
      totalFare: 1350000,
      status: "정산 검토",
      siteId: registeredSiteList[0]?.id || 1,
      siteName: registeredSiteList[0]?.name || "인천 검단 3공구",
    },
    {
      ticketId: "TICKET-#0460",
      date: "2026-08-05",
      driverName: "마동석 기사",
      carPlate: "경기 80사 5678 (25톤)",
      companyName: "(주) 삼성이엔씨",
      phone: "010-5678-1234",
      tripCount: 5,
      unitPrice: 450000,
      totalFare: 2250000,
      status: "정산 완료",
      siteId: registeredSiteList[1]?.id || 2,
      siteName: registeredSiteList[1]?.name || "신길동 아파트 현장",
    },
  ];

  // 운송사별 실제 덤프비 정산 목록 (Fleet Company 기반 데이터 구조)
  const companyExpensesData = [
    {
      companyId: 101,
      companyName: "(주) 대진운송",
      ceoName: "이대진",
      bizRegNo: "120-81-45678",
      driverCount: 8,
      totalTrips: 32,
      totalAmount: 14400000,
      taxInvoiceStatus: "발행 완료",
      status: "정산 완료",
      siteName: registeredSiteList[0]?.name || "인천 검단 3공구",
    },
    {
      companyId: 102,
      companyName: "(주) 삼성이엔씨",
      ceoName: "김삼성",
      bizRegNo: "214-88-12345",
      driverCount: 5,
      totalTrips: 18,
      totalAmount: 8100000,
      taxInvoiceStatus: "승인 대기",
      status: "지급 검토",
      siteName: registeredSiteList[1]?.name || "신길동 아파트 현장",
    },
  ];

  const filteredDriverData = driverExpensesData.filter((item) => {
    if (selectedSiteId && item.siteId !== Number(selectedSiteId)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.driverName.toLowerCase().includes(q) ||
      item.carPlate.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q)
    );
  });

  const totalDriverFare = filteredDriverData.reduce((acc, curr) => acc + curr.totalFare, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장 덤프비 정산 확인</h2>
          <p className="text-xs text-slate-500 mt-1">
            개별 덤프트럭 기사 및 소속 운송사별 운반비(덤프비) 발생 정산 대장을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert("덤프비 정산 대장 엑셀 파일이 출력되었습니다.")}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10"
        >
          덤프비 정산 대장 엑셀
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">금월 덤프비 정산 총액</span>
          <div className="text-2xl font-black text-slate-900">₩ {totalDriverFare.toLocaleString()}</div>
          <p className="text-[10px] text-emerald-600 font-bold">기사 {filteredDriverData.length}명 정산 연동중</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">운송사 정산 대상</span>
          <div className="text-2xl font-black text-blue-600">{companyExpensesData.length} 개 운송사</div>
          <p className="text-[10px] text-blue-500 font-bold">세금계산서 연동중</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">정산 마감 현황</span>
          <div className="text-2xl font-black text-amber-600">정상 진행중</div>
          <p className="text-[10px] text-amber-600 font-bold">월말 마감 예정</p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
        {/* Navigation Tabs & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 pb-3 gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("DRIVER")}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                activeTab === "DRIVER"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              개별 기사별 정산 대장
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("COMPANY")}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                activeTab === "COMPANY"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              운송사별 정산 대장
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : "")}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="">전체 현장 선택</option>
              {registeredSiteList.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            {activeTab === "DRIVER" && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="기사명, 차량번호 검색..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 1. Tab A: Driver-Based Table (개별 기사별 정산) */}
        {activeTab === "DRIVER" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">티켓 번호</th>
                  <th className="py-3 px-4">운행 일자</th>
                  <th className="py-3 px-4">기사명</th>
                  <th className="py-3 px-4">차량번호 (톤수)</th>
                  <th className="py-3 px-4">소속 운송사</th>
                  <th className="py-3 px-4">운행 횟수</th>
                  <th className="py-3 px-4">개별 덤프비</th>
                  <th className="py-3 px-4">정산 상태</th>
                  <th className="py-3 px-4 text-right">상세 명세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredDriverData.map((row) => (
                  <tr key={row.ticketId} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{row.ticketId}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{row.date}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">{row.driverName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{row.carPlate}</td>
                    <td className="py-3.5 px-4 font-bold text-blue-600">{row.companyName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{row.tripCount} 회</td>
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900">{row.totalFare.toLocaleString()} 원</td>
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
                            row.status = "송금 완료";
                            alert(`[${row.driverName}] 기사에게 계좌 송금 완료 및 수령 확인 요청을 전송했습니다.`);
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                        >
                          송금 처리
                        </button>
                      )}
                      {row.status === "송금 완료" && (
                        <span className="text-[11px] text-indigo-600 font-bold">기사 수령 확인 대기</span>
                      )}
                      {row.status === "수령 확인" && (
                        <button
                          type="button"
                          onClick={() => {
                            row.status = "정산 마감";
                            alert(`[${row.driverName}] 정산 건이 상호 확인 완료되어 최종 마감되었습니다.`);
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
                        onClick={() => alert(`[${row.driverName}] 기사의 덤프비 미터기 상세 정산 명세서가 출력되었습니다.`)}
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
        )}

        {/* 2. Tab B: Company-Based Table (운송사별 정산) */}
        {activeTab === "COMPANY" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">운송사 명칭</th>
                  <th className="py-3 px-4">대표자</th>
                  <th className="py-3 px-4">사업자 등록번호</th>
                  <th className="py-3 px-4">소속 기사 수</th>
                  <th className="py-3 px-4">총 운행건수</th>
                  <th className="py-3 px-4">총 덤프 정산액</th>
                  <th className="py-3 px-4">세금계산서</th>
                  <th className="py-3 px-4 text-right">정산 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {companyExpensesData.map((comp) => (
                  <tr key={comp.companyId} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">{comp.companyName}</td>
                    <td className="py-3.5 px-4 text-slate-700">{comp.ceoName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{comp.bizRegNo}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{comp.driverCount} 명</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{comp.totalTrips} 건</td>
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900">{comp.totalAmount.toLocaleString()} 원</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-blue-50 text-blue-600 border border-blue-200">
                        {comp.taxInvoiceStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {comp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
