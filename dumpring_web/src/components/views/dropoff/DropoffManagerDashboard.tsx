import React from "react";
import { AlertCircle } from "lucide-react";
import DropoffRegisterManagement from "./DropoffRegisterManagement";
import DropoffAnnouncementManagement from "./DropoffAnnouncementManagement";
import DropoffDispatchManagement from "./DropoffDispatchManagement";
import DropoffSoilSettlementManagement from "./DropoffSoilSettlementManagement";
import DropoffTaxInvoiceManagement from "./DropoffTaxInvoiceManagement";
import DropoffStatsManagement from "./DropoffStatsManagement";
import DropoffAlertsManagement from "./DropoffAlertsManagement";
import DropoffHistoryManagement from "./DropoffHistoryManagement";

interface DropoffManagerDashboardProps {
  user?: any;
  activePath: string;
  setActivePath: (path: string) => void;
  dropoffFormName?: string;
  setDropoffFormName?: (val: string) => void;
  dropoffFormAddress?: string;
  setDropoffFormAddress?: (val: string) => void;
  dropoffFormManagers?: string;
  setDropoffFormManagers?: (val: string) => void;
  dropoffFormSoilTypes?: string[];
  setDropoffFormSoilTypes?: (val: string[]) => void;
  dropoffFormCapacity?: string;
  setDropoffFormCapacity?: (val: string) => void;
  dropoffFormSoilDealType?: "buy" | "sell";
  setDropoffFormSoilDealType?: (val: "buy" | "sell") => void;
  registeredDropoffList: any[];
  setRegisteredDropoffList?: React.Dispatch<React.SetStateAction<any[]>>;
  inboundTrucks: any[];
  handleVerifyInbound: (id: number) => void;
  dropoffVerifiedCount: number;
  dbCommonCodes?: any[];
  handleCreateDropoff?: (payload: any) => Promise<boolean>;
  handleDeleteDropoff?: (id: number) => Promise<boolean>;
  handleUpdateDropoff?: (id: number, payload: any) => Promise<boolean>;
  dispatchRequestList?: any[];
  handleUpdateDispatch?: (id: number, payload: any) => Promise<boolean>;
  dropoffRequestList?: any[];
  handleCreateDropoffRequest?: (payload: any) => Promise<boolean>;
  handleDeleteDropoffRequest?: (id: number) => Promise<boolean>;
  handleUpdateDropoffRequestStatus?: (id: number, status: string) => Promise<boolean>;
  handleUpdateDropoffRequest?: (id: number, payload: any) => Promise<boolean>;
  handleApproveJobPost?: (id: number) => Promise<boolean>;
  handleRejectJobPost?: (id: number, reason?: string) => Promise<boolean>;
  handleMatchJobPost?: (jobId: number, dropOffId: number) => Promise<boolean>;
  fetchOpenDropOffRequests?: () => Promise<void>;
  registeredSiteList?: any[];
  handleResetMatchJobPost?: (id: number) => Promise<boolean>;
}

export function DropoffManagerDashboard({
  user,
  activePath,
  setActivePath,
  registeredDropoffList,
  setRegisteredDropoffList,
  inboundTrucks,
  handleVerifyInbound,
  dropoffVerifiedCount,
  dbCommonCodes,
  handleCreateDropoff,
  handleDeleteDropoff,
  handleUpdateDropoff,
  dispatchRequestList = [],
  dropoffRequestList = [],
  handleCreateDropoffRequest,
  handleDeleteDropoffRequest,
  handleUpdateDropoffRequestStatus,
  handleUpdateDropoffRequest,
  handleApproveJobPost,
  handleRejectJobPost,
  fetchOpenDropOffRequests,
  registeredSiteList = [],
  handleResetMatchJobPost,
}: DropoffManagerDashboardProps) {

  // 1. 하차지 등록 메뉴 (/dropoff/register) ➔ 독립 모듈 컴포넌트 마운트
  if (activePath === "/dropoff/register") {
    return (
      <DropoffRegisterManagement
        user={user}
        registeredDropoffList={registeredDropoffList}
        setRegisteredDropoffList={setRegisteredDropoffList}
        dbCommonCodes={dbCommonCodes}
        handleCreateDropoff={handleCreateDropoff}
        handleDeleteDropoff={handleDeleteDropoff}
        handleUpdateDropoff={handleUpdateDropoff}
      />
    );
  }

  // 2. 수용 공고 관리 메뉴 (/dropoff/dispatch-request) ➔ 독립 모듈 컴포넌트 마운트
  if (activePath === "/dropoff/dispatch-request") {
    return (
      <DropoffAnnouncementManagement
        user={user}
        registeredDropoffList={registeredDropoffList}
        dropoffRequestList={dropoffRequestList}
        dispatchRequestList={dispatchRequestList}
        registeredSiteList={registeredSiteList}
        dbCommonCodes={dbCommonCodes}
        handleCreateDropoffRequest={handleCreateDropoffRequest}
        handleDeleteDropoffRequest={handleDeleteDropoffRequest}
        handleUpdateDropoffRequestStatus={handleUpdateDropoffRequestStatus}
        handleUpdateDropoffRequest={handleUpdateDropoffRequest}
        handleApproveJobPost={handleApproveJobPost}
        handleRejectJobPost={handleRejectJobPost}
        fetchOpenDropOffRequests={fetchOpenDropOffRequests}
        handleResetMatchJobPost={handleResetMatchJobPost}
      />
    );
  }

  // 3. 배차 관리 메뉴 (/dropoff/dispatch)
  if (activePath === "/dropoff/dispatch") {
    return (
      <DropoffDispatchManagement
        user={user}
        registeredDropoffList={registeredDropoffList}
        dropoffRequestList={dropoffRequestList}
        dispatchRequestList={dispatchRequestList}
        registeredSiteList={registeredSiteList}
        dbCommonCodes={dbCommonCodes}
      />
    );
  }

  // 4. 운송 이력 메뉴 (/dropoff/history)
  if (activePath === "/dropoff/history") {
    return (
      <DropoffHistoryManagement
        registeredDropoffList={registeredDropoffList}
        dispatchRequestList={dispatchRequestList}
        dbCommonCodes={dbCommonCodes}
      />
    );
  }

  // 5. 흙값 정산 메뉴 (/dropoff/soil-settlement)
  if (activePath === "/dropoff/soil-settlement") {
    return (
      <DropoffSoilSettlementManagement
        registeredDropoffList={registeredDropoffList}
        dbCommonCodes={dbCommonCodes}
      />
    );
  }

  // 6. 세금계산서 메뉴 (/dropoff/tax-invoice)
  if (activePath === "/dropoff/tax-invoice") {
    return (
      <DropoffTaxInvoiceManagement
        registeredDropoffList={registeredDropoffList}
        dbCommonCodes={dbCommonCodes}
      />
    );
  }

  // 7. 통계 보고서 메뉴 (/dropoff/stats)
  if (activePath === "/dropoff/stats") {
    return (
      <DropoffStatsManagement
        registeredDropoffList={registeredDropoffList}
      />
    );
  }

  // 8. 알림 센터 메뉴 (/dropoff/alerts)
  if (activePath === "/dropoff/alerts") {
    return <DropoffAlertsManagement />;
  }

  // 미정의 경로 대응
  if (activePath !== "/dropoff") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-16 space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">준비 중인 화면</h3>
        <p className="text-sm text-slate-500">'{activePath}' 메뉴는 현재 하차지 연동 점검 중입니다.</p>
        <button type="button" onClick={() => setActivePath("/dropoff")} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs">
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  // ==========================================
  // 9. 순수 하차지 메인 대시보드 화면 (/dropoff)
  // ==========================================
  const currentDropForStats = registeredDropoffList[0] || null;
  const maxCapacity = currentDropForStats?.capacity || 80000;

  const verifiedVolume = dropoffVerifiedCount * 20; // 20㎥ per truck
  const totalVolume = Math.min(maxCapacity, Math.floor(maxCapacity * 0.76) + verifiedVolume);
  const capacityPercentage = Math.min(100, Math.round((totalVolume / maxCapacity) * 100));

  const soilUnitPrice = 8000; // ㎥당 8,000원
  const soilRevenue = totalVolume * soilUnitPrice;

  return (
    <div className="space-y-6">
      {/* Upper Grid: Real-time Capacity Statistics & Soil Settlement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capacity Statistics */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h2 className="font-extrabold text-base text-slate-800">하차지 실시간 상태 & 정보 통계</h2>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                실시간 반입 연계
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-600 font-semibold">{currentDropForStats?.name || "선택된 사토장"} (현재 잔여 용량)</span>
                  <span className="font-black text-blue-600">{capacityPercentage}% ({totalVolume.toLocaleString()} / {maxCapacity.toLocaleString()} ㎥)</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${capacityPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center mt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">오전 반입량</p>
                  <p className="text-base font-black text-slate-800 mt-1">2,850 ㎥</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">오늘 추가 반입</p>
                  <p className="text-base font-black text-emerald-600 mt-1">+{verifiedVolume.toLocaleString()} ㎥</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">일일 최대 제한량</p>
                  <p className="text-base font-black text-slate-800 mt-1">8,000 ㎥</p>
                </div>
              </div>
            </div>
          </div>

          {/* Soil price statistics */}
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">금월 누적 토사 반입량 연동 흙값 정산액</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">₩{soilRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <div>단가: 8,000원 / ㎥</div>
              <div className="text-slate-600 font-semibold mt-0.5">정산대장 정상 마감</div>
            </div>
          </div>
        </div>

        {/* Dynamic Push Notification Receiver Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h2 className="font-extrabold text-sm text-slate-800">실시간 운영 알림 수신함</h2>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> Live Receive
              </span>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {[
                { id: 1, type: "배차알림", content: "삼부토건 인천 검단 3공구에서 사토 덤프 8대 출발 예정", time: "17:15" },
                { id: 2, type: "용량경고", content: "영종도 C구역 용량 75% 돌파 - 순차 진입 간격 제어 필요", time: "16:48" },
                { id: 3, type: "정산알림", content: "5월 흙값 정산 세금계산서 청구서가 플랫폼 본부에 승인 완료", time: "09:30" }
              ].map((alertItem) => (
                <div key={alertItem.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-mono">
                      {alertItem.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{alertItem.time}</span>
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">{alertItem.content}</p>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-bold">
            알림 수신 환경설정
          </button>
        </div>
      </div>

      {/* Lower Grid: Real-time Inbound verification & New Drop-off Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Inbound Verification list */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-base text-slate-800">실시간 반입 확인 및 현장 통제</h3>
              <p className="text-xs text-slate-500 mt-0.5">게이트 하우스 진입 대기 트럭 반입 완료 승인 처리</p>
            </div>

            <div className="space-y-3">
              {inboundTrucks.map((truck) => (
                <div key={truck.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-sm">{truck.plate}</span>
                      <span className="text-[10px] text-slate-600 font-semibold">기사: {truck.driver} | 적재: {truck.weight}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      출발시각: {truck.time} | 적재형태: <strong className="text-slate-600 font-bold">{truck.type}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      truck.status === "반입 완료"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                    }`}>
                      {truck.status}
                    </span>
                    {truck.status === "진입 대기" && (
                      <button
                        type="button"
                        onClick={() => handleVerifyInbound(truck.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                      >
                        반입 승인 완료
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-bold">
            전체 반입 완료 대장 조회
          </button>
        </div>

        {/* Pre-registered Drop-off Form Summary / Shortcut Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">사토지/하차지 신속 연동</h3>
              <span className="text-[9px] text-slate-500 font-bold">B2B 연계</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              현재 영종도 매립구역 C-3 구역이 활성화되어 있습니다. 신규 하차지를 정식 등록하여 거래 방식을 매핑하고 플랫폼에 연동하려면 아래 버튼을 눌러 이동해 주세요.
            </p>
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium">
              * 하차지 등록 메뉴에서는 토사 판매/구매 여부 지정 및 한도 정산 관리가 지원됩니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActivePath("/dropoff/register")}
            className="w-full mt-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
          >
            하차지 등록 및 관리 화면으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}

export default DropoffManagerDashboard;