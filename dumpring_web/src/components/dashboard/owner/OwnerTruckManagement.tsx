import React from "react";

interface OwnerTruckManagementProps {
  setActivePath: (path: string) => void;
}

export function OwnerTruckManagement({ setActivePath }: OwnerTruckManagementProps) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">소속 차량 및 덤프 기사 대장</h2>
          <p className="text-xs text-slate-500 mt-1">운송사 소속 등록 차량 18대의 차량번호, 톤수, 등록 서류 및 기사 매핑 상태를 관리합니다.</p>
        </div>
        <button onClick={() => setActivePath("/owner")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
          ← 대시보드로 돌아가기
        </button>
      </div>

      <div className="border rounded-xl overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
            <tr>
              <th className="p-3">차량번호</th>
              <th className="p-3">톤수</th>
              <th className="p-3">담당 기사</th>
              <th className="p-3">연락처</th>
              <th className="p-3">가동 상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            <tr>
              <td className="p-3 font-mono font-bold">경기80사1234</td>
              <td className="p-3">25.5 톤</td>
              <td className="p-3">김철수</td>
              <td className="p-3 font-mono">010-1111-2222</td>
              <td className="p-3 text-emerald-600 font-bold">가동 중</td>
            </tr>
            <tr>
              <td className="p-3 font-mono font-bold">경기80사5678</td>
              <td className="p-3">25.5 톤</td>
              <td className="p-3">이영희</td>
              <td className="p-3 font-mono">010-3333-4444</td>
              <td className="p-3 text-emerald-600 font-bold">가동 중</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
