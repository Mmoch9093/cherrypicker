import type { BankId } from './types.js';

interface BankSignature {
  bankId: BankId;
  patterns: RegExp[];
}

const BANK_SIGNATURES: BankSignature[] = [
  {
    bankId: 'hyundai',
    patterns: [/현대카드/, /HYUNDAICARD/, /hdcard/i],
  },
  {
    bankId: 'kb',
    patterns: [/KB국민카드/, /국민카드/, /kbcard/i],
  },
  {
    bankId: 'ibk',
    patterns: [/IBK기업은행/, /기업은행/],
  },
  {
    bankId: 'woori',
    patterns: [/우리카드/, /wooricard/i],
  },
  {
    bankId: 'samsung',
    patterns: [/삼성카드/, /SAMSUNG\s*CARD/i],
  },
  {
    bankId: 'shinhan',
    patterns: [/신한카드/, /SHINHAN/i],
  },
  {
    bankId: 'lotte',
    patterns: [/롯데카드/, /LOTTE\s*CARD/i],
  },
  {
    bankId: 'hana',
    patterns: [/하나카드/, /HANA\s*CARD/i],
  },
  {
    bankId: 'nh',
    patterns: [/NH농협/, /농협카드/],
  },
  {
    bankId: 'bc',
    patterns: [/BC카드/, /비씨카드/],
  },
];

export function detectFormatFromFile(file: File): 'csv' | 'xlsx' | 'pdf' {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'pdf') return 'pdf';
  return 'csv'; // default
}

export function detectBank(content: string): { bank: BankId | null; confidence: number } {
  let bestMatch: BankId | null = null;
  let bestScore = 0;
  let bestBank: BankSignature | null = null;

  for (const sig of BANK_SIGNATURES) {
    let score = 0;
    for (const pattern of sig.patterns) {
      if (pattern.test(content)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = sig.bankId;
      bestBank = sig;
    }
  }

  const bestBankPatterns = bestBank ? bestBank.patterns.length : 1;
  const confidence = bestScore > 0 ? bestScore / bestBankPatterns : 0;

  return { bank: bestMatch, confidence };
}

export function detectBankFromText(content: string): BankId | null {
  const { bank } = detectBank(content);
  return bank;
}

export function detectCSVDelimiter(content: string): string {
  const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let totalComma = 0;
  let totalTab = 0;
  let totalPipe = 0;

  for (const line of lines) {
    totalComma += (line.match(/,/g) ?? []).length;
    totalTab += (line.match(/\t/g) ?? []).length;
    totalPipe += (line.match(/\|/g) ?? []).length;
  }

  if (totalComma === 0 && totalTab === 0 && totalPipe === 0) return ',';
  if (totalTab > totalComma && totalTab >= totalPipe) return '\t';
  if (totalPipe > totalComma) return '|';
  return ',';
}
