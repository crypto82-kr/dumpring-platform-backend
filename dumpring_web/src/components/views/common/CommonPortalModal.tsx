"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface CommonPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
  hideHeader?: boolean;
}

const MAX_WIDTH_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  full: "max-w-[95vw]",
};

export default function CommonPortalModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = "3xl",
  children,
  footer,
  headerRight,
  hideHeader = false,
}: CommonPortalModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || "max-w-3xl";

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full ${maxWidthClass} max-h-[90vh] overflow-hidden flex flex-col my-auto animate-scaleUp`}
      >
        {/* Modal Header */}
        {!hideHeader && (
          <div className="px-6 py-4 sm:py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              {icon && <div className="shrink-0">{icon}</div>}
              <div>
                {title && (
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs active:scale-90 transition-all"
                title="닫기"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 text-slate-800">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
