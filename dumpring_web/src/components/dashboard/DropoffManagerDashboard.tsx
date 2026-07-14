import React from "react";
import { AlertCircle } from "lucide-react";
import { MockMap } from "./MockMap";

interface DropoffManagerDashboardProps {
  activePath: string;
  setActivePath: (path: string) => void;
  dropoffFormName: string;
  setDropoffFormName: (val: string) => void;
  dropoffFormAddress: string;
  setDropoffFormAddress: (val: string) => void;
  dropoffFormManagers: string;
  setDropoffFormManagers: (val: string) => void;
  dropoffFormSoilTypes: string[];
  setDropoffFormSoilTypes: (val: string[]) => void;
  dropoffFormCapacity: string;
  setDropoffFormCapacity: (val: string) => void;
  dropoffFormSoilDealType: "buy" | "sell";
  setDropoffFormSoilDealType: (val: "buy" | "sell") => void;
  registeredDropoffList: any[];
  setRegisteredDropoffList: React.Dispatch<React.SetStateAction<any[]>>;
  inboundTrucks: any[];
  handleVerifyInbound: (id: number) => void;
  dropoffVerifiedCount: number;
  dbCommonCodes?: any[];
  handleCreateDropoff?: (payload: any) => Promise<boolean>;
  handleDeleteDropoff?: (id: number) => Promise<boolean>;
  handleUpdateDropoff?: (id: number, payload: any) => Promise<boolean>;
}

export function DropoffManagerDashboard({
  activePath,
  setActivePath,
  dropoffFormName,
  setDropoffFormName,
  dropoffFormAddress,
  setDropoffFormAddress,
  dropoffFormManagers,
  setDropoffFormManagers,
  dropoffFormSoilTypes,
  setDropoffFormSoilTypes,
  dropoffFormCapacity,
  setDropoffFormCapacity,
  dropoffFormSoilDealType,
  setDropoffFormSoilDealType,
  registeredDropoffList,
  setRegisteredDropoffList,
  inboundTrucks,
  handleVerifyInbound,
  dropoffVerifiedCount,
  dbCommonCodes,
  handleCreateDropoff,
  handleDeleteDropoff,
  handleUpdateDropoff,
}: DropoffManagerDashboardProps) {
  
  const [editingDropId, setEditingDropId] = React.useState<number | null>(null);
  const [selectedDropId, setSelectedDropId] = React.useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [documentFiles, setDocumentFiles] = React.useState<Record<string, string>>({});
  const [uploadingDocCode, setUploadingDocCode] = React.useState<string | null>(null);

  // Load user's uploaded documents on mount
  React.useEffect(() => {
    fetchUploadedDocs();
  }, []);

  const fetchUploadedDocs = async () => {
    try {
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      if (!token) return;
      const res = await fetch("http://localhost:8000/api/auth/member-status?role=drop_off", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Create lookup map of code -> file_name
        const docMap: Record<string, string> = {};
        if (data.uploaded_documents) {
          // fetch individual documents to get file name
          const docsRes = await fetch("http://localhost:8000/api/auth/required-documents?role=drop_off", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (docsRes.ok) {
            const reqDocs = await docsRes.json();
            data.uploaded_documents.forEach((code: string) => {
              docMap[code] = "제출완료 (등록됨)";
            });
          }
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
      const token = sessionStorage.getItem("dumpring_token") || localStorage.getItem("accessToken");
      if (!token) return;

      // 1. Upload to physical storage
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "documents");

      const uploadRes = await fetch("http://localhost:8000/api/files/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) {
        alert("파일 업로드 서버 전송 실패");
        return;
      }
      const uploadData = await uploadRes.json();

      // 2. Submit document name/path metadata to DB
      const submitRes = await fetch("http://localhost:8000/api/auth/upload-document", {
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

  const getPayerTypeLabel = (code: string) => {
    const codeItem = dbCommonCodes?.find(c => c.code === code && c.group_code === "PAYER_TYPE");
    if (codeItem) return codeItem.code_name;
    if (code === "SITE_PAYS") return "돈 받음 (판매)";
    if (code === "DROP_OFF_PAYS") return "돈 줌 (구매)";
    if (code === "FREE") return "무상";
    return code || "지정 대기";
  };

  const renderDropoffRegister = () => {
    // If selectedDropId is not set but we have list items, default select the first one
    const activeSelectedId = selectedDropId || registeredDropoffList[0]?.id || null;
    const selectedDrop = registeredDropoffList.find(d => d.id === activeSelectedId) || null;

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dropoffFormName || !dropoffFormAddress || !dropoffFormCapacity) {
        alert("하차지명, 주소, 총 용량은 필수 입력 항목입니다.");
        return;
      }

      console.log("====== handleRegister ENTER ======", {
        editingDropId,
        dropoffFormName,
        dropoffFormAddress,
        dropoffFormCapacity,
        dropoffFormSoilDealType
      });

      // Safely convert capacity to a pure number by stripping non-numeric characters
      const rawCapacityStr = String(dropoffFormCapacity || "0");
      const parsedCapacity = Number(rawCapacityStr.replace(/[^0-9]/g, "")) || 0;

      if (editingDropId !== null) {
        const payload = {
          name: dropoffFormName,
          address: dropoffFormAddress,
          capacity: parsedCapacity,
          soilDealType: dropoffFormSoilDealType,
          managers: dropoffFormManagers
        };
        console.log("Calling handleUpdateDropoff with:", editingDropId, payload);
        const success = handleUpdateDropoff ? await handleUpdateDropoff(editingDropId, payload) : false;
        if (success) {
          // Explicitly update selectedDropId to trigger detail pane re-render with updated values
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
          managers: dropoffFormManagers
        };
        const success = handleCreateDropoff ? await handleCreateDropoff(payload) : false;
        if (success) {
          // Reset selectedDropId to force selecting the new item
          setSelectedDropId(null);
          alert("신규 하차지가 성공적으로 등록되었습니다.");
        } else {
          alert("하차지 등록 실패");
        }
      }

      // Reset forms
      setDropoffFormName("");
      setDropoffFormAddress("");
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
            <h2 className="text-xl font-extrabold text-slate-900">하차지 등록 및 거래구분 관리</h2>
            <p className="text-xs text-slate-505 mt-1">
              거래 형태(판매/구매) 및 토사 한도 정보를 포함한 하차지를 등록 및 제어합니다.
            </p>
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
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
          >
            + 신규 B2B 하차지 등록
          </button>
        </div>

        {/* Master-Detail Split Screen Layout (Platform Admin style) */}
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
                        : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-350"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                        {drop.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-505 mt-2 font-semibold truncate">{drop.address}</p>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                      <span>용량: {drop.capacity.toLocaleString()} ㎥</span>
                      <span className="text-slate-505 font-medium">관리자: {drop.managers?.[0] || "지정대기"}</span>
                    </div>
                  </div>
                );
              })}
              {registeredDropoffList.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-250">
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
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">하차지/사토장 명칭</span>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedDrop.name}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">계약 토사 총 용량</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedDrop.capacity.toLocaleString()} ㎥</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">소재지 주소</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedDrop.address}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">하차 담당 연락처</span>
                        <div className="text-xs font-semibold text-slate-600 mt-0.5">{selectedDrop.managers?.join(", ") || "지정 대기"}</div>
                      </div>
                    </div>

                    {/* Submitted Documents Status in details */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">제출 완료 필수 서류 목록</span>
                      <div className="space-y-2">
                        {dbCommonCodes && dbCommonCodes.filter(c => c.group_code === "REQUIRED_DOC_DROPOFF").map(doc => {
                          const hasFile = documentFiles[doc.code];
                          return (
                            <div key={doc.code} className="flex justify-between items-center text-[11px] font-bold">
                              <span className="text-slate-650">{doc.code_name}</span>
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
                        title="하차지"
                        address={selectedDrop.address}
                        pinned={true}
                        onPinClick={() => {}}
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
                <p className="text-xs text-slate-505 max-w-sm leading-relaxed">
                  좌측 하차지 목록에서 상세 조회를 희망하는 사토장을 선택해 주세요. 신규 등록은 우측 상단의 등록 버튼을 눌러 모달 창을 통해 진행하실 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ==================== CREATE/EDIT MODAL POPUP ==================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleUp">
              {/* Modal Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {editingDropId !== null ? `[${dropoffFormName}] 하차지 정보 수정` : "신규 B2B 하차지/사토장 등록"}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">사토장의 고유 지주 정보와 매립 용량을 정확히 작성해 주세요.</p>
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
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-650 flex items-center justify-center font-bold text-xs active:scale-90 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleRegister} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-bold block">하차지/사토장 명칭 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={dropoffFormName}
                      onChange={(e) => setDropoffFormName(e.target.value)}
                      placeholder="예: 경기 김포 고촌 신축 사토장"
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-705 font-bold block">계약 토사 총 용량 (㎥) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={dropoffFormCapacity}
                      onChange={(e) => setDropoffFormCapacity(e.target.value)}
                      placeholder="예: 45,000"
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-707 font-bold block">하차 담당자 (자동 입력) <span className="text-slate-400 font-normal">(수정 불가)</span></label>
                    <input
                      type="text"
                      value={registeredDropoffList[0]?.managers?.[0] || "하차지 관리자 정보"}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 border border-slate-205 rounded-lg px-3 py-2 text-slate-500 font-bold cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-705 font-bold block">주소 (허가 필증 지번 주소 기준) <span className="text-rose-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dropoffFormAddress}
                      onChange={(e) => setDropoffFormAddress(e.target.value)}
                      placeholder="주소 조회 버튼을 눌러 주소를 선택해 주세요."
                      className="flex-1 bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // Dynamically load Daum Postcode Script
                        if (typeof window !== "undefined") {
                          const scriptId = "daum-postcode-script";
                          const existingScript = document.getElementById(scriptId);
                          
                          const openPostcode = () => {
                            // @ts-ignore
                            new window.daum.Postcode({
                              oncomplete: function(data: any) {
                                // fullAddress or roadAddress
                                let fullAddress = data.roadAddress || data.address;
                                if (data.buildingName) {
                                  fullAddress += ` (${data.buildingName})`;
                                }
                                setDropoffFormAddress(fullAddress);
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-750 font-bold text-white rounded-lg transition-colors active:scale-95"
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
                            <span className="text-[9px] text-slate-400 truncate max-w-[180px]">
                              {fileUrl ? `등록됨 (${fileUrl.split("/").pop()})` : "미등록 (파일을 선택하세요)"}
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
                </div>                <div className="flex gap-2 pt-4 border-t border-slate-200">
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
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-650 font-bold text-xs active:scale-95 transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                  >
                    하차지 등록 및 신청 완료
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (activePath === "/dropoff/register") {
    return renderDropoffRegister();
  }

  if (activePath !== "/dropoff") {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center py-16 space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">준비 중인 화면</h3>
        <p className="text-sm text-slate-500">'{activePath}' 메뉴는 현재 하차지 연동 점검 중입니다.</p>
        <button type="button" onClick={() => setActivePath("/dropoff")} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs">
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  // Calculate dynamic values based on interactive verifications and selected dropoff capacity
  const activeSelectedIdForStats = selectedDropId || registeredDropoffList[0]?.id || null;
  const currentDropForStats = registeredDropoffList.find(d => d.id === activeSelectedIdForStats) || null;
  const maxCapacity = currentDropForStats?.capacity || 80000;

  const verifiedVolume = dropoffVerifiedCount * 20; // 20㎥ per truck
  const totalVolume = Math.min(maxCapacity, Math.floor(maxCapacity * 0.76) + verifiedVolume);
  const capacityPercentage = Math.min(100, Math.round((totalVolume / maxCapacity) * 100));

  const soilUnitPrice = 8000; // ㎥당 8,000원
  const soilRevenue = totalVolume * soilUnitPrice;

  return (
    <div className="space-y-6">
      {/* Upper Grid: Real-time Capacity Statistics & Soil Settlement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capacity Statistics */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h2 className="font-extrabold text-base text-slate-800">하차지 실시간 상태 & 정보 통계</h2>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-cyan-850">
                실시간 반입 연계
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-650 font-semibold">{currentDropForStats?.name || "선택된 사토장"} (현재 잔여 용량)</span>
                  <span className="font-black text-blue-600">{capacityPercentage}% ({totalVolume.toLocaleString()} / {maxCapacity.toLocaleString()} ㎥)</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 overflow-hidden border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-505"
                    style={{ width: `${capacityPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center mt-2">
                <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">오전 반입량</p>
                  <p className="text-base font-black text-slate-800 mt-1">2,850 ㎥</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">오늘 추가 반입</p>
                  <p className="text-base font-black text-emerald-400 mt-1">+{verifiedVolume.toLocaleString()} ㎥</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">일일 최대 제한량</p>
                  <p className="text-base font-black text-slate-800 mt-1">8,000 ㎥</p>
                </div>
              </div>
            </div>
          </div>

          {/* Soil price statistics */}
          <div className="mt-4 p-4 rounded-xl bg-slate-100/40 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">금월 누적 토사 반입량 연동 흙값 정산액</span>
              <p className="text-2xl font-black text-emerald-450 mt-1">₩{soilRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <div>단가: 8,000원 / ㎥</div>
              <div className="text-slate-605 font-semibold mt-0.5">정산대장 정상 마감</div>
            </div>
          </div>
        </div>

        {/* Dynamic Push Notification Receiver Box */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h2 className="font-extrabold text-sm text-slate-800">실시간 운영 알림 수신함</h2>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-405 bg-amber-950/50 border border-amber-900/30 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Live Receive
              </span>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {[
                { id: 1, type: "배차알림", content: "삼부토건 인천 검단 3공구에서 사토 덤프 8대 출발 예정", time: "17:15" },
                { id: 2, type: "용량경고", content: "영종도 C구역 용량 75% 돌파 - 순차 진입 간격 제어 필요", time: "16:48" },
                { id: 3, type: "정산알림", content: "5월 흙값 정산 세금계산서 청구서가 플랫폼 본부에 승인 완료", time: "09:30" }
              ].map((alertItem) => (
                <div key={alertItem.id} className="p-3 rounded-lg bg-slate-100/50 border border-slate-200/60 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-cyan-900/30 font-mono">
                      {alertItem.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{alertItem.time}</span>
                  </div>
                  <p className="text-slate-707 font-medium leading-relaxed">{alertItem.content}</p>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850">
            알림 수신 환경설정
          </button>
        </div>
      </div>

      {/* Lower Grid: Real-time Inbound verification & New Drop-off Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Inbound Verification list */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-base text-slate-800">실시간 반입 확인 및 현장 통제</h3>
              <p className="text-xs text-slate-505 mt-0.5">게이트 하우스 진입 대기 트럭 반입 완료 승인 처리</p>
            </div>

            <div className="space-y-3">
              {inboundTrucks.map((truck) => (
                <div key={truck.id} className="p-4 rounded-xl bg-slate-100/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-sm">{truck.plate}</span>
                      <span className="text-[10px] text-slate-600 font-semibold">기사: {truck.driver} | 적재: {truck.weight}</span>
                    </div>
                    <div className="text-[11px] text-slate-505 mt-1">
                      출발시각: {truck.time} | 적재형태: <strong className="text-slate-650 font-bold">{truck.type}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${truck.status === "반입 완료"
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/30"
                        : "bg-amber-950/60 text-amber-400 border-amber-800/30 animate-pulse"
                      }`}>
                      {truck.status}
                    </span>
                    {truck.status === "진입 대기" && (
                      <button
                        type="button"
                        onClick={() => handleVerifyInbound(truck.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-white text-xs shadow-lg shadow-cyan-500/10 transition-all active:scale-95"
                      >
                        반입 승인 완료
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold text-slate-850">
            전체 반입 완료 대장 조회
          </button>
        </div>

        {/* Pre-registered Drop-off Form (Leftover, styled nicely as a summary/shortcut card) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">사토지/하차지 신속 연동</h3>
              <span className="text-[9px] text-slate-500 font-bold">B2B 연계</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              현재 영종도 매립구역 C-3 구역이 활성화되어 있습니다. 신규 하차지를 정식 등록하여 거래 방식을 매핑하고 플랫폼에 연동하려면 아래 버튼을 눌러 이동해 주세요.
            </p>
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium">
              * 하차지 등록 메뉴에서는 토사 판매/구매 여부 지정 및 한도 정산 관리가 지원됩니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActivePath("/dropoff/register")}
            className="w-full mt-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
          >
            하차지 등록 및 관리 화면으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
