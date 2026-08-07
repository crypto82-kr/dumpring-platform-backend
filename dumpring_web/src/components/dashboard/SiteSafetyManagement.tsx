"use client";

import React, { useState } from "react";
import { HardHat, AlertTriangle, PlusCircle, Bell, ShieldCheck } from "lucide-react";

interface SiteSafetyManagementProps {
  registeredSiteList?: any[];
}

export default function SiteSafetyManagement({
  registeredSiteList = [],
}: SiteSafetyManagementProps) {
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장 안전 공지 및 수칙 전송</h2>
          <p className="text-xs text-slate-500 mt-1">
            진출입 덤프트럭 기사 및 현장 작업자 대상 안전 지침, 위험 구간 공지 및 실시간 알림을 등록합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => alert("신규 현장 안전 공지 작성 창이 오픈되었습니다.")}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-amber-500/10"
        >
          + 신규 안전 공지 전송
        </button>
      </div>

      {/* Safety Notice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-md space-y-3 relative overflow-hidden">
          <div className="w-1.5 h-full bg-amber-500 absolute left-0 top-0"></div>
          <div className="flex justify-between items-start">
            <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-amber-50 text-amber-700 border border-amber-200">
              [긴급] 현장 진입로 서행 지침
            </span>
            <span className="text-[10px] font-mono text-slate-400">2026-08-07</span>
          </div>
          <h3 className="font-extrabold text-base text-slate-900">현장 A 게이트 인근 가설도로 우회 및 시속 10km 제한</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            현재 A 게이트 인근 배수로 공사로 인하여 바닥면 유실 위험이 있습니다. 덤프트럭 운행 기사님께서는 반드시 B 게이트 보조 진입로를 이용해 주시기 바랍니다.
          </p>
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-bold">
            <span>발신: 인천 검단 3공구 현장안전팀</span>
            <span className="text-blue-600">진입 기사 100% 팝업 완료</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md space-y-3">
          <div className="flex justify-between items-start">
            <span className="px-2.5 py-1 text-[10px] font-extrabold rounded bg-blue-50 text-blue-700 border border-blue-200">
              [일반] 장마철 수해 안전 수칙
            </span>
            <span className="text-[10px] font-mono text-slate-400">2026-08-01</span>
          </div>
          <h3 className="font-extrabold text-base text-slate-900">토사 적재 후 방수 덮개 필수 밀폐 착용 지침</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            우천 시 상차지에서 토사 적재 후 적재함 덮개를 완벽히 밀폐하지 않을 경우 도로 낙석 및 토사 유출 사고가 발생할 수 있습니다. 덮개미착용 시 출차 불가합니다.
          </p>
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-bold">
            <span>발신: 현장 관리 본부</span>
            <span className="text-slate-500">기본 수칙 수신중</span>
          </div>
        </div>
      </div>
    </div>
  );
}
