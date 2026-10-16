"use client";

import React, { useState } from "react";
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, ShieldAlert } from "lucide-react";

export default function DropoffAlertsManagement() {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: "SUCCESS",
      title: "매칭 공고 승인 완료",
      message: "[서울 강남 재건축 현장 ➔ 신길 사토장] 25톤 15대 매칭 요청이 승인되었습니다.",
      time: "10분 전",
      read: false,
    },
    {
      id: 2,
      type: "INFO",
      title: "실시간 토사 반입 등록 알림",
      message: "강동원 기사(서울88바1234) 차량이 하차지에 도착하여 반입 확인을 기다리고 있습니다.",
      time: "45분 전",
      read: false,
    },
    {
      id: 3,
      type: "WARNING",
      title: "흙값 정산 입금 확인 요청",
      message: "STL-202608-002 (서초 현장 건) 1,000,000원 입금 확인 요청이 접수되었습니다.",
      time: "2시간 전",
      read: true,
    },
  ]);

  const markAllAsRead = () => {
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
  };

  const deleteAlert = (id: number) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            알림 수신함
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            하차지 매칭 승인, 토사 반입 알림 및 정산 수신 내역을 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={markAllAsRead}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            모두 읽음 처리
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {alerts.map((alertItem) => (
          <div
            key={alertItem.id}
            className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 shadow-sm ${
              alertItem.read
                ? "bg-slate-50 border-slate-200 opacity-75"
                : "bg-white border-blue-200 shadow-md"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  alertItem.type === "SUCCESS"
                    ? "bg-emerald-100 text-emerald-700"
                    : alertItem.type === "WARNING"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {alertItem.type === "SUCCESS" ? (
                  <CheckCheck className="w-5 h-5" />
                ) : alertItem.type === "WARNING" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-slate-900">{alertItem.title}</h4>
                  {!alertItem.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {alertItem.message}
                </p>
                <span className="text-[10px] text-slate-400 font-mono block pt-1">
                  {alertItem.time}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => deleteAlert(alertItem.id)}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all shrink-0"
              title="알림 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">수신된 새 알림이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
