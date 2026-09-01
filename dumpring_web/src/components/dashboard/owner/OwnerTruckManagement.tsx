"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Truck, 
  Plus, 
  Search, 
  RefreshCw, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck,
  X,
  Calendar,
  Edit2,
  Trash2,
  User,
  Phone,
  Layers,
  ArrowRight,
  Upload,
  ExternalLink,
  FileCheck
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface CarItem {
  id: number;
  car_number: string;
  tonnage: number;
  truck_type?: string | null;
  truck_type_name?: string | null;
  driver_name: string;
  inspection_date: string;
  machinery_reg_file?: string | null;
  machinery_reg_url?: string | null;
  biz_license_file?: string | null;
  biz_license_url?: string | null;
  insurance_file?: string | null;
  insurance_url?: string | null;
}

interface DriverOption {
  driver_id: number;
  name: string;
  phone_number: string;
  car_number: string;
}

interface CommonCodeItem {
  code: string;
  code_name: string;
  display_order: number;
}

interface OwnerTruckManagementProps {
  setActivePath: (path: string) => void;
}

export function OwnerTruckManagement({ setActivePath }: OwnerTruckManagementProps) {
  const [cars, setCars] = useState<CarItem[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [truckTypeCodes, setTruckTypeCodes] = useState<CommonCodeItem[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCarId, setEditingCarId] = useState<number | null>(null);
  const [formCarNumber, setFormCarNumber] = useState("");
  const [formTruckType, setFormTruckType] = useState("T_25");
  const [formInspectionDate, setFormInspectionDate] = useState("2026-12-31");
  const [formDriverId, setFormDriverId] = useState<number | string>("");

  // 서류 업로드 및 미리보기 관련 상태
  const [machineryFile, setMachineryFile] = useState<File | null>(null);
  const [bizLicenseFile, setBizLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [existingMachineryUrl, setExistingMachineryUrl] = useState<string | null>(null);
  const [existingBizUrl, setExistingBizUrl] = useState<string | null>(null);
  const [existingInsuranceUrl, setExistingInsuranceUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. 공통코드 (TRUCK_TYPE) 조회
  const fetchTruckTypeCodes = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/common-codes/TRUCK_TYPE`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setTruckTypeCodes(data);
        }
      }
    } catch (e) {
      console.error("차량 규격 공통코드 조회 에러:", e);
    }
  };

  // 2. 차량 및 기사 목록 조회
  const fetchCarsAndDrivers = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      const [carsRes, driversRes] = await Promise.all([
        fetch(`${baseUrl}/api/fleet/my-cars`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch(`${baseUrl}/api/fleet/my-drivers`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      if (carsRes.ok) {
        const carData = await carsRes.json();
        setCars(carData || []);
        if (carData && carData.length > 0 && selectedCarId === null) {
          setSelectedCarId(carData[0].id);
        }
      }

      if (driversRes.ok) {
        const driverData = await driversRes.json();
        setDrivers(driverData || []);
      }
    } catch (e) {
      console.error("차량/기사 데이터 조회 실패:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTruckTypeCodes();
    fetchCarsAndDrivers();
  }, []);

  const selectedCar = useMemo(
    () => cars.find((c) => c.id === selectedCarId) || cars[0] || null,
    [cars, selectedCarId]
  );

  const filteredCars = useMemo(
    () =>
      cars.filter((car) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          car.car_number.toLowerCase().includes(q) ||
          (car.driver_name && car.driver_name.toLowerCase().includes(q))
        );
      }),
    [cars, searchQuery]
  );

  const resetModalFiles = () => {
    setMachineryFile(null);
    setBizLicenseFile(null);
    setInsuranceFile(null);
    setExistingMachineryUrl(null);
    setExistingBizUrl(null);
    setExistingInsuranceUrl(null);
  };

  const openCreateModal = () => {
    setEditingCarId(null);
    setFormCarNumber("");
    setFormTruckType(truckTypeCodes.length > 0 ? truckTypeCodes[1]?.code || "T_25" : "T_25");
    setFormInspectionDate("2026-12-31");
    setFormDriverId("");
    resetModalFiles();
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (car: CarItem) => {
    setEditingCarId(car.id);
    setFormCarNumber(car.car_number);
    setFormTruckType(car.truck_type || "T_25");
    setFormInspectionDate(car.inspection_date || "2026-12-31");
    const matched = drivers.find((d) => d.car_number === car.car_number);
    setFormDriverId(matched ? matched.driver_id : "");
    resetModalFiles();
    setExistingMachineryUrl(car.machinery_reg_url || car.machinery_reg_file || null);
    setExistingBizUrl(car.biz_license_url || car.biz_license_file || null);
    setExistingInsuranceUrl(car.insurance_url || car.insurance_file || null);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // 공통코드 코드값 파싱 헬퍼 (예: T_15 -> 15.0, T_25 -> 25.5)
  function parseTonnageFromCode(code: string): number {
    if (code === "T_15") return 15.0;
    if (code === "T_25") return 25.5;
    if (code === "T_27") return 27.0;
    const num = parseFloat(code.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 25.5 : num;
  }

  // 공통 파일 업로드 함수 (/api/files/upload)
  const uploadDocFile = async (file: File): Promise<{ fileName: string; fileUrl: string } | null> => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      const formData = new FormData();
      formData.append("category", "documents");
      formData.append("file", file);

      const res = await fetch(`${baseUrl}/api/files/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        return {
          fileName: data.file_name || file.name,
          fileUrl: data.file_url ? `${baseUrl}${data.file_url}` : `${baseUrl}/api/files/stream/${data.file_name}?category=documents`
        };
      }
    } catch (e) {
      console.error(`서류 업로드 실패:`, e);
    }
    return null;
  };

  // 공통 물리 파일 삭제 함수 (/api/files/{filename})
  const deletePhysicalFile = async (fileName: string) => {
    if (!fileName) return;
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      await fetch(`${baseUrl}/api/files/${encodeURIComponent(fileName)}?category=documents`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (e) {
      console.warn("물리 파일 삭제 실패 (무시):", e);
    }
  };

  // 차량 등록 및 수정 저장
  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCarNumber.trim()) {
      setErrorMsg("차량번호를 입력해 주세요.");
      return;
    }

    // 차량 필수 서류 3종 존재 여부 검증
    const hasMachinery = Boolean(machineryFile || existingMachineryUrl);
    const hasBizLicense = Boolean(bizLicenseFile || existingBizUrl);
    const hasInsurance = Boolean(insuranceFile || existingInsuranceUrl);

    if (!hasMachinery) {
      setErrorMsg("건설기계등록증(차량등록증) 서류를 첨부해 주세요. (필수)");
      return;
    }
    if (!hasBizLicense) {
      setErrorMsg("차주 사업자등록증 서류를 첨부해 주세요. (필수)");
      return;
    }
    if (!hasInsurance) {
      setErrorMsg("화물/종합 보험증권 서류를 첨부해 주세요. (필수)");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      const baseUrl = getApiBaseUrl();

      // 1. 건설기계등록증 처리 (새 파일이 업로드된 경우 기존 물리 파일 삭제 후 교체)
      let machineryUrl = existingMachineryUrl;
      let machineryName = existingMachineryUrl ? "건설기계등록증" : null;
      if (machineryFile) {
        const up = await uploadDocFile(machineryFile);
        if (up) {
          // 기존에 파일이 등록되어 있었다면 스토리지에서 이전 물리 파일 삭제
          if (editingCarId && existingMachineryUrl) {
            const oldKey = existingMachineryUrl.split("/").pop()?.split("?")[0];
            if (oldKey) await deletePhysicalFile(oldKey);
          }
          machineryUrl = up.fileUrl;
          machineryName = up.fileName;
        }
      }

      // 2. 사업자등록증 처리
      let bizUrl = existingBizUrl;
      let bizName = existingBizUrl ? "사업자등록증" : null;
      if (bizLicenseFile) {
        const up = await uploadDocFile(bizLicenseFile);
        if (up) {
          if (editingCarId && existingBizUrl) {
            const oldKey = existingBizUrl.split("/").pop()?.split("?")[0];
            if (oldKey) await deletePhysicalFile(oldKey);
          }
          bizUrl = up.fileUrl;
          bizName = up.fileName;
        }
      }

      // 3. 보험증권 처리
      let insuranceUrl = existingInsuranceUrl;
      let insuranceName = existingInsuranceUrl ? "보험증권" : null;
      if (insuranceFile) {
        const up = await uploadDocFile(insuranceFile);
        if (up) {
          if (editingCarId && existingInsuranceUrl) {
            const oldKey = existingInsuranceUrl.split("/").pop()?.split("?")[0];
            if (oldKey) await deletePhysicalFile(oldKey);
          }
          insuranceUrl = up.fileUrl;
          insuranceName = up.fileName;
        }
      }

      // 4. 차량 정보 등록/업데이트
      const res = await fetch(`${baseUrl}/api/fleet/my-cars`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          car_number: formCarNumber.trim(),
          truck_type: formTruckType,
          inspection_date: formInspectionDate.trim() || "2026-12-31",
          machinery_reg_file: machineryName,
          machinery_reg_url: machineryUrl,
          biz_license_file: bizName,
          biz_license_url: bizUrl,
          insurance_file: insuranceName,
          insurance_url: insuranceUrl
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "차량 정보 저장에 실패했습니다.");
      }

      const savedCar = await res.json();

      // 3. 기사 배정 변경 처리
      if (savedCar && savedCar.id) {
        await fetch(`${baseUrl}/api/fleet/assign-driver`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            car_id: savedCar.id,
            driver_id: formDriverId !== "" ? Number(formDriverId) : null
          })
        });
      }

      setIsModalOpen(false);
      await fetchCarsAndDrivers();
      if (savedCar?.id) {
        setSelectedCarId(savedCar.id);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "처리 도중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Truck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">차량 관리 대장</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            차주님이 보유하신 덤프트럭 차량 등록, 공통코드 톤수 규격 설정, 등록 서류 첨부 및 전담 기사 배정을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCarsAndDrivers}
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
            <Plus className="w-4 h-4" />
            <span>신규 차량 등록</span>
          </button>
        </div>
      </div>

      {/* Master-Detail Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Vehicles List (Master) */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 min-h-[720px] max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="차량번호 또는 담당 기사 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between mt-3 mb-2 px-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              등록 차량 목록 ({filteredCars.length})
            </h3>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              배정 {cars.filter((c) => c.driver_name && c.driver_name !== "미배정").length} / 전체 {cars.length}
            </span>
          </div>

          <div className="space-y-2">
            {filteredCars.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-30 stroke-1" />
                <p className="text-xs font-bold text-slate-500">등록된 차량이 없습니다.</p>
              </div>
            ) : (
              filteredCars.map((car) => {
                const isSelected = selectedCar?.id === car.id;
                const hasDriver = car.driver_name && car.driver_name !== "미배정";

                return (
                  <div
                    key={car.id}
                    onClick={() => setSelectedCarId(car.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-900/30 border-blue-400 dark:border-blue-700 shadow-md"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span
                        className={`text-xs font-black leading-tight font-mono ${
                          isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200 group-hover:text-blue-600"
                        }`}
                      >
                        {car.car_number}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                          hasDriver
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {hasDriver ? "기사 배정됨" : "공차 (미배정)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      <span className="font-bold">{car.truck_type_name || `${car.tonnage}톤`}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {hasDriver ? `담당: ${car.driver_name}` : "기사 미지정"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Vehicle Detail Card (Detail) */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCar ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              {/* Detail Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-900 text-white dark:bg-slate-800 rounded-xl font-mono text-sm font-black tracking-wide">
                      {selectedCar.car_number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      {selectedCar.truck_type_name || `${selectedCar.tonnage}톤`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(selectedCar)}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>정보 수정 및 서류 등록</span>
                  </button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. 차량 제원 정보 */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>차량 정보</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500">차량번호</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedCar.car_number}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500">적재 규격</span>
                      <span className="font-bold text-blue-600">{selectedCar.truck_type_name || `${selectedCar.tonnage}톤`}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500">정기검사 유효기간</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedCar.inspection_date || "2026-12-31"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">운행 상태</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>정상 운행 가능</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. 전담 배정 기사 정보 */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>배정 기사</span>
                  </h4>
                  {selectedCar.driver_name && selectedCar.driver_name !== "미배정" ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500">기사 성명</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{selectedCar.driver_name} 기사</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500">배정 상태</span>
                        <span className="text-emerald-600 font-bold">배정 완료</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">모바일 앱 연동</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">연동 완료</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 space-y-2">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-500 opacity-60" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">현재 배정된 기사가 없습니다.</p>
                      <button
                        onClick={() => openEditModal(selectedCar)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold"
                      >
                        기사 배정하기
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. 차량 등록 증빙 서류 카드 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>차량 서류</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* 건설기계등록증 */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">건설기계등록증</span>
                    </div>
                    {selectedCar.machinery_reg_url || selectedCar.machinery_reg_file ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          등록 완료
                        </span>
                        {selectedCar.machinery_reg_url && (
                          <a
                            href={selectedCar.machinery_reg_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                          >
                            보기 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold block">미등록</span>
                    )}
                  </div>

                  {/* 사업자등록증 */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">사업자등록증</span>
                    </div>
                    {selectedCar.biz_license_url || selectedCar.biz_license_file ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          등록 완료
                        </span>
                        {selectedCar.biz_license_url && (
                          <a
                            href={selectedCar.biz_license_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                          >
                            보기 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold block">미등록</span>
                    )}
                  </div>

                  {/* 자동차/화물 종합보험증권 */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">보험증권</span>
                    </div>
                    {selectedCar.insurance_url || selectedCar.insurance_file ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          등록 완료
                        </span>
                        {selectedCar.insurance_url && (
                          <a
                            href={selectedCar.insurance_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                          >
                            보기 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold block">미등록</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-1" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">선택된 차량이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">좌측 목록에서 차량을 선택하거나 신규 차량을 등록해 주세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 등록 및 수정 팝업 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>🚚</span>
                <span>{editingCarId ? "차량 정보 수정" : "신규 차량 등록"}</span>
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

            <form onSubmit={handleSaveCar} className="space-y-4">
              {/* 차량번호 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  차량번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 경기80사1234, 인천82자5678"
                  value={formCarNumber}
                  onChange={(e) => setFormCarNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 톤수 규격 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  차량 규격 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formTruckType}
                  onChange={(e) => setFormTruckType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {truckTypeCodes.length > 0 ? (
                    truckTypeCodes.map((tc) => (
                      <option key={tc.code} value={tc.code}>
                        {tc.code_name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="T_15">15톤</option>
                      <option value="T_25">25톤</option>
                      <option value="T_27">27톤</option>
                    </>
                  )}
                </select>
              </div>

              {/* 정기검사 유효기간 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  정기검사 유효기간
                </label>
                <input
                  type="date"
                  value={formInspectionDate}
                  onChange={(e) => setFormInspectionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 기사 배정 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                  담당 기사
                </label>
                <select
                  value={formDriverId}
                  onChange={(e) => setFormDriverId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">미배정</option>
                  {drivers.map((d) => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.name} ({d.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* 서류 파일 업로드 섹션 */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  차량 서류 첨부
                </span>

                {/* 1. 건설기계등록증 */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      건설기계등록증 <span className="text-rose-500">*</span>
                    </label>
                    {existingMachineryUrl && !machineryFile && (
                      <div className="flex items-center gap-2">
                        <a
                          href={existingMachineryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          미리보기 <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const oldKey = existingMachineryUrl.split("/").pop()?.split("?")[0];
                            if (oldKey) deletePhysicalFile(oldKey);
                            setExistingMachineryUrl(null);
                          }}
                          className="text-[10px] text-rose-500 hover:underline font-bold"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {existingMachineryUrl && !machineryFile ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        등록된 파일 있음
                      </span>
                      <label className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-sm">
                        파일 변경
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setMachineryFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setMachineryFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {machineryFile && (
                        <button
                          type="button"
                          onClick={() => setMachineryFile(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          선택 취소
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. 차주 사업자등록증 */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      사업자등록증 <span className="text-rose-500">*</span>
                    </label>
                    {existingBizUrl && !bizLicenseFile && (
                      <div className="flex items-center gap-2">
                        <a
                          href={existingBizUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          미리보기 <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const oldKey = existingBizUrl.split("/").pop()?.split("?")[0];
                            if (oldKey) deletePhysicalFile(oldKey);
                            setExistingBizUrl(null);
                          }}
                          className="text-[10px] text-rose-500 hover:underline font-bold"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>

                  {existingBizUrl && !bizLicenseFile ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        등록된 파일 있음
                      </span>
                      <label className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-sm">
                        파일 변경
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setBizLicenseFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setBizLicenseFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {bizLicenseFile && (
                        <button
                          type="button"
                          onClick={() => setBizLicenseFile(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          선택 취소
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. 화물 종합보험증권 */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      보험증권 <span className="text-rose-500">*</span>
                    </label>
                    {existingInsuranceUrl && !insuranceFile && (
                      <div className="flex items-center gap-2">
                        <a
                          href={existingInsuranceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          미리보기 <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const oldKey = existingInsuranceUrl.split("/").pop()?.split("?")[0];
                            if (oldKey) deletePhysicalFile(oldKey);
                            setExistingInsuranceUrl(null);
                          }}
                          className="text-[10px] text-rose-500 hover:underline font-bold"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>

                  {existingInsuranceUrl && !insuranceFile ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        등록된 파일 있음
                      </span>
                      <label className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-sm">
                        파일 변경
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {insuranceFile && (
                        <button
                          type="button"
                          onClick={() => setInsuranceFile(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          선택 취소
                        </button>
                      )}
                    </div>
                  )}
                </div>
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
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "저장 중..." : editingCarId ? "수정 완료" : "등록 완료"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
