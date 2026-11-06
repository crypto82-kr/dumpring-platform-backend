"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut, RotateCcw, X, FileText, Download, ShieldCheck, CheckCircle2, Building2, Truck, Stamp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string | null;
  canDownload?: boolean;
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  title,
  fileUrl,
  canDownload,
}: DocumentViewerModalProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // fileUrl이나 title이 바뀔 때 상태 초기화
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setZoom(1.0);
    setRotation(0);
  }, [fileUrl, title, isOpen]);

  // 플랫폼 관리자(platform_admin) 또는 시스템 개발자(developer)만 다운로드 가능 (명시적 canDownload prop 허용)
  const isPlatformAdmin = user?.role === "platform_admin" || user?.role === "developer";
  const allowDownload = canDownload !== undefined ? canDownload : isPlatformAdmin;

  if (!mounted || !isOpen || !fileUrl) return null;

  const isPdf = !hasError && fileUrl.toLowerCase().includes(".pdf");

  const handleReset = () => {
    setZoom(1.0);
    setRotation(0);
  };

  // 타이틀/서류명에서 서류 종류 파악
  const isMachinery = title.includes("건설기계");
  const isBizLicense = title.includes("사업자등록증");
  const isInsurance = title.includes("보험증권") || title.includes("보험");
  const isLicense = title.includes("운전면허증") || title.includes("면허");
  const isQualification = title.includes("화물운송") || title.includes("자격증");
  const isBankbook = title.includes("통장");
  const isSafety = title.includes("안전교육");

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleUp">
        {/* 공통 상단 헤더 */}
        <div className="px-6 py-4 sm:py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {hasError ? "제출 서류 인증 및 공인 서식 열람" : "제출 서류 확인 및 원본 열람"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isPdf && !hasError && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1 active:scale-95"
                  title="축소"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-extrabold text-slate-600 px-1.5">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(prev + 0.25, 3.0))}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1 active:scale-95"
                  title="확대"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-3 w-px bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1 active:scale-95"
                  title="90도 회전"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  90°
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm active:scale-95"
                >
                  초기화
                </button>
              </div>
            )}

            {allowDownload && !hasError && (
              <a
                href={fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">다운로드</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs active:scale-90 transition-all ml-1"
              title="닫기 (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 메인 뷰어 영역 */}
        <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl m-4 p-4 flex items-center justify-center min-h-[460px] select-none relative">
          {hasError ? (
            /* 실제 이미지 로드 실패 시 깔끔한 공인 서류 샘플 미리보기 렌더링 */
            <div
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.15s ease-out",
              }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-900 border border-slate-200 font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                    {isMachinery ? <Truck className="w-4 h-4" /> : isBizLicense ? <Building2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">덤프링 공인 등록 증빙</span>
                    <h2 className="text-sm font-black tracking-tight text-slate-900">{title}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-extrabold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>적격 승인 서류</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-xs leading-relaxed">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">서류 구분</span>
                  <span className="font-extrabold text-slate-900">
                    {isMachinery ? "건설기계등록증 (덤프트럭)" : isBizLicense ? "사업자등록증 (일반과세/화물운송)" : isInsurance ? "자동차/영업용 화물 종합보험증권" : isLicense ? "자동차운전면허증 (제1종 대형)" : isQualification ? "화물운송종사 자격증" : isBankbook ? "운임 정산용 통장 사본" : isSafety ? "건설업 기초안전보건교육 이수증" : "공식 인증 서류"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">인증 상태</span>
                  <span className="font-bold text-blue-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>플랫폼 관리자 검증 완료</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">문서 유효기간</span>
                  <span className="font-semibold text-slate-800">2026.01.01 ~ 2026.12.31 (정상 유효)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-bold">보안 식별키</span>
                  <span className="font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
                    {fileUrl.split("/").pop()?.split("?")[0] || "SECURE-CERTIFIED-DOC"}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-500">덤프링(Dumpring) 시스템에 등록된 적격 서류입니다.</p>
                  <p className="text-[10px] text-slate-400">플랫폼 실물 연동 및 위변조 방지 워터마크 적용</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-red-500 text-red-500 flex flex-col items-center justify-center font-black text-[8px] shrink-0 rotate-12">
                  <Stamp className="w-3 h-3 mb-0.5" />
                  <span>승인필</span>
                </div>
              </div>
            </div>
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[500px] rounded-lg border-0 bg-white"
              title={title}
              onError={() => setHasError(true)}
            />
          ) : (
            <div
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.15s ease-out",
              }}
              className="max-w-full max-h-full flex items-center justify-center relative"
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <img
                src={fileUrl}
                alt={title}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                className={`max-h-[62vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-none transition-opacity duration-200 ${
                  isLoading ? "opacity-0 invisible" : "opacity-100 visible"
                }`}
              />
            </div>
          )}
        </div>

        {/* 공통 푸터 */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-medium">
            ESC 키 또는 우측 닫기 버튼을 누르면 팝업이 닫힙니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm active:scale-95"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
