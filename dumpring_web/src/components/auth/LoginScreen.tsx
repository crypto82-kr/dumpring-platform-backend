"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, Truck, MapPin, BarChart3, Lock, Phone, AlertCircle, Loader2, Terminal } from "lucide-react";
import RegisterScreen from "./RegisterScreen";
import { getApiBaseUrl } from "@/utils/api";

export default function LoginScreen() {
  const { login, changeRole } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleLogin = async (phone: string, pass: string) => {
    if (!phone || !pass) {
      setErrorMsg("휴대폰 번호와 비밀번호를 입력해 주세요.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phone.trim(),
          password: pass,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        login(data.access_token, data.user);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "휴대폰 번호 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "인증 처리 중 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(phoneNumber, password);
  };

  // 퀵 로그인 프리셋 정의
  const quickLoginPresets = [
    {
      role: "platform_admin",
      roleName: "플랫폼 관리자",
      phone: "010-0000-0000",
      password: "password123",
      name: "시스템관리자",
      icon: ShieldCheck,
      color: "from-blue-500 to-cyan-500",
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/35",
      borderColor: "border-blue-150 dark:border-blue-900/50"
    },
    {
      role: "site_manager",
      roleName: "현장 관리자",
      phone: "010-8888-5555",
      password: "1234",
      name: "이태우",
      icon: MapPin,
      color: "from-indigo-500 to-purple-500",
      textColor: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/35",
      borderColor: "border-indigo-150 dark:border-indigo-900/50"
    },
    {
      role: "dropoff_manager",
      roleName: "하차지 관리자",
      phone: "010-7777-8888",
      password: "1234",
      name: "오지주",
      icon: Truck,
      color: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/35",
      borderColor: "border-emerald-150 dark:border-emerald-900/50"
    },
    {
      role: "owner",
      roleName: "차주 / 운송사",
      phone: "010-9433-9433",
      password: "1234",
      name: "이몽룡",
      icon: BarChart3,
      color: "from-amber-500 to-orange-500",
      textColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/35",
      borderColor: "border-amber-150 dark:border-amber-900/50"
    },
    {
      role: "developer",
      roleName: "개발자 (시스템 관제)",
      phone: "010-9999-9999",
      password: "password123",
      name: "개발자",
      icon: Terminal,
      color: "from-slate-700 to-slate-900",
      textColor: "text-slate-700 dark:text-slate-300",
      bgColor: "bg-slate-50 dark:bg-slate-900/35",
      borderColor: "border-slate-200 dark:border-slate-800"
    }
  ];

  if (isRegister) {
    return <RegisterScreen onBackToLogin={() => setIsRegister(false)} />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900/5 dark:bg-slate-950 p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Decorative background blur shapes */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* 좌측 엔터프라이즈 브랜드 패널 (7칸) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* 배경 그래픽 패턴 */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* 상단 브랜드 배지 & 헤드라인 */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-black text-xs text-white shadow-sm">
                D
              </div>
              <span className="text-xs font-extrabold tracking-wider text-blue-200">
                DUMPRING INTEGRATED PLATFORM
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-snug text-white">
                건설 현장과 사토장, 운송사를 잇는<br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                  스마트 토사 배차·운행 통합 관제 시스템
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300/90 leading-relaxed font-medium max-w-xl">
                상차지 현장 요청부터 사토장 매칭, 덤프트럭 실시간 운행 관제 및 정산 관리까지
                하나의 통합 콘솔에서 빠르고 정확하게 운영하세요.
              </p>
            </div>
          </div>

          {/* 중단 3대 핵심 기능 하이라이트 */}
          <div className="relative z-10 my-8 space-y-3.5">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/20 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-extrabold text-white">
                  상차지 · 하차지 맞춤형 스마트 매칭
                </h3>
                <p className="text-[11px] text-slate-300/80 mt-0.5 leading-relaxed">
                  공사 현장 토사 반출 계획과 사토장 반입 공고를 실시간으로 연결하여 최적의 운행 배차를 지원합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-extrabold text-white">
                  실시간 차량 운행 현황 및 반입 검수 관제
                </h3>
                <p className="text-[11px] text-slate-300/80 mt-0.5 leading-relaxed">
                  투입 차량의 상차 출발, 운행 이동, 사토장 도착 및 반입 승인 상태를 실시간으로 모니터링합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-extrabold text-white">
                  운행 이력 기반 운반비 · 토사 대금 통합 정산
                </h3>
                <p className="text-[11px] text-slate-300/80 mt-0.5 leading-relaxed">
                  확정된 운행 대수와 단가를 바탕으로 현장·하차지·운송사 간의 내역을 명확하게 집계하고 관리합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 하단 카피라이트 및 보안 배지 */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="font-semibold">© DUMPRING Corp. All rights reserved.</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              승인된 파트너 전용 보안 포털
            </span>
          </div>
        </div>

        {/* 우측 로그인 폼 영역 (5칸) */}
        <div className="lg:col-span-5 p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="space-y-2 mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold">
              <Lock className="w-3 h-3" />
              통합 관리자 로그인
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              환영합니다
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              부여받은 관리자 계정(휴대폰 번호)과 비밀번호를 입력하여 접속해 주세요.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Regular Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block px-1">
                휴대폰 번호 (아이디)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  disabled={loading}
                  placeholder="010-0000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block px-1">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  disabled={loading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>로그인 인증 중...</span>
                </>
              ) : (
                <span>통합 관리 콘솔 로그인</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              신규 현장·사토장·운송사 파트너이신가요?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline ml-1"
              >
                회원가입 신청하기
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * 회원가입 신청 후 플랫폼 관리자의 자격 서류 검토 및 승인이 완료되면 정상 이용이 가능합니다.
            </p>
          </div>

          {/* 개발용 권한 빠른 로그인 영역 (보고 시 숨김 처리)
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500">
                개발용 권한 빠른 로그인 (DB 연결)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickLoginPresets.map((preset) => {
              const PresetIcon = preset.icon;
              return (
                <button
                  key={preset.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleLogin(preset.phone, preset.password)}
                  className={`flex items-start gap-3 p-3 text-left rounded-2xl border ${preset.bgColor} ${preset.borderColor} hover:scale-[1.02] active:scale-[0.98] transition-all group`}
                >
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${preset.color} text-white shadow-sm flex-shrink-0 group-hover:rotate-6 transition-all`}>
                    <PresetIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">
                      {preset.roleName}
                    </div>
                    <div className={`text-xs font-black ${preset.textColor}`}>
                      {preset.name}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 leading-none">
                      {preset.phone}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
