"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Menu,
  Maximize2,
  Minimize2,
  Activity,
  BarChart3,
  Sparkles,
  AlertTriangle,
  Radar,
  X,
  ArrowRight,
  Radio,
  ShieldAlert,
} from "lucide-react";

interface SiteOverviewDashboardProps {
  registeredSiteList?: any[];
  dispatchRequestList?: any[];
  dropoffRequestList?: any[];
  registeredDropoffList?: any[];
  taxInvoiceApproved?: boolean;
  setTaxInvoiceApproved?: (val: boolean) => void;
  setActivePath?: (path: string) => void;
  onOpenCreateDispatch?: () => void;
}

interface AnomalyEventDetail {
  id: string;
  siteName: string;
  severity: "CRITICAL" | "WARNING";
  categoryLabel:
    | "반입 거부(회차)"
    | "배차·매칭 거절"
    | "검수·상하차 지연"
    | "계획 용량 초과 반출"
    | "현장 상차 중단 감지";
  title: string;
  dropoffName: string;
  orderNo: string;
  soilType: string;
  truckOrCount: string;
  reason: string;
  detectedTime: string;
  targetPath: string;
  baseX: number;
  baseY: number;
}

const SITE_PALETTE = [
  { main: "#22d3ee", glow: "rgba(34,211,238,0.45)", fill: "rgba(34,211,238,0.16)" },
  { main: "#fbbf24", glow: "rgba(251,191,36,0.45)", fill: "rgba(251,191,36,0.14)" },
  { main: "#34d399", glow: "rgba(52,211,153,0.45)", fill: "rgba(52,211,153,0.16)" },
  { main: "#a78bfa", glow: "rgba(167,139,250,0.45)", fill: "rgba(167,139,250,0.16)" },
];

export default function SiteOverviewDashboard({
  registeredSiteList = [],
  dispatchRequestList = [],
  registeredDropoffList = [],
  setActivePath,
}: SiteOverviewDashboardProps) {
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const [clockText, setClockText] = useState<string>("");
  const [tick, setTick] = useState<number>(0);
  const [timeSeriesHistory, setTimeSeriesHistory] = useState<
    Array<{ timeLabel: string; values: number[] }>
  >([]);
  const [emergencySimMode, setEmergencySimMode] = useState<boolean>(true);

  // 이상 징후 클릭 시 열리는 상세 모달 (1~3번 현장 그래프용)
  const [selectedDetailModal, setSelectedDetailModal] = useState<{
    siteName: string;
    events: AnomalyEventDetail[];
    focusedEvent?: AnomalyEventDetail;
  } | null>(null);

  // 4번째 그래프(기사별 실시간 움직임 이상 감지 분포도) 점 클릭 시 열리는 기사 상세 모달
  const [selectedDriverModal, setSelectedDriverModal] = useState<{
    driverName: string;
    carPlate: string;
    phone: string;
    siteName: string;
    statusType: "CRITICAL" | "WARNING" | "NORMAL";
    statusBadge: string;
    lastLocation: string;
    stoppedDuration: string;
    reason: string;
  } | null>(null);

  // 실시간 시계 및 1초 주기 시간 흐름 틱 (억지 출렁거림 없이 실제 시간 흐름에 따라 진행)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setClockText(`${hh}:${mi}:${ss}`);
    };
    updateClock();
    const timer = setInterval(() => {
      updateClock();
      setTick((prev) => (prev + 1) % 10000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleBrowserFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsBrowserFullscreen(false);
    }
  };

  const handleOpenSidebarDrawer = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dumpring:toggle-sidebar"));
    }
  };

  // 관제 대상 현장: 가짜 현장을 만들지 않고 100% 실제 DB에 등록된 현장(registeredSiteList)만 사용
  const showcaseSites = useMemo(() => {
    return registeredSiteList.map((s, idx) => ({
      id: s.id || `site-${idx}`,
      name: s.name,
      basePlanned: 20 + idx * 5,
      baseCompleted: 12 + idx * 3,
      baseActive: 4,
      role: (idx === 0 ? "CRITICAL" : idx === 1 ? "WARNING" : "NORMAL") as
        | "CRITICAL"
        | "WARNING"
        | "NORMAL",
    }));
  }, [registeredSiteList]);

  // 실제 DB 현장에 매핑되는 긴급 이상 감지 시연 건수 데이터
  const anomalyEvents = useMemo<AnomalyEventDetail[]>(() => {
    if (!emergencySimMode || showcaseSites.length === 0) return [];
    const events: AnomalyEventDetail[] = [];

    const s1 = showcaseSites[0].name;
    const s1Order = dispatchRequestList.find((d) => d.siteName === s1);

    events.push({
      id: "emerg-divert-1",
      siteName: s1,
      severity: "CRITICAL",
      categoryLabel: "반입 거부(회차)",
      title: `[${s1}] 반출 차량 하차지 자재 검수 불합격 — 긴급 회차 발생`,
      dropoffName: s1Order?.dropoffName || "지정 하차지",
      orderNo: s1Order ? `오더 #${s1Order.id}` : "오더 #1762",
      soilType: s1Order?.soilType || "양질토사",
      truckOrCount: "경기 82바 4519 (25톤) 외 1대",
      reason:
        "하차지 도착 후 자재 검수에서 함수율 기준 초과(젖은 토사 및 폐콘크리트 소량 혼입) 판정으로 반입이 거부되어 대체 하차지 전환이 시급합니다.",
      detectedTime: "실시간 긴급 감지",
      targetPath: "/site/dispatch",
      baseX: 66,
      baseY: 87,
    });

    if (showcaseSites.length > 1) {
      const s2 = showcaseSites[1].name;
      const s2Order = dispatchRequestList.find((d) => d.siteName === s2);
      events.push({
        id: "emerg-delay-2",
        siteName: s2,
        severity: "WARNING",
        categoryLabel: "검수·상하차 지연",
        title: `[${s2}] 하차지 담당자 부재로 반입 검수 25분째 대기 지연`,
        dropoffName: s2Order?.dropoffName || "지정 하차지",
        orderNo: s2Order ? `오더 #${s2Order.id}` : "오더 #1764",
        soilType: s2Order?.soilType || "풍화암 토사",
        truckOrCount: "서울 86아 9012 (25톤) 외 2대",
        reason:
          "차량 3대가 하차지에 도착했으나 하차지 검수 승인이 25분 이상 지연되어 후속 차량 배차 간격이 밀리고 있습니다.",
        detectedTime: "4분 전 감지",
        targetPath: "/site/dispatch",
        baseX: 52,
        baseY: 64,
      });
    }

    return events;
  }, [showcaseSites, dispatchRequestList, emergencySimMode]);

  // 현장별 실시간 텔레메트리:
  // 빠르게 위아래로 출렁이는 것이 아니라, 시간이 흐를수록(2초마다 1단계씩)
  // 1) 반출 완료 대수와 토사 루베(㎥)는 천천히 차오르고,
  // 2) 반출이 완료되어 운행 종료가 될수록 '현재 운행' 대수는 줄어들며 내려가고,
  // 3) 2번 토사 용량 기둥이 100%를 넘어가면 빨간색(초과 반출)으로 감지되는 자연스러운 흐름!
  // 빠르게 지나가지 않고 충분히 눈으로 확인하고 클릭할 수 있도록 4초마다 1단계씩 천천히 진행
  const slowStep = Math.floor(tick / 4); // 4초마다 1단계씩 천천히 진행

  const sitesTelemetry = useMemo(() => {
    return showcaseSites.map((site, idx) => {
      const palette = SITE_PALETTE[idx % SITE_PALETTE.length];
      const siteEvents = anomalyEvents.filter((e) => e.siteName === site.name);

      const divertCnt = siteEvents.filter((e) => e.categoryLabel === "반입 거부(회차)").length;
      const matchRejCnt = siteEvents.filter((e) => e.categoryLabel === "배차·매칭 거절").length;
      const delayCnt = siteEvents.filter((e) => e.categoryLabel === "검수·상하차 지연").length;

      const planned = site.basePlanned; // 예: 20대 (시스템 배차 오더 대수는 절대 20대를 초과할 수 없음!)

      // 0단계 ~ 11단계까지 천천히 진행 (한 사이클 48초: 36초 동안 이상/주의 표시 유지 -> 12초 동안 해소 표시)
      const stage = (slowStep + idx * 2) % 12; // 0 ~ 11

      // 1) 배차 부족 대수: stage 0~8(36초 동안)에는 부족/회차가 충분히 유지되어 눈으로 여유 있게 확인 가능 -> stage 9~11(12초 동안)에 해소
      const shortageCount =
        emergencySimMode && idx === 0
          ? stage <= 5
            ? 4
            : stage <= 8
            ? 2
            : 0
          : emergencySimMode && idx === 1
          ? stage <= 3
            ? 2
            : 0
          : 0;

      const matchedTotal = Math.max(1, planned - shortageCount);

      // 2) 완료 대수(completed): 절대 확보 대수(matchedTotal)나 목표 대수(planned, 20대)를 넘지 않음! (최대 20대 = 100%)
      const completed = Math.min(matchedTotal, 9 + stage);

      // 현재 운행 대수는 초반에 많이 운행하다가 완료(운행 종료)가 될수록 0대까지 서서히 줄어듦
      const activeMoving = Math.max(0, matchedTotal - completed);
      const remaining = shortageCount;

      const completedRatio = Math.round((completed / planned) * 100);
      const activeRatio = Math.round((activeMoving / planned) * 100);
      const shortageRatio = Math.round((shortageCount / planned) * 100);

      // 2번 그래프: 1번 그래프의 목표 대수(planned) 및 완료 대수(completed) × 15루베(25톤 1대 표준 적재량)로 100% 동일하게 산출!
      // 현장은 목표량(맥스 100%)을 넘지 않고 계획 총량 대비 현재 나간 반출량(루베 ㎥ · 톤수 · %)을 정직하고 선명하게 표시
      const tonPerTruck = 25;
      const rubePerTruck = 15;
      const plannedTons = planned * tonPerTruck; // 예: 20대 × 25톤 = 500톤
      const plannedRube = planned * rubePerTruck; // 예: 20대 × 15루베 = 300㎥

      const outTons = completed * tonPerTruck;
      const outRube = completed * rubePerTruck;
      const movingRube = activeMoving * rubePerTruck;
      const shortageRube = shortageCount * rubePerTruck;
      const rubeRatio = completedRatio; // 1번 그래프 완료율(%)과 100% 일치 (최대 100%)
      const isOverVolume = false;
      const overRubeAmount = 0;

      // 1번 그래프는 배차 부족(shortageCount > 0)이 있을 때 위험(빨간색)이고,
      // 2번 현장의 검수 지연(hasWarning)도 stage 0~9 동안 충분히 길게 유지되며 외곽선이 노란색으로 표시됨!
      const hasCritical = emergencySimMode && shortageCount > 0;
      const hasWarning =
        emergencySimMode && activeMoving > 0 && site.role === "WARNING" && stage <= 9;

      const isLoadingStopped = emergencySimMode && idx === 0;
      const currentHourlyRate = isLoadingStopped ? 0 : 4;
      const stoppedMinutes = isLoadingStopped ? 65 : 0;

      return {
        id: site.id,
        name: site.name,
        palette,
        planned,
        matchedTotal,
        shortageCount,
        shortageRatio,
        completed,
        activeMoving,
        remaining,
        completedRatio,
        activeRatio,
        plannedTons,
        plannedRube,
        outTons,
        outRube,
        movingRube,
        shortageRube,
        rubePerTruck,
        rubeRatio,
        isOverVolume,
        overRubeAmount,
        isLoadingStopped,
        currentHourlyRate,
        stoppedMinutes,
        hasCritical,
        hasWarning,
        divertCnt,
        matchRejCnt,
        delayCnt,
        siteEvents,
      };
    });
  }, [showcaseSites, anomalyEvents, emergencySimMode, slowStep]);

  // 3번 그래프 전용: 실제 현재 시각(HH:MM:SS)의 흐름에 따라 오른쪽에서 왼쪽으로 흘러가는 시계열 히스토리
  // 이미 찍힌 과거 데이터 점은 절대 위아래로 출렁거리지 않고 고정된 채 시간 축을 따라 왼쪽으로 이동함!
  useEffect(() => {
    const formatTime = (d: Date) => {
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${hh}:${mi}:${ss}`;
    };

    setTimeSeriesHistory((prev) => {
      const now = new Date();
      if (prev.length === 0 || prev[0].values.length !== showcaseSites.length) {
        // 초기 20개 시점 생성 (과거 -> 현재 순으로 고정된 이력: 1번 현장은 잘 나가다가 최근 구간부터 0대로 급락해 멈춘 모습)
        const initList: Array<{ timeLabel: string; values: number[] }> = [];
        for (let i = 19; i >= 0; i--) {
          const tDate = new Date(now.getTime() - i * 1000);
          const vals = showcaseSites.map((_, sIdx) => {
            if (emergencySimMode && sIdx === 0) {
              // 과거(i >= 10)에는 시간당 5대씩 나가다가 i < 10 부터 0대로 급락 후 현재까지 0대 유지!
              return i >= 12 ? 5 : i === 11 ? 3 : i === 10 ? 1 : 0;
            }
            return sIdx === 1 ? 4 : 5;
          });
          initList.push({ timeLabel: formatTime(tDate), values: vals });
        }
        return initList;
      }

      // 매 1초마다 현재 시각의 새로운 점 1개를 맨 오른쪽에 추가하고 가장 오래된 왼쪽 점 1개를 밀어냄
      const newValues = showcaseSites.map((_, sIdx) => {
        if (emergencySimMode && sIdx === 0) return 0; // 상차 중단 현장은 현재 0대/시 유지
        return sIdx === 1 ? 4 : 5;
      });

      const next = [...prev.slice(1), { timeLabel: formatTime(now), values: newValues }];
      return next;
    });
  }, [tick, showcaseSites, emergencySimMode]);

  // 4번째 그래프 전용: 기사별 실시간 움직임 및 위치/정차 이상 감지 분포도 포인트
  const distributionDots = useMemo(() => {
    const primarySite = showcaseSites[0]?.name || "등록 현장";
    const secondarySite = showcaseSites[1]?.name || primarySite;

    const dots: Array<{
      id: string;
      driverName: string;
      carPlate: string;
      phone: string;
      siteName: string;
      xPct: number;
      yPct: number;
      isCritical: boolean;
      isWarning: boolean;
      label: string;
      color: string;
      statusBadge: string;
      lastLocation: string;
      stoppedDuration: string;
      reason: string;
    }> = [];

    // 1) 상단 긴급 이상 감지 기사 (멈춘 지점과 시간에 고정, 위아래 출렁거림 제거!)
    if (emergencySimMode && showcaseSites.length > 0) {
      dots.push(
        {
          id: "drv-anom-signal-lost",
          driverName: "박민수 기사",
          carPlate: "경기 82바 4519",
          phone: "010-4821-4519",
          siteName: primarySite,
          xPct: 35,
          yPct: 86,
          isCritical: true,
          isWarning: false,
          label: "박민수 (142분 신호끊김)",
          color: "#f43f5e",
          statusBadge: "이상 감지 (이동률 32% 지점 · 120분 이상 신호 끊김)",
          lastLocation: "올림픽대로 김포 방향 개화터널 인근 (목적지까지 이동률 32% 지점)",
          stoppedDuration: "142분째 위치 신호 미수신 (기준 120분 초과)",
          reason:
            "현장 출발 후 목적지까지 32% 이동한 지점에서 차량 단말기 위치 신호가 142분째 끊겨 이상 감지 기준(120분)을 초과했습니다. 즉시 유선 확인이 필요합니다.",
        },
        {
          id: "drv-anom-long-stop",
          driverName: "이영호 기사",
          carPlate: "서울 86아 9012",
          phone: "010-7392-9012",
          siteName: primarySite,
          xPct: 74,
          yPct: 74,
          isCritical: true,
          isWarning: false,
          label: "이영호 (128분 미이동)",
          color: "#f43f5e",
          statusBadge: "이상 감지 (이동률 74% 지점 · 120분 이상 미이동 고장 의심)",
          lastLocation: "수도권제1순환고속도로 자유로 분기점 1.2km 전방 (목적지까지 이동률 74% 지점)",
          stoppedDuration: "128분째 동일 지점 미이동 정차 중 (기준 120분 초과)",
          reason:
            "목적지까지 74% 이동한 도로 상 동일 위치에서 128분 동안 전혀 움직임이 없어 이상 감지 기준(120분)을 초과했습니다. 차량 고장 또는 사고가 의심됩니다.",
        },
        {
          id: "drv-anom-slow-delay",
          driverName: "최동수 기사",
          carPlate: "인천 88사 3321",
          phone: "010-5519-3321",
          siteName: secondarySite,
          xPct: 50,
          yPct: 54,
          isCritical: false,
          isWarning: true,
          label: "최동수 (75분 미이동)",
          color: "#fbbf24",
          statusBadge: "주의 감지 (이동률 52% 지점 · 60분 이상 미이동 주의)",
          lastLocation: "강변북로 가양대교 북단 진입로 (목적지까지 이동률 52% 지점)",
          stoppedDuration: "75분째 이동 없음 · 정체 대기 중 (주의 기준 60분 초과)",
          reason:
            "목적지까지 52% 이동한 중간 구간에서 75분째 위치 이동이 감지되지 않아 주의 기준(60분)을 초과했습니다. 계속 미이동 시 120분 이상 감지 단계로 격상됩니다.",
        }
      );
    }

    // 2) 하단 정상 주행 중인 기사들 (위아래 출렁거림 없이 X축 이동률 0% -> 100% 방향으로만 수평 주행!)
    const normalDrivers = [
      { name: "김철수 기사", plate: "경기 80바 4531", phone: "010-3321-4531", loc: "영종대교 북단 정상 주행 중" },
      { name: "정우성 기사", plate: "서울 81가 1120", phone: "010-8812-1120", loc: "김포한강로 시속 65km 주행 중" },
      { name: "강호동 기사", plate: "경기 85자 7781", phone: "010-9102-7781", loc: "인천공항고속도로 정상 주행 중" },
      { name: "유재석 기사", plate: "인천 89바 6042", phone: "010-2219-6042", loc: "서부간선도로 정상 이동 중" },
      { name: "손흥민 기사", plate: "경기 83아 5509", phone: "010-6671-5509", loc: "제2자유로 시속 70km 주행 중" },
      { name: "조규성 기사", plate: "서울 87사 2098", phone: "010-4409-2098", loc: "외곽순환도로 정상 주행 중" },
    ];

    sitesTelemetry.forEach((site, sIdx) => {
      normalDrivers.forEach((drv, i) => {
        const progressPct = Math.round(((sIdx * 17 + i * 15 + tick * 1.2) % 94) + 3);
        const movingX = 13 + (progressPct / 100) * 81;
        const fixedY = 16 + ((sIdx * 5 + i * 3) % 14);

        dots.push({
          id: `norm-${site.id}-${i}`,
          driverName: drv.name,
          carPlate: drv.plate,
          phone: drv.phone,
          siteName: site.name,
          xPct: movingX,
          yPct: fixedY,
          isCritical: false,
          isWarning: false,
          label: `${drv.name} (${drv.plate}) - 이동률 ${progressPct}% 정상 주행중`,
          color: site.palette.main,
          statusBadge: `정상 이동 운행 중 (목적지 이동률 ${progressPct}%)`,
          lastLocation: `${drv.loc} (현재 이동률 ${progressPct}% 구간)`,
          stoppedDuration: "미이동 0분 (실시간 정상 주행 중)",
          reason: "현재 위치 신호가 정상 수신되고 있으며 미이동 시간 없이 목적지를 향해 원활하게 주행 중입니다.",
        });
      });
    });

    return dots;
  }, [showcaseSites, sitesTelemetry, emergencySimMode, tick]);

  const openSiteAnomalyDetail = (siteName: string, focused?: AnomalyEventDetail) => {
    const eventsForSite = anomalyEvents.filter((e) => e.siteName === siteName);
    setSelectedDetailModal({
      siteName,
      events: eventsForSite,
      focusedEvent: focused || eventsForSite[0],
    });
  };

  const globalCounts = useMemo(() => {
    const totalDiverts = anomalyEvents.filter((e) => e.categoryLabel === "반입 거부(회차)").length;
    const totalMatchRej = anomalyEvents.filter((e) => e.categoryLabel === "배차·매칭 거절").length;
    const totalDelays = anomalyEvents.filter((e) => e.categoryLabel === "검수·상하차 지연").length;

    // 최상단 전체 통합 현황 지표 계산
    const activeSiteCount = sitesTelemetry.length;

    // 연결된 하차지 수 (실제 배차 오더의 하차지 + 등록된 하차지 고유 개수)
    const connectedDropoffNames = new Set<string>();
    dispatchRequestList.forEach((d) => {
      if (d?.dropoffName) connectedDropoffNames.add(d.dropoffName);
    });
    registeredDropoffList.forEach((d) => {
      if (d?.name) connectedDropoffNames.add(d.name);
    });
    const connectedDropoffCount = Math.max(connectedDropoffNames.size, activeSiteCount > 0 ? 3 : 0);

    // 전체 목표 대수, 정상 운행 건수(현재 운행 + 완료), 배차 부족 대수 합산
    const totalPlannedTrucks = sitesTelemetry.reduce((acc, s) => acc + s.planned, 0);
    const totalActiveMovingTrucks = sitesTelemetry.reduce((acc, s) => acc + s.activeMoving, 0);
    const totalCompletedTrucks = sitesTelemetry.reduce((acc, s) => acc + s.completed, 0);
    const totalNormalOperationCount = totalActiveMovingTrucks + totalCompletedTrucks;
    const totalShortageTrucks = sitesTelemetry.reduce((acc, s) => acc + s.shortageCount, 0);

    return {
      totalDiverts,
      totalMatchRej,
      totalDelays,
      activeSiteCount,
      connectedDropoffCount,
      totalPlannedTrucks,
      totalActiveMovingTrucks,
      totalCompletedTrucks,
      totalNormalOperationCount,
      totalShortageTrucks,
    };
  }, [anomalyEvents, sitesTelemetry, dispatchRequestList, registeredDropoffList]);

  return (
    <div className="w-screen h-screen bg-[#03060c] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      <style jsx>{`
        @keyframes jenniferSweepX {
          0% {
            left: 0%;
          }
          100% {
            left: 100%;
          }
        }
        @keyframes jenniferPulseRing {
          0% {
            transform: scale(0.85);
            opacity: 0.95;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
        @keyframes jenniferSpinCw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes jenniferSpinCcw {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        @keyframes jenniferEnergyUp {
          0% {
            background-position: 0% 100%;
          }
          100% {
            background-position: 0% -100%;
          }
        }
        .jennifer-x-radar {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 56px;
          background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.16), rgba(244, 63, 94, 0.42));
          border-right: 2px solid #f43f5e;
          animation: jenniferSweepX 3.4s linear infinite;
        }
        .jennifer-ping-ring {
          animation: jenniferPulseRing 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .jennifer-spin-slow {
          animation: jenniferSpinCw 6s linear infinite;
        }
        .jennifer-spin-beam {
          animation: jenniferSpinCw 2.8s linear infinite;
        }
        .jennifer-spin-reverse {
          animation: jenniferSpinCcw 9s linear infinite;
        }
        .jennifer-bar-energy-cyan {
          background: linear-gradient(180deg, #67e8f9 0%, #06b6d4 40%, #0284c7 80%, #67e8f9 100%);
          background-size: 100% 200%;
          animation: jenniferEnergyUp 1.4s linear infinite;
        }
        .jennifer-bar-energy-emerald {
          background: linear-gradient(180deg, #6ee7b7 0%, #10b981 45%, #047857 85%, #6ee7b7 100%);
          background-size: 100% 200%;
          animation: jenniferEnergyUp 1.8s linear infinite;
        }
        .jennifer-bar-energy-rose {
          background: linear-gradient(180deg, #fde047 0%, #f43f5e 50%, #be123c 90%, #fde047 100%);
          background-size: 100% 200%;
          animation: jenniferEnergyUp 0.9s linear infinite;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════════
          1. 최상단 현장 중심 관제 상태 바
         ═══════════════════════════════════════════════════════════════════════════ */}
      <header className="h-12 shrink-0 bg-[#070c18] border-b border-slate-800 px-3.5 flex items-center justify-between gap-2 z-20 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleOpenSidebarDrawer}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 shrink-0"
            title="메뉴 열기"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="text-xs font-black tracking-wide text-white whitespace-nowrap">
              덤프링 <span className="text-cyan-400">실시간 현장 이상 감지 상황판</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 pl-2.5 border-l border-slate-800 overflow-hidden">
            {sitesTelemetry.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openSiteAnomalyDetail(s.name)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                  s.hasCritical
                    ? "bg-rose-600 text-white border-rose-300 shadow-[0_0_15px_#f43f5e] animate-pulse"
                    : s.hasWarning
                    ? "bg-amber-950/90 border-amber-400 text-amber-200"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.hasCritical ? "#ffffff" : s.palette.main }}
                />
                <span className="whitespace-nowrap">{s.name}</span>
                {s.hasCritical && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-200 text-[10px] whitespace-nowrap shrink-0">
                    회차 {s.divertCnt} · 미배차 {s.shortageCount}대
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setEmergencySimMode((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-black flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              emergencySimMode
                ? "bg-rose-950/90 text-rose-200 border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
                : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 shrink-0 ${emergencySimMode ? "text-rose-400 animate-pulse" : ""}`} />
            <span className="whitespace-nowrap">시연 {emergencySimMode ? "켜짐" : "꺼짐"}</span>
          </button>

          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1 whitespace-nowrap shrink-0 ${
              globalCounts.totalDiverts > 0
                ? "bg-rose-600 text-white border-rose-300 animate-pulse"
                : "bg-slate-950 text-slate-500 border-slate-800"
            }`}
          >
            <span>회차 {globalCounts.totalDiverts}건</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1 whitespace-nowrap shrink-0 ${
              globalCounts.totalDelays > 0
                ? "bg-amber-950 text-amber-200 border-amber-500/70"
                : "bg-slate-950 text-slate-500 border-slate-800"
            }`}
          >
            <span>검수지연 {globalCounts.totalDelays}건</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{clockText}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBrowserFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 shrink-0"
          >
            {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════
          1-B. 최상단 전체 기준 통합 운영 요약 바 (운행중인 현장 수 · 연결된 하차지 수 · 정상 운행 건수 · 배차 부족 대수)
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-[#050914] border-b border-slate-800/90 px-3.5 py-2 grid grid-cols-5 gap-2.5 z-10">
        {/* 1) 운행중인 전체 현장 수 */}
        <div className="rounded-xl bg-[#091122] border border-slate-800 px-3.5 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 block">전체 운행중인 현장 수</span>
            <span className="text-xs text-cyan-300 font-bold">실시간 가동 현장</span>
          </div>
          <div className="text-right font-mono">
            <strong className="text-xl font-black text-white">{globalCounts.activeSiteCount}</strong>
            <span className="text-xs font-bold text-slate-400 ml-1">개 현장</span>
          </div>
        </div>

        {/* 2) 연결된 전체 하차지 수 */}
        <div className="rounded-xl bg-[#091122] border border-slate-800 px-3.5 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 block">연결된 하차지 수</span>
            <span className="text-xs text-indigo-300 font-bold">반입 연동 하차지</span>
          </div>
          <div className="text-right font-mono">
            <strong className="text-xl font-black text-indigo-300">{globalCounts.connectedDropoffCount}</strong>
            <span className="text-xs font-bold text-slate-400 ml-1">개소</span>
          </div>
        </div>

        {/* 3) 전체 정상 운행 건수 (현재 운행중 + 최종 반출 완료 통합) */}
        <div className="rounded-xl bg-[#091122] border border-emerald-500/40 px-3.5 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 block">전체 정상 운행 건수</span>
            <span className="text-[11px] text-emerald-400 font-bold">
              현재 운행 {globalCounts.totalActiveMovingTrucks}대 + 완료 {globalCounts.totalCompletedTrucks}대
            </span>
          </div>
          <div className="text-right font-mono">
            <strong className="text-xl font-black text-emerald-400">{globalCounts.totalNormalOperationCount}</strong>
            <span className="text-xs font-bold text-slate-400 ml-1">
              / 목표 {globalCounts.totalPlannedTrucks}건
            </span>
          </div>
        </div>

        {/* 4) 전체 배차 부족(차량 미배차로 모자란 대수) */}
        <div
          className={`rounded-xl px-3.5 py-2 flex items-center justify-between border ${
            globalCounts.totalShortageTrucks > 0
              ? "bg-rose-950/50 border-rose-500/80 shadow-[0_0_16px_rgba(244,63,94,0.25)]"
              : "bg-[#091122] border-slate-800"
          }`}
        >
          <div>
            <span className="text-[10.5px] font-bold text-slate-300 block">전체 배차 부족(미달) 대수</span>
            <span className="text-[11px] text-rose-300 font-bold">기사 미매칭 · 차량 미배차분</span>
          </div>
          <div className="text-right font-mono">
            <strong
              className={`text-xl font-black ${
                globalCounts.totalShortageTrucks > 0 ? "text-rose-400 animate-pulse" : "text-slate-400"
              }`}
            >
              {globalCounts.totalShortageTrucks}
            </strong>
            <span className="text-xs font-bold text-rose-300 ml-1">대 부족</span>
          </div>
        </div>

        {/* 5) 실시간 이상 감지 통합 건수 */}
        <div
          className={`rounded-xl px-3.5 py-2 flex items-center justify-between border ${
            globalCounts.totalDiverts > 0
              ? "bg-rose-950/60 border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.35)]"
              : "bg-[#091122] border-slate-800"
          }`}
        >
          <div>
            <span className="text-[10.5px] font-bold text-slate-300 block">실시간 운행 이상 감지</span>
            <span className="text-[11px] text-amber-300 font-bold">
              반입거부(회차) {globalCounts.totalDiverts}건 · 검수지연 {globalCounts.totalDelays}건
            </span>
          </div>
          <div className="text-right font-mono">
            <strong className="text-xl font-black text-rose-400 animate-pulse">
              {globalCounts.totalDiverts + globalCounts.totalDelays}
            </strong>
            <span className="text-xs font-bold text-rose-300 ml-1">건 감지</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          2. 메인 관제 그래픽 영역: 상단 1개 통합(1번 그래프) + 하단 좌우 2분할(2번·3번 그래프)
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 grid grid-cols-12 grid-rows-2 gap-2.5 p-2.5 overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────────────────
            [상단 전체 12칸 통합 — 1번 그래프]
            현장별 실시간 운행 · 최종 반출 완료 및 배차 부족(미달) 대수 통합 현황
           ───────────────────────────────────────────────────────────────────────── */}
        <div className="col-span-12 row-span-1 rounded-xl bg-[#070d19] border border-slate-800/90 p-3 flex flex-col justify-between overflow-hidden relative">
          <div className="flex items-center justify-between gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-black text-white truncate">
                현장별 실시간 운행 · 최종 반출 완료 및 배차 부족(미달) 대수 통합 관제
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10.5px] font-bold shrink-0 whitespace-nowrap">
              <span className="flex items-center gap-1 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 shrink-0" /> 좌: 현재 운행 대수
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 shrink-0" /> 중: 최종 완료 대수
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 animate-pulse shrink-0" /> 우: 모자란 대수(차량 미배차)
              </span>
            </div>
          </div>

          <div className="relative flex-1 my-1 rounded-lg bg-[#040811] border border-slate-800/80 px-6 py-2.5 flex items-end justify-around gap-6 overflow-hidden">
            {sitesTelemetry.map((site) => {
              // 0대이면 높이를 정확히 0%로 완전히 비움!
              const smoothActiveHeight =
                site.activeMoving > 0 ? Math.max(12, Math.min(88, site.activeRatio * 1.6)) : 0;
              const smoothCompletedHeight =
                site.completed > 0 ? Math.max(15, Math.min(100, site.completedRatio)) : 0;
              const smoothShortageHeight =
                site.shortageCount > 0 ? Math.max(20, Math.min(90, site.shortageRatio * 2.2)) : 0;

              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => openSiteAnomalyDetail(site.name)}
                  className="relative z-10 flex-1 max-w-[420px] h-full flex flex-col justify-between items-center group cursor-pointer focus:outline-none"
                >
                  {/* 1) 상단 현장 요약 헤더 (목표 대수 + 부족 대수 + 이상 뱃지 통합) */}
                  <div className="w-full flex items-center justify-between gap-2 px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-800/90 shrink-0 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                        목표 <strong className="text-white font-mono">{site.planned}대</strong>
                      </span>
                      <span className="text-[10.5px] font-bold text-emerald-400 whitespace-nowrap">
                        (확보 {site.matchedTotal}대)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {site.shortageCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-[0_0_12px_#f43f5e] whitespace-nowrap">
                          미배차 {site.shortageCount}대 부족{site.divertCnt > 0 ? ` · 회차 ${site.divertCnt}건` : ""}
                        </span>
                      ) : site.hasWarning ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-amber-200 text-[10px] font-black animate-pulse whitespace-nowrap">
                          검수 지연 {site.delayCnt}건
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold whitespace-nowrap">
                          배차 100% 충족 · 정상
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2) 중단 3열 막대 그래프 영역 (현재 운행 / 최종 완료 / 배차 부족 모자란 대수) */}
                  <div className="w-full flex-1 my-1.5 flex items-end justify-center gap-3 px-2 min-h-0">
                    {/* 좌측 기둥: 현재 운행 (0대 운행중이면 막대가 완전히 비어있고, 1대 이상 운행중일 때만 막대 및 회차/지연 조각 표시) */}
                    <div className="flex-1 h-full flex flex-col items-center justify-end min-w-0">
                      <span
                        className={`text-[10.5px] font-mono font-black mb-0.5 whitespace-nowrap ${
                          site.activeMoving > 0 ? "text-cyan-300" : "text-slate-500"
                        }`}
                      >
                        {site.activeMoving}대 운행중
                        {site.activeMoving > 0 && site.shortageCount > 0 && site.divertCnt > 0 && (
                          <span className="text-rose-400 ml-1 text-[9.5px]">(회차 {site.divertCnt})</span>
                        )}
                        {site.activeMoving > 0 && site.hasWarning && site.delayCnt > 0 && (
                          <span className="text-amber-300 ml-1 text-[9.5px] animate-pulse">(지연 {site.delayCnt})</span>
                        )}
                      </span>
                      <div
                        className={`w-full flex-1 rounded-t-xl bg-slate-950/90 border-2 p-1 flex flex-col justify-end relative overflow-hidden transition-all duration-700 ${
                          site.activeMoving === 0
                            ? "border-slate-800"
                            : site.hasWarning && site.delayCnt > 0
                            ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
                            : "border-cyan-500/60"
                        }`}
                      >
                        {site.activeMoving > 0 && site.shortageCount > 0 && site.divertCnt > 0 && (
                          <div
                            className="w-full rounded-t-xs jennifer-bar-energy-rose animate-pulse mb-0.5 transition-all duration-1000"
                            style={{ height: `${Math.max(8, Math.round((site.divertCnt / site.planned) * 100))}%` }}
                            title={`회차 발생 ${site.divertCnt}대`}
                          />
                        )}
                        {site.activeMoving > 0 && site.hasWarning && site.delayCnt > 0 && (
                          <div
                            className="w-full rounded-t-xs bg-amber-400 animate-pulse shadow-[0_0_12px_#fbbf24] mb-0.5 transition-all duration-1000"
                            style={{ height: `${Math.max(10, Math.round((site.delayCnt / site.planned) * 100))}%` }}
                            title={`검수 지연 ${site.delayCnt}대`}
                          />
                        )}
                        {site.activeMoving > 0 && (
                          <div
                            className="w-full rounded-xs jennifer-bar-energy-cyan transition-all duration-1000 ease-in-out"
                            style={{ height: `${smoothActiveHeight}%` }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold mt-1 whitespace-nowrap ${
                          site.activeMoving > 0 ? "text-cyan-300" : "text-slate-500"
                        }`}
                      >
                        현재 운행
                      </span>
                    </div>

                    {/* 중앙 기둥: 최종 완료 (목표 20대 = 100% 한도 내에서만 정상 상승) */}
                    <div className="flex-1 h-full flex flex-col items-center justify-end min-w-0">
                      <span className="text-[10.5px] font-mono font-black text-emerald-400 mb-0.5 whitespace-nowrap">
                        {site.completed}대 ({site.completedRatio}%)
                      </span>
                      <div className="w-full flex-1 rounded-t-xl bg-slate-950/90 border-2 border-emerald-500/70 p-1 flex flex-col justify-end relative overflow-hidden">
                        <div
                          className="w-full rounded-xs jennifer-bar-energy-emerald transition-all duration-1000 ease-in-out"
                          style={{ height: `${smoothCompletedHeight}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 mt-1 whitespace-nowrap">
                        최종 완료
                      </span>
                    </div>

                    {/* 우측 기둥: 모자란 대수 (배차 부족 / 매칭 거절 결손분) */}
                    <div className="flex-1 h-full flex flex-col items-center justify-end min-w-0">
                      <span
                        className={`text-[10.5px] font-mono font-black mb-0.5 whitespace-nowrap ${
                          site.shortageCount > 0 ? "text-rose-400 animate-pulse" : "text-slate-500"
                        }`}
                      >
                        {site.shortageCount > 0 ? `-${site.shortageCount}대 부족!` : "0대 (부족없음)"}
                      </span>
                      <div
                        className={`w-full flex-1 rounded-t-xl bg-slate-950/90 border-2 p-1 flex flex-col justify-end relative overflow-hidden ${
                          site.shortageCount > 0
                            ? "border-rose-500 border-dashed shadow-[0_0_18px_rgba(244,63,94,0.45)]"
                            : "border-slate-800"
                        }`}
                      >
                        <div
                          className={`w-full rounded-xs transition-all duration-1000 ease-in-out ${
                            site.shortageCount > 0
                              ? "jennifer-bar-energy-rose animate-pulse shadow-[0_0_14px_#f43f5e]"
                              : "bg-slate-800/50"
                          }`}
                          style={{ height: `${smoothShortageHeight}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-bold mt-1 whitespace-nowrap ${
                          site.shortageCount > 0 ? "text-rose-400 font-black" : "text-slate-500"
                        }`}
                      >
                        모자란 대수(미배차)
                      </span>
                    </div>
                  </div>

                  {/* 3) 하단 현장명 */}
                  <span
                    className={`text-xs font-black shrink-0 whitespace-nowrap truncate max-w-full ${
                      site.hasCritical
                        ? "text-rose-400 animate-pulse"
                        : site.hasWarning
                        ? "text-amber-300"
                        : "text-slate-100"
                    }`}
                  >
                    {site.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            [좌하단 6칸 — 2번 그래프]
            현장별 금일 반출 토사량(루베 ㎥ · 톤수) 및 잔여 토사량 확인 (익일 배차량 산정 기준)
           ───────────────────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-6 row-span-1 rounded-xl bg-[#070d19] border border-slate-800/90 p-3 flex flex-col justify-between overflow-hidden relative">
          <div className="flex items-center justify-between gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-black text-white truncate">
                현장별 금일 반출 토사량(루베 ㎥) 및 잔여 물량 현황
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold shrink-0 whitespace-nowrap">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-xs bg-emerald-400 shrink-0" /> 금일 반출 완료(㎥)
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> 잔여량(익일 배차 참고)
              </span>
            </div>
          </div>

          <div className="relative flex-1 my-1 rounded-lg bg-[#040811] border border-slate-800/80 px-4 py-2 flex items-end justify-around gap-4 overflow-hidden min-h-0">
            {sitesTelemetry.map((site) => {
              const smoothFillHeight = Math.max(18, Math.min(100, site.rubeRatio));
              const remainRube = Math.max(0, site.plannedRube - site.outRube);

              return (
                <button
                  key={`vol-${site.id}`}
                  type="button"
                  onClick={() => openSiteAnomalyDetail(site.name)}
                  className="relative z-10 flex-1 max-w-[240px] min-w-0 h-full flex flex-col justify-between items-center group cursor-pointer focus:outline-none overflow-hidden"
                >
                  {/* 1) 상단 금일 계획 루베 & 잔여 루베(내일 배차 산정용) 헤더 박스 */}
                  <div className="w-full flex items-center justify-between gap-1 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-800/90 shrink-0 whitespace-nowrap overflow-hidden">
                    <span className="text-[10.5px] font-bold text-slate-300 whitespace-nowrap">
                      계획 <strong className="text-white font-mono">{site.plannedRube}㎥</strong>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-black whitespace-nowrap ${
                        remainRube > 0
                          ? "bg-amber-950/90 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {remainRube > 0 ? `잔여 ${remainRube}㎥` : "금일 100% 반출"}
                    </span>
                  </div>

                  {/* 2) 중단 단일 총 용량 실린더 기둥 (금일 나간 반출량 + 남은 잔여량 명확히 표시) */}
                  <div className="w-full flex-1 my-1 px-3 flex flex-col justify-end min-h-0">
                    <div className="w-full h-full rounded-t-2xl bg-slate-950/90 border-2 border-emerald-500/70 p-1.5 flex flex-col justify-end relative overflow-hidden">
                      {/* 상단 빈 공간: 오늘 아직 안 나간 잔여량 & 달성률 안내 */}
                      <div className="absolute top-1.5 inset-x-2 flex items-center justify-between text-[9px] font-mono text-slate-400 z-20 pointer-events-none whitespace-nowrap">
                        <span>총 {site.plannedTons}t</span>
                        <span className="text-emerald-300 font-bold">반출 {site.rubeRatio}%</span>
                      </div>

                      <div
                        className="w-full rounded-t-xl flex flex-col items-center justify-center px-1 text-center whitespace-nowrap transition-all duration-1000 ease-in-out jennifer-bar-energy-emerald text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                        style={{ height: `${smoothFillHeight}%` }}
                      >
                        <span className="text-xs font-mono font-black whitespace-nowrap">
                          {site.outRube}㎥ 반출
                        </span>
                        <span className="text-[9.5px] font-mono font-extrabold text-slate-900 whitespace-nowrap">
                          ({site.outTons}t 완료)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3) 하단 현장명 */}
                  <span className="text-xs font-black shrink-0 whitespace-nowrap truncate max-w-full text-slate-100">
                    {site.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────
            [우하단 6칸] 기사별 실시간 움직임 현황 분포도 (X축: 이동률 / Y축: 미이동 경과 시간)
           ───────────────────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-6 row-span-1 rounded-xl bg-[#070d19] border border-slate-800/90 p-3 flex flex-col justify-between overflow-hidden relative">
          <div className="flex items-center justify-between gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-black text-white truncate">
                기사별 이동률(X축) 대비 미이동 시간(Y축) 이상 감지 분포도
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold shrink-0 whitespace-nowrap">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] shrink-0" /> 120분+ 이상
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> 60분+ 주의
              </span>
              <span className="flex items-center gap-1 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" /> 정상주행
              </span>
            </div>
          </div>

          <div className="relative flex-1 my-1.5 rounded-lg bg-[#040811] border border-slate-800/80 overflow-hidden">
            {/* 좌측 Y축 (미이동 경과 시간 눈금 바) */}
            <div className="absolute left-0 top-0 bottom-6 w-14 bg-slate-950/90 border-r border-slate-800 z-20 flex flex-col justify-between py-2 px-1 text-right font-mono text-[9.5px] pointer-events-none">
              <span className="text-rose-400 font-black">180분</span>
              <span className="text-rose-400 font-black bg-rose-950/80 px-1 rounded border border-rose-500/50">
                120분
              </span>
              <span className="text-amber-300 font-black bg-amber-950/80 px-1 rounded border border-amber-500/50">
                60분
              </span>
              <span className="text-cyan-400 font-bold">30분</span>
              <span className="text-emerald-400 font-bold">0분</span>
            </div>

            {/* 1) Y축 120분 이상: 이상 감지 구역 & 120분 기준선 */}
            <div className="absolute left-14 right-0 top-0 h-[32%] bg-gradient-to-b from-rose-950/35 to-rose-950/10 border-b border-dashed border-rose-500/80 px-2.5 py-1 flex items-start justify-end pointer-events-none z-10">
              <span className="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/60 text-rose-300 font-mono text-[9px] font-bold">
                120분+ 이상감지 구역
              </span>
            </div>

            {/* 2) Y축 60분 ~ 120분: 주의 감지 구역 & 60분 기준선 */}
            <div className="absolute left-14 right-0 top-[32%] h-[24%] bg-gradient-to-b from-amber-950/20 to-amber-950/5 border-b border-dashed border-amber-400/70 px-2.5 py-1 flex items-start justify-end pointer-events-none z-10">
              <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-300 font-mono text-[9px] font-bold">
                60분+ 주의 구역
              </span>
            </div>

            {/* 3) Y축 30분 보조선 */}
            <div className="absolute left-14 right-0 bottom-[24%] border-b border-dotted border-slate-800/80 px-2.5 flex justify-end pointer-events-none">
              <span className="text-[8.5px] font-bold text-slate-600 -mt-3.5">
                60분 미만 정상 주행
              </span>
            </div>

            {/* 하단 X축 (목적지까지의 이동률 0% ~ 100% 눈금 바) */}
            <div className="absolute left-14 right-0 bottom-0 h-6 bg-slate-950/90 border-t border-slate-800 px-3 flex items-center justify-between font-mono text-[9.5px] text-slate-400 z-20 pointer-events-none">
              <span className="text-cyan-400 font-bold">0% (출발)</span>
              <span>25%</span>
              <span>50% (주행)</span>
              <span>75%</span>
              <span className="text-emerald-400 font-bold">100% (도착) ➔</span>
            </div>

            <div className="jennifer-x-radar pointer-events-none" />

            {distributionDots.map((dot) => {
              const placeLabelLeft = dot.xPct > 58;
              return (
                <button
                  key={dot.id}
                  type="button"
                  onClick={() =>
                    setSelectedDriverModal({
                      driverName: dot.driverName,
                      carPlate: dot.carPlate,
                      phone: dot.phone,
                      siteName: dot.siteName,
                      statusType: dot.isCritical ? "CRITICAL" : dot.isWarning ? "WARNING" : "NORMAL",
                      statusBadge: dot.statusBadge,
                      lastLocation: dot.lastLocation,
                      stoppedDuration: dot.stoppedDuration,
                      reason: dot.reason,
                    })
                  }
                  style={{ left: `${dot.xPct}%`, bottom: `${dot.yPct}%` }}
                  className="absolute -translate-x-1/2 translate-y-1/2 cursor-pointer group focus:outline-none transition-all duration-500 z-20"
                >
                  {dot.isCritical ? (
                    <div className={`relative flex items-center ${placeLabelLeft ? "flex-row-reverse" : ""}`}>
                      <span className="relative flex items-center justify-center shrink-0">
                        <span className="jennifer-ping-ring absolute w-7 h-7 rounded-full bg-rose-500/80 border border-rose-300" />
                        <span
                          className="jennifer-ping-ring absolute w-10 h-10 rounded-full border border-rose-400/70"
                          style={{ animationDelay: "0.4s" }}
                        />
                        <span className="relative w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-[0_0_16px_#f43f5e] shrink-0" />
                      </span>
                      <span
                        className={`${
                          placeLabelLeft ? "mr-2" : "ml-2"
                        } px-1.5 py-0.5 rounded bg-rose-600/95 hover:bg-rose-500 text-white text-[10px] font-black whitespace-nowrap shadow-[0_0_12px_#f43f5e] border border-rose-300 animate-pulse`}
                      >
                        {dot.label}
                      </span>
                    </div>
                  ) : dot.isWarning ? (
                    <div className={`relative flex items-center ${placeLabelLeft ? "flex-row-reverse" : ""}`}>
                      <span className="relative flex items-center justify-center shrink-0">
                        <span className="jennifer-ping-ring absolute w-6 h-6 rounded-full bg-amber-400/60" />
                        <span className="relative w-3 h-3 rounded-sm rotate-45 bg-amber-400 border border-white shadow-[0_0_10px_#fbbf24] shrink-0" />
                      </span>
                      <span
                        className={`${
                          placeLabelLeft ? "mr-2" : "ml-2"
                        } px-1.5 py-0.5 rounded bg-amber-950/95 text-amber-200 border border-amber-400 text-[9.5px] font-black whitespace-nowrap animate-pulse`}
                      >
                        {dot.label}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="block w-2.5 h-2.5 rounded-sm rotate-45 border border-white/50 transition-transform group-hover:scale-150"
                      style={{
                        backgroundColor: dot.color,
                        boxShadow: `0 0 10px ${dot.color}`,
                      }}
                      title={dot.label}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          3-A. 4번째 그래프(기사 움직임 이상 감지 점) 클릭 시 열리는 [기사 실시간 상태 상세 팝업]
         ═══════════════════════════════════════════════════════════════════════════ */}
      {selectedDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setSelectedDriverModal(null)}
          />
          <div
            className={`relative z-10 w-full max-w-lg rounded-2xl bg-[#0b1222] border-2 p-6 text-slate-100 space-y-4 animate-fadeIn ${
              selectedDriverModal.statusType === "CRITICAL"
                ? "border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]"
                : selectedDriverModal.statusType === "WARNING"
                ? "border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                : "border-cyan-500/70"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    selectedDriverModal.statusType === "CRITICAL"
                      ? "bg-rose-600/20 border-rose-500/50 text-rose-400"
                      : selectedDriverModal.statusType === "WARNING"
                      ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                      : "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                  }`}
                >
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {selectedDriverModal.driverName} ({selectedDriverModal.carPlate}) 움직임 감지 상세
                  </h3>
                  <p className="text-xs text-slate-400">
                    출발 현장: <strong className="text-cyan-300">{selectedDriverModal.siteName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriverModal(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-400">현재 감지 상태</span>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-black ${
                    selectedDriverModal.statusType === "CRITICAL"
                      ? "bg-rose-600 text-white"
                      : selectedDriverModal.statusType === "WARNING"
                      ? "bg-amber-500/30 text-amber-200 border border-amber-400"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {selectedDriverModal.statusBadge}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">기사명 / 차량번호</span>
                  <strong className="text-white font-extrabold">
                    {selectedDriverModal.driverName} ({selectedDriverModal.carPlate})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">기사 비상 연락처</span>
                  <strong className="text-cyan-300 font-mono font-extrabold">
                    {selectedDriverModal.phone}
                  </strong>
                </div>
                <div className="col-span-2 pt-1.5 border-t border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">마지막 확인 위치</span>
                  <strong className="text-slate-200">{selectedDriverModal.lastLocation}</strong>
                </div>
                <div className="col-span-2 pt-1.5 border-t border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">미이동 / 신호 끊김 경과 시간</span>
                  <strong
                    className={
                      selectedDriverModal.statusType === "CRITICAL"
                        ? "text-rose-400 font-black"
                        : "text-amber-300 font-bold"
                    }
                  >
                    {selectedDriverModal.stoppedDuration}
                  </strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <strong className="text-rose-400 mr-1.5">[이상 감지 사유]</strong>
                {selectedDriverModal.reason}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          3. 현장 이상 징후 클릭 시에만 열리는 [긴급 운행 이상 상세 조회 모달]
         ═══════════════════════════════════════════════════════════════════════════ */}
      {selectedDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setSelectedDetailModal(null)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-[#0b1222] border-2 border-rose-500/80 shadow-[0_0_40px_rgba(244,63,94,0.35)] p-6 text-slate-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-600/20 border border-rose-500/50 text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    [{selectedDetailModal.siteName}] 실시간 운행 이상 감지 상세 내역
                  </h3>
                  <p className="text-xs text-slate-400">
                    해당 현장에서 실시간 감지된 반입 거부(회차) 및 하차지 검수 지연 건의 상세 사유입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailModal(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDetailModal.events.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedDetailModal.events.map((ev) => {
                  const isFocused = selectedDetailModal.focusedEvent?.id === ev.id;
                  return (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        ev.severity === "CRITICAL"
                          ? isFocused
                            ? "bg-rose-950/60 border-2 border-rose-400"
                            : "bg-rose-950/35 border-rose-500/60"
                          : "bg-amber-950/30 border-amber-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-black ${
                              ev.severity === "CRITICAL"
                                ? "bg-rose-600 text-white"
                                : "bg-amber-500/30 text-amber-200 border border-amber-400"
                            }`}
                          >
                            {ev.categoryLabel}
                          </span>
                          <span className="text-sm font-black text-white">{ev.title}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{ev.detectedTime}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">발생 하차지</span>
                          <strong className="text-cyan-300 font-extrabold">{ev.dropoffName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">관련 오더/송장</span>
                          <strong className="text-white font-mono">{ev.orderNo}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">반출 토사</span>
                          <strong className="text-slate-200">{ev.soilType}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">대상 차량/물량</span>
                          <strong className="text-amber-300">{ev.truckOrCount}</strong>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                        <strong className="text-rose-400 mr-1.5">[상세 사유]</strong>
                        {ev.reason}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDetailModal(null);
                            if (setActivePath) setActivePath(ev.targetPath);
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
                        >
                          <span>해당 배차 관리 화면으로 이동하여 조치하기</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <p className="text-base font-black text-emerald-400">
                  현재 [{selectedDetailModal.siteName}] 현장은 긴급 이상 징후 없이 정상 반출 중입니다.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
