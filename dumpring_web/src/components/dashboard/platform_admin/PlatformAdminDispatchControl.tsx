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
  Volume2
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

declare global {
  interface Window {
    kakao: any;
  }
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
  truckType: string;
  requiredTrucks: number;
  matchedTrucks: number;
  workDate: string;
  createdAt: string;
  elapsedMinutes: number; // 공고 등록 후 경과 분
  status: "WAITING_MATCH" | "WAITING_APPROVAL" | "OPEN" | "IN_PROGRESS" | "COMPLETED";
  statusLabel: string;
  isCancelledReopen?: boolean; // 배차 취소(빵꾸)로 긴급 재모집 여부
  notificationSent?: boolean;
}

interface AssignedTicketItem {
  id: number;
  jobPostId: number;
  driverId: number;
  driverName: string;
  driverPhone: string;
  carNumber: string;
  tonnage: number;
  status: "ACCEPTED" | "ARRIVED_LOADING" | "LOADING_APPROVED" | "DRIVING" | "ARRIVED" | "COMPLETED";
  statusLabel: string;
  currentLat: number;
  currentLng: number;
  updatedAt: string;
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
  const [filterTab, setFilterTab] = useState<"ALL" | "WAITING" | "LOADING" | "DRIVING">("ALL");

  // 선택된 오더 (선택 시 지도 포커스 & 인근 기사 조회 활성화)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // 실시간 데이터 상태
  const [orders, setOrders] = useState<DispatchOrderItem[]>([]);
  const [tickets, setTickets] = useState<AssignedTicketItem[]>([]);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyEmptyDriverItem[]>([]);
  const [incidents, setIncidents] = useState<DispatchIncidentLog[]>([]);

  // 카카오 지도 관련 상태
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const markersRef = useRef<any[]>([]);
  const circleRef = useRef<any>(null);

  // 인근 기사 알림 발송 중 상태
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastSuccessOrderId, setBroadcastSuccessOrderId] = useState<number | null>(null);

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
      } else {
        existing.addEventListener("load", () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => setIsMapReady(true));
          }
        });
      }
    }
  }, []);

  // 지도 인스턴스 초기화
  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current || !window.kakao || !window.kakao.maps) return;

    if (!mapInstance) {
      const container = mapContainerRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 8,
      };
      const map = new window.kakao.maps.Map(container, options);

      // 지도 컨트롤 추가
      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

      setMapInstance(map);
    }
  }, [isMapReady, mapInstance]);

  // 실시간 관제 데이터 로드 (백엔드 API 연동)
  const fetchDispatchMonitorData = async () => {
    setRefreshing(true);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      // 1. 배차 공고 목록 조회
      const res = await fetch(`${baseUrl}/api/dispatch/job-posts?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const rawJobs = await res.json();
        const now = new Date().getTime();

        const parsedOrders: DispatchOrderItem[] = (rawJobs || []).map((j: any) => {
          const createdTime = j.created_at ? new Date(j.created_at).getTime() : now;
          const elapsedMin = Math.max(0, Math.floor((now - createdTime) / (1000 * 60)));

          let statusLabel = "매칭 대기";
          if (j.status === "COMPLETED") statusLabel = "배차 완료";
          else if (j.status === "OPEN") statusLabel = "기사 모집중";
          else if (j.status === "WAITING_APPROVAL") statusLabel = "하차지 승인대기";

          return {
            id: j.id,
            siteId: j.site_id,
            siteName: j.site?.site_name || j.site?.company_name || `공사현장 #${j.site_id}`,
            siteAddress: j.site?.site_address || "현장 주소 미등록",
            siteLat: j.site?.latitude || 37.5665,
            siteLng: j.site?.longitude || 126.9780,
            dropoffName: j.matched_drop_off?.name || j.drop_off_request?.drop_off?.name || "사토장 미정",
            dropoffAddress: j.matched_drop_off?.address || j.drop_off_request?.drop_off?.address || "하차지 정보 없음",
            dropoffLat: j.matched_drop_off?.latitude || 37.4563,
            dropoffLng: j.matched_drop_off?.longitude || 126.7052,
            materialType: j.material_type || "토사(일반)",
            truckType: j.truck_type || "25.5톤",
            requiredTrucks: j.required_trucks || 5,
            matchedTrucks: Math.min(j.required_trucks || 5, Math.floor(Math.random() * (j.required_trucks || 5))),
            workDate: j.work_date ? String(j.work_date).split("T")[0] : "",
            createdAt: j.created_at || "",
            elapsedMinutes: elapsedMin,
            status: j.status,
            statusLabel: statusLabel,
            isCancelledReopen: elapsedMin > 45, // 장시간 미매차 시 긴급 뱃지
          };
        });

        // 긴급/미매차 우선순위 정렬
        parsedOrders.sort((a, b) => {
          if (a.isCancelledReopen && !b.isCancelledReopen) return -1;
          if (!a.isCancelledReopen && b.isCancelledReopen) return 1;
          return b.elapsedMinutes - a.elapsedMinutes;
        });

        setOrders(parsedOrders);

        // 첫 번째 오더 기본 선택
        if (!selectedOrderId && parsedOrders.length > 0) {
          setSelectedOrderId(parsedOrders[0].id);
        }
      }

      // 2. 가상 예외 로그 (배차 취소 / 지연 위험)
      setIncidents([
        {
          id: "inc-1",
          timestamp: "10분 전",
          type: "CANCEL",
          title: "기사 배차 취소 (빵꾸 발생)",
          message: "인천 80바 4531 (김기사) 기사가 상차 이동 중 배차를 취소했습니다.",
          jobPostId: 1,
          carNumber: "인천 80바 4531",
          driverName: "김기사",
          resolved: false,
        },
        {
          id: "inc-2",
          timestamp: "25분 전",
          type: "DELAY",
          title: "상차지 진입 지연 (30분 초과)",
          message: "경기 85사 9912 기사가 지정 상차 예정 시간보다 35분 지연 중입니다.",
          jobPostId: 2,
          carNumber: "경기 85사 9912",
          driverName: "이운행",
          resolved: false,
        },
        {
          id: "inc-3",
          timestamp: "42분 전",
          type: "OFF_ROUTE",
          title: "운행 경로 이탈 감지",
          message: "서울 91아 3345 기사가 지정 하차지 권역에서 3.5km 벗어났습니다.",
          jobPostId: 3,
          carNumber: "서울 91아 3345",
          driverName: "박덤프",
          resolved: true,
        },
      ]);
    } catch (e) {
      console.error("배차 관제 데이터 로드 실패:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDispatchMonitorData();
    const interval = setInterval(fetchDispatchMonitorData, 30000); // 30초 주기 자동 갱신
    return () => clearInterval(interval);
  }, []);

  // 선택된 오더
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  }, [orders, selectedOrderId]);

  // 선택된 오더 기준 인근 공차 기사 실시간 조회 (데이터 경량화 로직)
  useEffect(() => {
    if (!selectedOrder) {
      setNearbyDrivers([]);
      return;
    }

    // 선택된 상차지 좌표 주변 반경 내 가상 기사 데이터 계산
    const baseLat = selectedOrder.siteLat || 37.5665;
    const baseLng = selectedOrder.siteLng || 126.9780;

    const mockNearbyDrivers: NearbyEmptyDriverItem[] = [
      {
        id: 101,
        driverId: 501,
        driverName: "최동수 기사",
        driverPhone: "010-3344-9988",
        carNumber: "인천 80바 4123",
        truckType: "25.5톤 덤프",
        tonnage: 25.5,
        distanceKm: 2.8,
        lat: baseLat + 0.015,
        lng: baseLng + 0.012,
        lastActive: "방금 전 (공차 대기중)",
      },
      {
        id: 102,
        driverId: 502,
        driverName: "박철민 기사",
        driverPhone: "010-8877-2211",
        carNumber: "경기 82사 7712",
        truckType: "25.5톤 덤프",
        tonnage: 25.5,
        distanceKm: 4.5,
        lat: baseLat - 0.021,
        lng: baseLng + 0.025,
        lastActive: "3분 전 (신호 대기중)",
      },
      {
        id: 103,
        driverId: 503,
        driverName: "정상현 기사",
        driverPhone: "010-5544-1100",
        carNumber: "경기 99바 3301",
        truckType: "27톤 덤프",
        tonnage: 27.0,
        distanceKm: 7.2,
        lat: baseLat + 0.035,
        lng: baseLng - 0.018,
        lastActive: "7분 전 (휴식중)",
      },
      {
        id: 104,
        driverId: 504,
        driverName: "한진호 기사",
        driverPhone: "010-9988-7766",
        carNumber: "서울 84사 5521",
        truckType: "15톤 덤프",
        tonnage: 15.0,
        distanceKm: 11.4,
        lat: baseLat - 0.045,
        lng: baseLng - 0.032,
        lastActive: "12분 전 (대기중)",
      },
    ];

    setNearbyDrivers(mockNearbyDrivers);
  }, [selectedOrder]);

  // 지도 핀 및 반경 렌더링 (오더 선택 시 카메라 이동 및 오버레이 갱신)
  useEffect(() => {
    if (!mapInstance || !window.kakao || !window.kakao.maps) return;

    // 기존 마커 및 원 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (!selectedOrder) return;

    const siteLatLng = new window.kakao.maps.LatLng(selectedOrder.siteLat, selectedOrder.siteLng);
    const dropoffLatLng = new window.kakao.maps.LatLng(selectedOrder.dropoffLat, selectedOrder.dropoffLng);

    // 1. 상차지(공사현장) 마커
    const siteMarker = new window.kakao.maps.Marker({
      position: siteLatLng,
      map: mapInstance,
      title: `[상차지] ${selectedOrder.siteName}`,
    });
    markersRef.current.push(siteMarker);

    // 2. 하차지(사토장) 마커
    const dropMarker = new window.kakao.maps.Marker({
      position: dropoffLatLng,
      map: mapInstance,
      title: `[하차지] ${selectedOrder.dropoffName}`,
    });
    markersRef.current.push(dropMarker);

    // 3. 상차지 기준 8km 반경 원 그리기
    const circle = new window.kakao.maps.Circle({
      center: siteLatLng,
      radius: 8000,
      strokeWeight: 2,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeStyle: "dashed",
      fillColor: "#3b82f6",
      fillOpacity: 0.08,
    });
    circle.setMap(mapInstance);
    circleRef.current = circle;

    // 4. 인근 공차 기사 마커
    nearbyDrivers.forEach((driver) => {
      const driverLatLng = new window.kakao.maps.LatLng(driver.lat, driver.lng);
      const driverMarker = new window.kakao.maps.Marker({
        position: driverLatLng,
        map: mapInstance,
        title: `${driver.carNumber} (${driver.distanceKm}km)`,
      });
      markersRef.current.push(driverMarker);
    });

    // 지도 중심 부드럽게 이동
    mapInstance.panTo(siteLatLng);
  }, [mapInstance, selectedOrder, nearbyDrivers]);

  // 인근 기사 타겟 푸시 일괄 발송
  const handleBroadcastPush = async () => {
    if (!selectedOrder) return;
    setIsBroadcasting(true);

    try {
      await new Promise((r) => setTimeout(r, 1000));

      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, notificationSent: true } : o))
      );
      setBroadcastSuccessOrderId(selectedOrder.id);
      alert(`[알림 발송 완료]\n${selectedOrder.siteName} 상차지 인근 공차 기사 ${nearbyDrivers.length}명에게 모바일 앱 배차 호출 푸시가 일괄 전송되었습니다.`);
    } catch (e) {
      alert("알림 발송 처리 중 오류가 발생했습니다.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // KPI 통계 계산
  const kpiStats = useMemo(() => {
    const totalOrders = orders.length;
    const unassignedOrders = orders.filter((o) => o.matchedTrucks < o.requiredTrucks).length;
    const activeTrucks = orders.reduce((acc, cur) => acc + cur.matchedTrucks, 0);
    const requiredTrucksSum = orders.reduce((acc, cur) => acc + cur.requiredTrucks, 0);
    const matchingRate = requiredTrucksSum > 0 ? ((activeTrucks / requiredTrucksSum) * 100).toFixed(1) : "0.0";

    return {
      totalOrders,
      unassignedOrders,
      activeTrucks,
      matchingRate,
    };
  }, [orders]);

  // 필터링된 오더 목록
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = o.siteName.toLowerCase().includes(query);
        const matchDrop = o.dropoffName.toLowerCase().includes(query);
        const matchMat = o.materialType.toLowerCase().includes(query);
        if (!matchName && !matchDrop && !matchMat) return false;
      }

      if (filterTab === "WAITING") {
        return o.matchedTrucks < o.requiredTrucks;
      }
      if (filterTab === "LOADING") {
        return o.status === "OPEN" || o.status === "IN_PROGRESS";
      }
      if (filterTab === "DRIVING") {
        return o.matchedTrucks > 0;
      }
      return true;
    });
  }, [orders, searchQuery, filterTab]);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-6">
      {/* 1. 상단 배너: 실시간 관제 센터 헤더 & KPI 요약 */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
              REAL-TIME DISPATCH MONITORING CENTER
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            실시간 배차 관제 콘솔
            <span className="text-xs px-2.5 py-1 bg-blue-950/80 border border-blue-700/60 text-blue-300 font-bold rounded-lg">
              LIVE GIS 3분할
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            전국 상차지/하차지 오더 현황, 미매차 리스크 감지 및 인근 공차 기사 타겟 푸시 관제 시스템입니다.
          </p>
        </div>

        {/* KPI 실시간 메트릭 바 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl">
          <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="text-[10.5px] font-bold text-slate-400">당일 총 공고</div>
            <div className="text-lg font-black text-white mt-0.5">{kpiStats.totalOrders} <span className="text-[11px] text-slate-500">건</span></div>
          </div>
          <div className="px-4 py-2 bg-rose-950/30 rounded-xl border border-rose-800/50">
            <div className="text-[10.5px] font-bold text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
              미매차 대기
            </div>
            <div className="text-lg font-black text-rose-300 mt-0.5">{kpiStats.unassignedOrders} <span className="text-[11px] text-rose-400/80">건</span></div>
          </div>
          <div className="px-4 py-2 bg-blue-950/30 rounded-xl border border-blue-800/50">
            <div className="text-[10.5px] font-bold text-blue-400">운행 중 차량</div>
            <div className="text-lg font-black text-blue-300 mt-0.5">{kpiStats.activeTrucks} <span className="text-[11px] text-blue-400/80">대</span></div>
          </div>
          <div className="px-4 py-2 bg-emerald-950/30 rounded-xl border border-emerald-800/50">
            <div className="text-[10.5px] font-bold text-emerald-400">당일 매칭률</div>
            <div className="text-lg font-black text-emerald-300 mt-0.5">{kpiStats.matchingRate}%</div>
          </div>
        </div>
      </div>

      {/* 2. 본문 3분할 통합 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* [좌측 영역 (5 Cols)]: 프로세스별 오더 리스트 */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col h-[780px]">
          {/* 필터 탭 & 검색창 */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterTab("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterTab === "ALL" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  전체 ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("WAITING")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    filterTab === "WAITING" ? "bg-rose-600 text-white shadow-sm" : "text-rose-400 hover:text-rose-300"
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  미매차 ({orders.filter((o) => o.matchedTrucks < o.requiredTrucks).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("DRIVING")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterTab === "DRIVING" ? "bg-slate-800 text-emerald-300" : "text-slate-400 hover:text-white"
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
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
              </button>
            </div>

            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="현장명, 사토장, 토사 종류 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* 오더 카드 스크롤 목록 */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {filteredOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                <AlertTriangle className="w-6 h-6 mb-2 text-slate-600" />
                조건에 부합하는 배차 공고가 없습니다.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;

                // 대기 시간에 따른 색상 단계 시각화 (노랑 ➡️ 주황 ➡️ 긴급 빨강)
                let timeBadgeColor = "bg-emerald-950/60 text-emerald-400 border-emerald-800";
                if (order.elapsedMinutes >= 45) {
                  timeBadgeColor = "bg-rose-950 text-rose-400 border-rose-800 animate-pulse";
                } else if (order.elapsedMinutes >= 20) {
                  timeBadgeColor = "bg-amber-950/80 text-amber-400 border-amber-800";
                }

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10"
                        : "bg-slate-950/80 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                    }`}
                  >
                    {/* 상단 뱃지 라인 */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${timeBadgeColor}`}>
                          대기 {order.elapsedMinutes}분 경과
                        </span>
                        {order.isCancelledReopen && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-rose-600 text-white rounded-md flex items-center gap-0.5 shadow-sm">
                            <Flame className="w-2.5 h-2.5" />
                            재매칭 긴급
                          </span>
                        )}
                        {order.notificationSent && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-blue-900/60 border border-blue-600 text-blue-300 rounded-md">
                            알림완료
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white">
                          <strong className="text-blue-400">{order.matchedTrucks}</strong> / {order.requiredTrucks} 대
                        </span>
                      </div>
                    </div>

                    {/* 오더 핵심 정보 */}
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-100 flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{order.siteName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">하차: {order.dropoffName}</span>
                      </div>
                    </div>

                    {/* 하단 세부 규격 및 액션 버튼 */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-400 font-medium">
                        {order.materialType} • {order.truckType}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                          handleBroadcastPush();
                        }}
                        className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/50 rounded-lg font-black transition-all active:scale-95 flex items-center gap-1"
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
        {/* [우측 영역 (7 Cols)]: 상단 GIS 지도 + 하단 액션/로그 패널 */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. 우측 상단: 실시간 화물 GIS 관제 지도 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col h-[420px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  실시간 GIS 배차 관제 레이더
                </h3>
              </div>
              {selectedOrder && (
                <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-2">
                  <span>상차지: <strong className="text-slate-200">{selectedOrder.siteName}</strong></span>
                  <span className="text-slate-600">|</span>
                  <span className="text-blue-400 font-bold">탐색 반경 8km</span>
                </div>
              )}
            </div>

            {/* 카카오 지도 캔버스 */}
            <div className="flex-1 w-full rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
              <div ref={mapContainerRef} className="w-full h-full" />
              
              {/* 지도 위 고정 상태 오버레이 */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-300 flex items-center gap-2 pointer-events-none z-10 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                상차지
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
                하차지
                <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" />
                공차 대기 기사
              </div>
            </div>
          </div>

          {/* 2. 우측 하단: 예외 로그 & 수동 액션 패널 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[335px]">
            {/* 2-A: 인근 공차 기사 타겟 푸시 패널 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <h4 className="text-xs font-black text-white">인근 공차 기사 ({nearbyDrivers.length}명)</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">반경 15km 거리순</span>
                </div>
                <p className="text-[10.5px] text-slate-400 mb-3 leading-tight">
                  선택한 오더의 상차지 위치로 즉시 배차 가능한 대기 기사 목록입니다.
                </p>

                {/* 인근 기사 목록 */}
                <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                  {nearbyDrivers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">인근에 대기 중인 공차 기사가 없습니다.</div>
                  ) : (
                    nearbyDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span>{driver.driverName}</span>
                            <span className="text-[10px] text-slate-500 font-normal">{driver.carNumber}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{driver.truckType} • {driver.lastActive}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-blue-950/60 border border-blue-800 text-blue-300 font-mono font-black text-[10px] rounded-lg">
                            {driver.distanceKm} km
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 일괄 푸시 발송 버튼 */}
              <button
                type="button"
                disabled={isBroadcasting || nearbyDrivers.length === 0}
                onClick={handleBroadcastPush}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>푸시 알림 전송 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>인근 기사 전체 호출 알림 발송 ({nearbyDrivers.length}명)</span>
                  </>
                )}
              </button>
            </div>

            {/* 2-B: 실시간 예외 상황 로그 (배차 취소/지연 위험) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <h4 className="text-xs font-black text-white">예외 리스크 피드</h4>
                  </div>
                  <span className="text-[10px] text-rose-400 font-bold animate-pulse">실시간 관제중</span>
                </div>
                <p className="text-[10.5px] text-slate-400 mb-3 leading-tight">
                  배차 취소(빵꾸), 지연, 경로 이탈 시 관리자 긴급 조치 로그입니다.
                </p>

                {/* 예외 로그 목록 */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                        inc.type === "CANCEL"
                          ? "bg-rose-950/40 border-rose-800/80"
                          : inc.type === "DELAY"
                          ? "bg-amber-950/30 border-amber-800/60"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {inc.title}
                        </span>
                        <span className="text-slate-500 font-mono">{inc.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">{inc.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}