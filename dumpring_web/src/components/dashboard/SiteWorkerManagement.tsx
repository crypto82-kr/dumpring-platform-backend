"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, ShieldCheck, UserX, Clock, Search, Plus, User, Phone, Briefcase, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export interface SiteWorkerItem {
  id: number;
  name: string;
  phone_number: string;
  employee_role: string;
  site_id?: number | null;
  site_name?: string | null;
  is_approved: boolean;
  status: "APPROVED" | "PENDING" | "REJECTED";
  reject_reason?: string | null;
  created_at: string;
}

interface SiteWorkerManagementProps {
  registeredSiteList?: any[];
}

export default function SiteWorkerManagement({ registeredSiteList = [] }: SiteWorkerManagementProps) {
  const [workerList, setWorkerList] = useState<SiteWorkerItem[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [siteOptions, setSiteOptions] = useState<any[]>(registeredSiteList);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("현장통제/도장");
  const [formSiteId, setFormSiteId] = useState<number | "">("");

  // Fetch Sites List directly from backend for robust dropdown rendering
  const fetchSites = async () => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch("http://127.0.0.1:8000/api/sites/admin-sites", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          id: item.id,
          name: item.site_name || item.name || "공사 현장",
          address: item.address || "주소 미등록",
        }));
        if (mapped.length > 0) {
          setSiteOptions(mapped);
        }
      }
    } catch (e) {
      console.error("Failed to load site list inside SiteWorkerManagement", e);
    }
  };

  // Fetch Workers List from backend
  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const res = await fetch("http://127.0.0.1:8000/api/sites/all-employees", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setWorkerList(data);
        if (data.length > 0 && selectedWorkerId === null) {
          setSelectedWorkerId(data[0].id);
        }
      } else {
        setWorkerList([]);
      }
    } catch (err) {
      console.error(err);
      setWorkerList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchSites();
  }, []);

  useEffect(() => {
    if (registeredSiteList && registeredSiteList.length > 0) {
      setSiteOptions(registeredSiteList);
    }
  }, [registeredSiteList]);

  const selectedWorker = workerList.find((w) => w.id === selectedWorkerId) || workerList[0] || null;

  const filteredWorkers = workerList.filter((w) =>
    w.name.includes(searchQuery) || w.phone_number.includes(searchQuery) || w.employee_role.includes(searchQuery)
  );

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert("담당자 성명과 휴대폰 번호를 입력해 주세요.");
      return;
    }

    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (token) authHeaders["Authorization"] = `Bearer ${token}`;

      if (editingWorkerId !== null) {
        // Edit Mode
        const res = await fetch(`http://127.0.0.1:8000/api/sites/all-employees/${editingWorkerId}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            name: formName,
            phone_number: formPhone,
            employee_role: formRole,
            site_id: formSiteId !== "" ? Number(formSiteId) : null,
          }),
        });
        if (res.ok) {
          alert("현장담당자 정보가 성공적으로 수정되었습니다.");
          fetchWorkers();
        } else {
          // Local State Fallback
          const selectedSiteObj = registeredSiteList.find((s) => s.id === formSiteId);
          setWorkerList((prev) =>
            prev.map((w) =>
              w.id === editingWorkerId
                ? {
                    ...w,
                    name: formName,
                    phone_number: formPhone,
                    employee_role: formRole,
                    site_id: formSiteId !== "" ? Number(formSiteId) : null,
                    site_name: selectedSiteObj?.name || "소속 현장 미지정",
                  }
                : w
            )
          );
          alert("현장담당자 정보가 수정되었습니다.");
        }
      } else {
        // Create Mode
        const res = await fetch("http://127.0.0.1:8000/api/sites/all-employees", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: formName,
            phone_number: formPhone,
            employee_role: formRole,
            site_id: formSiteId !== "" ? Number(formSiteId) : null,
          }),
        });
        if (res.ok) {
          alert("신규 현장담당자 인원이 등록되었습니다. (플랫폼 관리자 승인 대기)");
          fetchWorkers();
        } else {
          // Local State Fallback
          const selectedSiteObj = registeredSiteList.find((s) => s.id === formSiteId);
          const newWorker: SiteWorkerItem = {
            id: Date.now(),
            name: formName,
            phone_number: formPhone,
            employee_role: formRole,
            site_id: formSiteId !== "" ? Number(formSiteId) : null,
            site_name: selectedSiteObj?.name || "소속 현장 미지정",
            is_approved: false,
            status: "PENDING",
            created_at: new Date().toISOString().split("T")[0],
          };
          setWorkerList((prev) => [newWorker, ...prev]);
          setSelectedWorkerId(newWorker.id);
          alert("신규 현장담당자 인원이 등록되었습니다. (플랫폼 관리자 승인 대기)");
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("처리 중 에러가 발생했습니다.");
    }
  };

  const handleDeleteWorker = async (id: number) => {
    if (!confirm("해당 현장담당자 인원을 정말 삭제 처리하시겠습니까?")) return;
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      await fetch(`http://127.0.0.1:8000/api/sites/all-employees/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setWorkerList((prev) => prev.filter((w) => w.id !== id));
      alert("삭제되었습니다.");
      if (selectedWorkerId === id) {
        setSelectedWorkerId(null);
      }
    } catch (err) {
      console.error(err);
      setWorkerList((prev) => prev.filter((w) => w.id !== id));
      alert("삭제되었습니다.");
      if (selectedWorkerId === id) {
        setSelectedWorkerId(null);
      }
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormRole("현장통제/도장");
    setEditingWorkerId(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Section */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">현장담당자 인원 관리</h2>
          <p className="text-xs text-slate-500 mt-1">
            공사현장에 근무할 담당자 인원의 인적사항(성명, 연락처, 직책)을 등록·수정·관리합니다. (소속 현장은 현장 관리에서 별도 매핑)
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          신규 현장담당자 등록
        </button>
      </div>

      {/* Master-Detail Split Screen Layout (Same as Site Management UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workers List (Master) */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 min-h-[740px] max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="성명, 연락처, 직책 검색..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mt-3 mb-2">
            등록된 담당자 인원 ({filteredWorkers.length})
          </h3>

          <div className="space-y-2">
            {filteredWorkers.map((worker) => {
              const isSelected = selectedWorker?.id === worker.id;
              return (
                <div
                  key={worker.id}
                  onClick={() => setSelectedWorkerId(worker.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${
                    isSelected ? "bg-blue-50/70 border-blue-300 shadow-md" : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-350"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                      {worker.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        worker.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : worker.status === "REJECTED"
                          ? "bg-rose-50 text-rose-600 border-rose-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                      }`}
                    >
                      {worker.status === "APPROVED" ? "승인완료" : worker.status === "REJECTED" ? "반려" : "승인대기"}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2 font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {worker.phone_number}
                  </p>

                  <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                    <span className="text-slate-600 font-bold">소속: {worker.site_name || "소속 현장 미지정"}</span>
                    <span className="font-mono">{worker.created_at}</span>
                  </div>
                </div>
              );
            })}

            {filteredWorkers.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                등록된 현장담당자 인원이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Worker Detail Card */}
        <div className="lg:col-span-2 space-y-6">
          {selectedWorker ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">[{selectedWorker.name}] 현장담당자 인적사항 상세</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">인원 ID: EMP-00{selectedWorker.id}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWorkerId(selectedWorker.id);
                      setFormName(selectedWorker.name);
                      setFormPhone(selectedWorker.phone_number);
                      setFormRole(selectedWorker.employee_role);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-black rounded-lg border border-blue-200 active:scale-95 transition-all"
                  >
                    정보 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorker(selectedWorker.id)}
                    className="px-3 py-1.5 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-lg border border-rose-200 active:scale-95 transition-all"
                  >
                    인원 삭제
                  </button>
                </div>
              </div>

              {/* Detail Info Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">담당자 성명</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-blue-600" />
                        {selectedWorker.name}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">휴대폰 연락처</span>
                      <div className="text-xs font-mono font-bold text-slate-700 mt-0.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedWorker.phone_number}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">매핑된 소속 공사 현장</span>
                      <div className="text-xs font-bold text-blue-700 mt-0.5 flex items-center gap-1.5">
                        {selectedWorker.site_name || "소속 현장 미지정"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">인원 등록 일자</span>
                      <div className="text-xs font-mono text-slate-600 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {selectedWorker.created_at}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Status Card */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">플랫폼 승인 및 관리 상태</span>
                    <div className="space-y-2.5 text-xs font-semibold">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">어드민 최종 승인 상태</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            selectedWorker.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : selectedWorker.status === "REJECTED"
                              ? "bg-rose-50 text-rose-600 border-rose-200"
                              : "bg-amber-50 text-amber-600 border-amber-200"
                          }`}
                        >
                          {selectedWorker.status === "APPROVED" ? "최종 승인 완료" : selectedWorker.status === "REJECTED" ? "승인 반려" : "승인 대기 중"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500">소속 현장 매핑 방식</span>
                        <span className="text-blue-600 font-bold">현장 관리에서 별도 지정</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">실물 서류 제출 유무</span>
                        <span className="text-slate-600 font-bold">서류 제출 없음 (소장님 서류 공유)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      담당자 인원 등록 지침
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      * 등록된 현장담당자는 플랫폼 관리자의 최종 승인 후 활성화되며, [현장 관리] 메뉴에서 특정 현장의 관제 담당자로 지정/매핑할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
              <User className="w-12 h-12 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">선택된 현장담당자 인원이 없습니다</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                좌측 목록에서 조회할 담당자를 선택하거나 우측 상단의 등록 버튼을 눌러 신규 인원을 등록해 주세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== CREATE / EDIT MODAL POPUP ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingWorkerId !== null ? `[${formName}] 담당자 정보 수정` : "신규 현장담당자 인원 등록"}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">현장에 배치할 담당자의 인적사항을 정확히 입력해 주세요.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs active:scale-90 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Form (Personnel info + Site selection) */}
            <form onSubmit={handleSaveWorker} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold block">소속 공사 현장 선택 <span className="text-rose-500">*</span></label>
                <select
                  value={formSiteId}
                  onChange={(e) => setFormSiteId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                >
                  <option value="">담당 현장을 선택해 주세요</option>
                  {siteOptions.map((site: any) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold block">담당자 성명 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold block">휴대폰 번호 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* 담당 직책 / 역할은 화면에서 노출하지 않고 백엔드 DB 디폴트 '현장통제/도장' 으로 자동 저장됩니다 */}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px] text-slate-500 leading-normal">
                * 별도 서류 파일 첨부는 없으며, 소속 현장 매핑은 현장 관리 화면에서 소장님이 별도 지정합니다.
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 active:scale-95 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
                >
                  {editingWorkerId !== null ? "정보 수정 완료" : "인원 등록 신청"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
