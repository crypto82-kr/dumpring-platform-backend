import React from "react";
import { OwnerOverviewDashboard } from "./owner/OwnerOverviewDashboard";
import { OwnerScheduleManagement } from "./owner/OwnerScheduleManagement";
import { OwnerNoticeManagement } from "./owner/OwnerNoticeManagement";
import { OwnerSettlementManagement } from "./owner/OwnerSettlementManagement";
import { OwnerTruckManagement } from "./owner/OwnerTruckManagement";

interface OwnerDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  ownerBroadcastSuccess: boolean;
  setOwnerBroadcastSuccess: (val: boolean) => void;
}

export function OwnerDashboard({
  activePath,
  setActivePath,
  ownerBroadcastSuccess,
  setOwnerBroadcastSuccess,
}: OwnerDashboardProps) {
  // 1. 메인 대시보드 (/owner)
  if (activePath === "/owner") {
    return <OwnerOverviewDashboard setActivePath={setActivePath} />;
  }

  // 2. 배차 스케줄러 (/owner/schedule)
  if (activePath === "/owner/schedule") {
    return <OwnerScheduleManagement setActivePath={setActivePath} />;
  }

  // 3. 소속 차량 및 기사 관리 (/owner/trucks, /owner/drivers)
  if (activePath === "/owner/trucks" || activePath === "/owner/drivers") {
    return <OwnerTruckManagement setActivePath={setActivePath} />;
  }

  // 4. 정산 관리 (/owner/settlement)
  if (activePath === "/owner/settlement") {
    return <OwnerSettlementManagement setActivePath={setActivePath} />;
  }

  // 5. 알림 센터 (/owner/notice)
  if (activePath === "/owner/notice") {
    return (
      <OwnerNoticeManagement
        setActivePath={setActivePath}
        ownerBroadcastSuccess={ownerBroadcastSuccess}
        setOwnerBroadcastSuccess={setOwnerBroadcastSuccess}
      />
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-20 animate-fadeIn">
      <h2 className="text-lg font-bold text-slate-800">개발 진행 중</h2>
      <p className="text-xs text-slate-500 mt-2">선택하신 {activePath} 메뉴는 추가 개발 연동 대기 중입니다.</p>
    </div>
  );
}
