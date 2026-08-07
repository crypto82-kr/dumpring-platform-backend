import React, { useEffect, useRef, useState } from "react";
import { MapPin, RefreshCw, Navigation } from "lucide-react";

declare global {
  interface Window {
    kakao: any;
  }
}

interface MockMapProps {
  title: string;
  address: string;
  pinned: boolean;
  onPinClick?: () => void;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  lat?: number;
  lng?: number;
  interactive?: boolean; // false: 상세 화면 조망 전용 (수정 불가), true: 등록/수정 모달 핀 픽업 가능
  isRouteMode?: boolean;
  siteName?: string;
  siteAddress?: string;
  dropoffName?: string;
  dropoffAddress?: string;
  distance?: number;
  estimatedTime?: number;
}

export function MockMap({
  title,
  address,
  pinned,
  onPinClick,
  onLocationSelect,
  lat,
  lng,
  interactive = false,
  isRouteMode = false,
  siteName,
  siteAddress,
  dropoffName,
  dropoffAddress,
  distance,
  estimatedTime,
}: MockMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );

  const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || "7acd38e59f0935b4ba4dfb9eb5936bdd";

  // 카카오 지도 SDK 스크립트 동적 로드
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setIsLoaded(true);
      });
      return;
    }

    const scriptId = "kakao-map-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        window.kakao.maps.load(() => {
          setIsLoaded(true);
        });
      };
      script.onerror = () => {
        setLoadError(true);
      };
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            setIsLoaded(true);
          });
        }
      });
    }
  }, [KAKAO_KEY]);

  // 카카오 지도 객체 생성 및 렌더링
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !window.kakao || !window.kakao.maps) return;

    const defaultLat = lat || 37.5665;
    const defaultLng = lng || 126.9780;

    const container = mapContainerRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
      level: 3,
    };

    const map = new window.kakao.maps.Map(container, options);
    
    // 일반 지도/스카이뷰 컨트롤 추가
    const mapTypeControl = new window.kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

    // 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    // 마커 생성 (interactive 일 때만 마커 드래그 이동 허용)
    const markerPosition = new window.kakao.maps.LatLng(defaultLat, defaultLng);
    const marker = new window.kakao.maps.Marker({
      position: markerPosition,
      draggable: !!interactive,
    });
    marker.setMap(map);

    setMapInstance(map);
    setMarkerInstance(marker);

    // interactive 가 true 인 정보 등록/수정 모달에서만 지점 클릭 및 마커 드래그 핀 변경 허용
    if (interactive) {
      // 지도 클릭 이벤트 (클릭 시 마커 이동 & 좌표 픽업)
      window.kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
        const latlng = mouseEvent.getLatLng();
        const clickedLat = latlng.getLat();
        const clickedLng = latlng.getLng();

        marker.setPosition(latlng);
        setCurrentCoords({ lat: clickedLat, lng: clickedLng });

        // 좌표로 주소 검색 (Reverse Geocoding)
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(clickedLng, clickedLat, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const newAddress = result[0]?.address?.address_name || address;
            if (onLocationSelect) {
              onLocationSelect(clickedLat, clickedLng, newAddress);
            }
          }
        });

        if (onPinClick) {
          onPinClick();
        }
      });

      // 마커 드래그 끝났을 때 이벤트
      window.kakao.maps.event.addListener(marker, "dragend", () => {
        const position = marker.getPosition();
        const dragLat = position.getLat();
        const dragLng = position.getLng();

        setCurrentCoords({ lat: dragLat, lng: dragLng });

        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(dragLng, dragLat, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const newAddress = result[0]?.address?.address_name || address;
            if (onLocationSelect) {
              onLocationSelect(dragLat, dragLng, newAddress);
            }
          }
        });
      });
    }

  }, [isLoaded, interactive]);

  const activeOverlaysRef = useRef<any[]>([]);

  // Route Mode: Render Multi-Marker (Site + Dropoff) and Route Line (Polyline)
  useEffect(() => {
    if (!isRouteMode || !mapInstance || !window.kakao || !window.kakao.maps) return;

    // Clear existing custom overlays to prevent stacking duplicate markers
    activeOverlaysRef.current.forEach((ol) => ol.setMap(null));
    activeOverlaysRef.current = [];

    const geocoder = new window.kakao.maps.services.Geocoder();
    const siteAddr = siteAddress || address || "서울 영등포구 신길동 100";
    const dropAddr = dropoffAddress || "인천 서구 검단동 888";

    geocoder.addressSearch(siteAddr, (siteRes: any, siteStatus: any) => {
      if (siteStatus !== window.kakao.maps.services.Status.OK || !siteRes[0]) return;
      const siteCoords = new window.kakao.maps.LatLng(siteRes[0].y, siteRes[0].x);

      geocoder.addressSearch(dropAddr, (dropRes: any, dropStatus: any) => {
        if (dropStatus !== window.kakao.maps.services.Status.OK || !dropRes[0]) return;
        const dropCoords = new window.kakao.maps.LatLng(dropRes[0].y, dropRes[0].x);

        // 1. Hide default single marker
        if (markerInstance) {
          markerInstance.setMap(null);
        }

        // 2. Custom Overlay / Marker for Site (Blue)
        const siteContent = `
          <div style="padding:4px 10px; background:#2563eb; color:white; border-radius:8px; font-weight:800; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.15); white-space:nowrap;">
            상차지: ${siteName || "현장"}
          </div>
        `;
        const siteOverlay = new window.kakao.maps.CustomOverlay({
          position: siteCoords,
          content: siteContent,
          yAnchor: 1.3
        });
        siteOverlay.setMap(mapInstance);
        activeOverlaysRef.current.push(siteOverlay);

        // 3. Custom Overlay / Marker for Dropoff (Emerald)
        const dropContent = `
          <div style="padding:4px 10px; background:#059669; color:white; border-radius:8px; font-weight:800; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.15); white-space:nowrap;">
            하차지: ${dropoffName || "사토장"}
          </div>
        `;
        const dropOverlay = new window.kakao.maps.CustomOverlay({
          position: dropCoords,
          content: dropContent,
          yAnchor: 1.3
        });
        dropOverlay.setMap(mapInstance);
        activeOverlaysRef.current.push(dropOverlay);

        // 4. Adjust Bounds to fit both markers cleanly (No artificial line, clean Multi-Marker)
        const bounds = new window.kakao.maps.LatLngBounds();
        bounds.extend(siteCoords);
        bounds.extend(dropCoords);
        mapInstance.setBounds(bounds);
      });
    });

    return () => {
      activeOverlaysRef.current.forEach((ol) => ol.setMap(null));
      activeOverlaysRef.current = [];
    };
  }, [isRouteMode, mapInstance, siteAddress, dropoffAddress, address, siteName, dropoffName]);

  // 주소(address)가 변경되면 Geocoder로 좌표 변환하여 지도 중심 및 마커 이동 (Single Marker mode)
  useEffect(() => {
    if (isRouteMode || !mapInstance || !markerInstance || !address || !window.kakao || !window.kakao.maps) return;

    // Clear route overlays when in single marker mode
    activeOverlaysRef.current.forEach((ol) => ol.setMap(null));
    activeOverlaysRef.current = [];
    markerInstance.setMap(mapInstance);

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        mapInstance.setCenter(coords);
        markerInstance.setPosition(coords);
        markerInstance.setMap(mapInstance);
        setCurrentCoords({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
      }
    });
  }, [address, mapInstance, markerInstance, interactive, isRouteMode]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-slate-900">{title}</span>
        </div>
        {interactive && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
              위치 편집 가능
            </span>
          </div>
        )}
      </div>

      {/* 지도 영역 */}
      <div className="relative h-64 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
        {!isLoaded && !loadError && (
          <div className="absolute inset-0 z-20 bg-slate-50 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-xs font-bold text-slate-600">실제 카카오 지도를 로드 중입니다...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 z-20 bg-slate-50 flex flex-col items-center justify-center space-y-2 p-4 text-center">
            <p className="text-xs font-bold text-slate-800">카카오 지도 로드 실패</p>
            <p className="text-[10px] text-slate-500">도메인 등록 상태 및 API 키를 점검해 주세요.</p>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {interactive && (
        <p className="text-[9.5px] text-slate-400">
          * 지도를 직접 클릭하거나 마커를 드래그하면 정확한 덤프트럭 진입로 좌표(위경도)를 지정하실 수 있습니다.
        </p>
      )}
    </div>
  );
}
