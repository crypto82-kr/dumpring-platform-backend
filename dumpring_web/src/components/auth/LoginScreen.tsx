"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, Truck, MapPin, BarChart3, Lock, Phone, AlertCircle, Loader2, Terminal } from "lucide-react";
import RegisterScreen from "./RegisterScreen";

export default function LoginScreen() {
  const { login } = useAuth();
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
      const res = await fetch("http://localhost:8000/api/auth/login", {
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
    } catch (e) {
      setErrorMsg("백엔드 인증 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.");
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
      phone: "010-3333-1111",
      name: "정소장",
      icon: MapPin,
      color: "from-indigo-500 to-purple-500",
      textColor: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/35",
      borderColor: "border-indigo-150 dark:border-indigo-900/50"
    },
    {
      role: "dropoff_manager",
      roleName: "하차지 관리자",
      phone: "010-4444-1111",
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
      phone: "010-1111-1111",
      name: "김차주",
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden font-sans">
      {/* Decorative background blur shapes */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 relative z-10 transition-all">
        {/* Logo and header */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto">
            <span className="font-black text-2xl text-white tracking-wider">D</span>
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
            DUMPRING INTEGRATED PORTAL
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">
            덤프링 통합 관리 및 대시보드 로그인
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Regular Login Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-505 dark:text-slate-400 block px-1">
              휴대폰 번호
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                disabled={loading}
                placeholder="010-0000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-505 dark:text-slate-400 block px-1">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                disabled={loading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/15 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>로그인 요청 중...</span>
              </>
            ) : (
              <span>로그인</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mt-4">
          아직 계정이 없으신가요?{" "}
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline"
          >
            회원가입 신청하기
          </button>
        </div>

        {/* Divider */}
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

        {/* Quick Simulated Logins */}
        <div className="grid grid-cols-2 gap-3">
          {quickLoginPresets.map((preset) => {
            const PresetIcon = preset.icon;
            return (
              <button
                key={preset.role}
                type="button"
                disabled={loading}
                onClick={() => handleLogin(preset.phone, "password123")}
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
      </div>
    </div>
  );
}
