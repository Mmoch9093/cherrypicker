import * as XLSX from 'xlsx';
import type { BankId, ParseError, ParseResult, RawTransaction } from './types.js';
import { detectBank } from './detect.js';

// ---------------------------------------------------------------------------
// Column config per bank (ported from packages/parser/src/xlsx/adapters)
// ---------------------------------------------------------------------------

interface ColumnConfig {
  date: string;
  merchant: string;
  amount: string;
  installments?: string;
  category?: string;
  memo?: string;
}

const BANK_COLUMN_CONFIGS: Record<BankId, ColumnConfig> = {
  hyundai: {
    date: '이용일',
    merchant: '이용처',
    amount: '이용금액',
    installments: '할부',
    memo: '비고',
  },
  kb: {
    date: '거래일시',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부개월',
    category: '업종',
  },
  ibk: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
    memo: '적요',
  },
  woori: {
    date: '이용일자',
    merchant: '이용가맹점',
    amount: '이용금액',
    installments: '할부기간',
    memo: '비고',
  },
  samsung: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
    category: '업종',
  },
  shinhan: {
    date: '이용일',
    merchant: '이용처',
    amount: '이용금액',
    installments: '할부개월수',
    category: '업종분류',
  },
  lotte: {
    date: '거래일',
    merchant: '이용가맹점',
    amount: '이용금액',
    installments: '할부',
    category: '업종',
  },
  hana: {
    date: '이용일자',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부개월',
    memo: '적요',
  },
  nh: {
    date: '거래일',
    merchant: '이용처',
    amount: '거래금액',
    installments: '할부',
    memo: '비고',
  },
  bc: {
    date: '이용일',
    merchant: '가맹점',
    amount: '이용금액',
    installments: '할부',
    category: '업종',
  },
  kakao: {
    date: '거래일시',
    merchant: '가맹점명',
    amount: '거래금액',
    installments: '할부',
  },
  toss: {
    date: '거래일',
    merchant: '가맹점명',
    amount: '거래금액',
    installments: '할부',
  },
  kbank: {
    date: '거래일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  bnk: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  dgb: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  suhyup: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  jb: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  kwangju: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  jeju: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  sc: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  mg: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  cu: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  kdb: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
  epost: {
    date: '이용일',
    merchant: '가맹점명',
    amount: '이용금액',
    installments: '할부',
  },
};

function getBankColumnConfig(bankId: BankId): ColumnConfig {
  return BANK_COLUMN_CONFIGS[bankId];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDateToISO(raw: unknown): string {
  if (typeof raw === 'number') {
    // Guard against numbers that are clearly NOT dates (< 1 or > 100000)
    if (raw < 1 || raw > 100000) return String(raw);
    // Excel serial date number
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) {
      const y = date.y.toString().padStart(4, '0');
      const m = date.m.toString().padStart(2, '0');
      const d = date.d.toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim();

    // YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
    const fullMatch = cleaned.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
    if (fullMatch) return `${fullMatch[1]}-${fullMatch[2]!.padStart(2, '0')}-${fullMatch[3]!.padStart(2, '0')}`;

    // YYYYMMDD
    if (/^\d{8}$/.test(cleaned)) return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;

    // YY-MM-DD or YY.MM.DD
    const shortYearMatch = cleaned.match(/^(\d{2})[.\-\/](\d{2})[.\-\/](\d{2})$/);
    if (shortYearMatch) {
      const year = parseInt(shortYearMatch[1]!, 10);
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      return `${fullYear}-${shortYearMatch[2]}-${shortYearMatch[3]}`;
    }

    // 2024년 1월 15일
    const koreanFull = cleaned.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (koreanFull) return `${koreanFull[1]}-${koreanFull[2]!.padStart(2, '0')}-${koreanFull[3]!.padStart(2, '0')}`;

    // 1월 15일
    const koreanShort = cleaned.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (koreanShort) {
      const year = new Date().getFullYear();
      return `${year}-${koreanShort[1]!.padStart(2, '0')}-${koreanShort[2]!.padStart(2, '0')}`;
    }

    return cleaned;
  }
  return String(raw ?? '');
}

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/원$/, '').replace(/,/g, '');
    const parsed = parseInt(cleaned, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseInstallments(raw: unknown): number | undefined {
  if (typeof raw === 'number') return raw > 1 ? raw : undefined;
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10);
    return !isNaN(n) && n > 1 ? n : undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Main XLSX parser (browser: accepts ArrayBuffer)
// ---------------------------------------------------------------------------

export function parseXLSX(buffer: ArrayBuffer, bank?: BankId): ParseResult {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });

  if (workbook.SheetNames.length === 0) {
    return { bank: bank ?? null, format: 'xlsx', transactions: [], errors: [{ message: '시트를 찾을 수 없습니다.' }] };
  }

  // Try all sheets, use the first one that yields transactions
  let bestResult: ParseResult | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const result = parseXLSXSheet(sheet, bank);
    if (result.transactions.length > 0) {
      return result; // Found transactions, use this sheet
    }
    if (!bestResult) bestResult = result; // Keep first sheet as fallback
  }

  return bestResult ?? { bank: bank ?? null, format: 'xlsx', transactions: [], errors: [{ message: '시트 데이터를 읽을 수 없습니다.' }] };
}

function parseXLSXSheet(sheet: XLSX.WorkSheet, bank?: BankId): ParseResult {
  // Convert to 2D array
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

  if (rows.length === 0) {
    return { bank: bank ?? null, format: 'xlsx', transactions: [], errors: [{ message: '빈 파일입니다.' }] };
  }

  // Detect bank from header rows if not provided
  let resolvedBank: BankId | null = bank ?? null;
  if (!resolvedBank) {
    const headerText = rows
      .slice(0, 10)
      .map((r) => r.join(' '))
      .join(' ');
    const { bank: detected } = detectBank(headerText);
    resolvedBank = detected;
  }

  // Find header row — first row with known column keywords
  let headerRowIdx = -1;
  let headers: string[] = [];

  const allHeaderKeywords = [
    '이용일', '이용일자', '거래일', '거래일시', '날짜', '일시', '결제일', '승인일', '매출일',
    '이용처', '가맹점', '가맹점명', '이용가맹점', '거래처', '매출처', '사용처', '결제처', '상호',
    '이용금액', '거래금액', '금액', '결제금액', '승인금액', '매출금액', '이용액',
  ];

  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const row = rows[i] ?? [];
    const rowStrings = row.map((c) => String(c ?? '').trim());
    const matchCount = rowStrings.filter((c) => allHeaderKeywords.includes(c)).length;
    if (matchCount >= 2) {
      headerRowIdx = i;
      headers = rowStrings;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return {
      bank: resolvedBank,
      format: 'xlsx',
      transactions: [],
      errors: [{ message: '헤더 행을 찾을 수 없습니다.' }],
    };
  }

  // Get column config for this bank (or auto-detect from headers)
  const config = resolvedBank ? getBankColumnConfig(resolvedBank) : null;

  const dateCol = config?.date
    ? headers.indexOf(config.date)
    : headers.findIndex((h) => /이용일|거래일|날짜|일시|이용일자|거래일시|결제일|승인일|매출일/.test(h));
  const merchantCol = config?.merchant
    ? headers.indexOf(config.merchant)
    : headers.findIndex((h) => /이용처|가맹점|이용가맹점|가맹점명|거래처|매출처|사용처|결제처|상호/.test(h));
  const amountCol = config?.amount
    ? headers.indexOf(config.amount)
    : headers.findIndex((h) => /이용금액|거래금액|금액|결제금액|승인금액|매출금액|이용액/.test(h));
  const installCol = config?.installments
    ? headers.indexOf(config.installments)
    : headers.findIndex((h) => /할부|할부개월|할부기간|할부월/.test(h));
  const categoryCol = config?.category
    ? headers.indexOf(config.category)
    : headers.findIndex((h) => /업종|분류|카테고리|업종분류|업종명/.test(h));
  const memoCol = config?.memo
    ? headers.indexOf(config.memo)
    : headers.findIndex((h) => /비고|적요|메모|내용|설명|참고/.test(h));

  const transactions: RawTransaction[] = [];
  const errors: ParseError[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (row.every((c) => !c)) continue;

    // Skip summary/total rows
    const rowText = row.map((c) => String(c ?? '')).join(' ');
    if (/합계|총계|소계|total|sum/i.test(rowText)) continue;

    const dateRaw = dateCol !== -1 ? row[dateCol] : '';
    const merchantRaw = merchantCol !== -1 ? row[merchantCol] : '';
    const amountRaw = amountCol !== -1 ? row[amountCol] : '';

    if (!dateRaw && !merchantRaw) continue;

    const amount = parseAmount(amountRaw);

    // Skip rows where amount is 0 or clearly not a transaction
    if (amount === 0) continue;

    const tx: RawTransaction = {
      date: parseDateToISO(dateRaw),
      merchant: String(merchantRaw ?? '').replace(/^"(.*)"$/, '$1').trim(),
      amount,
      ...(installCol !== -1 && row[installCol]
        ? { installments: parseInstallments(row[installCol]) }
        : {}),
      ...(categoryCol !== -1 && row[categoryCol]
        ? { category: String(row[categoryCol]).trim() }
        : {}),
      ...(memoCol !== -1 && row[memoCol]
        ? { memo: String(row[memoCol]).trim() }
        : {}),
    };

    transactions.push(tx);
  }

  return { bank: resolvedBank, format: 'xlsx', transactions, errors };
}
