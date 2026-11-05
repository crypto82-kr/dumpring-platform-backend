"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, X, FileText, Download } from "lucide-react";
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
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  // 플랫폼 관리자(platform_admin) 또는 시스템 개발자(developer)만 다운로드 가능 (명시적 canDownload prop 허용)
  const isPlatformAdmin = user?.role === "platform_admin" || user?.role === "developer";
  const allowDownload = canDownload !== undefined ? canDownload : isPlatformAdmin;

  if (!isOpen || !fileUrl) return null;

  const isPdf = fileUrl.toLowerCase().includes(".pdf");

  const handleReset = () => {
    setZoom(1.0);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh]">
        {/* 상단 툴바 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{title}</h3>
              <span className="text-[11px] text-slate-400 font-medium">서류 확인 뷰어</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPdf && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1"
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
                  className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1"
                  title="확대"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-3 w-px bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1"
                  title="90도 회전"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  90°
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm"
                >
                  초기화
                </button>
              </div>
            )}

            {allowDownload && (
              <a
                href={fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>다운로드</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 메인 뷰어 영역 */}
        <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl my-3 p-4 flex items-center justify-center min-h-[460px] select-none relative">
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[500px] rounded-lg border-0 bg-white"
              title={title}
            />
          ) : (
            <div
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.15s ease-out",
              }}
              className="max-w-full max-h-full flex items-center justify-center"
            >
              <img
                src={fileUrl}
                alt={title}
                className="max-h-[62vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            </div>
          )}
        </div>

        {/* 하단 닫기 */}
        <div className="flex items-center justify-end shrink-0 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
