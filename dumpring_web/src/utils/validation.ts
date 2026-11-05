/**
 * 사업자등록번호 및 폼 입력 유효성 검증 유틸리티
 */

/**
 * 사업자등록번호 형식화 (123-45-67890)
 */
export function formatBusinessNumber(value: string): string {
  const clean = value.replace(/[^0-9]/g, "").slice(0, 10);
  if (clean.length <= 3) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5, 10)}`;
}

/**
 * 국세청 표준 사업자등록번호 유효성 검증 (모듈로 10 체크섬 알고리즘)
 * @param bizNumber 10자리 숫자 또는 하이픈 포함 12자리 문자열
 * @returns { isValid: boolean; message: string }
 */
export function validateBusinessNumber(bizNumber: string): { isValid: boolean; message: string } {
  const clean = bizNumber.replace(/[^0-9]/g, "");

  if (!clean) {
    return { isValid: false, message: "사업자등록번호를 입력해주세요." };
  }

  if (clean.length !== 10) {
    return { isValid: false, message: `사업자등록번호는 10자리 숫자여야 합니다. (현재 ${clean.length}자리)` };
  }

  // 국세청 표준 가중치 [1, 3, 7, 1, 3, 7, 1, 3, 5]
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }

  // 9번째 자리에 가중치(5)를 곱한 값의 10의 자리 몫을 합산
  sum += Math.floor((parseInt(clean[8], 10) * 5) / 10);

  const checkDigit = (10 - (sum % 10)) % 10;
  const lastDigit = parseInt(clean[9], 10);

  if (checkDigit !== lastDigit) {
    return { isValid: false, message: "유효하지 않은 사업자등록번호(체크섬 불일치)입니다." };
  }

  return { isValid: true, message: "정상 사업자등록번호입니다." };
}
