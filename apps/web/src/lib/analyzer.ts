import { MerchantMatcher, buildConstraints, greedyOptimize } from '@cherrypicker/core';
import type { CategorizedTransaction, CardRuleSet as CoreCardRuleSet } from '@cherrypicker/core';
import type { CategoryNode as RulesCategoryNode } from '@cherrypicker/rules';
import { parseFile } from './parser/index.js';
import type { RawTransaction } from './parser/types.js';
import type { BankId } from './parser/types.js';
import { getAllCardRules, loadCategories } from './cards.js';
import type { AnalysisResult, AnalyzeOptions } from './store.svelte.js';

export async function analyzeFile(
  file: File,
  options?: AnalyzeOptions,
): Promise<AnalysisResult> {
  // 1. Parse the file
  const parseResult = await parseFile(file, options?.bank as BankId | undefined);

  if (parseResult.transactions.length === 0) {
    throw new Error('거래 내역을 찾을 수 없어요');
  }

  // 2. Load categories and build matcher
  const categoryNodes = await loadCategories();
  // MerchantMatcher expects CategoryNode[] from @cherrypicker/rules which has
  // { id, labelKo, labelEn, keywords, subcategories? }. The static JSON uses
  // the same shape; the local type has an extra `label` field but is otherwise
  // structurally compatible, so we cast through the rules type.
  const matcher = new MerchantMatcher(categoryNodes as unknown as RulesCategoryNode[]);

  // 3. Categorize transactions
  const categorized: CategorizedTransaction[] = parseResult.transactions.map(
    (tx: RawTransaction, idx: number) => {
      const match = matcher.match(tx.merchant, tx.category);
      return {
        id: `tx-${idx}`,
        date: tx.date,
        merchant: tx.merchant,
        amount: tx.amount,
        currency: 'KRW',
        installments: tx.installments,
        isOnline: tx.isOnline,
        rawCategory: tx.category,
        memo: tx.memo,
        category: match.category,
        subcategory: match.subcategory,
        confidence: match.confidence,
      };
    },
  );

  // 4. Load card rules (optionally filtered)
  let cardRules = await getAllCardRules();
  if (options?.cardIds && options.cardIds.length > 0) {
    cardRules = cardRules.filter(r => options.cardIds!.includes(r.card.id));
  }

  // 5. Build constraints
  const previousMonthSpending = options?.previousMonthSpending ?? 500000;
  const cardPreviousSpending = new Map<string, number>(
    cardRules.map(r => [r.card.id, previousMonthSpending]),
  );
  const constraints = buildConstraints(categorized, cardPreviousSpending);

  // 6. Optimize — cardRules from static JSON match the CardRuleSet shape;
  // the local type differs only in minor string-literal widening on `source`.
  const optimizationResult = greedyOptimize(constraints, cardRules as unknown as CoreCardRuleSet[]);

  return {
    success: true,
    bank: parseResult.bank ?? null,
    format: parseResult.format ?? 'csv',
    statementPeriod: parseResult.statementPeriod,
    transactionCount: categorized.length,
    parseErrors: parseResult.errors ?? [],
    optimization: optimizationResult,
  };
}
