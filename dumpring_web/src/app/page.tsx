"use client";

import React, { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import {
  ShieldAlert,
  Clock,
  TrendingUp,
  MapPin,
  Truck,
  PlusCircle,
  CheckCircle,
  Database,
  Terminal,
  Activity,
  FileCheck,
  AlertCircle,
  Search,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";

export default function Home() {
  const { user, changeRole, activePath, setActivePath } = useAuth();
  const [inputText, setInputText] = useState("");
  
  // Interactive Simulation States
  const [commissionRate, setCommissionRate] = useState(8.5); // %
  const [baseTariff, setBaseTariff] = useState(180000); // 원
  const [approvalTab, setApprovalTab] = useState<"users" | "dropoffs">("users");
  const [dropoffSites, setDropoffSites] = useState([
    { id: 1, name: "인천 송도 남측 매립지 B구역", company: "삼부토건", status: "대기", capacity: "80,000 ㎥" },
    { id: 2, name: "경기 김포 고촌 신축 사토장", company: "대우건설", status: "대기", capacity: "45,000 ㎥" },
    { id: 3, name: "인천 청라 지구 매립지", company: "현대건설", status: "승인됨", capacity: "120,000 ㎥" },
  ]);

  // Disputes & Support States
  const [disputes, setDisputes] = useState([
    { id: 1, type: "운임 미지급", desc: "김포 사토장 - 송도 운행 2건 미지급", reporter: "홍길동 차주", status: "대기", date: "2026-05-27" },
    { id: 2, type: "배차 취소 갈등", desc: "검단 3공구 현장 일방적 당일 배차 취소", reporter: "김철수 기사", status: "중재 중", date: "2026-05-26" },
  ]);

  // Site Manager states
  const [taxInvoiceApproved, setTaxInvoiceApproved] = useState(false);

  // Drop-off Manager states
  const [dropoffVerifiedCount, setDropoffVerifiedCount] = useState(0);
  const [dropoffRegSuccess, setDropoffRegSuccess] = useState(false);
  const [inboundTrucks, setInboundTrucks] = useState([
    { id: 1, plate: "인천 88사 9081", driver: "이영희", time: "17:10:15", status: "진입 대기", type: "사토 (토사)", weight: "24.5 ton" },
    { id: 2, plate: "경기 82자 7732", driver: "박민수", time: "17:05:00", status: "진입 대기", type: "사토 (토사)", weight: "25.0 ton" },
  ]);

  // Owner states
  const [ownerBroadcastSuccess, setOwnerBroadcastSuccess] = useState(false);

  // Developer states
  const [menuTarget, setMenuTarget] = useState<"web" | "app">("web");
  const [menuSelectedRole, setMenuSelectedRole] = useState<string>("site_manager");
  const [menuConfigSaveSuccess, setMenuConfigSaveSuccess] = useState(false);
  const [developerMenus, setDeveloperMenus] = useState([
    { id: 1, name: "덤프비 정산 확인", target: "web", role: "site_manager", allowed: true },
    { id: 2, name: "흙값 정산 관리", target: "web", role: "site_manager", allowed: true },
    { id: 3, name: "운행 이력 조회", target: "web", role: "site_manager", allowed: true },
    { id: 4, name: "세금계산서 업무", target: "web", role: "site_manager", allowed: true },
    { id: 5, name: "실시간 반입 확인", target: "web", role: "dropoff_manager", allowed: true },
    { id: 6, name: "흙값 정산 관리 (하차지)", target: "web", role: "dropoff_manager", allowed: true },
    { id: 7, name: "시스템 DB 원격 터미널", target: "web", role: "platform_admin", allowed: false },
    { id: 8, name: "모바일 계량 전송", target: "app", role: "site_manager", allowed: true },
    { id: 9, name: "모바일 배차 서명", target: "app", role: "site_manager", allowed: true },
  ]);

  // APM States
  const [apmLoadTesting, setApmLoadTesting] = useState(false);

  if (!user) return null;

  const handleApproveDropoff = (id: number) => {
    setDropoffSites(prev =>
      prev.map(site => site.id === id ? { ...site, status: "승인됨" } : site)
    );
  };

  const handleResolveDispute = (id: number) => {
    setDisputes(prev =>
      prev.map(d => d.id === id ? { ...d, status: "해결됨" } : d)
    );
  };

  const handleVerifyInbound = (id: number) => {
    setInboundTrucks(prev =>
      prev.map(t => t.id === id ? { ...t, status: "반입 완료" } : t)
    );
    setDropoffVerifiedCount(prev => prev + 1);
  };

  const handleToggleMenuAllowed = (id: number) => {
    setDeveloperMenus(prev =>
      prev.map(m => m.id === id ? { ...m, allowed: !m.allowed } : m)
    );
  };

  // 1. 플랫폼 관리자 대시보드 렌더링 함수
  const renderPlatformAdmin = () => {
    const estimatedFeePerTrip = Math.round(baseTariff * (commissionRate / 100));
    const estimatedDriverRevenue = baseTariff - estimatedFeePerTrip;

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: "실시간 운행 중 트럭", val: "142대", change: "+12대 상승", icon: Truck, color: "text-blue-600 bg-blue-50" },
            { title: "금일 총 배차 완료", val: "847건", change: "+8.4% 전일비", icon: CheckCircle, color: "text-emerald-400 bg-emerald-950/50" },
            { title: "신규 승인 대기", val: `${3 + dropoffSites.filter(s => s.status === "대기").length}건`, change: "하차지 포함", icon: ShieldAlert, color: "text-amber-400 bg-amber-950/50" },
            { title: "금일 플랫폼 수수료 총액", val: `₩${Math.round(847 * estimatedFeePerTrip).toLocaleString()}`, change: "수수료율 연동 실시간 집계", icon: TrendingUp, color: "text-rose-400 bg-rose-950/50" }
          ].map((c, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-xs font-semibold text-slate-600">{c.title}</p>
                <h3 className="text-xl font-black mt-2 text-slate-900">{c.val}</h3>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">{c.change}</span>
              </div>
              <div className={`p-3 rounded-xl ${c.color} border border-slate-200`}>
                <c.icon className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Map & Interactive Approval queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-extrabold text-base text-slate-800">실시간 전국 덤프링 현장 지도 모니터링</h2>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Tracking
                </span>
              </div>
              <div className="h-64 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                <div className="relative z-10 flex flex-col items-center text-center px-6">
                  <MapPin className="w-8 h-8 text-blue-600 animate-bounce mb-2" />
                  <p className="text-sm font-semibold text-slate-700">인천 검단 3공구 현장 외 18개 현장 모니터링 중</p>
                  <p className="text-xs text-slate-500 mt-1">실시간 배차 트럭 위경도 데이터 수신 상태 정상 (1.2s 주기)</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-3">
              <span>최근 GPS 갱신: 방금 전</span>
              <button className="text-blue-600 font-bold hover:underline">상세 지도 보기 →</button>
            </div>
          </div>

          {/* Interactive Approvals (Users vs Drop-offs) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                <h2 className="font-extrabold text-sm text-slate-800">통합 승인 관리</h2>
                <div className="flex gap-1 text-[11px]">
                  <button
                    onClick={() => setApprovalTab("users")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      approvalTab === "users" ? "bg-blue-600 text-white text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 text-slate-600"
                    }`}
                  >
                    가입승인
                  </button>
                  <button
                    onClick={() => setApprovalTab("dropoffs")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      approvalTab === "dropoffs" ? "bg-blue-600 text-white text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 text-slate-600"
                    }`}
                  >
                    하차지승인
                  </button>
                </div>
              </div>

              {approvalTab === "users" ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {[
                    { name: "홍길동 (차주)", phone: "010-3333-4444", status: "면허 검증 완료" },
                    { name: "이순신 (기사)", phone: "010-9999-8888", status: "신청서 검토 중" },
                    { name: "강감찬 (운송사)", phone: "010-1111-2222", status: "사업자 확인 대기" }
                  ].map((ap, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50/40 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-800">{ap.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{ap.phone}</div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                        {ap.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {dropoffSites.map((site) => (
                    <div key={site.id} className="p-3 rounded-xl bg-slate-50/40 border border-slate-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-800">{site.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{site.company} | 용량: {site.capacity}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                          site.status === "승인됨" 
                            ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30" 
                            : "bg-amber-950/60 text-amber-400 border-amber-800/30"
                        }`}>
                          {site.status}
                        </span>
                      </div>
                      {site.status === "대기" && (
                        <button
                          onClick={() => handleApproveDropoff(site.id)}
                          className="w-full py-1 rounded bg-blue-50 hover:bg-blue-100 text-[10px] font-bold text-blue-600 border border-blue-200 transition-all active:scale-95"
                        >
                          하차지 정식 승인 처리
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
              전체 승인 대장 조회
            </button>
          </div>
        </div>

        {/* Dynamic Pricing & Commission Rates Settings panel */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div>
              <h2 className="font-extrabold text-base text-slate-800">기본 운임 및 플랫폼 수수료 실시간 설정</h2>
              <p className="text-xs text-slate-500 mt-0.5">매칭 성사 시 자동 부과되는 기본 단가와 중개 수수료율을 제어합니다.</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              실시간 시뮬레이션 적용 중
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Setting Input 1: Basic Tariff */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-semibold">1회 운반 기본 운임 단가</span>
                <span className="font-black text-slate-800">{baseTariff.toLocaleString()} 원</span>
              </div>
              <input
                type="range"
                min={100000}
                max={300000}
                step={5000}
                value={baseTariff}
                onChange={(e) => setBaseTariff(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                <span>100,000원</span>
                <span>300,000원</span>
              </div>
            </div>

            {/* Setting Input 2: Commission Rate */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-semibold">플랫폼 매칭 수수료율</span>
                <span className="font-black text-blue-600">{commissionRate} %</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={15.0}
                step={0.1}
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                <span>1.0% (최저)</span>
                <span>15.0% (최대)</span>
              </div>
            </div>

            {/* Calculation Output Card */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-bold">1회 배차당 예상 정산 금액</p>
                <div className="flex justify-between items-baseline mt-1.5">
                  <span className="text-[11px] text-slate-600">드라이버 수령액:</span>
                  <span className="text-sm font-extrabold text-slate-800">₩{estimatedDriverRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-[11px] text-blue-600">플랫폼 수수료액:</span>
                  <span className="text-sm font-extrabold text-blue-600">₩{estimatedFeePerTrip.toLocaleString()}</span>
                </div>
              </div>
              <button className="w-full mt-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-[11px] font-bold text-white shadow-lg shadow-blue-500/10 active:scale-95">
                운임단가 설정 적용하기
              </button>
            </div>
          </div>
        </div>

        {/* Dispute Management & Customer Support Boards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dispute Management Panel */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                <h2 className="font-extrabold text-sm text-slate-800">실시간 분쟁 및 현장 민원 조율</h2>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/50 border border-rose-900/30 px-2 py-0.5 rounded">
                  미해결 {disputes.filter(d => d.status !== "해결됨").length}건
                </span>
              </div>
              <div className="space-y-3">
                {disputes.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-slate-100/60 border border-slate-200 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-900/30 font-mono">
                          {d.type}
                        </span>
                        <span className="text-[11px] text-slate-600">{d.reporter} | {d.date}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold ${
                        d.status === "해결됨" ? "text-emerald-400" : d.status === "중재 중" ? "text-amber-400" : "text-rose-400"
                      }`}>
                        ● {d.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{d.desc}</p>
                    {d.status !== "해결됨" && (
                      <button
                        onClick={() => handleResolveDispute(d.id)}
                        className="py-1 rounded bg-blue-50 hover:bg-blue-100 text-[10px] font-bold text-blue-600 border border-blue-200 transition-all active:scale-95 text-center"
                      >
                        신고 중재 및 종결 처리 (해결 완료)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
              전체 분쟁 대장 및 이력 보기
            </button>
          </div>

          {/* Customer Support Boards Panel */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                <h2 className="font-extrabold text-sm text-slate-800">고객센터 및 통합 게시판 모니터링</h2>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                  신규 피드백 존재
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-4 rounded-xl bg-slate-100/50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-bold">미답변 1:1 문의</span>
                  <p className="text-2xl font-black text-amber-400 mt-1">4 건</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-100/50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-bold">오늘 등록된 공지</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">1 건</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-slate-100/40 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">[1:1 문의] 모바일 배차 알림 지연 관련 문의...</span>
                  <span className="text-[10px] text-slate-500 font-mono">16:12</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-100/40 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">[공지사항] 영종도 C구역 토요일 운영시간 변경 안내</span>
                  <span className="text-[10px] text-slate-500 font-mono">10:00</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-100/40 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">[자주묻는질문] 자동 정산 금액 오차가 발생했을 때...</span>
                  <span className="text-[10px] text-slate-500 font-mono">FAQ</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
                1:1 문의 답변하기
              </button>
              <button className="py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-bold text-white shadow-lg shadow-cyan-500/10">
                신규 공지/FAQ 작성
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. 현장 관리자 대시보드 렌더링 함수
  const renderSiteManager = () => (
    <div className="space-y-6">
      {/* Header section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">[인천 검단 3공구] 현장 관리 본부</h2>
          <p className="text-xs text-slate-600 mt-1">현장 고유 인증 코드: <span className="text-blue-600 font-mono font-bold">GD-3-DUMP</span></p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold text-white text-xs shadow-lg shadow-blue-500/10 active:scale-95">
            <PlusCircle className="w-4 h-4" />
            신규 배차 신청서 작성
          </button>
        </div>
      </div>

      {/* Main Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" /> 오늘 배차 요청 현황
          </h3>
          <div className="text-3xl font-black text-slate-900">12 / 20 대</div>
          <p className="text-xs text-slate-500 mt-1">오전 배차 100% 완료, 오후 추가 대기 중</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" /> 현재 하차 지정지
          </h3>
          <div className="text-base font-extrabold text-slate-900">인천 영종도 신공항 북측 매립지</div>
          <p className="text-xs text-slate-500 mt-1">경로 정체 지체 지연 없음 (운행 소요 35분)</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400" /> 실시간 평균 대기 시간
          </h3>
          <div className="text-3xl font-black text-rose-400">14 분</div>
          <p className="text-xs text-slate-500 mt-1">전년 동월 대비 8분 단축</p>
        </div>
      </div>

      {/* 덤프비 / 흙값 정산 및 세금계산서 업무 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dump & Soil Settlement */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-base text-slate-800">금월 현장 정산 및 단가 관리</h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/30">
                실시간 단가 연동
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dump truck expenses */}
              <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">덤프비 정산 확인 (운송료)</span>
                <p className="text-2xl font-black text-slate-900 mt-1.5">₩12,450,000</p>
                <div className="flex justify-between items-center text-[10px] text-slate-600 mt-3 pt-2.5 border-t border-slate-200/40">
                  <span>총 운반 횟수: 69회</span>
                  <span className="text-blue-600 font-bold">1회 평균 단가: 180,000원</span>
                </div>
              </div>

              {/* Soil / Earthwork expenses */}
              <div className="p-4 rounded-xl bg-slate-100/60 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">흙값 정산 관리 (토사비)</span>
                <p className="text-2xl font-black text-blue-600 mt-1.5">₩4,800,000</p>
                <div className="flex justify-between items-center text-[10px] text-slate-600 mt-3 pt-2.5 border-t border-slate-200/40">
                  <span>반출 흙 분량: 600 ㎥</span>
                  <span className="text-emerald-400 font-bold">㎥당 단가: 8,000원</span>
                </div>
              </div>
            </div>

            {/* Simulated mini dynamic pricing changer */}
            <div className="mt-4 p-3 rounded-xl bg-slate-100/30 border border-slate-200 text-xs flex justify-between items-center text-slate-600">
              <span>흙값(토사)㎥당 단가 조정: <strong>8,000원</strong></span>
              <span className="text-[10px] text-slate-500">단가 변경은 플랫폼 본부 승인 후 적용됩니다.</span>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
              덤프 운송 정산서 보기
            </button>
            <button className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
              사토/흙값 정산 대장
            </button>
          </div>
        </div>

        {/* Tax Invoice Module */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">세금계산서 발행 및 증빙</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                taxInvoiceApproved
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30"
                  : "bg-amber-950/60 text-amber-400 border-amber-800/30"
              }`}>
                {taxInvoiceApproved ? "승인완료" : "승인대기"}
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2">
                <div className="text-[11px] text-slate-500 font-bold">5월 정기 세금계산서 청구 건</div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-700 font-semibold">공급가액:</span>
                  <span className="text-sm font-black text-slate-900">₩17,250,000</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-700 font-semibold">세액 (10%):</span>
                  <span className="text-xs font-bold text-slate-600">₩1,725,000</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-slate-200/50 pt-2 mt-2">
                  <span className="text-xs text-slate-700 font-bold">합계금액:</span>
                  <span className="text-sm font-black text-blue-600">₩18,975,000</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 leading-relaxed leading-5">
                * 위 청구 내역은 덤프비 정산액과 흙값 정산액을 합산한 5월 분 반출 증빙 내역입니다. 발행 승인 시 홈택스 세금계산서가 자동 대행 발행됩니다.
              </div>
            </div>
          </div>

          {!taxInvoiceApproved ? (
            <button
              onClick={() => setTaxInvoiceApproved(true)}
              className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
            >
              전자 세금계산서 발행 최종 승인
            </button>
          ) : (
            <div className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold text-center">
              ✓ 세금계산서 승인 및 국세청 전송 완료
            </div>
          )}
        </div>
      </div>

      {/* 실시간 운행 이력 조회 (Trip logs / history) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">실시간 반출 차량 운행 이력</h3>
            <p className="text-xs text-slate-500 mt-0.5">인천 검단 3공구 현장 출발 실시간 배차 목록</p>
          </div>
          <button className="text-xs font-bold text-blue-600 hover:underline">
            전체 운행 로그 파일(CSV) 다운로드 →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-500 font-bold">
                <th className="py-3 px-1">차량 번호</th>
                <th className="py-3 px-1">기사명 / 운송사</th>
                <th className="py-3 px-1">하차 지정 목적지</th>
                <th className="py-3 px-1">반출 종류</th>
                <th className="py-3 px-1">출발 시각</th>
                <th className="py-3 px-1 text-right">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-y-slate-800/50">
              {[
                { plate: "경기 80바 4531", driver: "김철수 (대진운송)", dest: "영종도 신공항 북측 매립지", type: "사토 (토사)", time: "16:20:11", status: "운행완료" },
                { plate: "서울 86아 1002", driver: "홍길동 (개인차주)", dest: "영종도 신공항 북측 매립지", type: "사토 (토사)", time: "16:05:40", status: "운행완료" },
                { plate: "인천 88사 9081", driver: "이영희 (인천물류)", dest: "인천 송도 남측 매립지 B", type: "혼합골재", time: "15:52:19", status: "운행완료" },
                { plate: "경기 82자 7732", driver: "박민수 (대진운송)", dest: "경기 김포 고촌 사토장", type: "사토 (토사)", time: "15:45:00", status: "운행완료" }
              ].map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-850/30 transition-colors">
                  <td className="py-3 px-1 font-bold text-slate-800">{log.plate}</td>
                  <td className="py-3 px-1">{log.driver}</td>
                  <td className="py-3 px-1 text-slate-600">{log.dest}</td>
                  <td className="py-3 px-1">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/40 text-[10px]">
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 px-1 font-mono text-slate-500">{log.time}</td>
                  <td className="py-3 px-1 text-right font-bold text-emerald-400">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // 3. 하차지 관리자 대시보드 렌더링 함수
  const renderDropoffManager = () => {
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
                    <span className="text-slate-600 font-semibold">영종도 매립구역 C-3 구역 (현재 잔여 용량)</span>
                    <span className="font-black text-blue-600">{capacityPercentage}% ({totalVolume.toLocaleString()} / 50,000 ㎥)</span>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 overflow-hidden border border-slate-700/50">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500" 
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
                <p className="text-2xl font-black text-emerald-400 mt-1">₩{soilRevenue.toLocaleString()}</p>
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
                <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400 bg-amber-950/50 border border-amber-900/30 px-2 py-0.5 rounded">
                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping"></span> Live Receive
                </span>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {[
                  { id: 1, type: "배차알림", content: "삼부토건 인천 검단 3공구에서 사토 덤프 8대 출발 예정", time: "17:15" },
                  { id: 2, type: "용량경고", content: "영종도 C구역 용량 75% 돌파 - 순차 진입 간격 제어 필요", time: "16:48" },
                  { id: 3, type: "정산알림", content: "5월 흙값 정산 세금계산서 청구서가 플랫폼 본부에 승인 완료", time: "09:30" }
                ].map((alert) => (
                  <div key={alert.id} className="p-3 rounded-lg bg-slate-100/50 border border-slate-200/60 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-cyan-900/30 font-mono">
                        {alert.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{alert.time}</span>
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed">{alert.content}</p>
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
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
                  <div key={truck.id} className="p-4 rounded-xl bg-slate-100/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm">{truck.plate}</span>
                        <span className="text-[10px] text-slate-600">기사: {truck.driver} | 적재: {truck.weight}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        출발시각: {truck.time} | 적재형태: <strong className="text-slate-600 font-bold">{truck.type}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        truck.status === "반입 완료"
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30"
                          : "bg-amber-950/60 text-amber-400 border-amber-800/30 animate-pulse"
                      }`}>
                        {truck.status}
                      </span>
                      {truck.status === "진입 대기" && (
                        <button
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
            <button className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
              전체 반입 완료 대장 조회
            </button>
          </div>

          {/* New Drop-off Area Registration Form */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                <h3 className="font-extrabold text-sm text-slate-800">신규 사토/하차지 등록 신청</h3>
                <span className="text-[9px] text-slate-500 font-bold">임시 보관 가능</span>
              </div>
              <div className="space-y-3.5 text-xs">
                {dropoffRegSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 font-bold">
                    ✓ 하차지 사전 등록 신청서가 플랫폼 운영 본부로 성공적으로 송신되었습니다!
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-slate-600 font-semibold block">신규 하차지 명칭</label>
                  <input
                    type="text"
                    placeholder="예: 김포 고촌읍 신규 제2매립장"
                    disabled={dropoffRegSuccess}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 font-semibold block">계약 토사 총 용량 (㎥)</label>
                  <input
                    type="text"
                    placeholder="예: 60,000"
                    disabled={dropoffRegSuccess}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 font-semibold block">운영/소속 건설사명</label>
                  <input
                    type="text"
                    placeholder="예: 삼환기업 (주)"
                    disabled={dropoffRegSuccess}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            {!dropoffRegSuccess ? (
              <button
                onClick={() => setDropoffRegSuccess(true)}
                className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
              >
                신규 하차지 등록 신청서 송신
              </button>
            ) : (
              <button
                onClick={() => setDropoffRegSuccess(false)}
                className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-slate-700 text-xs font-bold active:scale-95 transition-all"
              >
                추가 신청서 작성하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 4. 차주/운송사 대시보드 렌더링 함수
  const renderOwner = () => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">소속 등록 트럭</h3>
          <p className="text-3xl font-black text-slate-900 mt-2">18 대</p>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/30 px-2 py-0.5 rounded-full inline-block mt-2">
            15대 정상 가동 중
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">이번 달 정산 예정액</h3>
          <p className="text-3xl font-black text-blue-600 mt-2">₩18,240,000</p>
          <span className="text-[10px] text-slate-500 font-semibold inline-block mt-2">
            지급 예정일: 2026-06-10
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">완료 배차 건수 (월간)</h3>
          <p className="text-3xl font-black text-slate-900 mt-2">248 건</p>
          <span className="text-[10px] text-slate-500 font-semibold inline-block mt-2 font-mono">
            배차 수락률 98.4%
          </span>
        </div>
      </div>

      {/* Fleet Operational Statistics & Charts */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">소속 차량 운행 통계 분석</h3>
            <p className="text-xs text-slate-500 mt-0.5">운송사의 금월 전체 배차 운반 실적 통계</p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50/40 border border-blue-200 px-3 py-1 rounded-full">
            운행 달성률 82.6%
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target completion progress */}
          <div className="space-y-4 lg:col-span-1">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-semibold">
                <span>금월 목표 운행 건수</span>
                <span>248 / 300 회</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-850 overflow-hidden border border-slate-200">
                <div className="h-full bg-blue-600 text-white rounded-full" style={{ width: "82.6%" }}></div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100/50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">기사당 평균 운행:</span>
                <span className="font-bold text-slate-700">13.7회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">하루 평균 운반 토사량:</span>
                <span className="font-bold text-slate-700">160 ㎥</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">운행 중 최장 거리:</span>
                <span className="font-bold text-slate-700">42 km (검단 3공구 {"->"} 영종도)</span>
              </div>
            </div>
          </div>

          {/* Simulated weekly trip bar chart */}
          <div className="lg:col-span-2 space-y-2">
            <div className="text-xs font-semibold text-slate-600 mb-2">주간 운행 트렌드 (배차 완료 건수)</div>
            <div className="h-32 flex items-end justify-around gap-2 bg-slate-100/40 p-4 rounded-xl border border-slate-200/60 relative">
              <div className="absolute inset-x-0 bottom-4 border-b border-slate-200/60 z-0"></div>
              
              {[
                { label: "5월 1주차", value: 52, height: "h-[52px]", color: "bg-slate-700 hover:bg-slate-600" },
                { label: "5월 2주차", value: 61, height: "h-[61px]", color: "bg-slate-700 hover:bg-slate-600" },
                { label: "5월 3주차", value: 65, height: "h-[65px]", color: "bg-slate-700 hover:bg-slate-600" },
                { label: "5월 4주차 (현재)", value: 70, height: "h-[70px]", color: "bg-blue-600 text-white hover:bg-cyan-400 shadow-lg shadow-blue-500/10" }
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 relative z-10 w-16">
                  <span className="text-[10px] text-slate-600 font-bold">{bar.value}회</span>
                  <div className={`w-8 ${bar.height} rounded-t transition-all duration-300 ${bar.color}`}></div>
                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* B2B Notification Center & Broadcaster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Received Platform Announcements */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">수신된 본부 알림 피드</h3>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                B2B 파트너 알림
              </span>
            </div>
            <div className="space-y-3">
              {[
                { title: "[긴급] 인천 영종도 C구역 진입로 토요일 야간 통제 안내", date: "2026-05-27", author: "플랫폼 본부" },
                { title: "[안내] 5월 정산 마감 및 세금계산서 청구 마감일 안내 (6월 5일한)", date: "2026-05-25", author: "플랫폼 본부" },
                { title: "[규정] 덤프트럭 비산먼지 덮개 밀폐 규정 미준수 차량 패널티 부여 안내", date: "2026-05-22", author: "안전팀" }
              ].map((notice, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-100/60 border border-slate-200 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>작성자: {notice.author}</span>
                    <span>{notice.date}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer">
                    {notice.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <button className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-800">
            본부 전체 알림 수신함 열기
          </button>
        </div>

        {/* B2B Driver Announcement Broadcaster */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">소속 기사용 긴급 알림 작성 및 전송</h3>
              <span className="text-[9px] text-slate-500 font-bold">운송사 전용 알림망</span>
            </div>
            <div className="space-y-3.5 text-xs">
              {ownerBroadcastSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 font-bold transition-all animate-pulse">
                  ✓ 소속 기사 18명의 모바일 앱으로 긴급 알림 메시지가 즉각 전송되었습니다!
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-slate-600 font-semibold block">공지 메시지 텍스트</label>
                <textarea
                  placeholder="예: 내일부터 검단 3공구 출입 시, 안전화를 지참하지 않은 경우 진입이 거부되오니 전원 확인 바랍니다."
                  rows={4}
                  disabled={ownerBroadcastSuccess}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-40 font-medium resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {!ownerBroadcastSuccess ? (
            <button
              onClick={() => setOwnerBroadcastSuccess(true)}
              className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
            >
              소속 기사들에게 즉시 알림 발송
            </button>
          ) : (
            <button
              onClick={() => setOwnerBroadcastSuccess(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-slate-700 text-xs font-bold active:scale-95 transition-all"
            >
              추가 공지 작성하기
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // 5. 개발자 대시보드 렌더링 함수
  const renderDeveloper = () => {
    // Filter menus based on target system and selected role
    const filteredMenus = developerMenus.filter(
      (m) => m.target === menuTarget && m.role === menuSelectedRole
    );

    return (
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-800">시스템 개발 환경 및 권한 통합 관리</h2>
              <p className="text-xs text-slate-500 mt-0.5">앱/웹 통합 메뉴 관리 및 백엔드 라우터 제어</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/30 font-mono">
            API_HOST: http://localhost:8000
          </span>
        </div>

        {/* 1. Real-time Server API APM Dashboard (NOW AT THE TOP) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div>
              <h3 className="font-extrabold text-base text-slate-800">실시간 서버 API APM 관제 대시보드</h3>
              <p className="text-xs text-slate-500 mt-0.5">FastAPI 서버의 자원 소비량 및 API 트래픽 인입 상태를 초단위로 모니터링합니다.</p>
            </div>
            
            {/* Interactive Load Test Simulation Button */}
            <button
              onClick={() => setApmLoadTesting(!apmLoadTesting)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
                apmLoadTesting 
                  ? "bg-rose-600 text-slate-900 shadow-rose-600/10 animate-pulse" 
                  : "bg-emerald-500 text-white shadow-emerald-500/10"
              }`}
            >
              {apmLoadTesting ? "트래픽 폭주 시뮬레이션 중지 (Stop)" : "트래픽 폭주 시뮬레이션 가동 (Load Test)"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            {[
              { 
                label: "CPU 사용량", 
                val: apmLoadTesting ? "89.2 %" : "12.4 %", 
                status: apmLoadTesting ? "과부하 경고" : "정상",
                color: apmLoadTesting ? "text-rose-400 bg-rose-950/30" : "text-emerald-400 bg-emerald-950/30",
                pct: apmLoadTesting ? "w-[89.2%]" : "w-[12.4%]"
              },
              { 
                label: "메모리 사용량", 
                val: apmLoadTesting ? "81.7 %" : "39.5 %", 
                status: apmLoadTesting ? "스왑 발생" : "정상",
                color: apmLoadTesting ? "text-rose-400 bg-rose-950/30" : "text-emerald-400 bg-emerald-950/30",
                pct: apmLoadTesting ? "w-[81.7%]" : "w-[39.5%]"
              },
              { 
                label: "DB 커넥션 풀", 
                val: apmLoadTesting ? "44 / 50" : "8 / 50", 
                status: apmLoadTesting ? "병목 위험" : "정상",
                color: apmLoadTesting ? "text-amber-400 bg-amber-955/30" : "text-emerald-400 bg-emerald-950/30",
                pct: apmLoadTesting ? "w-[88%]" : "w-[16%]"
              },
              { 
                label: "API 호출 트래픽 (RPS)", 
                val: apmLoadTesting ? "210.4 RPS" : "24.5 RPS", 
                status: apmLoadTesting ? "동시접속 폭주" : "여유",
                color: apmLoadTesting ? "text-rose-400 bg-rose-950/30" : "text-blue-600 bg-blue-50/30",
                pct: apmLoadTesting ? "w-[95%]" : "w-[25%]"
              },
              { 
                label: "평균 응답속도 (Latency)", 
                val: apmLoadTesting ? "245 ms" : "32 ms", 
                status: apmLoadTesting ? "지연 누적" : "매우 빠름",
                color: apmLoadTesting ? "text-rose-400 bg-rose-950/30" : "text-emerald-400 bg-emerald-950/30",
                pct: apmLoadTesting ? "w-[90%]" : "w-[12%]"
              }
            ].map((metric, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-100/60 border border-slate-200 flex flex-col justify-between shadow-md">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">{metric.label}</span>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-lg font-black text-slate-800">{metric.val}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${metric.color}`}>
                      {metric.status}
                    </span>
                  </div>
                </div>
                {/* Visual bar indicator */}
                <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden mt-3.5">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    apmLoadTesting ? "bg-rose-500" : "bg-blue-600 text-white"
                  }`} style={{ width: metric.pct.match(/\d+/)?.[0] + "%" }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Real-time API Logs Terminal */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2 pl-1">
              <span>인입 API 트래픽 실시간 모니터 (Live Endpoint Hits)</span>
              <span className="text-[10px] font-medium text-slate-500 font-mono">1.0s interval update</span>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-100/90 border border-slate-200 font-mono text-[11px] space-y-2.5 text-slate-700 max-h-48 overflow-y-auto">
              {apmLoadTesting ? (
                <>
                  <div className="flex justify-between text-rose-400 animate-pulse">
                    <span>⚠️ [CRITICAL] 17:45:53 - DB CONNECTION POOL IS REACHING LIMIT! (88% UTILIZATION)</span>
                    <span>503 Service Unavailable</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>➔ 17:45:52 - POST /api/locations/push - 408 Timeout (2000ms delay) - Client IP: 211.23.41.98</span>
                    <span>408 TIMEOUT</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>➔ 17:45:51 - GET /api/dropoff/capacity - 200 OK (210ms) - Client IP: 14.12.80.201</span>
                    <span>200 OK</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-emerald-400">
                    <span>➔ 17:45:53 - GET /api/auth/profile - 200 OK (11ms) - Client User: GD-3-MANAGER</span>
                    <span>200 OK</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>➔ 17:45:52 - POST /api/dropoff/verification - 201 Created (18ms) - Client IP: 182.203.11.23</span>
                    <span>201 CREATED</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>➔ 17:45:50 - GET /api/site/dump-expenses - 200 OK (24ms) - Client User: GD-3-MANAGER</span>
                    <span>200 OK</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. 앱/웹 권한별 통합 메뉴 관리 (Menu Configuration) (NOW AT THE BOTTOM) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div>
              <h3 className="font-extrabold text-base text-slate-800">앱 & 웹 권한별 메뉴 관리자 (ACL Configurator)</h3>
              <p className="text-xs text-slate-500 mt-0.5">각 사용자 역할군별로 활성화될 모바일 앱 메뉴 및 통합 웹 화면 접근 권한을 동적으로 매핑합니다.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setMenuTarget("web"); setMenuConfigSaveSuccess(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  menuTarget === "web" ? "bg-blue-600 text-white text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 text-slate-600"
                }`}
              >
                관리자웹 메뉴 설정
              </button>
              <button
                onClick={() => { setMenuTarget("app"); setMenuConfigSaveSuccess(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  menuTarget === "app" ? "bg-blue-600 text-white text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 text-slate-600"
                }`}
              >
                모바일앱 메뉴 설정
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Select Active Role */}
            <div className="p-4 rounded-xl bg-slate-100/50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">권한 역할군 선택</div>
              {[
                { id: "site_manager", name: "현장 관리자 (Site Manager)" },
                { id: "dropoff_manager", name: "하차지 관리자 (Dropoff Manager)" },
                { id: "platform_admin", name: "플랫폼 관리자 (Platform Admin)" },
                { id: "owner", name: "차주/운송사 (B2B Owner)" },
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => { setMenuSelectedRole(role.id); setMenuConfigSaveSuccess(false); }}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs font-semibold transition-colors ${
                    menuSelectedRole === role.id
                      ? "bg-blue-50 border-cyan-500/30 text-blue-600 font-bold"
                      : "bg-white/40 border-slate-200/80 text-slate-600 hover:bg-white"
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>

            {/* 2. Menu Checklist Configurator */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-slate-100/50 border border-slate-200 flex flex-col justify-between min-h-[250px]">
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-wider mb-3.5 pb-2 border-b border-slate-200">
                  <span>허용 메뉴 리스트 매핑</span>
                  <span className="text-[11px] text-blue-600">대상: {menuTarget === "web" ? "통합 웹" : "모바일 앱"}</span>
                </div>

                {menuConfigSaveSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 text-xs font-bold mb-4 transition-all">
                    ✓ 지정하신 역할의 메뉴 접근 권한(ACL) 설정이 실시간 데이터베이스 및 권한 라우터 레이어에 안전하게 저장 및 동기화 처리되었습니다!
                  </div>
                )}

                <div className="space-y-3">
                  {filteredMenus.length > 0 ? (
                    filteredMenus.map((menu) => (
                      <div
                        key={menu.id}
                        onClick={() => handleToggleMenuAllowed(menu.id)}
                        className="p-3 rounded-lg bg-white/60 border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-800">{menu.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            menu.allowed ? "bg-blue-50 text-blue-600" : "bg-slate-100 hover:bg-slate-200 text-slate-700 text-slate-500"
                          }`}>
                            {menu.allowed ? "활성화" : "비활성화"}
                          </span>
                          <input
                            type="checkbox"
                            checked={menu.allowed}
                            onChange={() => {}} // toggled via parent div click
                            className="w-4 h-4 rounded border-slate-200 text-cyan-500 accent-cyan-500 focus:ring-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-8">
                      이 역할에 대해 해당 시스템 타겟에 등록된 동적 메뉴 데이터가 존재하지 않습니다.
                    </div>
                  )}
                </div>
              </div>

              {filteredMenus.length > 0 && (
                <button
                  onClick={() => setMenuConfigSaveSuccess(true)}
                  className="w-full mt-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-bold text-white shadow-lg shadow-blue-500/10 active:scale-95"
                >
                  권한별 메뉴 설정(ACL) 데이터베이스 저장
                </button>
              )}
            </div>
          </div>
        </div>

        {/* API Route Tests & DB status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 lg:col-span-2">
            <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> 백엔드 API 라우트 상태 테스트
            </h3>
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded">GET</span>
              <input
                type="text"
                value={inputText || "/api/auth/profile"}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-white/60 border border-slate-200 text-xs px-3 py-1.5 rounded text-slate-700 font-mono focus:outline-none focus:border-blue-500"
              />
              <button className="px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors text-white text-xs font-bold">
                호출 테스트
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> 공통 코드 DB 상태
            </h3>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span>하이브리드 공통 코드 테이블</span>
                <span className="font-bold text-slate-800">12개</span>
              </div>
              <div className="flex justify-between">
                <span>Alembic 마이그레이션 상태</span>
                <span className="font-bold text-emerald-400">최신 (a4f66f3)</span>
              </div>
              <div className="flex justify-between">
                <span>연동 드라이버 테이블</span>
                <span className="font-bold text-slate-800">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header with Title & breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="text-xs font-bold text-blue-600/80 tracking-widest uppercase mb-1">
            DUMPRING ADMIN PORTAL
          </div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            통합 관리 콘솔
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            접속 권한: <strong className="text-slate-700 font-bold">{user.roleName}</strong> 계정으로 제어 및 조회 중입니다.
          </p>
        </div>

        {/* Quick Role Select Info Alert */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 max-w-sm">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            하단의 <strong>'권한 빠른 시뮬레이션'</strong>을 눌러 권한을 바꿀 수 있습니다. 실시간으로 좌측 메뉴 구성과 대시보드가 알맞게 변환됩니다.
          </p>
        </div>
      </div>

      {/* Dynamic Content based on User Role */}
      {user.role === "platform_admin" && renderPlatformAdmin()}
      {user.role === "site_manager" && renderSiteManager()}
      {user.role === "dropoff_manager" && renderDropoffManager()}
      {user.role === "owner" && renderOwner()}
      {user.role === "developer" && renderDeveloper()}
    </div>
  );
}
