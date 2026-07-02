import React from "react";
import { Activity, Terminal, Database, AlertCircle } from "lucide-react";

interface DeveloperDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  developerMenus: any[];
  menuTarget: "web" | "app";
  setMenuTarget: (target: "web" | "app") => void;
  menuSelectedRole: string;
  setMenuSelectedRole: (role: string) => void;
  menuConfigSaveSuccess: boolean;
  setMenuConfigSaveSuccess: (val: boolean) => void;
  handleToggleMenuAllowed: (id: number) => void;
  apmLoadTesting: boolean;
  setApmLoadTesting: (val: boolean) => void;
  inputText: string;
  setInputText: (val: string) => void;
}

export function DeveloperDashboard({
  activePath,
  setActivePath,
  developerMenus,
  menuTarget,
  setMenuTarget,
  menuSelectedRole,
  setMenuSelectedRole,
  menuConfigSaveSuccess,
  setMenuConfigSaveSuccess,
  handleToggleMenuAllowed,
  apmLoadTesting,
  setApmLoadTesting,
  inputText,
  setInputText,
}: DeveloperDashboardProps) {
  // Filter menus based on target system and selected role
  const filteredMenus = developerMenus.filter(
    (m) => m.target === menuTarget && m.role === menuSelectedRole
  );

  // 1. 실시간 APM 모니터링 (/dev/apm)
  if (activePath === "/dev/apm") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">실시간 서버 API APM 관제 대시보드</h3>
            <p className="text-xs text-slate-500 mt-0.5">FastAPI 서버의 자원 소비량 및 API 트래픽 인입 상태를 초단위로 모니터링합니다.</p>
          </div>

          {/* Interactive Load Test Simulation Button */}
          <button
            onClick={() => setApmLoadTesting(!apmLoadTesting)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
              apmLoadTesting
                ? "bg-rose-600 text-white shadow-rose-600/10 animate-pulse"
                : "bg-emerald-500 text-white shadow-emerald-500/10"
            }`}
          >
            {apmLoadTesting ? "트래픽 폭주 시뮬레이션 중지 (Stop)" : "트래픽 폭주 시뮬레이션 가동 (Load Test)"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          {[
            {
              label: "CPU 사용량",
              val: apmLoadTesting ? "89.2 %" : "12.4 %",
              status: apmLoadTesting ? "과부하 경고" : "정상",
              color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
              pct: apmLoadTesting ? "w-[89.2%]" : "w-[12.4%]"
            },
            {
              label: "메모리 사용량",
              val: apmLoadTesting ? "81.7 %" : "39.5 %",
              status: apmLoadTesting ? "스왑 발생" : "정상",
              color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
              pct: apmLoadTesting ? "w-[81.7%]" : "w-[39.5%]"
            },
            {
              label: "DB 커넥션 풀",
              val: apmLoadTesting ? "44 / 50" : "8 / 50",
              status: apmLoadTesting ? "병목 위험" : "정상",
              color: apmLoadTesting ? "text-amber-600 bg-amber-50 border border-amber-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
              pct: apmLoadTesting ? "w-[88%]" : "w-[16%]"
            },
            {
              label: "API 호출 트래픽 (RPS)",
              val: apmLoadTesting ? "210.4 RPS" : "24.5 RPS",
              status: apmLoadTesting ? "동시접속 폭주" : "여유",
              color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-blue-600 bg-blue-50 border border-blue-200",
              pct: apmLoadTesting ? "w-[95%]" : "w-[25%]"
            },
            {
              label: "평균 응답속도 (Latency)",
              val: apmLoadTesting ? "245 ms" : "32 ms",
              status: apmLoadTesting ? "지연 누적" : "매우 빠름",
              color: apmLoadTesting ? "text-rose-600 bg-rose-50 border border-rose-200" : "text-emerald-600 bg-emerald-50 border border-emerald-200",
              pct: apmLoadTesting ? "w-[90%]" : "w-[12%]"
            }
          ].map((metric, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-md">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">{metric.label}</span>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-lg font-black text-slate-800">{metric.val}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${metric.color}`}>
                    {metric.status}
                  </span>
                </div>
              </div>
              {/* Visual bar indicator */}
              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-3.5">
                <div className={`h-full rounded-full transition-all duration-500 ${apmLoadTesting ? "bg-rose-500" : "bg-blue-600"
                  }`} style={{ width: metric.pct.match(/\d+/)?.[0] + "%" }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Real-time API Logs Terminal */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2 pl-1">
            <span>인입 API 트래픽 실시간 모니터 (Live Endpoint Hits)</span>
            <span className="text-[10px] font-medium text-slate-500 font-mono">1.0s interval update</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-2.5 text-slate-300 max-h-48 overflow-y-auto">
            {apmLoadTesting ? (
              <>
                <div className="flex justify-between text-rose-400 animate-pulse">
                  <span>⚠️ [CRITICAL] 17:45:53 - DB CONNECTION POOL IS REACHING LIMIT! (88% UTILIZATION)</span>
                  <span>503 Service Unavailable</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>➔ 17:45:52 - POST /api/locations/push - 408 Timeout (2000ms delay) - Client IP: 211.23.41.98</span>
                  <span>408 TIMEOUT</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>➔ 17:45:51 - GET /api/dropoff/capacity - 200 OK (210ms) - Client IP: 14.12.80.201</span>
                  <span>200 OK</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-emerald-400">
                  <span>➔ 17:45:53 - GET /api/auth/profile - 200 OK (11ms) - Client User: GD-3-MANAGER</span>
                  <span>200 OK</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>➔ 17:45:52 - POST /api/dropoff/verification - 201 Created (18ms) - Client IP: 182.203.11.23</span>
                  <span>201 CREATED</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>➔ 17:45:50 - GET /api/site/dump-expenses - 200 OK (24ms) - Client User: GD-3-MANAGER</span>
                  <span>200 OK</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. 개발자 대시보드 (/dev)
  if (activePath === "/dev") {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">시스템 가동상태</span>
              <p className="text-2xl font-black text-slate-900 mt-1">Active (정상)</p>
            </div>
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
            <span className="text-xs font-bold text-slate-500 block">FastAPI 호스트</span>
            <p className="text-base font-mono font-bold text-slate-800 mt-1">http://localhost:8000</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
            <span className="text-xs font-bold text-slate-500 block">활성 DB 마이그레이션</span>
            <p className="text-base font-mono font-bold text-emerald-600 mt-1">a4f66f3 (최신)</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
          <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-200 pb-2 mb-4">개발자 빠른 도구 링크</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <button onClick={() => setActivePath("/dev/apm")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">APM 관제실</button>
            <button onClick={() => setActivePath("/dev/menus")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">ACL 메뉴 매핑</button>
            <button onClick={() => setActivePath("/dev/codes")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">공통 코드 관리</button>
            <button onClick={() => setActivePath("/dev/api")} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl font-semibold text-slate-700 text-center">API 테스트기</button>
          </div>
        </div>
      </div>
    );
  }

  // 3. 앱/웹 통합 메뉴 관리 (/dev/menus)
  if (activePath === "/dev/menus") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">앱 & 웹 권한별 메뉴 관리자 (ACL Configurator)</h3>
            <p className="text-xs text-slate-500 mt-0.5">각 사용자 역할군별로 활성화될 모바일 앱 메뉴 및 통합 웹 화면 접근 권한을 동적으로 매핑합니다.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setMenuTarget("web"); setMenuConfigSaveSuccess(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${menuTarget === "web" ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
            >
              관리자웹 메뉴 설정
            </button>
            <button
              onClick={() => { setMenuTarget("app"); setMenuConfigSaveSuccess(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${menuTarget === "app" ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
            >
              모바일앱 메뉴 설정
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Select Active Role */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">권한 역할군 선택</div>
            {[
              { id: "site_manager", name: "현장 관리자 (Site Manager)" },
              { id: "dropoff_manager", name: "하차지 관리자 (Dropoff Manager)" },
              { id: "platform_admin", name: "플랫폼 관리자 (Platform Admin)" },
              { id: "owner", name: "차주/운송사 (B2B Owner)" },
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => { setMenuSelectedRole(role.id); setMenuConfigSaveSuccess(false); }}
                className={`w-full p-2.5 rounded-lg border text-left text-xs font-semibold transition-colors ${menuSelectedRole === role.id
                    ? "bg-blue-50 border-blue-500/30 text-blue-600 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {role.name}
              </button>
            ))}
          </div>

          {/* 2. Menu Checklist Configurator */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between min-h-[250px]">
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-wider mb-3.5 pb-2 border-b border-slate-200">
                <span>허용 메뉴 리스트 매핑</span>
                <span className="text-[11px] text-blue-600">대상: {menuTarget === "web" ? "통합 웹" : "모바일 앱"}</span>
              </div>

              {menuConfigSaveSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4 transition-all">
                  ✓ 지정하신 역할의 메뉴 접근 권한(ACL) 설정이 실시간 데이터베이스 및 권한 라우터 레이어에 안전하게 저장 및 동기화 처리되었습니다!
                </div>
              )}

              <div className="space-y-3">
                {filteredMenus.length > 0 ? (
                  filteredMenus.map((menu) => (
                    <div
                      key={menu.id}
                      onClick={() => handleToggleMenuAllowed(menu.id)}
                      className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-800">{menu.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${menu.allowed ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                          }`}>
                          {menu.allowed ? "활성화" : "비활성화"}
                        </span>
                        <input
                          type="checkbox"
                          checked={menu.allowed}
                          onChange={() => { }} // toggled via parent div click
                          className="w-4 h-4 rounded border-slate-200 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-8">
                    이 역할에 대해 해당 시스템 타겟에 등록된 동적 메뉴 데이터가 존재하지 않습니다.
                  </div>
                )}
              </div>
            </div>

            {filteredMenus.length > 0 && (
              <button
                onClick={() => setMenuConfigSaveSuccess(true)}
                className="w-full mt-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95"
              >
                권한별 메뉴 설정(ACL) 데이터베이스 저장
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. 공통 코드 설정 (/dev/codes)
  if (activePath === "/dev/codes") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">공통 코드 관리 대장</h2>
            <p className="text-xs text-slate-500 mt-1">시스템에서 사용되는 공통 파라미터 및 요율 한도를 정의합니다.</p>
          </div>
          <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 font-bold text-slate-500 pb-2">
                <th className="py-2">코드 분류</th>
                <th className="py-2">코드명</th>
                <th className="py-2">설정값</th>
                <th className="py-2 text-right">수정일자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 font-semibold text-slate-900">SYSTEM_FEE</td>
                <td className="py-3">기본 중개 수수료</td>
                <td className="py-3 font-mono text-blue-600 font-bold">8.5%</td>
                <td className="py-3 text-right font-mono text-slate-400">2026-06-02</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900">BASE_TARIFF</td>
                <td className="py-3">기본 운임</td>
                <td className="py-3 font-mono text-blue-600 font-bold">180,000 원</td>
                <td className="py-3 text-right font-mono text-slate-400">2026-06-02</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 5. API 매핑 제어 (/dev/api)
  if (activePath === "/dev/api") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">백엔드 API 라우트 상태 테스트</h2>
            <p className="text-xs text-slate-500 mt-1">FastAPI 게이트웨이의 라우트 매핑 호출을 직접 트리거해 응답속도를 테스트합니다.</p>
          </div>
          <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded">GET</span>
            <input
              type="text"
              value={inputText || "/api/auth/profile"}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded font-mono text-slate-700"
            />
            <button onClick={() => alert("API Gateway 호출이 성공적으로 완료되었습니다. (Status: 200)")} className="px-4 py-1.5 rounded bg-blue-600 text-white font-bold transition-all">
              호출 테스트
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. DB 테이블 조회 (/dev/db)
  if (activePath === "/dev/db") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">시스템 데이터베이스 스키마 조회</h2>
            <p className="text-xs text-slate-500 mt-1">Supabase PostgreSQL의 활성 물리 스키마 정보와 alembic 마이그레이션 이력입니다.</p>
          </div>
          <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-700">물리 테이블 목록</span>
            <div className="space-y-2 mt-3 font-mono text-[10px] text-slate-600">
              <div>• users (사용자 정보)</div>
              <div>• drivers (기사 상세 정보)</div>
              <div>• sites (반출 현장)</div>
              <div>• dropoff_sites (하차지 정보)</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 md:col-span-2">
            <span className="font-bold text-slate-700">Alembic Migration History</span>
            <div className="mt-3 font-mono text-[10px] text-emerald-600 space-y-1">
              <div>✓ a4f66f3 - Add commission rate schema (Active)</div>
              <div>✓ 2c85bfa - Initialize database baseline tables</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 7. 시스템 로그 분석 (/dev/logs)
  if (activePath === "/dev/logs") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">시스템 로깅 센터</h2>
            <p className="text-xs text-slate-500 mt-1">운송 트랜잭션, 푸시 알림, 결제 연동에서 발생하는 시스템 에러/워닝을 모니터링합니다.</p>
          </div>
          <button onClick={() => setActivePath("/dev")} className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg">
            ← 대시보드로 돌아가기
          </button>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
          <div>[INFO] 2026-06-02 17:45:10 - Connection Pool established successfully (8/50 active).</div>
          <div>[INFO] 2026-06-02 17:45:11 - GPS Broadcast channel open on port 9002.</div>
          <div className="text-amber-400">[WARN] 2026-06-02 17:45:12 - API response delay detected in /api/locations/push (230ms).</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-20 animate-fadeIn">
      <h2 className="text-lg font-bold text-slate-800">개발 진행 중</h2>
      <p className="text-xs text-slate-500 mt-2">선택하신 {activePath} 메뉴는 추가 개발 연동 대기 중입니다.</p>
    </div>
  );
}
