"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Building2,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  Save,
  RefreshCw,
  ExternalLink,
  Key,
  Lock,
  X
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";
import { formatBusinessNumber, validateBusinessNumber } from "@/utils/validation";

interface OwnerProfileData {
  company_name: string;
  business_number: string;
  tax_email: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface UserProfileResponse {
  id: number;
  name: string;
  phone_number: string;
  is_owner: boolean;
  is_driver: boolean;
  is_approved: boolean;
  reject_reason: string | null;
  created_at: string | null;
  owner_profile: OwnerProfileData | null;
}

interface OwnerMyPageProps {
  setActivePath?: (path: string) => void;
}

export default function OwnerMyPage({ setActivePath }: OwnerMyPageProps) {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bizError, setBizError] = useState<string | null>(null);

  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 수정 가능한 폼 상태
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [taxEmail, setTaxEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const fetchProfile = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const baseUrl = getApiBaseUrl();
      const token =
        sessionStorage.getItem("dumpring_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token");

      if (!token) {
        setMessage({ type: "error", text: "로그인 세션이 만료되었습니다. 다시 로그인해주세요." });
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data: UserProfileResponse = await res.json();
        setProfile(data);
        setName(data.name || "");
        if (data.owner_profile) {
          setCompanyName(data.owner_profile.company_name || "");
          setBusinessNumber(data.owner_profile.business_number ? formatBusinessNumber(data.owner_profile.business_number) : "");
          setTaxEmail(data.owner_profile.tax_email || "");
          setBankName(data.owner_profile.bank_name || "");
          setAccountNumber(data.owner_profile.account_number || "");
          setAccountHolder(data.owner_profile.account_holder || data.name || "");
        }
      } else {
        setMessage({ type: "error", text: "내 프로필 정보를 불러오는 데 실패했습니다." });
      }
    } catch (e) {
      console.error("마이페이지 프로필 조회 실패:", e);
      setMessage({ type: "error", text: "서버 통신 오류가 발생했습니다." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // 사업자번호 입력 핸들러 (실시간 자동 하이픈 및 형식 검사)
  const handleBizNumberChange = (raw: string) => {
    const formatted = formatBusinessNumber(raw);
    setBusinessNumber(formatted);

    const clean = formatted.replace(/[^0-9]/g, "");
    if (clean.length > 0 && clean.length === 10) {
      const check = validateBusinessNumber(clean);
      if (!check.isValid) {
        setBizError(check.message);
      } else {
        setBizError(null);
      }
    } else if (clean.length > 0 && clean.length < 10) {
      setBizError(`사업자등록번호 10자리를 모두 입력해주세요. (${clean.length}/10)`);
    } else {
      setBizError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 사업자번호가 입력된 경우 유효성 재검증
    const cleanBiz = businessNumber.replace(/[^0-9]/g, "");
    if (cleanBiz.length > 0) {
      const check = validateBusinessNumber(cleanBiz);
      if (!check.isValid) {
        setBizError(check.message);
        setMessage({ type: "error", text: `[사업자등록번호 오류] ${check.message}` });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const baseUrl = getApiBaseUrl();
      const token =
        sessionStorage.getItem("dumpring_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token");

      const res = await fetch(`${baseUrl}/api/auth/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          company_name: companyName.trim(),
          business_number: cleanBiz ? formatBusinessNumber(cleanBiz) : "",
          tax_email: taxEmail.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim(),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "✅ 마이페이지 및 정산 계좌 정보가 성공적으로 저장되었습니다!" });
        // 사용자가 즉시 인지할 수 있도록 스크롤 맨 위로 이동
        window.scrollTo({ top: 0, behavior: "smooth" });
        await fetchProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.detail || "정보 저장 중 오류가 발생했습니다.";
        setMessage({ type: "error", text: `❌ 저장 실패: ${errMsg}` });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e) {
      console.error("프로필 저장 실패:", e);
      setMessage({ type: "error", text: "❌ 서버 저장 통신에 실패했습니다. 네트워크 상태를 확인해주세요." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  // 비밀번호 변경 요청 핸들러
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError("새 비밀번호는 최소 4자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token =
        sessionStorage.getItem("dumpring_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token");

      const res = await fetch(`${baseUrl}/api/auth/me/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage({ type: "success", text: "✅ 비밀번호가 성공적으로 변경되었습니다." });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const err = await res.json().catch(() => ({}));
        setPasswordError(err.detail || "비밀번호 변경에 실패했습니다.");
      }
    } catch (e) {
      setPasswordError("서버와의 통신에 실패했습니다.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-sm font-bold">차주 마이페이지 정보를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* 1. 상단 타이틀 바 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">차주 마이페이지</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                차주 / 운수사 대표
              </span>
              {profile?.is_approved ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 승인회원
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> 심사진행중
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              차주님의 기본 사업자 정보 및 덤프 운임을 지급받을 주거래 정산 계좌를 관리합니다.
            </p>
          </div>
        </div>

        {/* 차량 관리 바로가기 버튼 (중복 관리 방지 ➔ 전담 화면으로 링크) */}
        {setActivePath && (
          <button
            type="button"
            onClick={() => setActivePath("/owner/trucks")}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all self-start md:self-auto"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>내 덤프 차량 관리</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* 플로팅 토스트 알림 (화면 상단 고정 - 스크롤 위치와 무관하게 즉각 인지) */}
      {message && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md ${
              message.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-white shadow-emerald-900/30"
                : "bg-rose-950/90 border-rose-500/50 text-white shadow-rose-900/30"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="text-xs font-black tracking-tight mb-0.5">
                {message.type === "success" ? "저장 완료" : "저장 실패 / 확인 필요"}
              </h4>
              <p className="text-xs text-slate-200 font-medium leading-relaxed">{message.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded-lg hover:bg-white/10"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 상태 인라인 알림 메시지 */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2. 폼 본문 */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* [섹션 1] 기본 정보 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-blue-600" />
            1. 내 기본 정보
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                이름 (실명) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="이름 입력"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-extrabold text-slate-700">
                  휴대폰 번호
                </label>
                <button
                  type="button"
                  onClick={() => alert("📱 [휴대폰 본인인증] PASS 앱 또는 문자 인증으로 번호를 변경합니다.")}
                  className="text-[11px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  본인인증 번호변경
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={profile?.phone_number || ""}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* 비밀번호 변경 버튼 영역 */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">비밀번호</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPasswordError(null);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowPasswordModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Key className="w-3.5 h-3.5" />
              <span>비밀번호 변경</span>
            </button>
          </div>
        </div>

        {/* [섹션 2] 사업자 정보 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            2. 사업자 정보
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                상호명 (운수사 / 개인 차주명)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 대한물류 또는 개인(홍길동)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                사업자등록번호 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => handleBizNumberChange(e.target.value)}
                maxLength={12}
                placeholder="예: 123-45-67890"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white transition-all ${
                  bizError
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                    : businessNumber.replace(/[^0-9]/g, "").length === 10
                    ? "border-emerald-400 focus:border-emerald-500 bg-emerald-50/20"
                    : "border-slate-200 focus:border-blue-500"
                }`}
              />
              {bizError && (
                <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {bizError}
                </p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                세금계산서 받을 이메일 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={taxEmail}
                  onChange={(e) => setTaxEmail(e.target.value)}
                  placeholder="예: tax@logistics.com"
                  className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* 사업자등록증 서류 확인 및 변경 */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100/70 text-blue-700 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  사업자등록증 사본
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  세금계산서 발행 및 계좌 확인용 서류입니다.
                </span>
              </div>
            </div>

            {setActivePath && (
              <button
                type="button"
                onClick={() => setActivePath("/owner/trucks")}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-sm"
              >
                <span>서류 확인 및 변경</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* [섹션 3] 운임 받을 계좌 */}
        <div className="bg-white border-2 border-blue-500/30 rounded-2xl p-5 shadow-sm space-y-4 bg-gradient-to-br from-blue-50/20 to-transparent">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <h2 className="text-xs font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              3. 운임 받을 계좌 (주거래 통장)
            </h2>
            <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              필수 확인
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                은행 선택 <span className="text-rose-500">*</span>
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
              >
                <option value="">은행 선택</option>
                <option value="국민은행">국민은행</option>
                <option value="신한은행">신한은행</option>
                <option value="우리은행">우리은행</option>
                <option value="하나은행">하나은행</option>
                <option value="기업은행">기업은행</option>
                <option value="농협은행">농협은행</option>
                <option value="카카오뱅크">카카오뱅크</option>
                <option value="토스뱅크">토스뱅크</option>
                <option value="우체국">우체국</option>
                <option value="새마을금고">새마을금고</option>
                <option value="SC제일은행">SC제일은행</option>
                <option value="수협은행">수협은행</option>
                <option value="대구은행">대구은행</option>
                <option value="부산은행">부산은행</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                계좌번호 (하이픈 '-' 없이 입력) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="예: 110123456789"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                예금주 성명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="예: 홍길동 (또는 법인명)"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* 3. 하단 저장 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={fetchProfile}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all"
          >
            초기화
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 active:scale-98"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>마이페이지 정보 저장하기</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 4. 비밀번호 자체 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900">비밀번호 변경</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  현재 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="현재 비밀번호 입력"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  새 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="최소 4자 이상 입력"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  새 비밀번호 확인 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="새 비밀번호 재입력"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>변경 중...</span>
                    </>
                  ) : (
                    <span>변경 완료</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
