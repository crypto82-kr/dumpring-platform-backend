"use client";

import React, { useState } from "react";
import { ShieldCheck, MapPin, Truck, Lock, Phone, User as UserIcon, AlertCircle, Loader2, Check, ArrowLeft } from "lucide-react";

interface RegisterScreenProps {
  onBackToLogin: () => void;
}

export default function RegisterScreen({ onBackToLogin }: RegisterScreenProps) {
  const [role, setRole] = useState<"site_manager" | "dropoff_manager" | "owner">("site_manager");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // 인증 및 약관 동의 상태
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  
  // 에러 및 로딩 상태
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 본인인증 시뮬레이션
  const handleVerifyPhone = () => {
    if (!phoneNumber.trim()) {
      setErrorMsg("휴대폰 번호를 입력해 주세요.");
      return;
    }
    setErrorMsg("");
    setVerifying(true);
    
    // 1초 후 인증 완료 시뮬레이션
    setTimeout(() => {
      setVerifying(false);
      setIsVerified(true);
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!agreeTerms || !agreePrivacy) {
      setErrorMsg("필수 약관 및 개인정보 처리방침에 모두 동의해 주세요.");
      return;
    }

    if (!isVerified) {
      setErrorMsg("휴대폰 본인인증이 완료되지 않았습니다.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("이름을 입력해 주세요.");
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg("비밀번호는 최소 4자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/auth/pre-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber.trim(),
          password: password,
          name: name.trim(),
          role: role,
        }),
      });

      if (res.ok) {
        setSuccessMsg("가입(가가입) 신청이 완료되었습니다! 로그인 화면으로 돌아가 로그인 후 추가 정보를 입력해 승인 요청을 진행해 주세요.");
        setTimeout(() => {
          onBackToLogin();
        }, 3000);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "회원가입 중 에러가 발생했습니다. 입력 정보를 확인해 주세요.");
      }
    } catch (e) {
      setErrorMsg("인증 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden font-sans">
      {/* Decorative background blur shapes */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 relative z-10 transition-all flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Terms and Agreements */}
        <div className="w-full md:w-1/2 flex flex-col justify-between border-r-0 md:border-r border-slate-100 dark:border-slate-800 pr-0 md:pr-8">
          <div>
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-6 font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>로그인 화면으로</span>
            </button>
            
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">약관 동의 및 본인 확인</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">덤프링 플랫폼 서비스를 이용하기 위한 필수 계약 요건에 동의해 주세요.</p>
            
            {/* TOS Section */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>이용약관 동의 (필수)</span>
                </label>
                <div className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[10px] text-slate-500 dark:text-slate-500 font-semibold overflow-y-auto leading-relaxed scrollbar-thin">
                  제 1 조 (목적)
                  본 약관은 주식회사 덤프링(이하 "회사"라 함)이 제공하는 덤프링 통합 플랫폼 및 관련 제반 서비스(이하 "서비스"라 함)의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                  <br /><br />
                  제 2 조 (용어의 정의)
                  1. "회원"이라 함은 회사의 서비스에 접속하여 본 약관에 동의하고 가입 절차를 마친 사용자를 의미합니다.
                  2. "현장관리자"라 함은 상차지 현장을 등록 및 관리하며 덤프 수송 배차 오더를 생성하는 사용자를 의미합니다.
                  3. "하차지관리자"라 함은 매립지/사토장을 등록하고 반입 승인 처리를 담당하는 사용자를 의미합니다.
                </div>
              </div>

              {/* Privacy Policy Section */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>개인정보 수집 및 이용 동의 (필수)</span>
                </label>
                <div className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[10px] text-slate-500 dark:text-slate-500 font-semibold overflow-y-auto leading-relaxed scrollbar-thin">
                  주식회사 덤프링은 회원가입 시 아래와 같은 개인정보를 수집 및 이용합니다.
                  <br /><br />
                  1. 수집 항목: 이름, 휴대폰 번호, 본인인증 고유키(CI), 비밀번호
                  2. 수집 목적: 회원 가입 의사 확인, 본인 식별/인증, 회원자격 유지/관리, 허위가입 방지, 고지사항 전달
                  3. 보유 및 이용 기간: 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관)
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl hidden md:block">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-semibold">
              덤프링 통합 포털은 사업자 및 관리자 전용 서비스입니다. 일반 덤프 기사님은 기사용 모바일 앱을 통해 가입을 진행해 주시기 바랍니다.
            </p>
          </div>
        </div>

        {/* Right Side: Inputs and Role Selection */}
        <div className="w-full md:w-1/2 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">회원 정보 입력</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">사용하실 권한을 선택하고 기본 정보를 입력해 주세요.</p>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block px-1">
                  가입 권한 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "site_manager", name: "현장 관리자", icon: MapPin },
                    { id: "dropoff_manager", name: "하차지 관리자", icon: Truck },
                    { id: "owner", name: "차주 / 운송사", icon: ShieldCheck }
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = role === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRole(item.id as any)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? "bg-blue-50/60 border-blue-500 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold ring-1 ring-blue-500"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                        }`}
                      >
                        <ItemIcon className="w-5 h-5" />
                        <span className="text-[10px] tracking-tight">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone and Verification */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block px-1">
                  휴대폰 번호 (로그인 ID)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={loading || isVerified}
                      placeholder="010-0000-0000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all disabled:opacity-75"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={loading || verifying || isVerified}
                    onClick={handleVerifyPhone}
                    className={`px-4 text-xs font-bold rounded-xl transition-all border shrink-0 flex items-center gap-1.5 ${
                      isVerified
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-emerald-400"
                        : "bg-blue-600 hover:bg-blue-750 text-white border-transparent active:scale-[0.98] disabled:opacity-50"
                    }`}
                  >
                    {verifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isVerified ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>인증됨</span>
                      </>
                    ) : (
                      <span>본인인증</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block px-1">
                  실명 / 담당자명
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    disabled={loading}
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block px-1">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    disabled={loading}
                    placeholder="최소 4자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>

              {/* Password Confirm */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block px-1">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    disabled={loading}
                    placeholder="비밀번호 재입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black text-slate-800 dark:text-slate-200 transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || verifying}
                className="w-full py-3 mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/15 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>회원가입 처리 중...</span>
                  </>
                ) : (
                  <span>회원가입 신청</span>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
