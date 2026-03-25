import type { ParseResult, BankId } from './types.js';
import { detectFormatFromFile, detectBankFromText } from './detect.js';
import { parseCSV } from './csv.js';
import { parseXLSX } from './xlsx.js';
import { parsePDF } from './pdf.js';

export type { FileFormat, BankId, DetectionResult, RawTransaction, ParseResult, ParseError, BankAdapter } from './types.js';
export { detectFormatFromFile, detectBank, detectBankFromText, detectCSVDelimiter } from './detect.js';
export { parseCSV } from './csv.js';
export { parseXLSX } from './xlsx.js';
export { parsePDF } from './pdf.js';

export async function parseFile(file: File, bank?: BankId): Promise<ParseResult> {
  const format = detectFormatFromFile(file);

  switch (format) {
    case 'csv': {
      let content: string;
      try {
        content = await file.text();
        // Check for encoding issues (replacement chars)
        const replacementCount = (content.match(/\uFFFD/g) ?? []).length;
        if (replacementCount > 5) {
          // Try EUC-KR decoding
          const buffer = await file.arrayBuffer();
          const decoder = new TextDecoder('euc-kr');
          content = decoder.decode(buffer);
        }
      } catch {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('euc-kr');
        content = decoder.decode(buffer);
      }
      // Auto-detect bank from content if not specified
      const detectedBank = bank ?? detectBankFromText(content);
      return parseCSV(content, detectedBank ?? undefined);
    }
    case 'xlsx': {
      const buffer = await file.arrayBuffer();
      return parseXLSX(buffer, bank);
    }
    case 'pdf': {
      const buffer = await file.arrayBuffer();
      return parsePDF(buffer, bank);
    }
    default: {
      const _exhaustive: never = format;
      throw new Error(`지원하지 않는 형식이에요: ${_exhaustive}`);
    }
  }
}
