import { MerchantMatcher, buildConstraints, greedyOptimize } from '@cherrypicker/core';
import type { CategorizedTransaction, CardRuleSet as CoreCardRuleSet } from '@cherrypicker/core';
import type { CategoryNode as RulesCategoryNode } from '@cherrypicker/rules';
import { parseFile } from './parser/index.js';
import type { RawTransaction } from './parser/types.js';
import type { BankId } from './parser/types.js';
import { getAllCardRules, loadCategories } from './cards.js';
import type { AnalysisResult, AnalyzeOptions } from './store.svelte.js';

export interface CategorizedTx {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  subcategory: string | undefined;
  confidence: number;
  rawCategory?: string;
  memo?: string;
}

export async function parseAndCategorize(
  file: File,
  options?: AnalyzeOptions,
): Promise<{ transactions: CategorizedTx[]; bank: string | null; format: string; statementPeriod?: { start: string; end: string }; parseErrors: { line?: number; message: string; raw?: string }[] }> {
  const parseResult = await parseFile(file, options?.bank as BankId | undefined);
  if (parseResult.transactions.length === 0) {
    throw new Error('거래 내역을 찾을 수 없어요');
  }

  const categoryNodes = await loadCategories();
  // MerchantMatcher expects CategoryNode[] from @cherrypicker/rules which has
  // { id, labelKo, labelEn, keywords, subcategories? }. The static JSON uses
  // the same shape; the local type has an extra `label` field but is otherwise
  // structurally compatible, so we cast through the rules type.
  const matcher = new MerchantMatcher(categoryNodes as unknown as RulesCategoryNode[]);

  const transactions: CategorizedTx[] = parseResult.transactions.map(
    (tx: RawTransaction, idx: number) => {
      const match = matcher.match(tx.merchant, tx.category);
      return {
        id: `tx-${idx}`,
        date: tx.date,
        merchant: tx.merchant,
        amount: tx.amount,
        category: match.category,
        subcategory: match.subcategory,
        confidence: match.confidence,
        rawCategory: tx.category,
        memo: tx.memo,
      };
    },
  );

  return {
    transactions,
    bank: parseResult.bank ?? null,
    format: parseResult.format ?? 'csv',
    statementPeriod: parseResult.statementPeriod,
    parseErrors: parseResult.errors ?? [],
  };
}

export async function optimizeFromTransactions(
  transactions: CategorizedTx[],
  options?: AnalyzeOptions,
): Promise<AnalysisResult['optimization']> {
  // Convert CategorizedTx to CategorizedTransaction for the optimizer
  const categorized: CategorizedTransaction[] = transactions.map(tx => ({
    id: tx.id,
    date: tx.date,
    merchant: tx.merchant,
    amount: tx.amount,
    currency: 'KRW',
    installments: 0,
    isOnline: false,
    rawCategory: tx.rawCategory,
    memo: tx.memo,
    category: tx.category,
    subcategory: tx.subcategory,
    confidence: tx.confidence,
  }));

  let cardRules = await getAllCardRules();
  if (options?.cardIds && options.cardIds.length > 0) {
    cardRules = cardRules.filter(r => options.cardIds!.includes(r.card.id));
  }

  // 전월실적 기본값: 사용자가 입력하지 않으면 이번 달 총 지출과 같다고 가정
  const totalSpendingThisMonth = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const previousMonthSpending = options?.previousMonthSpending ?? totalSpendingThisMonth;
  const cardPreviousSpending = new Map<string, number>(
    cardRules.map(r => [r.card.id, previousMonthSpending]),
  );
  const constraints = buildConstraints(categorized, cardPreviousSpending);

  // cardRules from static JSON match the CardRuleSet shape;
  // the local type differs only in minor string-literal widening on `source`.
  const optimizationResult = greedyOptimize(constraints, cardRules as unknown as CoreCardRuleSet[]);

  return optimizationResult;
}

export async function analyzeMultipleFiles(
  files: File[],
  options?: AnalyzeOptions,
): Promise<AnalysisResult> {
  // 1. Parse and categorize ALL files
  const allParsed = await Promise.all(
    files.map(f => parseAndCategorize(f, options))
  );

  // 2. Merge all transactions
  const allTransactions: CategorizedTx[] = [];
  const allErrors: { line?: number; message: string; raw?: string }[] = [];
  let bank: string | null = null;
  let format = 'csv';

  for (const parsed of allParsed) {
    allTransactions.push(...parsed.transactions);
    allErrors.push(...parsed.parseErrors);
    if (parsed.bank) bank = parsed.bank;
    format = parsed.format;
  }

  if (allTransactions.length === 0) {
    throw new Error('거래 내역을 찾을 수 없어요');
  }

  // 3. Sort transactions by date
  allTransactions.sort((a, b) => a.date.localeCompare(b.date));

  // 4. Detect months and calculate per-month spending
  const monthlySpending = new Map<string, number>();
  for (const tx of allTransactions) {
    const month = tx.date.slice(0, 7); // "2026-01"
    monthlySpending.set(month, (monthlySpending.get(month) ?? 0) + Math.abs(tx.amount));
  }

  // 5. Find the latest month's transactions for optimization
  const months = [...monthlySpending.keys()].sort();
  const latestMonth = months[months.length - 1]!;
  const previousMonth = months.length >= 2 ? months[months.length - 2]! : null;

  // Use previous month's spending as performance tier input
  // If only one month uploaded, use that month's total as estimate
  const previousMonthSpending = previousMonth
    ? monthlySpending.get(previousMonth)!
    : options?.previousMonthSpending ?? monthlySpending.get(latestMonth)!;

  // 6. Filter to latest month for optimization
  const latestTransactions = allTransactions.filter(tx => tx.date.startsWith(latestMonth));

  // 7. Optimize using the latest month's transactions with previous month's spending
  const optimization = await optimizeFromTransactions(latestTransactions, {
    ...options,
    previousMonthSpending,
  });

  // 8. Calculate statement period from all transactions
  const dates = allTransactions.map(tx => tx.date).filter(Boolean).sort();
  const statementPeriod = dates.length > 0
    ? { start: dates[0]!, end: dates[dates.length - 1]! }
    : undefined;

  return {
    success: true,
    bank,
    format,
    statementPeriod,
    transactionCount: allTransactions.length,
    parseErrors: allErrors,
    transactions: allTransactions,
    optimization,
    monthlyBreakdown: [...monthlySpending.entries()].map(([month, spending]) => ({
      month,
      spending,
      transactionCount: allTransactions.filter(tx => tx.date.startsWith(month)).length,
    })),
  };
}

// Keep the original combined function for backward compatibility
export async function analyzeFile(
  file: File,
  options?: AnalyzeOptions,
): Promise<AnalysisResult> {
  return analyzeMultipleFiles([file], options);
}
