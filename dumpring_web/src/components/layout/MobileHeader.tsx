"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";

export default function MobileHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 md:hidden sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {}}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-450 transition-colors active:scale-95"
          aria-label="메뉴 열기"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-black text-base tracking-wider bg-gradient-to-r from-brand-500 to-brand-700 dark:from-brand-400 dark:to-brand-600 bg-clip-text text-transparent uppercase">
          DUMPRING
        </span>
      </div>
    </header>
  );
}
