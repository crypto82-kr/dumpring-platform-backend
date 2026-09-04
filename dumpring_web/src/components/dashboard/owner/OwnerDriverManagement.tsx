"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Phone, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserX,
  X,
  Send,
  ShieldCheck,
  Edit2,
  Calendar,
  Layers,
  UserCheck
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface DriverItem {
  driver_id: number;
  name: string;
  phone_number: string;
  car_number: string;
  tonnage: number;
  truck_type?: string | null;
  truck_type_name?: string | null;
  is_approved: boolean;
}

interface CarOption {
  id: number;
  car_number: string;
  tonnage: number;
  truck_type?: string | null;
  truck_type_name?: string | null;
  driver_name?: string | null;
}

interface OwnerDriverManagementProps {
  setActivePath: (path: string) => void;
}

export function OwnerDriverManagement({ setActivePath }: OwnerDriverManagementProps) {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 기사 초대/등록/수정 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [formDriverName, setFormDriverName] = useState("");
  const [formDriverPhone, setFormDriverPhone] = useState("");
  const [formCarNumber, setFormCarNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDriversAndCars = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      if (!token) return;

      const baseUrl = getApiBaseUrl();

      // 1. 소속 기사 목록 조회
      const driverRes = await fetch(`${baseUrl}/api/fleet/my-drivers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (driverRes.ok) {
        const driverData = await driverRes.json();
        setDrivers(driverData || []);
        if (driverData && driverData.length > 0 && selectedDriverId === null) {
          setSelectedDriverId(driverData[0].driver_id);
        }
      }

      // 2. 보유 차량 목록 조회
      const carRes = await fetch(`${baseUrl}/api/fleet/my-cars`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (carRes.ok) {
        const carData = await carRes.json();
        setCars(carData || []);
      }
    } catch (e) {
      console.error("기사 및 차량 조회 에러:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversAndCars();
  }, []);

  const selectedDriver = drivers.find((d) => d.driver_id === selectedDriverId) || drivers[0] || null;

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone_number.includes(searchQuery) ||
      d.car_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingDriverId(null);
    setFormDriverName("");
    setFormDriverPhone("");
    setFormCarNumber("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (driver: DriverItem) => {
    setEditingDriverId(driver.driver_id);
    setFormDriverName(driver.name);
    setFormDriverPhone(driver.phone_number);
    setFormCarNumber(driver.car_number !== "미지정" ? driver.car_number : "");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // 기사 초대 및 등록/수정 저장 핸들러
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDriverName.trim() || !formDriverPhone.trim()) {
      setErrorMsg("기사 성명과 휴대폰 번호를 모두 입력해 주세요.");
      return;
    }

    // 프론트엔드 1차 중복 검증: 신규 등록인데 이미 목록에 있는 번호인 경우
    if (!editingDriverId) {
      const normalizedInputPhone = formDriverPhone.replace(/[^0-9]/g, "");
      const isDuplicate = drivers.some(
        (d) => d.phone_number.replace(/[^0-9]/g, "") === normalizedInputPhone
      );
      if (isDuplicate) {
        setErrorMsg("이미 소속 기사로 등록되어 있는 휴대폰 번호입니다. 기존 목록에서 정보를 수정해 주세요.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      // 1. 기사 초대 푸시/DB 등록
      const inviteRes = await fetch(`${baseUrl}/api/fleet/invite-driver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formDriverName.trim(),
          phone_number: formDriverPhone.trim(),
          driver_id: editingDriverId || null
        })
      });

      if (!inviteRes.ok) {
        const err = await inviteRes.json();
        throw new Error(err.detail || "기사 저장 및 초대에 실패했습니다.");
      }

      const inviteData = await inviteRes.json();
      let targetDriverId = editingDriverId || inviteData?.driver_id;

      // 2. 차량 배정 또는 배정 해제 연동
      if (targetDriverId) {
        if (formCarNumber) {
          const selectedCarObj = cars.find((c) => c.car_number === formCarNumber);
          if (selectedCarObj) {
            await fetch(`${baseUrl}/api/fleet/assign-driver`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                car_id: selectedCarObj.id,
                driver_id: targetDriverId
              })
            });
          }
        } else if (editingDriverId) {
          // '차량 미배정'을 선택했고 기존에 기사가 수정 중이었던 경우, 기존 배정 차량 해제
          const currentEditingDriver = drivers.find((d) => d.driver_id === editingDriverId);
          if (currentEditingDriver && currentEditingDriver.car_number !== "미지정") {
            const oldCarObj = cars.find((c) => c.car_number === currentEditingDriver.car_number);
            if (oldCarObj) {
              await fetch(`${baseUrl}/api/fleet/assign-driver`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  car_id: oldCarObj.id,
                  driver_id: null
                })
              });
            }
          }
        }
      }

      setIsModalOpen(false);
      await fetchDriversAndCars();
    } catch (e: any) {
      setErrorMsg(e.message || "처리 도중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 기사 등록 해제(소속 방출) 핸들러
  const handleDisconnectDriver = async (driverId: number, name: string) => {
    if (!confirm(`'${name}' 기사님을 소속 기사 목록에서 해제하시겠습니까?\n차량 배정이 취소되고 소속 그룹에서 제외됩니다.`)) {
      return;
    }

    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      const res = await fetch(`${baseUrl}/api/fleet/disconnect-driver/${driverId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        await fetchDriversAndCars();
        if (selectedDriverId === driverId) {
          setSelectedDriverId(null);
        }
      } else {
        const err = await res.json();
        alert(err.detail || "기사 해제 처리에 실패했습니다.");
      }
    } catch (e) {
      alert("기사 해제 도중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">소속 기사 관리 대장</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            차주님께 소속되어 배차를 수행하는 전문 덤프 기사 명단, 연락처, 배정 차량 및 가입 심사 상태를 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDriversAndCars}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>새로고침</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>소속 기사 초대 / 등록</span>
          </button>
        </div>
      </div>

      {/* Master-Detail Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Drivers List (Master) */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 min-h-[720px] max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="기사명, 연락처, 차량번호 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between mt-3 mb-2 px-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              소속 기사 목록 ({filteredDrivers.length})
            </h3>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              승인 {drivers.filter((d) => d.is_approved).length} / 전체 {drivers.length}
            </span>
          </div>

          <div className="space-y-2">
            {filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30 stroke-1" />
                <p className="text-xs font-bold text-slate-500">등록된 소속 기사가 없습니다.</p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const isSelected = selectedDriver?.driver_id === driver.driver_id;
                const hasCar = driver.car_number && driver.car_number !== "미지정";

                return (
                  <div
                    key={driver.driver_id}
                    onClick={() => setSelectedDriverId(driver.driver_id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-900/30 border-blue-400 dark:border-blue-700 shadow-md"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span
                        className={`text-xs font-black leading-tight ${
                          isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200 group-hover:text-blue-600"
                        }`}
                      >
                        {driver.name} 기사
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                          driver.is_approved
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {driver.is_approved ? "승인완료" : "심사대기"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {driver.phone_number}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      <span className="font-semibold">배정 차량:</span>
                      {hasCar ? (
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {driver.car_number} ({driver.truck_type_name || `${driver.tonnage}톤`})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">미배정</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Driver Detail Card (Detail) */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDriver ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              {/* Detail Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {selectedDriver.name} 기사
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${
                        selectedDriver.is_approved
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {selectedDriver.is_approved ? "승인 완료" : "심사 대기"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(selectedDriver)}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>정보 수정 및 차량 배정</span>
                  </button>
                  <button
                    onClick={() => handleDisconnectDriver(selectedDriver.driver_id, selectedDriver.name)}
                    className="px-3.5 py-2 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs transition-all border border-rose-200 dark:border-rose-800 flex items-center gap-1.5"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>소속 해제</span>
                  </button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. 기사 인적 정보 */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>기사 정보</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500">성명</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedDriver.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500">연락처</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedDriver.phone_number}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500">모바일 앱</span>
                      <span className="font-bold text-emerald-600">연동 완료</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">승인 상태</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {selectedDriver.is_approved ? "승인 완료" : "심사 진행 중"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. 배정된 덤프 차량 정보 */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>배정 차량</span>
                  </h4>
                  {selectedDriver.car_number && selectedDriver.car_number !== "미지정" ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500">차량번호</span>
                        <span className="font-mono font-black text-blue-600">{selectedDriver.car_number}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500">적재 규격</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedDriver.truck_type_name || `${selectedDriver.tonnage}톤`}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">운행 상태</span>
                        <span className="text-emerald-600 font-bold">운행 대기</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 space-y-2">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-500 opacity-60" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">배정된 차량이 없습니다.</p>
                      <button
                        onClick={() => openEditModal(selectedDriver)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold"
                      >
                        차량 배정하기
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. 필수 제출 서류 심사 현황 카드 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>기사 서류</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="font-bold text-slate-800 dark:text-slate-200">운전면허증</p>
                    <span className="text-[10px] text-emerald-600 font-bold">제출 완료</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="font-bold text-slate-800 dark:text-slate-200">기초안전교육이수증</p>
                    <span className="text-[10px] text-emerald-600 font-bold">제출 완료</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="font-bold text-slate-800 dark:text-slate-200">특수형태근로자확인서</p>
                    <span className="text-[10px] text-emerald-600 font-bold">제출 완료</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-1" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">선택된 기사가 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">좌측 목록에서 기사를 선택하거나 신규 기사를 초대해 주세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 등록 및 수정 팝업 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>{editingDriverId ? "기사 정보 수정 및 차량 배정" : "소속 기사 신규 초대 / 등록"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  기사 성명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동"
                  value={formDriverName}
                  onChange={(e) => setFormDriverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  기사 휴대폰 번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="예: 01012345678"
                  value={formDriverPhone}
                  onChange={(e) => setFormDriverPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  기사님이 모바일 앱 가입 시 이 번호로 로그인하면 자동으로 소속 그룹에 매칭됩니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  배정 덤프 차량 (선택)
                </label>
                <select
                  value={formCarNumber}
                  onChange={(e) => setFormCarNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">차량 미배정 (추후 배정)</option>
                  {cars.map((c) => {
                    const isAssignedToOther = c.driver_name && c.driver_name !== "미배정" && (!editingDriverId || drivers.find(d => d.driver_id === editingDriverId)?.car_number !== c.car_number);
                    return (
                      <option key={c.id} value={c.car_number}>
                        {c.car_number} ({c.truck_type_name || `${c.tonnage}톤`}){isAssignedToOther ? ` [배정중: ${c.driver_name}]` : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  이미 다른 기사에게 배정된 차량을 선택할 경우, 기존 기사는 자동으로 미배정 상태로 변경됩니다.
                </p>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "처리 중..." : editingDriverId ? "수정 완료" : "초대 및 등록 완료"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
