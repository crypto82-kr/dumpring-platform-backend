import React from "react";
import { createPortal } from "react-dom";
import { MockMap } from "@/components/views/common/MockMap";
import { getApiBaseUrl } from "@/utils/api";

interface DropoffRegisterManagementProps {
  user?: any;
  registeredDropoffList: any[];
  setRegisteredDropoffList?: React.Dispatch<React.SetStateAction<any[]>>;
  dbCommonCodes?: any[];
  handleCreateDropoff?: (payload: any) => Promise<boolean>;
  handleDeleteDropoff?: (id: number) => Promise<boolean>;
  handleUpdateDropoff?: (id: number, payload: any) => Promise<boolean>;
}

export function DropoffRegisterManagement({
  user,
  registeredDropoffList,
  setRegisteredDropoffList,
  dbCommonCodes,
  handleCreateDropoff,
  handleDeleteDropoff,
  handleUpdateDropoff,
}: DropoffRegisterManagementProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedDropId, setSelectedDropId] = React.useState<number | null>(null);
  const [editingDropId, setEditingDropId] = React.useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Form states
  const [dropoffFormName, setDropoffFormName] = React.useState("");
  const [dropoffFormAddress, setDropoffFormAddress] = React.useState("");
  const [dropoffFormLat, setDropoffFormLat] = React.useState<number | undefined>(undefined);
  const [dropoffFormLng, setDropoffFormLng] = React.useState<number | undefined>(undefined);
  const [dropoffFormManagers, setDropoffFormManagers] = React.useState("");
  const [dropoffFormCapacity, setDropoffFormCapacity] = React.useState("");
  const [dropoffFormSoilDealType, setDropoffFormSoilDealType] = React.useState<"buy" | "sell">("sell");

  // Document states
  const [documentFiles, setDocumentFiles] = React.useState<Record<string, string>>({});
  const [uploadingDocCode, setUploadingDocCode] = React.useState<string | null>(null);

  // Load user's uploaded documents on mount
  React.useEffect(() => {
    fetchUploadedDocs();
  }, []);

  const fetchUploadedDocs = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      if (!token) return;
      const res = await fetch(`${baseUrl}/api/auth/member-status?role=drop_off`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const docMap: Record<string, string> = {};
        if (data.uploaded_documents) {
          data.uploaded_documents.forEach((code: string) => {
            docMap[code] = "제출완료 (등록됨)";
          });
        }
        setDocumentFiles(docMap);
      }
    } catch (e) {
      console.error("Failed to fetch uploaded documents:", e);
    }
  };

  const handleFileUpload = async (docCode: string, file: File) => {
    setUploadingDocCode(docCode);
    try {
      const baseUrl = getApiBaseUrl();
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      if (!token) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "documents");

      const uploadRes = await fetch(`${baseUrl}/api/files/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) {
        alert("파일 업로드 서버 전송 실패");
        return;
      }
      const uploadData = await uploadRes.json();

      const submitRes = await fetch(`${baseUrl}/api/auth/upload-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          document_code: docCode,
          file_name: uploadData.url
        })
      });

      if (submitRes.ok) {
        setDocumentFiles(prev => ({ ...prev, [docCode]: uploadData.url }));
        alert("필수 서류 파일이 정상 등록되었습니다.");
      } else {
        alert("필수 서류 DB 등록 실패");
      }
    } catch (e) {
      console.error("Upload error:", e);
      alert("서류 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingDocCode(null);
    }
  };

  const activeSelectedId = selectedDropId || registeredDropoffList[0]?.id || null;
  const selectedDrop = registeredDropoffList.find(d => d.id === activeSelectedId) || null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropoffFormName || !dropoffFormAddress || !dropoffFormCapacity) {
      alert("하차지명, 주소, 총 용량은 필수 입력 항목입니다.");
      return;
    }

    const rawCapacityStr = String(dropoffFormCapacity || "0");
    const parsedCapacity = Number(rawCapacityStr.replace(/[^0-9]/g, "")) || 0;

    if (editingDropId !== null) {
      const payload = {
        name: dropoffFormName,
        address: dropoffFormAddress,
        capacity: parsedCapacity,
        soilDealType: dropoffFormSoilDealType,
        managers: dropoffFormManagers,
        latitude: dropoffFormLat,
        longitude: dropoffFormLng,
      };
      const success = handleUpdateDropoff ? await handleUpdateDropoff(editingDropId, payload) : false;
      if (success) {
        setSelectedDropId(editingDropId);
        alert("하차지 정보가 성공적으로 수정되었습니다.");
      } else {
        alert("하차지 정보 수정 실패");
      }
    } else {
      const payload = {
        name: dropoffFormName,
        address: dropoffFormAddress,
        capacity: parsedCapacity,
        soilDealType: dropoffFormSoilDealType,
        managers: dropoffFormManagers,
        latitude: dropoffFormLat,
        longitude: dropoffFormLng,
      };
      const success = handleCreateDropoff ? await handleCreateDropoff(payload) : false;
      if (success) {
        setSelectedDropId(null);
        alert("신규 하차지가 성공적으로 등록되었습니다.");
      } else {
        alert("하차지 등록 실패");
      }
    }

    // Reset forms
    setDropoffFormName("");
    setDropoffFormAddress("");
    setDropoffFormLat(undefined);
    setDropoffFormLng(undefined);
    setDropoffFormManagers("");
    setDropoffFormCapacity("");
    setDropoffFormSoilDealType("sell");
    setEditingDropId(null);
    setIsModalOpen(false);
  };

  const handleDeleteDrop = async (id: number) => {
    if (confirm("정말로 이 하차지를 삭제하시겠습니까?")) {
      const success = handleDeleteDropoff ? await handleDeleteDropoff(id) : false;
      if (success) {
        if (editingDropId === id) {
          setEditingDropId(null);
        }
        alert("삭제되었습니다.");
      } else {
        alert("삭제 처리에 실패했습니다.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Title Section */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">하차지 등록</h2>
          <p className="text-xs text-slate-500 mt-1">
            거래 형태(판매/구매) 및 토사 한도 정보를 포함한 하차지를 등록 및 제어합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDropoffFormName("");
            setDropoffFormAddress("");
            setDropoffFormLat(undefined);
            setDropoffFormLng(undefined);
            setDropoffFormManagers(registeredDropoffList[0]?.managers?.[0] || "");
            setDropoffFormCapacity("");
            setDropoffFormSoilDealType("sell");
            setEditingDropId(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
        >
          + 신규 B2B 하차지 등록
        </button>
      </div>

      {/* Master-Detail Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dropoffs List (Master) */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 max-h-[640px] overflow-y-auto">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">하차지 목록 ({registeredDropoffList.length})</h3>
          <div className="space-y-2">
            {registeredDropoffList.map((drop) => {
              const isSelected = (selectedDropId || registeredDropoffList[0]?.id) === drop.id;
              return (
                <div
                  key={drop.id}
                  onClick={() => {
                    setSelectedDropId(drop.id);
                  }}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-300 shadow-md"
                      : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                      {drop.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-semibold truncate">{drop.address}</p>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                    <span>용량: {drop.capacity.toLocaleString()} ㎥</span>
                    <span className="text-slate-500 font-medium">관리자: {drop.managers?.[0] || "지정대기"}</span>
                  </div>
                </div>
              );
            })}
            {registeredDropoffList.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
                등록된 B2B 하차지가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dropoff Details (Detail Card) */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDrop ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    [{selectedDrop.name}] 하차지 상세 내역
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">계약 토사 총 용량 및 거래방식 상세</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDropId(selectedDrop.id);
                      setDropoffFormName(selectedDrop.name);
                      setDropoffFormAddress(selectedDrop.address);
                      setDropoffFormLat(selectedDrop.latitude || undefined);
                      setDropoffFormLng(selectedDrop.longitude || undefined);
                      setDropoffFormManagers(selectedDrop.managers?.join(", ") || "");
                      setDropoffFormCapacity(selectedDrop.capacity.toString());
                      setDropoffFormSoilDealType(selectedDrop.soilDealType);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-black rounded-lg border border-blue-200 active:scale-95 transition-all"
                  >
                    정보 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDrop(selectedDrop.id)}
                    className="px-3 py-1.5 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-lg border border-rose-200 active:scale-95 transition-all"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Left Column: Specs Details */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">하차지/사토장 명칭</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedDrop.name}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">계약 토사 총 용량</span>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedDrop.capacity.toLocaleString()} ㎥</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">소재지 주소</span>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedDrop.address}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">토지반입 인허가번호</span>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedDrop.managers?.join(", ") || "등록 대기"}</div>
                    </div>
                  </div>

                  {/* Submitted Documents Status in details */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">제출 완료 필수 서류 목록</span>
                    <div className="space-y-2">
                      {dbCommonCodes && dbCommonCodes.filter(c => c.group_code === "REQUIRED_DOC_DROPOFF").map(doc => {
                        const hasFile = documentFiles[doc.code];
                        return (
                          <div key={doc.code} className="flex justify-between items-center text-[11px] font-bold">
                            <span className="text-slate-600">{doc.code_name}</span>
                            {hasFile ? (
                              <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black">제출 완료</span>
                            ) : (
                              <span className="text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[9px] font-black">미제출</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Map */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">하차지 관제 지도</span>
                    <MockMap
                      title={`하차지 - ${selectedDrop.name}`}
                      address={selectedDrop.address}
                      lat={selectedDrop.latitude}
                      lng={selectedDrop.longitude}
                      pinned={true}
                      onPinClick={() => { }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                📄
              </div>
              <h3 className="text-sm font-bold text-slate-800">선택된 하차지 정보가 없습니다</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                좌측 하차지 목록에서 상세 조회를 희망하는 사토장을 선택해 주세요. 신규 등록은 우측 상단의 등록 버튼을 눌러 모달 창을 통해 진행하실 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE/EDIT MODAL POPUP */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-auto animate-scaleUp">
            {/* Modal Header (Fixed Top) */}
            <div className="px-6 py-4 sm:py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                  {editingDropId !== null ? `[${dropoffFormName}] 하차지 정보 수정` : "신규 B2B 하차지/사토장 등록"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">사토장의 고유 지주 정보와 매립 용량을 정확히 작성해 주세요.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDropoffFormName("");
                  setDropoffFormAddress("");
                  setDropoffFormManagers("");
                  setDropoffFormCapacity("");
                  setDropoffFormSoilDealType("sell");
                  setEditingDropId(null);
                  setIsModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs active:scale-90 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegister} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-6 text-xs overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {/* Left Column: Form Inputs & Documents */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">하차지/사토장 명칭 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={dropoffFormName}
                      onChange={(e) => setDropoffFormName(e.target.value)}
                      placeholder="예: 경기 김포 고촌 신축 사토장"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">계약 토사 총 용량 (㎥) <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={dropoffFormCapacity}
                        onChange={(e) => setDropoffFormCapacity(e.target.value)}
                        placeholder="예: 45,000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-700 font-bold block">토지반입 인허가번호 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={dropoffFormManagers}
                        onChange={(e) => setDropoffFormManagers(e.target.value)}
                        placeholder="예: 제 2026-김포개발-012호"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">하차지 주소 <span className="text-rose-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dropoffFormAddress}
                        onChange={(e) => setDropoffFormAddress(e.target.value)}
                        placeholder="주소 조회 버튼을 눌러 주소를 선택해 주세요."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        required
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            const scriptId = "daum-postcode-script";
                            const existingScript = document.getElementById(scriptId);

                            const openPostcode = () => {
                              // @ts-ignore
                              new window.daum.Postcode({
                                oncomplete: function (data: any) {
                                  let fullAddress = data.roadAddress || data.address;
                                  if (data.buildingName) {
                                    fullAddress += ` (${data.buildingName})`;
                                  }
                                  setDropoffFormAddress(fullAddress);

                                  // 카카오 Geocoder로 즉시 위경도 좌표 조회
                                  if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
                                    const geocoder = new window.kakao.maps.services.Geocoder();
                                    geocoder.addressSearch(fullAddress, (result: any, status: any) => {
                                      if (status === window.kakao.maps.services.Status.OK && result[0]) {
                                        setDropoffFormLat(parseFloat(result[0].y));
                                        setDropoffFormLng(parseFloat(result[0].x));
                                      }
                                    });
                                  }
                                }
                              }).open();
                            };

                            if (!existingScript) {
                              const script = document.createElement("script");
                              script.id = scriptId;
                              script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
                              script.async = true;
                              script.onload = () => {
                                openPostcode();
                              };
                              document.head.appendChild(script);
                            } else {
                              openPostcode();
                            }
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-lg transition-colors active:scale-95 shrink-0"
                      >
                        주소 조회
                      </button>
                    </div>
                  </div>

                  {/* Required Documents Upload Section */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="text-slate-700 font-bold block">하차지 인허가 필수 제출 서류 등록</label>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      * 사토장을 안전하게 운영하기 위해 공통코드로 지정된 필수 서류들을 업로드해 주십시오. (언제든지 수정/재업로드 가능)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {dbCommonCodes && dbCommonCodes.filter(c => c.group_code === "REQUIRED_DOC_DROPOFF").map(doc => {
                        const fileUrl = documentFiles[doc.code];
                        return (
                          <div key={doc.code} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-extrabold text-slate-700 text-[11px]">{doc.code_name}</span>
                              <span className="text-[9px] text-slate-400 truncate max-w-[150px]">
                                {fileUrl ? `등록됨 (${fileUrl.split("/").pop()})` : "미등록 (파일 선택)"}
                              </span>
                            </div>

                            <label className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[9px] font-black rounded-lg cursor-pointer transition-all active:scale-95 shrink-0 flex items-center gap-1">
                              {uploadingDocCode === doc.code ? (
                                <span>업로드 중...</span>
                              ) : (
                                <span>{fileUrl ? "서류 변경" : "파일 선택"}</span>
                              )}
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                                className="hidden"
                                disabled={uploadingDocCode !== null}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(doc.code, file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Map Preview */}
                <div className="flex flex-col h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-bold block">사토장 위치 지도</span>
                    {dropoffFormAddress && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        ✓ 주소 연동 완료
                      </span>
                    )}
                  </div>
                  <MockMap
                    title="하차지 위치 (핀 이동 가능)"
                    address={dropoffFormAddress}
                    pinned={true}
                    interactive={true}
                    lat={dropoffFormLat}
                    lng={dropoffFormLng}
                    onLocationSelect={(newLat, newLng, newAddr) => {
                      setDropoffFormLat(newLat);
                      setDropoffFormLng(newLng);
                      if (newAddr && !dropoffFormAddress) {
                        setDropoffFormAddress(newAddr);
                      }
                    }}
                    onPinClick={() => {}}
                    className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-slate-200 shadow-sm min-h-[340px]"
                    mapHeightClass="flex-1 min-h-[320px]"
                  />
                  <p className="text-[10px] text-slate-500 text-center font-medium bg-slate-50 py-1 rounded-lg border border-slate-100">
                    💡 지도를 직접 클릭하거나 붉은색 핀을 드래그하여 정확한 덤프트럭 진입 위치로 이동할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Buttons (Fixed Bottom Bar) */}
            <div className="flex gap-2.5 px-6 py-3.5 bg-slate-50 border-t border-slate-200 justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDropoffFormName("");
                  setDropoffFormAddress("");
                  setDropoffFormManagers("");
                  setDropoffFormCapacity("");
                  setDropoffFormSoilDealType("sell");
                  setEditingDropId(null);
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 active:scale-95 transition-all text-xs"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 text-xs"
              >
                {editingDropId !== null ? "정보 수정 완료" : "하차지 등록 및 신청 완료"}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
      )}
    </div>
  );
}

export default DropoffRegisterManagement;
