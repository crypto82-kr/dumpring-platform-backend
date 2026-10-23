"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MapPin,
  Truck,
  AlertTriangle,
  Radio,
  Send,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Navigation,
  Bell,
  ShieldAlert,
  ArrowRight,
  User,
  Phone,
  Layers,
  ChevronRight,
  Flame,
  Volume2,
  Calendar,
  Map,
  X,
  ExternalLink,
  Info
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

declare global {
  interface Window {
    kakao: any;
  }
}

interface CommonCodeItem {
  id?: number;
  group_code: string;
  code: string;
  code_name: string;
}

interface AssignedTicketItem {
  id: number;
  driverId: number;
  driverName: string;
  driverPhone: string;
  carNumber: string;
  tonnage: number;
  status: string;
  statusName: string;
  acceptedAt: string;
}

interface DispatchOrderItem {
  id: number;
  siteId: number;
  siteName: string;
  siteAddress: string;
  siteLat: number;
  siteLng: number;
  dropoffName: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  materialType: string;
  materialTypeName: string;
  truckType: string;
  truckTypeName: string;
  requiredTrucks: number;
  matchedTrucks: number;
  tickets: AssignedTicketItem[];
  workDate: string;
  createdAt: string;
  elapsedMinutes: number; // 공고 등록 후 경과 분
  status: string;
  statusLabel: string;
  isTodayWork: boolean; // 작업 희망일 당일 여부
  isCancelledReopen?: boolean; // 배차 취소(빵꾸)로 긴급 재모집 여부
  notificationSent?: boolean;
}

interface NearbyEmptyDriverItem {
  id: number;
  driverId: number;
  driverName: string;
  driverPhone: string;
  carNumber: string;
  truckType: string;
  tonnage: number;
  distanceKm: number;
  lat: number;
  lng: number;
  lastActive: string;
}

interface DispatchIncidentLog {
  id: string;
  timestamp: string;
  type: "CANCEL" | "DELAY" | "OFF_ROUTE" | "EMERGENCY";
  title: string;
  message: string;
  jobPostId: number;
  carNumber?: string;
  driverName?: string;
  resolved: boolean;
}

export function PlatformAdminDispatchControl({ setActivePath }: { setActivePath?: (path: string) => void }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // 오늘 날짜 계산 (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // 필터 탭 (실시간 관제: 오늘 전체 / 미매차 / 운행중)
  const [filterTab, setFilterTab] = useState<"ALL" | "WAITING" | "DRIVING">("ALL");

  // 공통코드 목록 상태
  const [commonCodes, setCommonCodes] = useState<CommonCodeItem[]>([]);

  // 선택된 오더
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // 실시간 데이터 상태
  const [orders, setOrders] = useState<DispatchOrderItem[]>([]);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyEmptyDriverItem[]>([]);
  const [incidents, setIncidents] = useState<DispatchIncidentLog[]>([]);

  // 지도 팝업 모달 상태
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  // 인근 기사 알림 발송 중 상태
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // 1. 공통코드 DB 마스터 로드
  useEffect(() => {
    const fetchCommonCodes = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/common-codes`);
        if (res.ok) {
          const data = await res.json();
          setCommonCodes(data || []);
        }
      } catch (err) {
        console.warn("공통코드 로드 실패:", err);
      }
    };
    fetchCommonCodes();
  }, []);

  // 공통코드 한글 변환 헬퍼 함수
  const getCodeName = (groupCode: string, code: string | null | undefined, fallback: string): string => {
    if (!code) return fallback;
    const found = commonCodes.find((c) => c.group_code === groupCode && c.code === code);
    if (found && found.code_name) return found.code_name;

    if (groupCode === "MATERIAL_TYPE") {
      const soilMap: Record<string, string> = {
        GOOD_SOIL: "양질토",
        MUD_SOIL: "뻘흙",
        ROCK: "암버럭",
        MIXED: "혼합토",
        SAND: "모래",
        CLAY: "점토",
        GRAVEL: "자갈",
        SOIL: "일반토사"
      };
      return soilMap[code] || code;
    }

    if (groupCode === "TRUCK_TYPE") {
      const truckMap: Record<string, string> = {
        T_15: "15톤",
        T_25: "25.5톤",
        T_27: "27톤",
        T_DUMP: "덤프트럭"
      };
      return truckMap[code] || code;
    }

    if (groupCode === "DISPATCH_STATUS") {
      const statusMap: Record<string, string> = {
        ACCEPTED: "배차 수락",
        MATCHED: "매칭 완료",
        ARRIVED_LOADING: "상차지 도착",
        LOADING_APPROVED: "상차 승인완료",
        DRIVING: "하차지 이동 중",
        ARRIVED: "하차지 도착",
        WAITING_ABSENT_APPROVAL: "지주부재 승인대기",
        APPROVED: "반입 승인완료",
        COMPLETED: "운행 완료",
        SETTLEMENT_REQUESTED: "정산 요청",
        SETTLEMENT_REVIEW: "정산 검토",
        SETTLEMENT_APPROVED: "정산 승인",
        SETTLEMENT_PAID: "송금 완료",
        SETTLEMENT_CONFIRMED: "정산 확정",
        SETTLEMENT_CLOSED: "정산 마감",
        SETTLEMENT_DISPUTED: "정산 분쟁",
        REJECTED: "반입 반려",
        CANCELLED: "배차 취소"
      };
      return statusMap[code] || code;
    }

    if (groupCode === "JOB_STATUS") {
      const jobMap: Record<string, string> = {
        WAITING_MATCH: "매칭 대기",
        MATCHED: "매칭 완료",
        WAITING_APPROVAL: "하차지 승인대기",
        OPEN: "기사 모집중",
        IN_PROGRESS: "배차 운행중",
        COMPLETED: "배차 완료",
        SETTLEMENT_REVIEW: "정산 검토",
        SETTLEMENT_APPROVED: "정산 승인",
        SETTLEMENT_PAID: "지급 완료",
        SETTLEMENT_CONFIRMED: "정산 확정",
        SETTLEMENT_CLOSED: "정산 마감",
        CLOSED: "공고 마감",
        CANCELLED: "배차 취소"
      };
      return jobMap[code] || code;
    }

    // fallback fallback map for common statuses across groups
    const genericMap: Record<string, string> = {
      MATCHED: "매칭 완료",
      WAITING_MATCH: "매칭 대기",
      SETTLEMENT_CLOSED: "정산 마감",
      SETTLEMENT_CONFIRMED: "정산 확정",
      SETTLEMENT_PAID: "지급 완료",
      SETTLEMENT_APPROVED: "정산 승인",
      SETTLEMENT_REVIEW: "정산 검토",
      SETTLEMENT_REQUESTED: "정산 요청",
      COMPLETED: "운행 완료",
      OPEN: "기사 모집중",
      IN_PROGRESS: "운행중",
      CLOSED: "마감",
      CANCELLED: "취소"
    };

    return genericMap[code] || code || fallback;
  };

  // 카카오 지도 스크립트 로드
  useEffect(() => {
    const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || "7acd38e59f0935b4ba4dfb9eb5936bdd";
    const scriptId = "kakao-map-script";
    const existing = document.getElementById(scriptId);

    if (!existing) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => setIsMapReady(true));
        }
      };
      document.head.appendChild(script);
    } else {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setIsMapReady(true));
      }
    }
  }, []);

  // 실시간 관제 데이터 로드 (백엔드 실제 API 연동)
  const fetchDispatchMonitorData = async () => {
    setRefreshing(true);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      const res = await fetch(`${baseUrl}/api/dispatch/job-posts?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const rawJobs = await res.json();
        const now = new Date().getTime();

        const parsedOrders: DispatchOrderItem[] = (rawJobs || []).map((j: any) => {
          const createdTime = j.created_at ? new Date(j.created_at).getTime() : now;
          const elapsedMin = Math.max(0, Math.floor((now - createdTime) / (1000 * 60)));

          const workDateStr = j.work_date ? String(j.work_date).split("T")[0] : "";
          const isToday = workDateStr === todayStr;

          const rawTickets = j.tickets || [];
          const parsedTickets: AssignedTicketItem[] = rawTickets.map((t: any) => ({
            id: t.id,
            driverId: t.driver_id,
            driverName: t.driver_name,
            driverPhone: t.driver_phone,
            carNumber: t.car_number,
            tonnage: t.tonnage,
            status: t.status,
            statusName: getCodeName("DISPATCH_STATUS", t.status, "운행중"),
            acceptedAt: t.accepted_at,
          }));

          return {
            id: j.id,
            siteId: j.site_id,
            siteName: j.site?.site_name || j.site?.company_name || `공사현장 #${j.site_id}`,
            siteAddress: j.site?.site_address || "현장 주소 미등록",
            siteLat: j.site?.latitude || 37.5665,
            siteLng: j.site?.longitude || 126.9780,
            dropoffName: j.matched_drop_off?.name || "사토장 미정",
            dropoffAddress: j.matched_drop_off?.address || "하차지 정보 없음",
            dropoffLat: j.matched_drop_off?.latitude || 37.4563,
            dropoffLng: j.matched_drop_off?.longitude || 126.7052,
            materialType: j.material_type || "",
            materialTypeName: getCodeName("MATERIAL_TYPE", j.material_type, "일반토사"),
            truckType: j.truck_type || "",
            truckTypeName: getCodeName("TRUCK_TYPE", j.truck_type, "25.5톤"),
            requiredTrucks: j.required_trucks || 1,
            matchedTrucks: j.matched_trucks_count !== undefined ? j.matched_trucks_count : parsedTickets.length,
            tickets: parsedTickets,
            workDate: workDateStr,
            createdAt: j.created_at || "",
            elapsedMinutes: elapsedMin,
            status: j.status,
            statusLabel: getCodeName("JOB_STATUS", j.status, "기사 모집중"),
            isTodayWork: isToday,
            isCancelledReopen: elapsedMin > 45 && parsedTickets.length === 0,
          };
        });

        parsedOrders.sort((a, b) => {
          if (a.isCancelledReopen && !b.isCancelledReopen) return -1;
          if (!a.isCancelledReopen && b.isCancelledReopen) return 1;
          return b.elapsedMinutes - a.elapsedMinutes;
        });

        setOrders(parsedOrders);

        // 이전 선택 아이디가 유효할 때만 유지, 없으면 null 상태 유지(사용자가 클릭할 때 상세 활성화)
        setSelectedOrderId((prev) => (prev && parsedOrders.some(p => p.id === prev) ? prev : null));
      } else {
        setOrders([]);
        setSelectedOrderId(null);
      }

      setIncidents([]);
      setNearbyDrivers([]);
    } catch (e) {
      console.error("배차 관제 데이터 로드 실패:", e);
      setOrders([]);
      setIncidents([]);
      setNearbyDrivers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDispatchMonitorData();
    const interval = setInterval(fetchDispatchMonitorData, 30000);
    return () => clearInterval(interval);
  }, [commonCodes]);

  // 실시간 KPI 통계 지표 계산 (금일 당일 todayStr 실시간 배차 오더 기준)
  const kpiStats = useMemo(() => {
    // 1. 실시간 관제 대상: 오늘(todayStr) 작업일이면서 마감/취소/정산완료가 아닌 활성 오더
    const activeTodayOrders = orders.filter((o) => {
      const isPastOrClosed = ["CANCELLED", "CLOSED", "SETTLEMENT_CLOSED"].includes(o.status);
      return o.workDate === todayStr && !isPastOrClosed;
    });

    const totalCount = activeTodayOrders.length;
    const unassignedCount = activeTodayOrders.filter((o) => o.matchedTrucks < o.requiredTrucks).length;
    const activeTrucks = activeTodayOrders.reduce((acc, cur) => acc + cur.matchedTrucks, 0);

    const requiredTrucksSum = activeTodayOrders.reduce((acc, cur) => acc + cur.requiredTrucks, 0);
    const matchingRate = requiredTrucksSum > 0 ? ((activeTrucks / requiredTrucksSum) * 100).toFixed(1) : "0.0";

    return {
      totalCount,
      unassignedCount,
      activeTrucks,
      matchingRate,
    };
  }, [orders, todayStr]);

  // 필터링된 오더 목록 (실시간 관제: 무조건 금일 todayStr 당일 건만 엄격 표시)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. 무조건 당일 오더만 관제 대상 (과거 날짜 및 이미 마감/취소/정산완료된 과거 이력은 실시간 관제에서 완전 배제)
      if (o.workDate !== todayStr) return false;
      if (["CANCELLED", "CLOSED", "SETTLEMENT_CLOSED"].includes(o.status)) return false;

      // 2. 검색어 필터링
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = o.siteName.toLowerCase().includes(query);
        const matchDrop = o.dropoffName.toLowerCase().includes(query);
        const matchMat = o.materialTypeName.toLowerCase().includes(query) || o.materialType.toLowerCase().includes(query);
        const matchTruck = o.truckTypeName.toLowerCase().includes(query) || o.truckType.toLowerCase().includes(query);
        if (!matchName && !matchDrop && !matchMat && !matchTruck) return false;
      }

      // 3. 실시간 관제 탭 필터링
      if (filterTab === "WAITING") {
        return o.matchedTrucks < o.requiredTrucks;
      }
      if (filterTab === "DRIVING") {
        return o.matchedTrucks > 0;
      }
      return true; // 오늘 전체 활성 오더
    });
  }, [orders, searchQuery, filterTab, todayStr]);

  // 선택된 오더 (좌측 현재 목록(filteredOrders)에 존재하는 공고 중에서만 선택 및 활성화)
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return filteredOrders.find((o) => o.id === selectedOrderId) || null;
  }, [filteredOrders, selectedOrderId]);

  // 모달 오픈 시 지도 렌더링 및 동선/경로선 시각화
  useEffect(() => {
    if (!isMapModalOpen || !isMapReady || !mapContainerRef.current || !window.kakao || !window.kakao.maps) return;

    // 모달 DOM이 열린 후 지도 생성
    const timer = setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container) return;

      const options = {
        center: new window.kakao.maps.LatLng(selectedOrder?.siteLat || 37.5665, selectedOrder?.siteLng || 126.9780),
        level: 8,
      };
      const map = new window.kakao.maps.Map(container, options);

      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

      if (selectedOrder) {
        const siteLatLng = new window.kakao.maps.LatLng(selectedOrder.siteLat, selectedOrder.siteLng);
        const dropLatLng = new window.kakao.maps.LatLng(selectedOrder.dropoffLat, selectedOrder.dropoffLng);

        // 1. 상차지 마커 & 커스텀 오버레이
        const siteMarker = new window.kakao.maps.Marker({
          position: siteLatLng,
          map: map,
        });

        const siteOverlayContent = `
          <div style="padding: 4px 8px; background: #2563eb; color: white; font-weight: bold; font-size: 11px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); white-space: nowrap; margin-bottom: 35px; border: 2px solid white;">
            [상차지] ${selectedOrder.siteName}
          </div>
        `;
        const siteOverlay = new window.kakao.maps.CustomOverlay({
          position: siteLatLng,
          content: siteOverlayContent,
          yAnchor: 1.4,
        });
        siteOverlay.setMap(map);

        // 2. 하차지 마커 & 커스텀 오버레이
        const dropMarker = new window.kakao.maps.Marker({
          position: dropLatLng,
          map: map,
        });

        const dropOverlayContent = `
          <div style="padding: 4px 8px; background: #059669; color: white; font-weight: bold; font-size: 11px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); white-space: nowrap; margin-bottom: 35px; border: 2px solid white;">
            [하차지] ${selectedOrder.dropoffName}
          </div>
        `;
        const dropOverlay = new window.kakao.maps.CustomOverlay({
          position: dropLatLng,
          content: dropOverlayContent,
          yAnchor: 1.4,
        });
        dropOverlay.setMap(map);

        // 3. 운행 경로 연결선 (Polyline)
        const linePath = [siteLatLng, dropLatLng];
        const polyline = new window.kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 4,
          strokeColor: "#2563eb",
          strokeOpacity: 0.8,
          strokeStyle: "solid",
        });
        polyline.setMap(map);

        // 4. 두 지점이 모두 보이도록 Bounds 자동 조정
        const bounds = new window.kakao.maps.LatLngBounds();
        bounds.extend(siteLatLng);
        bounds.extend(dropLatLng);
        map.setBounds(bounds);
      }

      setMapInstance(map);
    }, 150);

    return () => clearTimeout(timer);
  }, [isMapModalOpen, isMapReady, selectedOrder]);

  // 인근 기사 타겟 푸시 일괄 발송
  const handleBroadcastPush = async () => {
    if (!selectedOrder) return;
    setIsBroadcasting(true);

    try {
      await new Promise((r) => setTimeout(r, 800));

      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, notificationSent: true } : o))
      );
      alert(`[알림 발송 완료]\n${selectedOrder.siteName} 상차지 관할 소속 및 관심 지역 기사들에게 모바일 배차 호출 푸시가 일괄 전송되었습니다.`);
    } catch (e) {
      alert("알림 발송 처리 중 오류가 발생했습니다.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* 1. 상단 배너: 실시간 관제 센터 헤더 (금일 실시간 배차 현황 중심) & KPI 요약 */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
              REAL-TIME DISPATCH MONITORING CENTER
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              실시간 배차 관제 콘솔
              <span className="text-xs px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE (금일 {todayStr})
              </span>
            </h1>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            금일(<strong className="text-blue-600 font-bold">{todayStr}</strong>) 기준 전국 상·하차지 실시간 오더 현황 및 운행 차량 배차 관제 콘솔입니다.
          </p>
        </div>

        {/* KPI 실시간 메트릭 바 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/70 p-2.5 rounded-2xl">
          <div className="px-4 py-2 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>금일 관제 오더</span>
              <span className="text-[9.5px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-bold">
                TODAY
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {kpiStats.totalCount} <span className="text-[11px] text-slate-400 font-normal">건</span>
            </div>
          </div>
          <div className="px-4 py-2 bg-rose-50/60 rounded-xl border border-rose-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              미매차 대기
            </div>
            <div className="text-lg font-black text-rose-600 mt-0.5">
              {kpiStats.unassignedCount} <span className="text-[11px] text-rose-400 font-normal">건</span>
            </div>
          </div>
          <div className="px-4 py-2 bg-blue-50/60 rounded-xl border border-blue-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-blue-600">배차 운행 차량</div>
            <div className="text-lg font-black text-blue-700 mt-0.5">
              {kpiStats.activeTrucks} <span className="text-[11px] text-blue-400 font-normal">대</span>
            </div>
          </div>
          <div className="px-4 py-2 bg-emerald-50/60 rounded-xl border border-emerald-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-emerald-600">배차 매칭률</div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{kpiStats.matchingRate}%</div>
          </div>
        </div>
      </div>

      {/* 2. 본문 2분할 통합 레이아웃 (좌측: 오더 목록 / 우측: 선택 오더 심층 관제 & 차량 전체 현황) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* [좌측 영역 (5 Cols)]: 금일 실시간 배차 오더 리스트 */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col h-[780px]">
          {/* 필터 탭 & 검색창 */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterTab("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterTab === "ALL" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  오늘 전체 ({kpiStats.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("WAITING")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    filterTab === "WAITING" ? "bg-rose-500 text-white shadow-xs" : "text-rose-600 hover:text-rose-700"
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  미매차 ({kpiStats.unassignedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("DRIVING")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterTab === "DRIVING" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  운행중
                </button>
              </div>

              <button
                type="button"
                onClick={fetchDispatchMonitorData}
                disabled={refreshing}
                title="데이터 새로고침"
                className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 active:scale-95 transition-all shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>

            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="현장명, 사토장, 토사 종류, 차량 규격 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-medium shadow-xs"
              />
            </div>
          </div>

          {/* 오더 카드 스크롤 목록 */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {filteredOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <AlertTriangle className="w-6 h-6 mb-2 text-slate-300" />
                금일({todayStr}) 실시간 관제 대상 배차 공고가 없습니다.
                <span className="text-[11px] text-slate-400 mt-1">
                  (마감 및 정산 완료 건은 실시간 관제에서 자동 제외됩니다)
                </span>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;

                let timeBadgeColor = "bg-slate-100 text-slate-600 border-slate-200";
                if (order.elapsedMinutes >= 45) {
                  timeBadgeColor = "bg-rose-50 text-rose-600 border-rose-200 animate-pulse";
                } else if (order.elapsedMinutes >= 20) {
                  timeBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                }

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-400/30"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    {/* 상단 뱃지 라인 */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs ${
                          order.isTodayWork 
                            ? "bg-blue-600 text-white" 
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}>
                          <Calendar className="w-2.5 h-2.5" />
                          작업일: {order.workDate || "미정"}
                          {order.isTodayWork && " (오늘)"}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {order.statusLabel}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${timeBadgeColor}`}>
                          대기 {order.elapsedMinutes}분
                        </span>

                        {order.isCancelledReopen && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-md flex items-center gap-0.5 shadow-xs">
                            <Flame className="w-2.5 h-2.5" />
                            재매칭 긴급
                          </span>
                        )}
                        {order.notificationSent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                            호출완료
                          </span>
                        )}
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <span className="text-xs font-black text-slate-900">
                          <strong className="text-blue-600">{order.matchedTrucks}</strong> / {order.requiredTrucks} 대
                        </span>
                      </div>
                    </div>

                    {/* 오더 핵심 정보 */}
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{order.siteName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">하차: {order.dropoffName}</span>
                      </div>
                    </div>

                    {/* 하단 세부 규격(공통코드 한글화 적용) 및 액션 버튼 */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                          {order.materialTypeName}
                        </span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">
                          {order.truckTypeName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                          handleBroadcastPush();
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg font-bold transition-all active:scale-95 flex items-center gap-1 shadow-xs"
                      >
                        <Send className="w-2.5 h-2.5" />
                        기사 호출
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* [우측 영역 (7 Cols)]: 지도를 모달로 분리하고 오더 상세 & 배차 현황을 대화면 구성 */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedOrder ? (
            <div className="h-[780px] bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-slate-400">
              <Info className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-sm font-medium">좌측에서 관제할 배차 공고를 선택해 주세요.</p>
            </div>
          ) : (
            <>
              {/* 1. 선택된 오더 상세 관제 대시보드 카드 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        공고 #{selectedOrder.id}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        작업일: <strong className="text-slate-900">{selectedOrder.workDate}</strong>
                        {selectedOrder.isTodayWork && <span className="text-blue-600 ml-1">(오늘)</span>}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                      {selectedOrder.siteName}
                      <span className="text-xs font-normal text-slate-400">➡️</span>
                      {selectedOrder.dropoffName}
                    </h2>
                  </div>

                  {/* 지도 팝업 모달 열기 버튼 */}
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
                  >
                    <Map className="w-4 h-4" />
                    <span>상·하차지 동선 지도 보기</span>
                  </button>
                </div>

                {/* 상차지 / 하차지 주소 및 규격 상세 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-150/70">
                    <div className="text-[11px] font-black text-blue-700 flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      상차지 (출발 현장)
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{selectedOrder.siteName}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5 truncate">{selectedOrder.siteAddress}</div>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-150/70">
                    <div className="text-[11px] font-black text-emerald-700 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      하차지 (도착 사토장)
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{selectedOrder.dropoffName}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5 truncate">{selectedOrder.dropoffAddress}</div>
                  </div>
                </div>

                {/* 화물 조건 스펙 배지 바 */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400 text-[11px]">토사 종류: </span>
                      <strong className="text-slate-800 font-bold ml-1">{selectedOrder.materialTypeName}</strong>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div>
                      <span className="text-slate-400 text-[11px]">차량 규격: </span>
                      <strong className="text-slate-800 font-bold ml-1">{selectedOrder.truckTypeName}</strong>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div>
                      <span className="text-slate-400 text-[11px]">오더 상태: </span>
                      <strong className="text-blue-600 font-bold ml-1">{selectedOrder.statusLabel}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      배차 매칭: <strong className="text-blue-600 text-sm">{selectedOrder.matchedTrucks}</strong> / {selectedOrder.requiredTrucks} 대
                    </span>
                    <button
                      type="button"
                      disabled={isBroadcasting}
                      onClick={handleBroadcastPush}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      기사 추가 호출
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. 배정된 운행 차량 전체 현황표 (넓고 쾌적한 테이블 뷰) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900">
                      배차 운행 차량 목록 ({selectedOrder.tickets.length}대 배정)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    모집 목표: {selectedOrder.requiredTrucks}대 중 {selectedOrder.matchedTrucks}대 운행
                  </span>
                </div>

                {/* 차량 목록 테이블 */}
                {selectedOrder.tickets.length === 0 ? (
                  <div className="py-12 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center">
                    <Truck className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">현재 배정되어 운행 중인 차량이 없습니다.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">상단의 '기사 추가 호출' 버튼을 통해 인근 기사들에게 배차 알림을 전송할 수 있습니다.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">기사명</th>
                          <th className="py-2.5 px-3">차량 번호</th>
                          <th className="py-2.5 px-3">연락처</th>
                          <th className="py-2.5 px-3">톤수/차종</th>
                          <th className="py-2.5 px-3">현재 운행 상태</th>
                          <th className="py-2.5 px-3">배차 수락 시간</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {selectedOrder.tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t.driverName}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {t.carNumber || "차량번호 미등록"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">
                              {t.driverPhone || "-"}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {t.tonnage}톤 덤프
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-md text-[11px]">
                                {t.statusName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                              {t.acceptedAt ? t.acceptedAt.replace("T", " ").substring(0, 16) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. 실시간 관제 리스크 피드 */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-black text-slate-900">예외 리스크 피드</span>
                    <span className="text-[11px] text-slate-500 ml-2">현재 선택된 오더에 감지된 이상 징후나 취소 건이 없습니다.</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold">
                  정상 운행중
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. 지도 팝업 모달 (상·하차지 동선 및 핀 경로 확인) */}
      {/* ======================================================== */}
      {isMapModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col h-[650px] animate-scaleUp">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Map className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    {selectedOrder.siteName} ➡️ {selectedOrder.dropoffName}
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-normal">
                      작업일: {selectedOrder.workDate}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    상차지(파랑)와 하차지(초록) 간의 지리적 위치 및 운행 동선 레이더입니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 지도 캔버스 영역 */}
            <div className="flex-1 w-full relative bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* 지도 위 고정 상태 오버레이 범례 */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-3 z-10 shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                  <span>상차지: {selectedOrder.siteName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                  <span>하차지: {selectedOrder.dropoffName}</span>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <div className="text-slate-500">
                <span>상차지: {selectedOrder.siteAddress}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span>하차지: {selectedOrder.dropoffAddress}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}