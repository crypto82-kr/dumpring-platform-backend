import React from "react";
import { AlertCircle } from "lucide-react";
import { MockMap } from "./MockMap";

interface DropoffManagerDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  dropoffFormName: string;
  setDropoffFormName: (val: string) => void;
  dropoffFormAddress: string;
  setDropoffFormAddress: (val: string) => void;
  dropoffFormManagers: string;
  setDropoffFormManagers: (val: string) => void;
  dropoffFormSoilTypes: string[];
  setDropoffFormSoilTypes: (val: string[]) => void;
  dropoffFormCapacity: string;
  setDropoffFormCapacity: (val: string) => void;
  dropoffFormSoilDealType: "buy" | "sell";
  setDropoffFormSoilDealType: (val: "buy" | "sell") => void;
  registeredDropoffList: any[];
  setRegisteredDropoffList: React.Dispatch<React.SetStateAction<any[]>>;
  inboundTrucks: any[];
  handleVerifyInbound: (id: number) => void;
  dropoffVerifiedCount: number;
}

export function DropoffManagerDashboard({
  activePath,
  setActivePath,
  dropoffFormName,
  setDropoffFormName,
  dropoffFormAddress,
  setDropoffFormAddress,
  dropoffFormManagers,
  setDropoffFormManagers,
  dropoffFormSoilTypes,
  setDropoffFormSoilTypes,
  dropoffFormCapacity,
  setDropoffFormCapacity,
  dropoffFormSoilDealType,
  setDropoffFormSoilDealType,
  registeredDropoffList,
  setRegisteredDropoffList,
  inboundTrucks,
  handleVerifyInbound,
  dropoffVerifiedCount,
}: DropoffManagerDashboardProps) {
  
  const renderDropoffRegister = () => {
    const handleRegister = (e: React.FormEvent) => {
      e.preventDefault();
      if (!dropoffFormName || !dropoffFormAddress || !dropoffFormCapacity) {
        alert("하차지명, 주소, 총 용량은 필수 입력 항목입니다.");
        return;
      }

      const newDrop = {
        id: registeredDropoffList.length + 1,
        name: dropoffFormName,
        address: dropoffFormAddress,
        managers: dropoffFormManagers ? dropoffFormManagers.split(",").map(m => m.trim()) : ["담당자 미정"],
        soilTypes: dropoffFormSoilTypes,
        capacity: Number(dropoffFormCapacity.replace(/,/g, "")),
        soilDealType: dropoffFormSoilDealType
      };

      setRegisteredDropoffList(prev => [...prev, newDrop]);

      // Reset forms
      setDropoffFormName("");
      setDropoffFormAddress("");
      setDropoffFormManagers("");
      setDropoffFormCapacity("");
      setDropoffFormSoilDealType("sell");

      alert("신규 하차지가 성공적으로 신청 및 등록되었습니다.");
    };

    const handleDeleteDrop = (id: number) => {
      if (confirm("정말로 이 하차지를 삭제하시겠습니까?")) {
        setRegisteredDropoffList(prev => prev.filter(d => d.id !== id));
        alert("삭제되었습니다.");
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">하차지 등록 및 거래구분 관리</h2>
            <p className="text-xs text-slate-500 mt-1">거래 형태(판매/구매) 및 토사 한도 정보를 포함한 하차지를 등록 및 제어합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setActivePath("/dropoff")}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs transition-all"
          >
            ← 대시보드로 이동
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Registration Form */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">신규 하차지/사토장 등록</h3>
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold block">하차지/사토장 명칭 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={dropoffFormName}
                  onChange={(e) => setDropoffFormName(e.target.value)}
                  placeholder="예: 경기 김포 고촌 신축 사토장"
                  className="w-full bg-slate-55 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-705 font-bold block">계약 토사 총 용량 (㎥) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={dropoffFormCapacity}
                  onChange={(e) => setDropoffFormCapacity(e.target.value)}
                  placeholder="예: 45,000"
                  className="w-full bg-slate-55 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-705 font-bold block">주소 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={dropoffFormAddress}
                  onChange={(e) => setDropoffFormAddress(e.target.value)}
                  placeholder="예: 경기도 김포시 고촌읍 신곡리 789"
                  className="w-full bg-slate-55 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Transaction Type Choice */}
              <div className="space-y-1.5">
                <label className="text-slate-707 font-bold block">토사 거래 방식 구분 <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${dropoffFormSoilDealType === "sell"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold"
                      : "bg-white border-slate-200 text-slate-500"
                    }`}>
                    <input
                      type="radio"
                      name="dealType"
                      checked={dropoffFormSoilDealType === "sell"}
                      onChange={() => setDropoffFormSoilDealType("sell")}
                      className="sr-only"
                    />
                    <span className="text-base mb-1">💰</span>
                    <span>돈 받음 (판매)</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${dropoffFormSoilDealType === "buy"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                      : "bg-white border-slate-200 text-slate-500"
                    }`}>
                    <input
                      type="radio"
                      name="dealType"
                      checked={dropoffFormSoilDealType === "buy"}
                      onChange={() => setDropoffFormSoilDealType("buy")}
                      className="sr-only"
                    />
                    <span className="text-base mb-1">💳</span>
                    <span>돈 줌 (구매)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-707 font-bold block">하차 담당자 연락처</label>
                <input
                  type="text"
                  value={dropoffFormManagers}
                  onChange={(e) => setDropoffFormManagers(e.target.value)}
                  placeholder="예: 최하차 (010-8888-2222)"
                  className="w-full bg-slate-55 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-500/10 active:scale-95"
              >
                하차지 등록 및 신청 완료
              </button>
            </form>
          </div>

          {/* Right: List & Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* List of registered dropoffs */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">등록된 하차지 목록 및 거래방식</h3>
              <div className="space-y-3">
                {registeredDropoffList.map(drop => (
                  <div key={drop.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm">{drop.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${drop.soilDealType === "buy"
                            ? "bg-blue-50 text-blue-600 border-blue-205"
                            : "bg-emerald-50 text-emerald-600 border-emerald-205"
                          }`}>
                          {drop.soilDealType === "buy" ? "돈 줌 (구매) 💳" : "돈 받음 (판매) 💰"}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1">주소: {drop.address} | 허용토종: {drop.soilTypes.join(", ")}</p>
                      <p className="text-[10px] text-slate-600 font-bold mt-1">용량: {drop.capacity.toLocaleString()} ㎥ | 담당자: {drop.managers.join(", ")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDrop(drop.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Map Preview */}
            <MockMap title="하차지/사토장" address={dropoffFormAddress || "지도상의 매립 위치를 매핑합니다."} pinned={!!dropoffFormAddress} />
          </div>
        </div>
      </div>
    );
  };

  if (activePath === "/dropoff/register") {
    return renderDropoffRegister();
  }

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

  // Calculate dynamic values based on interactive verifications
  const verifiedVolume = dropoffVerifiedCount * 20; // 20㎥ per truck
  const totalVolume = 38000 + verifiedVolume;
  const capacityPercentage = Math.min(100, Math.round((totalVolume / 50000) * 100));

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
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-cyan-850">
                실시간 반입 연계
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-650 font-semibold">영종도 매립구역 C-3 구역 (현재 잔여 용량)</span>
                  <span className="font-black text-blue-600">{capacityPercentage}% ({totalVolume.toLocaleString()} / 50,000 ㎥)</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 overflow-hidden border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-505"
                    style={{ width: `${capacityPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center mt-2">
                <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">오전 반입량</p>
                  <p className="text-base font-black text-slate-800 mt-1">2,850 ㎥</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">오늘 추가 반입</p>
                  <p className="text-base font-black text-emerald-400 mt-1">+{verifiedVolume.toLocaleString()} ㎥</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">일일 최대 제한량</p>
                  <p className="text-base font-black text-slate-800 mt-1">8,000 ㎥</p>
                </div>
              </div>
            </div>
          </div>

          {/* Soil price statistics */}
          <div className="mt-4 p-4 rounded-xl bg-slate-100/40 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">금월 누적 토사 반입량 연동 흙값 정산액</span>
              <p className="text-2xl font-black text-emerald-450 mt-1">₩{soilRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <div>단가: 8,000원 / ㎥</div>
              <div className="text-slate-605 font-semibold mt-0.5">정산대장 정상 마감</div>
            </div>
          </div>
        </div>

        {/* Dynamic Push Notification Receiver Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h2 className="font-extrabold text-sm text-slate-800">실시간 운영 알림 수신함</h2>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-405 bg-amber-950/50 border border-amber-900/30 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Live Receive
              </span>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {[
                { id: 1, type: "배차알림", content: "삼부토건 인천 검단 3공구에서 사토 덤프 8대 출발 예정", time: "17:15" },
                { id: 2, type: "용량경고", content: "영종도 C구역 용량 75% 돌파 - 순차 진입 간격 제어 필요", time: "16:48" },
                { id: 3, type: "정산알림", content: "5월 흙값 정산 세금계산서 청구서가 플랫폼 본부에 승인 완료", time: "09:30" }
              ].map((alertItem) => (
                <div key={alertItem.id} className="p-3 rounded-lg bg-slate-100/50 border border-slate-200/60 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-cyan-900/30 font-mono">
                      {alertItem.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{alertItem.time}</span>
                  </div>
                  <p className="text-slate-707 font-medium leading-relaxed">{alertItem.content}</p>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850">
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
              <p className="text-xs text-slate-505 mt-0.5">게이트 하우스 진입 대기 트럭 반입 완료 승인 처리</p>
            </div>

            <div className="space-y-3">
              {inboundTrucks.map((truck) => (
                <div key={truck.id} className="p-4 rounded-xl bg-slate-100/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-sm">{truck.plate}</span>
                      <span className="text-[10px] text-slate-600 font-semibold">기사: {truck.driver} | 적재: {truck.weight}</span>
                    </div>
                    <div className="text-[11px] text-slate-505 mt-1">
                      출발시각: {truck.time} | 적재형태: <strong className="text-slate-650 font-bold">{truck.type}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${truck.status === "반입 완료"
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30"
                        : "bg-amber-950/60 text-amber-400 border-amber-800/30 animate-pulse"
                      }`}>
                      {truck.status}
                    </span>
                    {truck.status === "진입 대기" && (
                      <button
                        type="button"
                        onClick={() => handleVerifyInbound(truck.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-white text-xs shadow-lg shadow-cyan-500/10 transition-all active:scale-95"
                      >
                        반입 승인 완료
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850">
            전체 반입 완료 대장 조회
          </button>
        </div>

        {/* Pre-registered Drop-off Form (Leftover, styled nicely as a summary/shortcut card) */}
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
            className="w-full mt-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
          >
            하차지 등록 및 관리 화면으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
