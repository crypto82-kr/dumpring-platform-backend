/**
 * ISO 날짜 문자열(예: '2026-11-04T15:00:00Z' 등)을 사용자의 브라우저(KST) 기준 YYYY-MM-DD 로 정확히 변환합니다.
 * 단순 substring(0, 10) 시 발생하는 UTC-KST 9시간 시차(전날로 표시되는 문제)를 방지합니다.
 */
export const formatToKSTDateString = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr.substring(0, 10);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr.substring(0, 10);
  }
};
