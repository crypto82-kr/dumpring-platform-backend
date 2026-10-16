import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Truck,
  Building2,
  MapPin,
  RefreshCw,
  Phone,
  Calendar,
  FileText,
  X,
  Eye,
  ShieldCheck,
  Award,
  Layers
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface UserItem {
  id: number;
  name: string;
  phone_number: string;
  roles: string[];
  primary_role: string;
  is_driver: boolean;
  is_owner: boolean;
  is_site_manager: boolean;
  is_site_worker: boolean;
  is_drop_off: boolean;
  is_admin: boolean;
  created_at?: string | null;
  assigned_car_number?: string | null;
  assigned_car_tonnage?: number | null;
  owner_name?: string | null;
  owned_cars_count: number;
  owned_cars: Array<{ id: number; car_number: string; tonnage: number }>;
  site_name?: string | null;
  company_name?: string | null;
  site_address?: string | null;
  business_number?: string | null;
  dropoff_name?: string | null;
  permit_number?: string | null;
  dropoff_address?: string | null;
  documents: Array<{ code: string; file_name: string; url: string }>;
}

interface PlatformAdminUserManagementProps {
  setActivePath?: (path: string) => void;
}

export function PlatformAdminUserManagement({ setActivePath }: PlatformAdminUserManagementProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 필터 및 검색
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 상세 모달
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem("accessToken") || sessionStorage.getItem("dumpring_token");
      const res = await fetch(`${baseUrl}/api/auth/admin/all-users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`이용자 목록을 불러오지 못했습니다. (${res.status})`);
      }

      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      setErrorMsg(e?.message || "데이터 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 필터링 계산
  const filteredUsers = users.filter((u) => {
    // 💡 관리자/개발자 계정 제외
    if (u.is_admin || u.phone_number === "010-0000-0000" || u.phone_number === "010-9999-9999" || u.name === "개발자" || u.name === "시스템관리자") {
      return false;
    }

    // 1. 역할 필터
    if (selectedRoleFilter === "DRIVER" && !u.is_driver) return false;
    if (selectedRoleFilter === "OWNER" && !u.is_owner) return false;
    if (selectedRoleFilter === "SITE" && !u.is_site_manager && !u.is_site_worker) return false;
    if (selectedRoleFilter === "DROPOFF" && !u.is_drop_off) return false;

    // 2. 검색어 필터 (이름, 전화번호, 차량번호, 현장명)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const matchName = u.name?.toLowerCase().includes(query);
      const matchPhone = u.phone_number?.replace(/-/g, "").includes(query.replace(/-/g, ""));
      const matchCar = u.assigned_car_number?.toLowerCase().includes(query) ||
        u.owned_cars?.some((c) => c.car_number?.toLowerCase().includes(query));
      const matchSite = u.site_name?.toLowerCase().includes(query) || u.dropoff_name?.toLowerCase().includes(query);
      return matchName || matchPhone || matchCar || matchSite;
    }

    return true;
  });

  // 카운트 집계
  const stats = {
    total: users.length,
    drivers: users.filter((u) => u.is_driver).length,
    owners: users.filter((u) => u.is_owner).length,
    sites: users.filter((u) => u.is_site_manager || u.is_site_worker).length,
    dropoffs: users.filter((u) => u.is_drop_off).length,
  };

  const getRoleBadge = (u: UserItem) => {
    if (u.is_owner && u.is_driver) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">차주(직접운전)</span>;
    }
    if (u.is_owner) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">차주</span>;
    }
    if (u.is_driver) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">기사</span>;
    }
    if (u.is_site_manager) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">현장관리자</span>;
    }
    if (u.is_site_worker) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">현장담당자</span>;
    }
    if (u.is_drop_off) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">하차지</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-slate-100 text-slate-700">회원</span>;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-900/50">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100">
                이용자 관리
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                플랫폼 승인이 완료된 정식 활동 회원 목록 및 역할별 상세 등록 정보를 조회합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 2. Quick Stat KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setSelectedRoleFilter("ALL")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === "ALL"
              ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-sm"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">전체 회원</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.total}명</div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter("DRIVER")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === "DRIVER"
              ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-sm"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">기사</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.drivers}명</div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter("OWNER")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === "OWNER"
              ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-sm"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">차주</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.owners}명</div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter("SITE")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === "SITE"
              ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 shadow-sm"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">현장</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.sites}명</div>
        </div>

        <div
          onClick={() => setSelectedRoleFilter("DROPOFF")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedRoleFilter === "DROPOFF"
              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-sm"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">하차지</div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.dropoffs}명</div>
        </div>
      </div>

      {/* 3. Search & Role Filter Tabs */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="이름, 연락처, 차량번호, 현장명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {[
            { id: "ALL", label: "전체 회원" },
            { id: "DRIVER", label: "덤프 기사" },
            { id: "OWNER", label: "차주 / 운송사" },
            { id: "SITE", label: "현장 관리/담당" },
            { id: "DROPOFF", label: "하차지 지주" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRoleFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedRoleFilter === tab.id
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-bold">
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                <th className="py-3 px-4 w-12 text-center">ID</th>
                <th className="py-3 px-4">성명 / 상호</th>
                <th className="py-3 px-4">휴대폰 번호</th>
                <th className="py-3 px-4">역할 구분</th>
                <th className="py-3 px-4">주요 등록/소속 정보</th>
                <th className="py-3 px-4">가입일</th>
                <th className="py-3 px-4 text-center">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    이용자 목록을 불러오고 있습니다...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-750/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                      #{u.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.documents && u.documents.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            서류 {u.documents.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {u.phone_number}
                    </td>
                    <td className="py-3 px-4">
                      {getRoleBadge(u)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {/* 역할별 맞춤 한 줄 요약 */}
                      {u.is_owner ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                            보유 차량: {u.owned_cars_count}대
                          </span>
                          {u.owned_cars_count > 0 && (
                            <span className="text-[10px] text-slate-400">
                              ({u.owned_cars.map((c) => c.car_number).slice(0, 2).join(", ")}
                              {u.owned_cars.length > 2 ? " 외" : ""})
                            </span>
                          )}
                        </div>
                      ) : u.is_driver ? (
                        u.assigned_car_number ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50 text-[11px]">
                              {u.assigned_car_number} ({u.assigned_car_tonnage || 25}톤)
                            </span>
                            {u.owner_name && (
                              <span className="text-[10px] text-slate-400">
                                [소속: {u.owner_name}]
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            미배정
                          </span>
                        )
                      ) : u.is_site_manager || u.is_site_worker ? (
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 text-[11px]">
                            {u.site_name || "현장명 미등록"}
                          </span>
                          {u.company_name && (
                            <span className="text-[10px] text-slate-400 truncate">
                              ({u.company_name})
                            </span>
                          )}
                        </div>
                      ) : u.is_drop_off ? (
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                            {u.dropoff_name || "하차지명 미등록"}
                          </span>
                          {u.permit_number && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              [{u.permit_number}]
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {u.created_at || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(u);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Count Summary */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          총 <span className="font-bold text-slate-800 dark:text-slate-200">{filteredUsers.length}</span>명
        </div>
      </div>

      {/* 5. Role-Specific User Detail Modal (승인관리 UI 스타일 100% 동일 구현) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-xl font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {selectedUser.name}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">#{selectedUser.id}</span>
                    {getRoleBadge(selectedUser)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    연락처: {selectedUser.phone_number} | 가입일: {selectedUser.created_at || "미상"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 역할별 특화 그리드 UI */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {/* 1) 덤프 기사 전용 상세 정보 카드 */}
              {selectedUser.is_driver && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    덤프 기사 등록 및 배정 차량 정보
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-sky-50/60 dark:bg-slate-900 border border-sky-200/70 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">기사 성명</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">연락처</span>
                      <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">{selectedUser.phone_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">배정 차량</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedUser.assigned_car_number
                          ? `${selectedUser.assigned_car_number} (${selectedUser.assigned_car_tonnage || 25}톤)`
                          : "미배정"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">소속 차주</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{selectedUser.owner_name || "미지정"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2) 차주 / 운송사 전용 상세 정보 카드 */}
              {selectedUser.is_owner && (
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    차주 / 운송사 차량 및 사업자 정보
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">대표 성명</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">연락처</span>
                      <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400">{selectedUser.phone_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">기사 겸직 여부</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedUser.is_driver ? "직접 운전 (겸직)" : "차주 전용"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">보유 등록 차량</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">{selectedUser.owned_cars_count}대</span>
                    </div>
                  </div>

                  {/* 등록 차량 목록 */}
                  {selectedUser.owned_cars.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 mb-2">보유 차량 목록 ({selectedUser.owned_cars.length}대)</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {selectedUser.owned_cars.map((c) => (
                          <div key={c.id} className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex justify-between">
                            <span>{c.car_number}</span>
                            <span className="text-slate-400">{c.tonnage}톤</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3) 공사 현장 관리자/담당자 전용 상세 정보 카드 */}
              {(selectedUser.is_site_manager || selectedUser.is_site_worker) && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    공사 현장 및 시공사 정보
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-900 border border-indigo-200/70 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">성명</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">연락처</span>
                      <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{selectedUser.phone_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">공사 현장명</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.site_name || "현장명 미등록"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">시공/도급 건설사</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.company_name || "건설사 미등록"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold block">공사 현장 주소지</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{selectedUser.site_address || "현장 주소 미등록"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold block">사업자등록번호</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedUser.business_number || "미등록"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4) 하차지(사토장) 지주 전용 상세 정보 카드 */}
              {selectedUser.is_drop_off && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    하차지(사토장) 허가 및 부지 정보
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-900 border border-emerald-200/70 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">지주/대표 성명</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedUser.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">연락처</span>
                      <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{selectedUser.phone_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">하차지 명칭</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.dropoff_name || "명칭 미등록"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">토사 반입 허가번호</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedUser.permit_number || "미등록"}</span>
                    </div>
                    <div className="col-span-4">
                      <span className="text-[10px] text-slate-400 font-bold block">하차지 주소지</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{selectedUser.dropoff_address || "주소 미등록"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 공통: 등록 제출 서류 목록 */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
                  <FileText className="w-4 h-4 text-blue-600" />
                  제출 증빙 서류 ({selectedUser.documents.length}건)
                </h4>
                {selectedUser.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {doc.code}
                          </span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {doc.file_name}
                          </span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-100"
                        >
                          서류 보기
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center text-slate-400">
                    제출된 서류가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-750 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition-all text-xs"
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
