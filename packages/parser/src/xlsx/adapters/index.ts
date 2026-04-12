import type { BankId } from '../../types.js';

export interface ColumnConfig {
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
    merchant: '이용처',
    amount: '이용금액',
  },
  toss: {
    date: '거래일',
    merchant: '이용처',
    amount: '이용금액',
  },
  kbank: {
    date: '거래일',
    merchant: '이용처',
    amount: '거래금액',
  },
  bnk: {
    date: '거래일',
    merchant: '가맹점',
    amount: '이용금액',
    installments: '할부',
  },
  dgb: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
  },
  suhyup: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
  },
  jb: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
  },
  kwangju: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
  },
  jeju: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
  },
  sc: {
    date: '거래일',
    merchant: '이용처',
    amount: '이용금액',
    installments: '할부',
  },
  mg: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
  },
  cu: {
    date: '거래일',
    merchant: '가맹점',
    amount: '거래금액',
    installments: '할부',
  },
  kdb: {
    date: '거래일',
    merchant: '이용처',
    amount: '거래금액',
    installments: '할부',
  },
  epost: {
    date: '거래일',
    merchant: '이용처',
    amount: '거래금액',
    installments: '할부',
  },
};

export function getBankColumnConfig(bankId: BankId): ColumnConfig {
  return BANK_COLUMN_CONFIGS[bankId];
}

export { BANK_COLUMN_CONFIGS };
