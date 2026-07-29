"use client";

import React from "react";
import DropoffRegisterManagement from "./DropoffRegisterManagement";
import DropoffRequestManagement from "./DropoffRequestManagement";
import DropoffOverviewDashboard from "./DropoffOverviewDashboard";

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
  dispatchRequestList?: any[];
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

export function DropoffManagerDashboard(props: DropoffManagerDashboardProps) {
  const { activePath } = props;
  const [documentFiles, setDocumentFiles] = React.useState<Record<string, string>>({});
  const [uploadingDocCode, setUploadingDocCode] = React.useState<string | null>(null);

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
        const docMap: Record<string, string> = {};
        if (data.uploaded_documents) {
          const docsRes = await fetch("http://localhost:8000/api/auth/required-documents?role=drop_off", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (docsRes.ok) {
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

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "documents");

      const uploadRes = await fetch("http://127.0.0.1:8000/api/files/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) {
        alert("파일 업로드 서버 전송 실패");
        return;
      }
      const uploadData = await uploadRes.json();

      const submitRes = await fetch("http://127.0.0.1:8000/api/auth/upload-document", {
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

  if (activePath === "/dropoff/register") {
    return (
      <DropoffRegisterManagement
        registeredDropoffList={props.registeredDropoffList}
        dropoffFormName={props.dropoffFormName}
        setDropoffFormName={props.setDropoffFormName}
        dropoffFormAddress={props.dropoffFormAddress}
        setDropoffFormAddress={props.setDropoffFormAddress}
        dropoffFormManagers={props.dropoffFormManagers}
        setDropoffFormManagers={props.setDropoffFormManagers}
        dropoffFormCapacity={props.dropoffFormCapacity}
        setDropoffFormCapacity={props.setDropoffFormCapacity}
        dropoffFormSoilDealType={props.dropoffFormSoilDealType}
        setDropoffFormSoilDealType={props.setDropoffFormSoilDealType}
        dbCommonCodes={props.dbCommonCodes}
        handleCreateDropoff={props.handleCreateDropoff}
        handleDeleteDropoff={props.handleDeleteDropoff}
        handleUpdateDropoff={props.handleUpdateDropoff}
        documentFiles={documentFiles}
        uploadingDocCode={uploadingDocCode}
        handleFileUpload={handleFileUpload}
      />
    );
  }

  if (activePath === "/dropoff/dispatch-request") {
    return (
      <DropoffRequestManagement
        user={props.user}
        registeredDropoffList={props.registeredDropoffList}
        dropoffRequestList={props.dropoffRequestList || []}
        dispatchRequestList={props.dispatchRequestList || []}
        registeredSiteList={props.registeredSiteList || []}
        dbCommonCodes={props.dbCommonCodes}
        handleCreateDropoffRequest={props.handleCreateDropoffRequest}
        handleDeleteDropoffRequest={props.handleDeleteDropoffRequest}
        handleUpdateDropoffRequestStatus={props.handleUpdateDropoffRequestStatus}
        handleUpdateDropoffRequest={props.handleUpdateDropoffRequest}
        handleApproveJobPost={props.handleApproveJobPost}
        handleRejectJobPost={props.handleRejectJobPost}
        fetchOpenDropOffRequests={props.fetchOpenDropOffRequests}
        handleResetMatchJobPost={props.handleResetMatchJobPost}
      />
    );
  }

  return (
    <DropoffOverviewDashboard
      registeredDropoffList={props.registeredDropoffList}
      dropoffRequestList={props.dropoffRequestList}
    />
  );
}