import React from "react";
import { AlertCircle, Search } from "lucide-react";
import { MockMap } from "./MockMap";
import { MatchStatusCard } from "./MatchStatusCard";

interface DropoffManagerDashboardProps {
  user?: any;
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
  dispatchRequestList?: any[]; // 배차 요청 리스트 추가
  handleUpdateDispatch?: (id: number, payload: any) => Promise<boolean>;
  dropoffRequestList?: any[];
  handleCreateDropoffRequest?: (payload: any) => Promise<boolean>;
  handleDeleteDropoffRequest?: (id: number) => Promise<boolean>;
  handleUpdateDropoffRequestStatus?: (id: number, status: string) => Promise<boolean>;
  handleUpdateDropoffRequest?: (id: number, payload: any) => Promise<boolean>;
  handleApproveJobPost?: (id: number) => Promise<boolean>;
  handleRejectJobPost?: (id: number, reason?: string) => Promise<boolean>;
  handleMatchJobPost?: (jobId: number, dropOffId: number) => Promise<boolean>;
  fetchOpenDropOffRequests?: () => Promise<void>;
  registeredSiteList?: any[];
  handleResetMatchJobPost?: (id: number) => Promise<boolean>;
}

export function DropoffManagerDashboard({
  user,
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
  dispatchRequestList = [], // 배차 요청 리스트 구조 분해 및 초기화
  handleUpdateDispatch,
  dropoffRequestList = [],
  handleCreateDropoffRequest,
  handleDeleteDropoffRequest,
  handleUpdateDropoffRequestStatus,
  handleUpdateDropoffRequest,
  handleApproveJobPost,
  handleRejectJobPost,
  handleMatchJobPost,
  fetchOpenDropOffRequests,
  registeredSiteList = [],
  handleResetMatchJobPost,
}: DropoffManagerDashboardProps) {

  const [editingDropId, setEditingDropId] = React.useState<number | null>(null);
  const [editingRequest, setEditingRequest] = React.useState<any | null>(null);
  const [selectedDropId, setSelectedDropId] = React.useState<number | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = React.useState("");
  const [rejectingJobId, setRejectingJobId] = React.useState<number | null>(null);
  const [rejectingSiteName, setRejectingSiteName] = React.useState("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = React.useState(false);
  const [reqDropoffId, setReqDropoffId] = React.useState("");
  const [reqMaterialType, setReqMaterialType] = React.useState("GOOD_SOIL");
  const [reqCapacityType, setReqCapacityType] = React.useState("T_25");
  const [reqUnitPrice, setReqUnitPrice] = React.useState("");
  const [reqWorkDate, setReqWorkDate] = React.useState("");
  const [reqPayerType, setReqPayerType] = React.useState("SITE_PAYS");
  const [reqSoilDealType, setReqSoilDealType] = React.useState<"buy" | "sell">("sell");
  const [reqMatchMode, setReqMatchMode] = React.useState<"none" | "direct" | "search">("none");
  const [reqSiteName, setReqSiteName] = React.useState("");
  const [reqSiteAddress, setReqSiteAddress] = React.useState("");
  const [reqSelectedSiteId, setReqSelectedSiteId] = React.useState("");
  const [selectedReqId, setSelectedReqId] = React.useState<number | null>(null);
  const [reqPaymentMethod, setReqPaymentMethod] = React.useState("MONTHLY");
  const [reqHasWashingFacility, setReqHasWashingFacility] = React.useState(false);
  const [reqNightWorkAllowed, setReqNightWorkAllowed] = React.useState(false);
  const [reqRainWorkAllowed, setReqRainWorkAllowed] = React.useState(false);
  const [reqTargetQuantity, setReqTargetQuantity] = React.useState("100");
  const [announceSearchQuery, setAnnounceSearchQuery] = React.useState("");

  const [dispatchSearchQuery, setDispatchSearchQuery] = React.useState("");
  const [selectedDispatchId, setSelectedDispatchId] = React.useState<number | null>(null);
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
              // 대표 허가증 번호를 신규 등록 시 기본값으로 설정하여 편의성 증대
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
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group active:scale-98 ${isSelected
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
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">토지반입 인허가번호</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedDrop.managers?.join(", ") || "등록 대기"}</div>
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
                    <label className="text-slate-707 font-bold block">토지반입 인허가번호 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={dropoffFormManagers}
                      onChange={(e) => setDropoffFormManagers(e.target.value)}
                      placeholder="예: 제 2026-김포개발-012호"
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-705 font-bold block">하차지 주소 <span className="text-rose-500">*</span></label>
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
                              oncomplete: function (data: any) {
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
      {/* 🛑 하차지 지주용 매칭 반려 사유 입력 중앙 레이어 팝업 모달 */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚫</span>
                <div>
                  <h3 className="font-black text-base text-slate-900">현장 매칭 요청 반려 사유 입력</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    [{rejectingSiteName}] 현장의 매칭 요청을 반려하는 명확한 사유를 입력해 주십시오.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectingJobId(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                반려 사유 작성 <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="예: 수용 가능 단가 불일치 / 요청 토질 사양 상이 / 일시적 매립 용량 초과 등"
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none shadow-inner"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!rejectionReasonInput.trim()) {
                    alert("반려 사유를 작성해 주십시오.");
                    return;
                  }
                  if (rejectingJobId !== null && handleRejectJobPost) {
                    const success = await handleRejectJobPost(rejectingJobId, rejectionReasonInput.trim());
                    if (success) {
                      alert("매칭 요청이 사유와 함께 성공적으로 반려되었습니다.");
                      setIsRejectModalOpen(false);
                      setRejectingJobId(null);
                    } else {
                      alert("반려 처리에 실패했습니다. 다시 시도해 주십시오.");
                    }
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95"
              >
                반려 확정
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectingJobId(null);
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}



      </div>
    );
  };

  if (activePath === "/dropoff/register") {
    return renderDropoffRegister();
  }

  if (activePath === "/dropoff/dispatch-request") {
    const isDetailDisabled = editingRequest?.status === "OPEN";
    // 1. 본인의 하차지 수용 공고 목록 필터링 및 검색어 적용
    const myDropoffIds = registeredDropoffList.map(d => d.id);
    const rawAnnouncements = dropoffRequestList.filter(req => myDropoffIds.includes(req.dropOffId));
    const myAnnouncements = rawAnnouncements.filter(announce => {
      if (!announceSearchQuery.trim()) return true;
      const q = announceSearchQuery.toLowerCase();
      const nameMatch = announce.name?.toLowerCase().includes(q);
      const addressMatch = announce.address?.toLowerCase().includes(q);
      const soilMatch = (
        announce.soilType === "GOOD_SOIL" ? "양질토" :
        announce.soilType === "MUD_SOIL" ? "뻘흙" :
        announce.soilType === "ROCK" ? "암버럭" :
        announce.soilType === "MIXED" ? "혼합" : announce.soilType || ""
      ).toLowerCase().includes(q);
      return nameMatch || addressMatch || soilMatch;
    });

    const activeSelectedReqId = selectedReqId || (myAnnouncements.length > 0 ? myAnnouncements[0].id : null);
    const selectedAnnounce = myAnnouncements.find(a => a.id === activeSelectedReqId) || null;

    // 조건에 부합하는 현장 배차 요청 추천 (동일 토사 종류 & 매칭 대기 상태인 상차지 공고)
    const matchedDispatches = selectedAnnounce
      ? dispatchRequestList.filter(d => d.soilType === selectedAnnounce.soilType && d.rawStatus === "WAITING_MATCH")
      : [];

    const handleCreateRequestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reqDropoffId) {
        alert("대상 하차지를 선택해 주십시오.");
        return;
      }
      if (!reqUnitPrice || !reqWorkDate) {
        alert("필수 입력값을 채워 주십시오.");
        return;
      }

      // 현장매칭 모드에 따른 정보 조립
      let finalSiteName = "";
      let finalSiteAddress = "";
      if (reqMatchMode === "direct") {
        finalSiteName = reqSiteName;
        finalSiteAddress = reqSiteAddress;
      } else if (reqMatchMode === "search") {
        const found = registeredSiteList.find(s => String(s.id) === reqSelectedSiteId);
        if (found) {
          finalSiteName = found.name;
          finalSiteAddress = found.address;
        }
      }

      const success = editingRequest
        ? (handleUpdateDropoffRequest
            ? await handleUpdateDropoffRequest(editingRequest.id, {
                dropOffId: reqDropoffId,
                materialType: reqMaterialType,
                capacityType: reqCapacityType,
                unitPrice: reqUnitPrice,
                startDate: reqWorkDate,
                endDate: reqWorkDate,
                payerType: reqPayerType,
                soilDealType: reqSoilDealType,
                paymentMethod: reqPaymentMethod,
                hasWashingFacility: reqHasWashingFacility,
                nightWorkAllowed: reqNightWorkAllowed,
                rainWorkAllowed: reqRainWorkAllowed,
                targetQuantity: Number(reqTargetQuantity),
                // 현장 매칭 연계 (수정 시에도 포함)
                matchMode: reqMatchMode,
                matchedSiteId: reqMatchMode === "search" ? reqSelectedSiteId : null,
              })
            : false)
        : (handleCreateDropoffRequest
            ? await handleCreateDropoffRequest({
                dropOffId: reqDropoffId,
                materialType: reqMaterialType,
                capacityType: reqCapacityType,
                unitPrice: reqUnitPrice,
                startDate: reqWorkDate, // 단일 수용일로 통일
                endDate: reqWorkDate,
                payerType: reqPayerType,
                soilDealType: reqSoilDealType,
                paymentMethod: reqPaymentMethod,
                hasWashingFacility: reqHasWashingFacility,
                nightWorkAllowed: reqNightWorkAllowed,
                rainWorkAllowed: reqRainWorkAllowed,
                targetQuantity: Number(reqTargetQuantity),
                // 현장 매칭 연계
                siteName: finalSiteName,
                siteAddress: finalSiteAddress,
                matchMode: reqMatchMode,
                matchedSiteId: reqMatchMode === "search" ? reqSelectedSiteId : null,
              })
            : false);

      if (success) {
        // 매칭을 요청했으나 수용 공고가 CLOSED(수용정지) 상태였던 경우 자동으로 수용중(OPEN)으로 변경
        if (editingRequest && editingRequest.status === "CLOSED" && reqMatchMode !== "none") {
          if (handleUpdateDropoffRequestStatus) {
            await handleUpdateDropoffRequestStatus(editingRequest.id, "OPEN");
          }
        }
        alert(editingRequest ? "수용 공고가 성공적으로 수정되었습니다!" : "수용 공고가 성공적으로 등록되었습니다!");
        setIsReqModalOpen(false);
        setEditingRequest(null);
        // Reset states
        setReqUnitPrice("");
        setReqWorkDate("");
        setReqSiteName("");
        setReqSiteAddress("");
        setReqSelectedSiteId("");
        setReqMatchMode("none");
        setReqPaymentMethod("MONTHLY");
        setReqHasWashingFacility(false);
        setReqNightWorkAllowed(false);
        setReqRainWorkAllowed(false);
        setReqTargetQuantity("100");
        if (fetchOpenDropOffRequests) {
          await fetchOpenDropOffRequests();
        }
      } else {
        alert(editingRequest ? "공고 수정에 실패했습니다." : "공고 등록에 실패했습니다.");
      }
    };

    const handleDeleteRequest = async (id: number) => {
      const hasActiveJobs = dispatchRequestList.filter(
        job => job.dropOffRequestId === id && 
        (job.rawStatus === "WAITING_APPROVAL" || job.rawStatus === "OPEN")
      );
      if (hasActiveJobs.length > 0) {
        alert("현재 진행 중이거나 승인 대기 중인 매칭 오더가 존재하여 공고를 삭제할 수 없습니다.");
        return;
      }

      if (confirm("정말로 이 수용 공고를 삭제하시겠습니까?")) {
        const success = handleDeleteDropoffRequest ? await handleDeleteDropoffRequest(id) : false;
        if (success) {
          alert("공고가 삭제되었습니다.");
          if (selectedReqId === id) {
            setSelectedReqId(null);
          }
        } else {
          alert("공고 삭제 처리에 실패했습니다.");
        }
      }
    };

    const handleToggleRequestStatus = async (id: number, currentStatus: string) => {
      const targetStatus = currentStatus === "CLOSED" ? "OPEN" : "CLOSED";
      const statusText = targetStatus === "OPEN" ? "수용 재개(OPEN)" : "수용 정지(CLOSED)";
      if (confirm(`공고 상태를 '${statusText}'로 변경하시겠습니까?\n정지 시 현장 배차 등록 화면에 노출되지 않습니다.`)) {
        const success = handleUpdateDropoffRequestStatus ? await handleUpdateDropoffRequestStatus(id, targetStatus) : false;
        if (success) {
          alert("상태가 성공적으로 변경되었습니다.");
        } else {
          alert("상태 변경 처리에 실패했습니다.");
        }
      }
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Top Title Section */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">하차지 반입 수용 공고 관리</h2>
            <p className="text-xs text-slate-505 mt-1">
              본인이 운영하는 사토장의 토사 반입 수용 공고를 등록하고 제어하며, 조건이 일치하는 공사 현장을 탐색해 매칭을 성사시킵니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (registeredDropoffList.length === 0) {
                alert("등록된 하차지가 없습니다. 하차지 등록 메뉴에서 사토장을 먼저 등록해 주십시오.");
                return;
              }
              setEditingRequest(null);
              setReqDropoffId(String(registeredDropoffList[0].id));
              setReqMaterialType("GOOD_SOIL");
              setReqCapacityType("T_25");
              setReqUnitPrice("");
              setReqWorkDate("");
              setReqPayerType("SITE_PAYS");
              setReqSoilDealType("sell");
              setReqMatchMode("none");
              setReqPaymentMethod("MONTHLY");
              setReqHasWashingFacility(false);
              setReqNightWorkAllowed(false);
              setReqRainWorkAllowed(false);
              setReqTargetQuantity("100");
              setIsReqModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10"
          >
            + 신규 수용 공고 등록
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: My Announcements List */}
          <div className="lg:col-span-1 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 max-h-[640px] overflow-y-auto">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">등록된 수용 공고 ({myAnnouncements.length})</h3>
            </div>

            {/* 🔍 수용 공고 실시간 검색창 */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={announceSearchQuery}
                onChange={(e) => setAnnounceSearchQuery(e.target.value)}
                placeholder="공고명, 사토장, 토사 검색..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div className="space-y-2">
              {myAnnouncements.map((announce) => {
                const isSelected = activeSelectedReqId === announce.id;
                return (
                  <div
                    key={announce.id}
                    onClick={() => setSelectedReqId(announce.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-205 group active:scale-98 ${isSelected
                        ? "bg-blue-50/70 border-blue-300 shadow-md"
                        : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-350"
                      }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-xs font-black leading-tight ${isSelected ? "text-blue-700" : "text-slate-800 group-hover:text-blue-600"}`}>
                        {announce.name}
                      </span>
                      <div className="flex flex-wrap gap-1 items-center justify-end">
                        {announce.status === "CLOSED" ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200">
                            수용 정지
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                            수용 중
                          </span>
                        )}
                        {(() => {
                          const linkedJobs = dispatchRequestList.filter(job => 
                            job.dropOffRequestId === announce.id || 
                            (job.matchedDropOffId !== null && Number(job.matchedDropOffId) === Number(announce.dropOffId) && job.soilType === announce.soilType)
                          );
                          if (linkedJobs.length === 0) return null;
                          if (linkedJobs.some(j => j.rawStatus === "WAITING_APPROVAL")) {
                            return (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-200">
                                승인대기
                              </span>
                            );
                          }
                          if (linkedJobs.some(j => j.rawStatus === "OPEN")) {
                            return (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-250">
                                배차완료
                              </span>
                            );
                          }
                          if (linkedJobs.some(j => j.rawStatus === "CANCELLED")) {
                            return (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200">
                                매칭반려
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold truncate">
                      토종: {(() => {
                        switch (announce.soilType) {
                          case "GOOD_SOIL": return "양질토";
                          case "MUD_SOIL": return "뻘흙";
                          case "ROCK": return "암버럭";
                          case "MIXED": return "혼합";
                          default: return announce.soilType || "양질토";
                        }
                      })()} | 규격: {announce.truckType === "T_25" ? "25톤" : "15톤"}
                    </p>
                    {(() => {
                      const linkedJobs = dispatchRequestList.filter(job => job.dropOffRequestId === announce.id);
                      if (linkedJobs.length === 0) return null;
                      // WAITING_APPROVAL이나 OPEN인 주체 하나 판별
                      const activeJob = linkedJobs.find(j => j.rawStatus === "WAITING_APPROVAL" || j.rawStatus === "OPEN");
                      if (!activeJob) return null;
                      const isMySent = Number(activeJob.authorId) === Number(user?.id);
                      return (
                        <div className="mt-2 text-[9.5px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200/40">
                          <span className="text-slate-400">매칭 : </span>
                          <span>{isMySent ? "하차지 ➔ 현장" : "현장 ➔ 하차지"}</span>
                          <span className="text-slate-400 ml-1">({activeJob.siteName})</span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200/50">
                      <span>수용 단가: <strong className="text-slate-700 font-extrabold">{announce.unitPrice.toLocaleString()}원</strong></span>
                      <span>목표: <strong className="text-slate-700 font-bold">{announce.targetQuantity}대</strong></span>
                      <span className="text-slate-550 font-mono font-bold">작업일: {announce.startDate}</span>
                    </div>

                    {/* 하차지 작업 조건 태그 */}
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-200/30">
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border transition-all ${
                        announce.hasWashingFacility 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-300 border-slate-150"
                      }`}>
                        세륜기
                      </span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border transition-all ${
                        announce.nightWorkAllowed 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-300 border-slate-150"
                      }`}>
                        야간작업
                      </span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border transition-all ${
                        announce.rainWorkAllowed 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-300 border-slate-150"
                      }`}>
                        우천작업
                      </span>
                    </div>
                  </div>
                );
              })}
              {myAnnouncements.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-250">
                  등록된 수용 공고가 없습니다. <br />상단의 신규 등록 단추를 눌러 생성해 보십시오.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Announcement Detail & Live Site Matching */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAnnounce ? (
              <div className="space-y-6">
                {/* Announcement detail card */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        [{selectedAnnounce.name}] 수용 공고 상세 사양
                      </h3>
                      <p className="text-[11px] text-slate-550 mt-0.5">공고번호: DACC-00{selectedAnnounce.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedAnnounce.status === "CLOSED" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleRequestStatus(selectedAnnounce.id, selectedAnnounce.status)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-emerald-200"
                        >
                          수용 시작 (OPEN)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleRequestStatus(selectedAnnounce.id, selectedAnnounce.status)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-amber-200"
                        >
                          수용 일시정지
                        </button>
                      )}
                      {(() => {
                        const hasActiveJobs = dispatchRequestList.some(
                          job => job.dropOffRequestId === selectedAnnounce.id && 
                          (job.rawStatus === "WAITING_APPROVAL" || job.rawStatus === "OPEN")
                        );
                        if (!hasActiveJobs) {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRequest(selectedAnnounce);
                                setReqDropoffId(String(selectedAnnounce.dropOffId));
                                setReqMaterialType(selectedAnnounce.soilType || "GOOD_SOIL");
                                setReqCapacityType(selectedAnnounce.truckType || "T_25");
                                setReqUnitPrice(String(selectedAnnounce.unitPrice));
                                setReqWorkDate(selectedAnnounce.startDate);
                                setReqPayerType(selectedAnnounce.payerType || "SITE_PAYS");
                                setReqSoilDealType(selectedAnnounce.soilDealType || "sell");
                                setReqPaymentMethod(selectedAnnounce.paymentMethod || "MONTHLY");
                                setReqHasWashingFacility(selectedAnnounce.hasWashingFacility || false);
                                setReqNightWorkAllowed(selectedAnnounce.nightWorkAllowed || false);
                                setReqRainWorkAllowed(selectedAnnounce.rainWorkAllowed || false);
                                setReqTargetQuantity(String(selectedAnnounce.targetQuantity || 100));
                                setIsReqModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-blue-200"
                            >
                              공고 수정
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(selectedAnnounce.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg active:scale-95 transition-all border border-rose-200"
                      >
                        공고 취소(삭제)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">공고 대상 사토장</span>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedAnnounce.name}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">하차지 지번 주소</span>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedAnnounce.address || "주소 미지정"}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-205 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">수용 가능 토사</span>
                          <div className="text-xs font-bold text-blue-600 mt-0.5">
                            {(() => {
                              switch (selectedAnnounce.soilType) {
                                case "GOOD_SOIL": return "양질토";
                                case "MUD_SOIL": return "뻘흙";
                                case "ROCK": return "암버럭";
                                case "MIXED": return "혼합";
                                default: return selectedAnnounce.soilType || "양질토";
                              }
                            })()}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">차량 대형 규격</span>
                          <div className="text-xs font-semibold text-slate-700 mt-0.5">{selectedAnnounce.truckType === "T_25" ? "25톤 덤프" : "15톤 덤프"}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2.5">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">비용 정산 구분</span>
                          <div className="text-xs font-semibold text-slate-700 mt-0.5">
                            {selectedAnnounce.payerType === "SITE_PAYS" ? "현장 지급" : selectedAnnounce.payerType === "DROP_OFF_PAYS" ? "하차지 지급" : "무상"}
                            {selectedAnnounce.paymentMethod && ` (${selectedAnnounce.paymentMethod === "MONTHLY" ? "월정산" : "주/일정산"})`}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">수용 단가</span>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedAnnounce.unitPrice.toLocaleString()} 원</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2.5">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">목표 수량 (대수)</span>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedAnnounce.targetQuantity} 대</div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">현재 매칭 수량</span>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedAnnounce.currentQuantity} 대</div>
                        </div>
                      </div>

                      {/* 하차지 작업 조건 태그 */}
                      <div className="flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-2.5">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border transition-all ${
                          selectedAnnounce.hasWashingFacility 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-50 text-slate-300 border-slate-150"
                        }`}>
                          세륜기
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border transition-all ${
                          selectedAnnounce.nightWorkAllowed 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-50 text-slate-300 border-slate-150"
                        }`}>
                          야간작업
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border transition-all ${
                          selectedAnnounce.rainWorkAllowed 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-50 text-slate-300 border-slate-150"
                        }`}>
                          우천작업
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🏢 연계된 현장 매칭 상세 현황 (Flow A: 현장➔하차지, Flow B: 하차지➔현장 통합 노출) */}
                {(() => {
                  const connectedRequests = dispatchRequestList.filter(
                    job => job.dropOffRequestId === selectedAnnounce.id || 
                    (job.matchedDropOffId !== null && Number(job.matchedDropOffId) === Number(selectedAnnounce.dropOffId) && job.soilType === selectedAnnounce.soilType)
                  );
                  if (connectedRequests.length > 0) {
                    return (
                      <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-xl space-y-4">
                        <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                          <div>
                            <h3 className="font-extrabold text-sm text-blue-800">🏢 연계된 현장 매칭 상세 현황</h3>
                            <p className="text-[10px] text-slate-505 mt-0.5">
                              해당 수용 공고와 연계된 현장 매칭 내역(현장 수신 요청 및 하차지 제안 건) 전체 현황입니다.
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600">총 {connectedRequests.length}건</span>
                        </div>

                        <div className="space-y-3">
                          {connectedRequests.map((sentJob) => (
                            <MatchStatusCard
                              key={sentJob.id}
                              id={sentJob.id}
                              title={sentJob.siteName}
                              direction={sentJob.matchedDropOffId !== null ? "dropoff_to_site" : "site_to_dropoff"}
                              rawStatus={sentJob.rawStatus}
                              isMyInitiated={sentJob.matchedDropOffId !== null}
                              workDate={sentJob.startDate}
                              materialType={sentJob.soilType}
                              truckCount={sentJob.truckCount}
                              unitPrice={sentJob.offeredUnitPrice}
                              distance={sentJob.distance}
                              estimatedTime={sentJob.estimatedTime}
                              memo={sentJob.memo}
                              rejectionReason={sentJob.rejectionReason}
                              onApprove={async () => {
                                if (confirm(`[${sentJob.siteName}] 현장의 매칭 요청을 승인하시겠습니까?`)) {
                                  const success = handleApproveJobPost ? await handleApproveJobPost(sentJob.id) : false;
                                  if (success) {
                                    alert("매칭 요청을 성공적으로 승인했습니다.");
                                  } else {
                                    alert("승인 처리에 실패했습니다.");
                                  }
                                }
                              }}
                              onReject={() => {
                                setRejectingJobId(sentJob.id);
                                setRejectingSiteName(sentJob.siteName);
                                setIsRejectModalOpen(true);
                              }}
                              onReset={async () => {
                                if (confirm("반려 확인 처리를 하고 이 매칭 건을 목록에서 제외(초기화)하시겠습니까?\n(공고는 다시 매칭 대기 상태로 초기화됩니다.)")) {
                                  const success = handleResetMatchJobPost ? await handleResetMatchJobPost(sentJob.id) : false;
                                  if (success) {
                                    alert("확인 처리가 완료되었습니다.");
                                  } else {
                                    alert("확인 처리에 실패했습니다.");
                                  }
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center py-24 shadow-xl space-y-3 flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  📄
                </div>
                <h4 className="text-xs font-bold text-slate-700">선택된 수용 공고가 없습니다.</h4>
                <p className="text-[10px] text-slate-400">왼쪽 공고 목록에서 상세 내역 및 현장 매칭을 검토할 공고를 선택해 주십시오.</p>
              </div>
            )}
          </div>
        </div>

        {/* Create announcement request Modal */}
        {isReqModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 max-w-xl w-full p-8 shadow-2xl space-y-6 animate-scaleUp max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-base text-slate-900">{editingRequest ? "토사 반입 수용 공고 수정" : "신규 토사 반입 수용 공고 등록"}</h3>
                  <p className="text-[10px] text-slate-450 mt-1">{editingRequest ? "선택한 수용 공고의 상세 조건 및 사양을 수정합니다." : "하차지가 수용 가능한 토사 사양 및 비용 정보를 입력하여 공고를 등록합니다."}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsReqModalOpen(false); setEditingRequest(null); }}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 flex items-center justify-center text-lg font-black transition-colors"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateRequestSubmit} className="space-y-5 text-xs">
                {isDetailDisabled && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-[11px] font-semibold leading-normal animate-fadeIn">
                    ⚠️ <strong>수용 중(OPEN)</strong> 상태인 공고는 상세 사양(토사 종류, 단가, 작업일 등)을 변경할 수 없습니다. 현장 매칭 정보만 설정 가능합니다. 상세 사양 변경을 원하시면 수용 일시정지 후 시도해 주십시오.
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold block">공고 게시 대상 사토장 <span className="text-rose-500">*</span></label>
                  <select
                    value={reqDropoffId}
                    onChange={(e) => setReqDropoffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  >
                    {registeredDropoffList.map(drop => (
                      <option key={drop.id} value={drop.id}>{drop.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-extrabold block">수용 토사 종류 <span className="text-rose-500">*</span></label>
                    <select
                      value={reqMaterialType}
                      onChange={(e) => setReqMaterialType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                      required
                      disabled={isDetailDisabled}
                    >
                      {dbCommonCodes && dbCommonCodes.filter(c => c.group_code === "MATERIAL_TYPE").length > 0 ? (
                        dbCommonCodes.filter(c => c.group_code === "MATERIAL_TYPE").map(c => (
                          <option key={c.id || c.code} value={c.code}>{c.code_name}</option>
                        ))
                      ) : (
                        <>
                          <option value="GOOD_SOIL">양질토</option>
                          <option value="MUD_SOIL">뻘흙</option>
                          <option value="ROCK">암버럭</option>
                          <option value="MIXED">혼합</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-extrabold block">대형 차량 규격 <span className="text-rose-500">*</span></label>
                    <select
                      value={reqCapacityType}
                      onChange={(e) => setReqCapacityType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                      required
                      disabled={isDetailDisabled}
                    >
                      {dbCommonCodes && dbCommonCodes.filter(c => c.group_code === "TRUCK_TYPE").length > 0 ? (
                        dbCommonCodes.filter(c => c.group_code === "TRUCK_TYPE").map(c => (
                          <option key={c.id || c.code} value={c.code}>{c.code_name}</option>
                        ))
                      ) : (
                        <>
                          <option value="T_25">25톤</option>
                          <option value="T_15">15톤</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-extrabold block">정산 구분 <span className="text-rose-500">*</span></label>
                    <select
                      value={reqPayerType}
                      onChange={(e) => setReqPayerType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                      required
                      disabled={isDetailDisabled}
                    >
                      <option value="SITE_PAYS">현장 지급 (사토 구입)</option>
                      <option value="DROP_OFF_PAYS">하차지 지급 (사토 처리비)</option>
                      <option value="FREE">무상 (FREE)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-extrabold block">정산 방식 <span className="text-rose-500">*</span></label>
                    <select
                      value={reqPaymentMethod}
                      onChange={(e) => setReqPaymentMethod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                      required
                      disabled={isDetailDisabled}
                    >
                      <option value="MONTHLY">월정산</option>
                      <option value="DAILY">주/일정산</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-extrabold block">수용 단가 (원) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      value={reqUnitPrice}
                      onChange={(e) => setReqUnitPrice(e.target.value)}
                      placeholder="단가 입력 (예: 8000)"
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                      required
                      disabled={isDetailDisabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-extrabold block">목표수량 (대수) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      value={reqTargetQuantity}
                      onChange={(e) => setReqTargetQuantity(e.target.value)}
                      placeholder="대수 입력 (예: 100)"
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                      required
                      disabled={isDetailDisabled}
                    />
                  </div>
                </div>

                {/* 하차지 작업 조건 */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-slate-700 font-extrabold block">하차지 작업 조건</label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      reqHasWashingFacility ? "bg-emerald-50/50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"
                    } ${isDetailDisabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                      <input
                        type="checkbox"
                        checked={reqHasWashingFacility}
                        onChange={(e) => !isDetailDisabled && setReqHasWashingFacility(e.target.checked)}
                        disabled={isDetailDisabled}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-bold">세륜기 구비</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      reqNightWorkAllowed ? "bg-emerald-50/50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"
                    } ${isDetailDisabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                      <input
                        type="checkbox"
                        checked={reqNightWorkAllowed}
                        onChange={(e) => !isDetailDisabled && setReqNightWorkAllowed(e.target.checked)}
                        disabled={isDetailDisabled}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-bold">야간작업 가능</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      reqRainWorkAllowed ? "bg-emerald-50/50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"
                    } ${isDetailDisabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                      <input
                        type="checkbox"
                        checked={reqRainWorkAllowed}
                        onChange={(e) => !isDetailDisabled && setReqRainWorkAllowed(e.target.checked)}
                        disabled={isDetailDisabled}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-bold">우천작업 가능</span>
                    </label>
                  </div>
                </div>

                {/* Single Date input field */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <label className="text-slate-700 font-extrabold block">수용 지정 작업일 <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={reqWorkDate}
                    onChange={(e) => setReqWorkDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3.5 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-150 disabled:cursor-not-allowed"
                    required
                    disabled={isDetailDisabled}
                  />
                </div>

                {/* Match Mode Selection (가로형 탭 스타일) */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-slate-700 font-extrabold block">현장정보 등록 <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setReqMatchMode("direct")}
                      className={`py-3 text-center text-xs font-black rounded-xl transition-all ${reqMatchMode === "direct"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      직접매칭
                    </button>
                    <button
                      type="button"
                      onClick={() => setReqMatchMode("search")}
                      className={`py-3 text-center text-xs font-black rounded-xl transition-all ${reqMatchMode === "search"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      현장 검색
                    </button>
                    <button
                      type="button"
                      onClick={() => setReqMatchMode("none")}
                      className={`py-3 text-center text-xs font-black rounded-xl transition-all ${reqMatchMode === "none"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      매칭대기
                    </button>
                  </div>
                </div>

                {/* Match Mode Description & Form Card */}
                <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/80 space-y-4">
                  {reqMatchMode === "none" && (
                    <div className="text-center py-2 space-y-1.5 animate-fadeIn">
                      <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                        현장을 지정하지 않고 공고를 올립니다.
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        현장 관리자들의 매칭 신청을 대기(WAITING_MATCH)합니다.
                      </p>
                    </div>
                  )}

                  {reqMatchMode === "search" && (() => {
                    if (!reqWorkDate) {
                      return (
                        <div className="text-center py-4 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-[11px] text-amber-800 font-bold">
                          ⚠️ 수용 지정 작업일을 먼저 선택해 주십시오.
                        </div>
                      );
                    }
                    const searchCandidates = dispatchRequestList.filter(job => 
                      job.rawStatus === "WAITING_MATCH" && 
                      job.startDate === reqWorkDate
                    );
                    const selectedJob = searchCandidates.find(j => String(j.siteId) === reqSelectedSiteId);
                    return (
                      <div className="space-y-3 animate-fadeIn">
                        <p className="text-[10px] text-slate-400 font-bold">
                          ℹ️ 선택한 수용 지정 작업일({reqWorkDate})에 매칭 가능한 현장 공고 목록입니다.
                        </p>
                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-bold block">현장 선택 <span className="text-rose-500">*</span></label>
                          {searchCandidates.length === 0 ? (
                            <div className="p-3 text-center bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-semibold">
                              해당 날짜에 등록된 매칭 대기 중인 현장 공고가 없습니다.
                            </div>
                          ) : (
                            <select
                              value={reqSelectedSiteId}
                              onChange={(e) => setReqSelectedSiteId(e.target.value)}
                              className="w-full bg-white border border-slate-205 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                              required
                            >
                              <option value="">-- 매칭할 등록 현장 선택 --</option>
                              {searchCandidates.map(job => (
                                <option key={job.id} value={job.siteId}>
                                  {job.siteName} ({job.soilType === "GOOD_SOIL" ? "양질토" : job.soilType === "MUD_SOIL" ? "뻘흙" : job.soilType === "ROCK" ? "암버럭" : job.soilType === "MIXED" ? "혼합" : job.soilType} | {job.truckCount}대)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {selectedJob && (
                          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 animate-fadeIn text-xs text-slate-705">
                            <div className="font-extrabold text-blue-900 flex items-center gap-1.5 mb-1.5 text-xs border-b border-blue-200 pb-1">
                              <span>🏢 선택 현장 상세 정보</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold">
                              <div>• 현장명: <span className="text-slate-900 font-bold">{selectedJob.siteName}</span></div>
                              <div>• 작업일: <span className="text-slate-950 font-bold">{selectedJob.startDate}</span></div>
                              <div>• 토사 종류: <span className="text-blue-700 font-bold">{
                                selectedJob.soilType === "GOOD_SOIL" ? "양질토" :
                                selectedJob.soilType === "MUD_SOIL" ? "뻘흙" :
                                selectedJob.soilType === "ROCK" ? "암버럭" :
                                selectedJob.soilType === "MIXED" ? "혼합" : selectedJob.soilType
                              }</span></div>
                              <div>• 필요 수량: <span className="text-slate-950 font-bold">{selectedJob.truckCount} 대</span></div>
                              <div>• 제시 단가: <span className="text-emerald-700 font-bold">{selectedJob.offeredUnitPrice.toLocaleString()} 원/㎥</span></div>
                              {selectedJob.distance && (
                                <div className="col-span-2">• 거리 / 시간: <span className="text-slate-950 font-bold">{selectedJob.distance}km ({selectedJob.estimatedTime}분 소요)</span></div>
                              )}
                              {selectedJob.memo && (
                                <div className="col-span-2 border-t border-blue-200/50 pt-1.5 mt-1 text-slate-500 font-medium leading-relaxed">
                                  • 현장 메모: {selectedJob.memo}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {reqMatchMode === "direct" && (
                    <div className="space-y-3 animate-fadeIn">
                      <p className="text-[10px] text-slate-400 font-bold">
                        ℹ️ 직접 거래를 위해 공사 현장 정보(현장명, 주소)를 수동으로 입력하여 직통 공고를 개설합니다.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-extrabold block">반출 현장명 <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            value={reqSiteName}
                            onChange={(e) => setReqSiteName(e.target.value)}
                            placeholder="공사 현장명 입력"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-slate-700 font-extrabold block">현장 주소 <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            value={reqSiteAddress}
                            onChange={(e) => setReqSiteAddress(e.target.value)}
                            placeholder="현장 위치 주소 입력"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>



                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsReqModalOpen(false); setEditingRequest(null); }}
                    className="flex-1 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-extrabold active:scale-98 transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/15 active:scale-98 transition-all"
                  >
                    {editingRequest ? "수용 공고 수정 완료" : "수용 공고 게시 완료"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      {/* 🛑 하차지 지주용 매칭 반려 사유 입력 중앙 레이어 팝업 모달 */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚫</span>
                <div>
                  <h3 className="font-black text-base text-slate-900">현장 매칭 요청 반려 사유 입력</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    [{rejectingSiteName}] 현장의 매칭 요청을 반려하는 명확한 사유를 입력해 주십시오.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectingJobId(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                반려 사유 작성 <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="예: 수용 가능 단가 불일치 / 요청 토질 사양 상이 / 일시적 매립 용량 초과 등"
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none shadow-inner"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!rejectionReasonInput.trim()) {
                    alert("반려 사유를 작성해 주십시오.");
                    return;
                  }
                  if (rejectingJobId !== null && handleRejectJobPost) {
                    const success = await handleRejectJobPost(rejectingJobId, rejectionReasonInput.trim());
                    if (success) {
                      alert("매칭 요청이 사유와 함께 성공적으로 반려되었습니다.");
                      setIsRejectModalOpen(false);
                      setRejectingJobId(null);
                    } else {
                      alert("반려 처리에 실패했습니다. 다시 시도해 주십시오.");
                    }
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95"
              >
                반려 확정
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectingJobId(null);
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}



      </div>
    );
  }

  if (activePath !== "/dropoff" && activePath !== "/dropoff/dispatch-request") {
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