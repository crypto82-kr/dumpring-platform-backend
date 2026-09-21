import React, { useState, useEffect } from "react";
import {
  Percent,
  PlusCircle,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Sun,
  Moon,
  Info,
  DollarSign
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface TonnageTariff {
  code: string;
  name: string;
  desc: string;
  base_tariff: number;
}

interface PlatformAdminFeeManagementProps {
  setActivePath: (path: string) => void;
}

export function PlatformAdminFeeManagement({ setActivePath }: PlatformAdminFeeManagementProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. 톤수별 기본 운임
  const [tonnages, setTonnages] = useState<TonnageTariff[]>([]);
  
  // 2. 플랫폼 수수료율 (%)
  const [commissionRate, setCommissionRate] = useState<number>(5.0);

  // 3. 미터기 계산 방식
  const [calcMethod, setCalcMethod] = useState<"CONTINUOUS" | "OVER_PLAN">("CONTINUOUS");
  const [continuousDistanceFare, setContinuousDistanceFare] = useState<number>(1000);
  const [continuousTimeFare, setContinuousTimeFare] = useState<number>(200);
  const [overPlanDistanceFare, setOverPlanDistanceFare] = useState<number>(1500);
  const [overPlanTimeFare, setOverPlanTimeFare] = useState<number>(200);

  // 4. 출퇴근 피크타임 할증 설정
  const [peakPricingEnabled, setPeakPricingEnabled] = useState<boolean>(false);
  const [morningPeakStart, setMorningPeakStart] = useState<string>("07:00");
  const [morningPeakEnd, setMorningPeakEnd] = useState<string>("09:30");
  const [morningDistanceFare, setMorningDistanceFare] = useState<number>(1300);
  const [morningTimeFare, setMorningTimeFare] = useState<number>(250);

  const [eveningPeakStart, setEveningPeakStart] = useState<string>("17:00");
  const [eveningPeakEnd, setEveningPeakEnd] = useState<string>("20:00");
  const [eveningDistanceFare, setEveningDistanceFare] = useState<number>(1300);
  const [eveningTimeFare, setEveningTimeFare] = useState<number>(250);

  // 5. 상·하차 승인 및 자재 검수 모드 (현장/하차지가 기사 QR 촬영 vs 기사가 현장/하차지 고정 QR 촬영)
  const [approvalMode, setApprovalMode] = useState<"MANAGER_SCANS_DRIVER" | "DRIVER_SCANS_SITE">("MANAGER_SCANS_DRIVER");
  const [dropoffInspectionMode, setDropoffInspectionMode] = useState<"MANAGER_SCANS_DRIVER" | "DRIVER_SCANS_SITE">("MANAGER_SCANS_DRIVER");

  // 모의 계산용 선택된 톤수
  const [simSelectedTonnageCode, setSimSelectedTonnageCode] = useState<string>("");

  // 백엔드 DB에서 요금 정책 로드
  const fetchPricingPolicy = async () => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/common-codes/pricing-policy`);
      if (res.ok) {
        const data = await res.json();
        setTonnages(data.tonnage_tariffs || []);
        if (data.tonnage_tariffs && data.tonnage_tariffs.length > 0) {
          setSimSelectedTonnageCode(data.tonnage_tariffs[0].code);
        }
        setCommissionRate(data.commission_rate ?? 5.0);
        setCalcMethod(data.calculation_method || "CONTINUOUS");
        setContinuousDistanceFare(data.continuous_distance_unit_fare ?? 1000);
        setContinuousTimeFare(data.continuous_time_unit_fare ?? 200);
        setOverPlanDistanceFare(data.over_plan_distance_unit_fare ?? 1500);
        setOverPlanTimeFare(data.over_plan_time_unit_fare ?? 200);

        setPeakPricingEnabled(data.peak_pricing_enabled ?? false);
        setMorningPeakStart(data.morning_peak_start || "07:00");
        setMorningPeakEnd(data.morning_peak_end || "09:30");
        setMorningDistanceFare(data.morning_distance_unit_fare ?? 1300);
        setMorningTimeFare(data.morning_time_unit_fare ?? 250);

        setEveningPeakStart(data.evening_peak_start || "17:00");
        setEveningPeakEnd(data.evening_peak_end || "20:00");
        setEveningDistanceFare(data.evening_distance_unit_fare ?? 1300);
        setEveningTimeFare(data.evening_time_unit_fare ?? 250);

        setApprovalMode(data.approval_mode || "MANAGER_SCANS_DRIVER");
        setDropoffInspectionMode(data.dropoff_inspection_mode || "MANAGER_SCANS_DRIVER");
      }
    } catch (err) {
      console.error("요금 정책 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingPolicy();
  }, []);

  // 톤수별 단가 변경
  const handleTariffChange = (code: string, newTariff: number) => {
    setTonnages(prev =>
      prev.map(t => t.code === code ? { ...t, base_tariff: newTariff } : t)
    );
  };

  // 신규 톤수 추가
  const handleAddTonnage = () => {
    const codeInput = prompt("새로운 톤수 공통코드를 입력하세요 (예: T_10, T_30):", "T_30");
    if (!codeInput) return;
    const cleanCode = codeInput.trim().toUpperCase();
    if (tonnages.some(t => t.code === cleanCode)) {
      alert("이미 존재하는 톤수 코드입니다.");
      return;
    }
    const nameInput = prompt("톤수 명칭을 입력하세요 (예: 10톤, 27톤):", "10톤");
    if (!nameInput) return;
    const descInput = prompt("톤수 설명을 입력하세요:", "중형 덤프트럭");
    const tariffInput = prompt("기본 운반 단가(원)를 입력하세요:", "120000");

    if (nameInput && tariffInput) {
      const newT: TonnageTariff = {
        code: cleanCode,
        name: nameInput,
        desc: descInput || "",
        base_tariff: Number(tariffInput) || 120000
      };
      setTonnages(prev => [...prev, newT]);
      if (!simSelectedTonnageCode) setSimSelectedTonnageCode(cleanCode);
    }
  };

  // 톤수 항목 삭제
  const handleDeleteTonnage = (code: string) => {
    if (confirm(`톤수 [${code}] 항목을 삭제하시겠습니까?`)) {
      setTonnages(prev => prev.filter(t => t.code !== code));
      if (simSelectedTonnageCode === code && tonnages.length > 1) {
        setSimSelectedTonnageCode(tonnages.filter(t => t.code !== code)[0].code);
      }
    }
  };

  // 정책 전체 저장
  const handleSavePolicy = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/common-codes/pricing-policy`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tonnage_tariffs: tonnages,
          commission_rate: commissionRate,
          calculation_method: calcMethod,
          continuous_distance_unit_fare: continuousDistanceFare,
          continuous_time_unit_fare: continuousTimeFare,
          over_plan_distance_unit_fare: overPlanDistanceFare,
          over_plan_time_unit_fare: overPlanTimeFare,
          peak_pricing_enabled: peakPricingEnabled,
          morning_peak_start: morningPeakStart,
          morning_peak_end: morningPeakEnd,
          morning_distance_unit_fare: morningDistanceFare,
          morning_time_unit_fare: morningTimeFare,
          evening_peak_start: eveningPeakStart,
          evening_peak_end: eveningPeakEnd,
          evening_distance_unit_fare: eveningDistanceFare,
          evening_time_unit_fare: eveningTimeFare,
          approval_mode: approvalMode,
          dropoff_inspection_mode: dropoffInspectionMode,
        })
      });

      if (res.ok) {
        const msg = "수수료, 운임 및 자재 검수/승인 정책이 성공적으로 수정 및 DB에 저장되었습니다.";
        setSuccessMessage(msg);
        alert("✅ 정책 수정 완료!\n\n수수료, 운임 및 자재 검수/승인 정책이 성공적으로 저장 및 즉시 반영되었습니다.");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`❌ 저장 실패: ${err.detail || "오류가 발생했습니다."}`);
      }
    } catch (e) {
      console.error("저장 통신 오류:", e);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 모의 수수료 계산
  const selectedTonnageData = tonnages.find(t => t.code === simSelectedTonnageCode) || tonnages[0];
  const simBase = selectedTonnageData ? selectedTonnageData.base_tariff : 180000;
  const simFee = Math.round(simBase * (commissionRate / 100));

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-sm">운임 및 수수료 정책을 DB에서 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 animate-fadeIn shadow-2xl">
      {/* 헤더 */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            공통코드 기반 톤수별 운임 및 수수료 설정
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-200 font-bold">
              Enterprise 정책국
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            차량 톤수별 기본 운임, 플랫폼 수수료, 실시간 미터기 단가 및 출퇴근 시간대별 할증 단가를 DB와 양방향 동기화 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePath("/admin")}
            className="px-3.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl active:scale-95 transition-all"
          >
            ← 대시보드로 돌아가기
          </button>
          <button
            onClick={handleSavePolicy}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "저장 중..." : "전체 정책 DB 저장 및 적용"}
          </button>
        </div>
      </div>

      {/* 최상단 고정 플로팅 토스트 알림 (스크롤 위치와 무관하게 화면 상단 중앙에 즉시 노출) */}
      {successMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-emerald-500/50 backdrop-blur-md animate-bounce-short">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-black text-emerald-400">정책 저장 완료</p>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* 성공 알림 인라인 배너 */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-xs font-extrabold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100/80 px-2.5 py-1 rounded-md">
            실시간 적용됨
          </span>
        </div>
      )}

      {/* 메인 2단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측 2열: 톤수별 기본단가 & 플랫폼 수수료율 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. 톤수별 기본단가 조율 */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  1. 등록된 톤수별 공통코드 및 기본단가 (TONNAGE_TARIFF)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  현장 배차 요청 시 선택한 톤수에 따라 기본 착수 운임으로 자동 산출됩니다.
                </p>
              </div>
              <button
                onClick={handleAddTonnage}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                신규 톤수 등록
              </button>
            </div>

            {tonnages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                등록된 톤수 요금 정책이 없습니다. 상단 '신규 톤수 등록'을 눌러 추가해주세요.
              </div>
            ) : (
              <div className="space-y-3.5">
                {tonnages.map((t) => (
                  <div
                    key={t.code}
                    className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {t.name} {t.desc ? `(${t.desc})` : ""}
                          </span>
                          <span className="text-[9px] bg-slate-100 border border-slate-250 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">
                            {t.code}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">기본단가(원):</span>
                          <input
                            type="number"
                            value={t.base_tariff}
                            onChange={(e) => handleTariffChange(t.code, Number(e.target.value))}
                            className="w-28 px-2.5 py-1 border border-slate-300 rounded font-mono text-xs text-right font-black text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteTonnage(t.code)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-400 font-bold font-mono">10만</span>
                      <input
                        type="range"
                        min={100000}
                        max={350000}
                        step={5000}
                        value={t.base_tariff}
                        onChange={(e) => handleTariffChange(t.code, Number(e.target.value))}
                        className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-bold font-mono">35만원</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. 플랫폼 중개 수수료율 설정 */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  2. 플랫폼 중개 수수료율 (COMMISSION_POLICY)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  오더 완료 및 운임 정산 시 플랫폼이 차감 또는 부과하는 수수료 요율입니다.
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-indigo-600 font-mono">{commissionRate}%</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-600">수수료율 조정:</span>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 accent-indigo-600 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.1}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 border border-slate-300 rounded font-mono text-xs text-right font-black text-indigo-600"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>

              {/* 실시간 모의 정산기 */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-700">모의 정산 예시:</span>
                  <select
                    value={simSelectedTonnageCode}
                    onChange={(e) => setSimSelectedTonnageCode(e.target.value)}
                    className="px-2 py-0.5 bg-white border border-indigo-200 rounded font-bold text-slate-800 text-[11px]"
                  >
                    {tonnages.map(t => (
                      <option key={t.code} value={t.code}>{t.name} ({t.base_tariff.toLocaleString()}원)</option>
                    ))}
                  </select>
                </div>
                <div className="font-mono font-bold text-indigo-900">
                  건당 플랫폼 수수료: <span className="text-indigo-600 font-extrabold">{simFee.toLocaleString()}원</span> (기사 정산: {(simBase - simFee).toLocaleString()}원)
                </div>
              </div>
            </div>
          </div>

          {/* 3. 출퇴근 피크타임 요금 정책 (신규 추가된 부분) */}
          <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm space-y-4">
            <div className="border-b border-amber-200 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  3. 출퇴근 시간대별 할증 단가 설정 (PEAK_PRICING_POLICY)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  교통 체증이 심한 출근 및 퇴근 시간대에 별도의 거리단가와 시간단가를 자동 적용합니다.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={peakPricingEnabled}
                  onChange={(e) => setPeakPricingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                <span className="ml-2 text-xs font-black text-slate-700">
                  {peakPricingEnabled ? "피크 할증 가동 중" : "비활성"}
                </span>
              </label>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${peakPricingEnabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
              {/* 출근 피크 설정 */}
              <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900 border-b border-amber-100 pb-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>출근 시간대 설정</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">적용 시간 범위:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={morningPeakStart}
                        onChange={(e) => setMorningPeakStart(e.target.value)}
                        className="px-2 py-0.5 border border-slate-300 rounded font-mono text-xs font-bold text-slate-800"
                      />
                      <span className="text-slate-400">~</span>
                      <input
                        type="time"
                        value={morningPeakEnd}
                        onChange={(e) => setMorningPeakEnd(e.target.value)}
                        className="px-2 py-0.5 border border-slate-300 rounded font-mono text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">출근 거리 단가:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={morningDistanceFare}
                        onChange={(e) => setMorningDistanceFare(Number(e.target.value))}
                        className="w-20 px-2 py-0.5 border border-slate-300 rounded text-right font-mono font-black text-amber-600 text-xs"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">원/km</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">출근 시간 단가:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={morningTimeFare}
                        onChange={(e) => setMorningTimeFare(Number(e.target.value))}
                        className="w-20 px-2 py-0.5 border border-slate-300 rounded text-right font-mono font-black text-amber-600 text-xs"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">원/분</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 퇴근 피크 설정 */}
              <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900 border-b border-amber-100 pb-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>퇴근 시간대 설정</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">적용 시간 범위:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={eveningPeakStart}
                        onChange={(e) => setEveningPeakStart(e.target.value)}
                        className="px-2 py-0.5 border border-slate-300 rounded font-mono text-xs font-bold text-slate-800"
                      />
                      <span className="text-slate-400">~</span>
                      <input
                        type="time"
                        value={eveningPeakEnd}
                        onChange={(e) => setEveningPeakEnd(e.target.value)}
                        className="px-2 py-0.5 border border-slate-300 rounded font-mono text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">퇴근 거리 단가:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={eveningDistanceFare}
                        onChange={(e) => setEveningDistanceFare(Number(e.target.value))}
                        className="w-20 px-2 py-0.5 border border-slate-300 rounded text-right font-mono font-black text-amber-600 text-xs"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">원/km</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">퇴근 시간 단가:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={eveningTimeFare}
                        onChange={(e) => setEveningTimeFare(Number(e.target.value))}
                        className="w-20 px-2 py-0.5 border border-slate-300 rounded text-right font-mono font-black text-amber-600 text-xs"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">원/분</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 1열: 실시간 미터기 요금 계산 방식 설정 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                4. 실시간 미터기 요금 계산 방식
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                관리자 선택에 따라 기사 앱 미터기 계산 공식이 무선으로 실시간 스위칭됩니다.
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 block">정산 계산 방식 선택</label>

              {/* 연속 누적 방식 */}
              <div
                onClick={() => setCalcMethod("CONTINUOUS")}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  calcMethod === "CONTINUOUS"
                    ? "bg-blue-50/60 border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="calcMethod"
                    checked={calcMethod === "CONTINUOUS"}
                    onChange={() => setCalcMethod("CONTINUOUS")}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="font-extrabold text-xs text-slate-900">연속 누적 방식 (CONTINUOUS)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed pl-5">
                  운행 시작 즉시 기본요금에 전체 주행거리 및 시간에 비례한 요금이 계속 가산됩니다. (일반 택시 방식)
                </p>
              </div>

              {/* 계획 초과분 가산 방식 */}
              <div
                onClick={() => setCalcMethod("OVER_PLAN")}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  calcMethod === "OVER_PLAN"
                    ? "bg-blue-50/60 border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="calcMethod"
                    checked={calcMethod === "OVER_PLAN"}
                    onChange={() => setCalcMethod("OVER_PLAN")}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="font-extrabold text-xs text-slate-900">계획 초과분 가산 방식 (OVER_PLAN)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed pl-5">
                  예정된 사전 경로(거리/시간) 이내에는 기본요금만 청구되며, 초과한 거리와 시간에 대해서만 할증 가산합니다.
                </p>
              </div>
            </div>

            {/* 방식별 요금 단가 세부 설정 */}
            <div className="space-y-4 pt-2 border-t border-slate-200/60">
              <label className="text-xs font-bold text-slate-700 block">방식별 상시 요금 가산 단가</label>

              <div
                className={`p-3 rounded-xl border space-y-3 transition-opacity ${
                  calcMethod === "CONTINUOUS" ? "bg-white border-blue-200 opacity-100" : "bg-slate-100/50 border-slate-200 opacity-60"
                }`}
              >
                <div className="text-[11px] font-black text-blue-900 border-b border-slate-100 pb-1.5">
                  연속 누적 단가 설정
                </div>
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                  <span>상시 거리 단가 (원/km)</span>
                  <input
                    type="number"
                    disabled={calcMethod !== "CONTINUOUS"}
                    value={continuousDistanceFare}
                    onChange={(e) => setContinuousDistanceFare(Number(e.target.value))}
                    className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                  <span>상시 시간 단가 (원/분)</span>
                  <input
                    type="number"
                    disabled={calcMethod !== "CONTINUOUS"}
                    value={continuousTimeFare}
                    onChange={(e) => setContinuousTimeFare(Number(e.target.value))}
                    className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-3 transition-opacity ${
                  calcMethod === "OVER_PLAN" ? "bg-white border-blue-200 opacity-100" : "bg-slate-100/50 border-slate-200 opacity-60"
                }`}
              >
                <div className="text-[11px] font-black text-blue-900 border-b border-slate-100 pb-1.5">
                  계획 초과분 단가 설정
                </div>
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                  <span>초과 거리 단가 (원/km)</span>
                  <input
                    type="number"
                    disabled={calcMethod !== "OVER_PLAN"}
                    value={overPlanDistanceFare}
                    onChange={(e) => setOverPlanDistanceFare(Number(e.target.value))}
                    className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                  <span>초과 시간 단가 (원/분)</span>
                  <input
                    type="number"
                    disabled={calcMethod !== "OVER_PLAN"}
                    value={overPlanTimeFare}
                    onChange={(e) => setOverPlanTimeFare(Number(e.target.value))}
                    className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right font-bold text-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. 상·하차 자재 검수 및 승인 방식 설정 (신규) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-indigo-600" />
                  4. 상차 및 하차 자재 검수/승인 방식 정책 (APPROVAL_MODE)
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  현장(상차지) 출발 및 사토장(하차지) 도착 시 자재 확인과 승인을 진행할 주체 및 방식을 결정합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 상차지 승인 방식 */}
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold text-slate-800 block">
                    [상차지] 출발 전 자재 적재 승인 방식
                  </span>
                  <div className="space-y-2">
                    <label
                      onClick={() => setApprovalMode("MANAGER_SCANS_DRIVER")}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        approvalMode === "MANAGER_SCANS_DRIVER"
                          ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="approvalMode"
                        checked={approvalMode === "MANAGER_SCANS_DRIVER"}
                        onChange={() => setApprovalMode("MANAGER_SCANS_DRIVER")}
                        className="mt-0.5 h-3.5 w-3.5 text-blue-600 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          📱 현장 관리자가 기사 QR 촬영 (추천)
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          기사가 띄운 상차 티켓 QR을 현장 관리자(앱)가 촬영하여 자재 확인 후 승인 (PC 웹 수동승인 병행 지원)
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setApprovalMode("DRIVER_SCANS_SITE")}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        approvalMode === "DRIVER_SCANS_SITE"
                          ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="approvalMode"
                        checked={approvalMode === "DRIVER_SCANS_SITE"}
                        onChange={() => setApprovalMode("DRIVER_SCANS_SITE")}
                        className="mt-0.5 h-3.5 w-3.5 text-blue-600 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          📷 기사가 현장 고정 QR 촬영
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          현장 게이트나 사무실에 인쇄 부착된 현장 QR 코드를 기사가 촬영하여 위치 대조 후 자동 상차 승인
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 하차지 검수 방식 */}
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold text-slate-800 block">
                    [하차지] 사토장 도착 자재 검수 방식
                  </span>
                  <div className="space-y-2">
                    <label
                      onClick={() => setDropoffInspectionMode("MANAGER_SCANS_DRIVER")}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        dropoffInspectionMode === "MANAGER_SCANS_DRIVER"
                          ? "bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="dropoffInspectionMode"
                        checked={dropoffInspectionMode === "MANAGER_SCANS_DRIVER"}
                        onChange={() => setDropoffInspectionMode("MANAGER_SCANS_DRIVER")}
                        className="mt-0.5 h-3.5 w-3.5 text-indigo-600 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          📱 하차지 지주가 기사 QR 촬영 (추천)
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          도착한 기사의 QR을 하차지 관리자가 스캔하여 들고온 흙/토질을 눈으로 대조 후 반입 승인/회차 (PC 웹 수동검수 지원)
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setDropoffInspectionMode("DRIVER_SCANS_SITE")}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        dropoffInspectionMode === "DRIVER_SCANS_SITE"
                          ? "bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="dropoffInspectionMode"
                        checked={dropoffInspectionMode === "DRIVER_SCANS_SITE"}
                        onChange={() => setDropoffInspectionMode("DRIVER_SCANS_SITE")}
                        className="mt-0.5 h-3.5 w-3.5 text-indigo-600 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          📷 기사가 사토장 고정 QR 촬영
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          사토장 입구에 부착된 고정 QR을 기사가 촬영하여 도착 체크인 및 검수 승인 처리
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePolicy}
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "저장 중..." : "요금 정책 저장 및 적용"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
