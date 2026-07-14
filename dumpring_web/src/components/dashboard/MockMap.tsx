import React from "react";
import { MapPin } from "lucide-react";

interface MockMapProps {
  title: string;
  address: string;
  pinned: boolean;
  onPinClick?: () => void;
}

export function MockMap({ title, address, pinned, onPinClick }: MockMapProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600 animate-bounce" />
          <span className="font-extrabold text-sm text-slate-800">{title} 진입로/위치 맵핑</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 font-mono">
          {pinned ? "● 핀 지정 완료" : "○ 핀 대기 중"}
        </span>
      </div>
      <div
        onClick={onPinClick}
        className="relative h-60 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex flex-col items-center justify-center cursor-pointer group"
      >
        {/* Mock Grid Lines */}
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        {/* Mock road curves */}
        <div className="absolute w-full h-8 bg-slate-200/20 top-1/3 rotate-6 transform scale-110"></div>
        <div className="absolute h-full w-8 bg-slate-200/20 left-1/4 -rotate-12 transform scale-110"></div>

        <div className="relative z-10 text-center px-4 flex flex-col items-center">
          {pinned ? (
            <>
              <div className="w-10 h-10 rounded-full bg-blue-600/10 border-2 border-blue-500 flex items-center justify-center animate-pulse mb-2">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-800">{address || "선택된 위치"}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">좌표: 37.5665° N, 126.9780° E (인근 오차 2m)</p>
            </>
          ) : (
            <>
              <MapPin className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform mb-2" />
              <p className="text-xs font-bold text-slate-600">지도를 클릭하여 정확한 핀 위치 지정</p>
              <p className="text-[10px] text-slate-400 mt-1">주소: {address || "주소를 입력해 주세요"}</p>
            </>
          )}
        </div>
      </div>
      <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <span>* 진로 진입 시 차량의 상세 위경도 데이터를 안내합니다.</span>
      </div>
    </div>
  );
}
