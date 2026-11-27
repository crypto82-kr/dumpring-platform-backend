import XLSX from "xlsx-js-style";

export interface ExcelExportOptions {
  /** 엑셀 시트 최상단 문서 대제목 (미지정 시 시트명 기반으로 자동 생성) */
  title?: string;
  /** 상단 조회/검색 기준 표시 배열 (예: ["조회 기간: 2026-11-01 ~ 2026-11-25", "현장: 전체"]) */
  criteria?: string[];
  /** 하단 수치 자동 합계 행 표시 여부 (기본값: true) */
  showTotalRow?: boolean;
}

/**
 * 테이블 헤더와 2차원 행 데이터를 받아
 * [문서 제목 + 검색 기준 + 출력 일시 + 표 테두리 선 + 천단위 콤마 + 자동 합계 행]이 적용된
 * 정식 업무용 엑셀(.xlsx) 보고서 파일로 즉시 다운로드합니다.
 */
export function downloadExcelFile(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options?: ExcelExportOptions
) {
  const colCount = Math.max(headers.length, 1);

  // 1. 데이터 정제 (기존 CSV용 따옴표 제거 및 숫자 변환 보조)
  const cleanRows: (string | number)[][] = rows.map((row) =>
    headers.map((_, colIdx) => {
      const cell = row[colIdx];
      if (cell === null || cell === undefined) return "";
      if (typeof cell === "string") {
        return cell.replace(/^"(.*)"$/, "$1").replace(/""/g, '"');
      }
      return cell;
    })
  );

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const reportTitle = options?.title || `[덤프링 통합 관리 시스템] ${sheetName}`;
  const criteriaText =
    options?.criteria && options.criteria.length > 0
      ? `검색/조회 기준:  ${options.criteria.join("   |   ")}`
      : "검색/조회 기준:  전체 조회 (필터 미적용)";
  const metaText = `출력 일시:  ${nowStr}   |   총 조회 건수:  ${cleanRows.length.toLocaleString()}건`;

  // 공통 테두리 스타일 정의
  const thinBorder = {
    top: { style: "thin", color: { rgb: "CBD5E1" } },
    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } },
  };

  const headerBorder = {
    top: { style: "medium", color: { rgb: "0F172A" } },
    bottom: { style: "medium", color: { rgb: "0F172A" } },
    left: { style: "thin", color: { rgb: "475569" } },
    right: { style: "thin", color: { rgb: "475569" } },
  };

  const totalBorder = {
    top: { style: "medium", color: { rgb: "334155" } },
    bottom: { style: "double", color: { rgb: "0F172A" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } },
  };

  // 2. 상단 타이틀 & 검색조건 메타 행 구성 (Row 0 ~ Row 3)
  const makeMergedRow = (text: string, style: any) => {
    const arr: any[] = [];
    for (let c = 0; c < colCount; c++) {
      arr.push({
        v: c === 0 ? text : "",
        t: "s",
        s: style,
      });
    }
    return arr;
  };

  const titleRow = makeMergedRow(reportTitle, {
    font: { name: "맑은 고딕", sz: 15, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "0F172A" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "medium", color: { rgb: "0F172A" } },
      bottom: { style: "thin", color: { rgb: "334155" } },
      left: { style: "medium", color: { rgb: "0F172A" } },
      right: { style: "medium", color: { rgb: "0F172A" } },
    },
  });

  const criteriaRow = makeMergedRow(criteriaText, {
    font: { name: "맑은 고딕", sz: 10, bold: true, color: { rgb: "1E293B" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    alignment: { horizontal: "left", vertical: "center" },
    border: thinBorder,
  });

  const metaRow = makeMergedRow(metaText, {
    font: { name: "맑은 고딕", sz: 9.5, bold: false, color: { rgb: "475569" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    alignment: { horizontal: "left", vertical: "center" },
    border: thinBorder,
  });

  const spacerRow = Array.from({ length: colCount }, () => ({ v: "", t: "s" }));

  // 3. 표 컬럼 헤더 행 (Row 4)
  const tableHeaderRow = headers.map((h) => ({
    v: h,
    t: "s",
    s: {
      font: { name: "맑은 고딕", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: headerBorder,
    },
  }));

  // 컬럼별 정렬 및 합계 대상 판별 헬퍼
  const isLeftAlignCol = (header: string) =>
    /현장|하차지|사토장|시공사|운송사|주소|내용|비고|메모/.test(header);
  const isIdOrNoCol = (header: string) => /번호|ID|No/i.test(header);
  const isSummableCol = (header: string) =>
    !isIdOrNoCol(header) &&
    !(/단가/.test(header)) &&
    /금액|공급가|부가세|합계|정산|운임|대수|횟수|수량|건수|중량|거리/.test(header);

  // 4. 데이터 본문 행 (Row 5 ~ )
  const styledDataRows = cleanRows.map((row, rowIdx) => {
    const rowBg = rowIdx % 2 === 1 ? "F8FAFC" : "FFFFFF";
    return headers.map((header, colIdx) => {
      const val = row[colIdx];
      const isNum = typeof val === "number" && !isNaN(val);
      const isId = isIdOrNoCol(header);

      if (isNum) {
        const isFloat = !Number.isInteger(val);
        return {
          v: val,
          t: "n",
          z: isId ? "0" : isFloat ? "#,##0.0" : "#,##0",
          s: {
            font: { name: "맑은 고딕", sz: 10, bold: false, color: { rgb: "0F172A" } },
            fill: { fgColor: { rgb: rowBg } },
            alignment: {
              horizontal: isId ? "center" : "right",
              vertical: "center",
            },
            border: thinBorder,
          },
        };
      }

      return {
        v: String(val ?? ""),
        t: "s",
        s: {
          font: { name: "맑은 고딕", sz: 10, bold: false, color: { rgb: "1E293B" } },
          fill: { fgColor: { rgb: rowBg } },
          alignment: {
            horizontal: isLeftAlignCol(header) ? "left" : "center",
            vertical: "center",
          },
          border: thinBorder,
        },
      };
    });
  });

  const allSheetRows: any[][] = [
    titleRow,
    criteriaRow,
    metaRow,
    spacerRow,
    tableHeaderRow,
    ...styledDataRows,
  ];

  // 5. 하단 합계(Total) 행 자동 계산 및 추가
  const hasSummableColumn =
    options?.showTotalRow !== false &&
    cleanRows.length > 0 &&
    headers.some((h, idx) => isSummableCol(h) && cleanRows.some((r) => typeof r[idx] === "number"));

  if (hasSummableColumn) {
    const totalRow = headers.map((header, colIdx) => {
      if (colIdx === 0) {
        return {
          v: "합 계",
          t: "s",
          s: {
            font: { name: "맑은 고딕", sz: 10.5, bold: true, color: { rgb: "0F172A" } },
            fill: { fgColor: { rgb: "E2E8F0" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: totalBorder,
          },
        };
      }

      if (isSummableCol(header)) {
        let sum = 0;
        let hasNumeric = false;
        let hasFloat = false;
        for (const r of cleanRows) {
          const cellVal = r[colIdx];
          if (typeof cellVal === "number" && !isNaN(cellVal)) {
            sum += cellVal;
            hasNumeric = true;
            if (!Number.isInteger(cellVal)) hasFloat = true;
          }
        }
        if (hasNumeric) {
          return {
            v: hasFloat ? Number(sum.toFixed(1)) : sum,
            t: "n",
            z: hasFloat ? "#,##0.0" : "#,##0",
            s: {
              font: { name: "맑은 고딕", sz: 10.5, bold: true, color: { rgb: "1E3A8A" } },
              fill: { fgColor: { rgb: "E2E8F0" } },
              alignment: { horizontal: "right", vertical: "center" },
              border: totalBorder,
            },
          };
        }
      }

      return {
        v: "",
        t: "s",
        s: {
          font: { name: "맑은 고딕", sz: 10, bold: true, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: "E2E8F0" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: totalBorder,
        },
      };
    });

    allSheetRows.push(totalRow);
  }

  // 6. 시트 생성 및 병합(!merges), 행 높이(!rows), 열 너비(!cols) 설정
  const worksheet = XLSX.utils.aoa_to_sheet(allSheetRows);

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];

  // 행 높이 설정 (제목 36pt, 검색기준 22pt, 출력일시 20pt, 여백 10pt, 표헤더 28pt, 본문 22pt, 합계 26pt)
  const rowHeights: { hpt: number }[] = [
    { hpt: 36 },
    { hpt: 22 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 28 },
    ...cleanRows.map(() => ({ hpt: 22 })),
  ];
  if (hasSummableColumn) {
    rowHeights.push({ hpt: 26 });
  }
  worksheet["!rows"] = rowHeights;

  // 각 열의 최대 글자 길이(한글 2바이트, 숫자 콤마 포함)를 계산해 컬럼 너비 설정
  const getVisualLength = (val: any): number => {
    const str =
      typeof val === "number" ? val.toLocaleString() : String(val ?? "");
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      len += str.charCodeAt(i) > 127 ? 2.1 : 1.1;
    }
    return Math.ceil(len);
  };

  worksheet["!cols"] = headers.map((header, colIdx) => {
    let maxLen = getVisualLength(header);
    for (const row of cleanRows) {
      const cellLen = getVisualLength(row[colIdx]);
      if (cellLen > maxLen) maxLen = cellLen;
    }
    return { wch: Math.min(Math.max(maxLen + 5, 12), 48) };
  });

  const workbook = XLSX.utils.book_new();
  const safeSheetName = (sheetName || "데이터").slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const normalizedFilename = filename
    .replace(/\.(csv|xls|xlsx)$/i, "")
    .concat(".xlsx");

  XLSX.writeFile(workbook, normalizedFilename);
}
