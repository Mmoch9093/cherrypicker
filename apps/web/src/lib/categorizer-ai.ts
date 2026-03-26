/**
 * AI-powered transaction categorizer using browser-local embedding model.
 * Uses multilingual-e5-small via Transformers.js for semantic similarity.
 * Only used as fallback for transactions where keyword matching fails.
 */

// Category labels in Korean for embedding comparison
const CATEGORY_LABELS: Record<string, string[]> = {
  'dining': ['음식점', '식당', '밥집', '레스토랑'],
  'restaurant': ['음식점', '식당', '한식', '중식', '일식', '양식'],
  'cafe': ['카페', '커피', '커피숍', '디저트'],
  'fast_food': ['패스트푸드', '햄버거', '치킨', '피자'],
  'delivery': ['배달', '배달음식', '배달앱'],
  'grocery': ['식료품', '마트', '장보기'],
  'supermarket': ['대형마트', '이마트', '홈플러스', '롯데마트', '코스트코'],
  'traditional_market': ['전통시장', '재래시장', '시장'],
  'convenience_store': ['편의점', 'CU', 'GS25', '세븐일레븐'],
  'public_transit': ['대중교통', '버스', '지하철', '전철'],
  'taxi': ['택시', '카카오택시', '타다'],
  'fuel': ['주유소', '주유', 'SK에너지', 'GS칼텍스', 'S-OIL', '현대오일뱅크'],
  'parking': ['주차', '주차장', '주차비'],
  'toll': ['통행료', '하이패스', '고속도로'],
  'online_shopping': ['온라인쇼핑', '인터넷쇼핑', '쿠팡', '네이버쇼핑', '11번가', 'G마켓'],
  'offline_shopping': ['오프라인쇼핑', '매장', '상점'],
  'department_store': ['백화점', '롯데백화점', '현대백화점', '신세계'],
  'fashion': ['패션', '의류', '옷', '신발', '가방'],
  'telecom': ['통신', '통신비', 'SKT', 'KT', 'LGU+', '알뜰폰'],
  'insurance': ['보험', '보험료', '생명보험', '자동차보험'],
  'medical': ['의료', '병원', '의원', '치과', '한의원'],
  'hospital': ['병원', '종합병원', '대학병원'],
  'pharmacy': ['약국', '약', '의약품'],
  'education': ['교육', '학원', '학비', '수업료'],
  'academy': ['학원', '어학원', '입시학원', '태권도', '피아노'],
  'books': ['도서', '서점', '책', '교보문고', '알라딘'],
  'entertainment': ['엔터테인먼트', '여가', '놀이', '오락'],
  'movie': ['영화', '영화관', 'CGV', '메가박스', '롯데시네마'],
  'streaming': ['스트리밍', '넷플릭스', '유튜브', '왓챠', '디즈니'],
  'subscription': ['구독', '구독료', '멤버십', '월정액'],
  'travel': ['여행', '관광', '여행사'],
  'airline': ['항공', '비행기', '항공권', '대한항공', '아시아나'],
  'hotel': ['숙박', '호텔', '모텔', '펜션', '에어비앤비'],
  'utilities': ['공과금', '관리비'],
  'electricity': ['전기', '전기요금', '한전'],
  'gas': ['가스', '도시가스', '가스요금'],
  'water': ['수도', '수도요금', '상하수도'],
};

let pipeline: any = null;
let categoryEmbeddings: Map<string, Float32Array> | null = null;
let loading = false;
let loadError: string | null = null;

/**
 * Check if Transformers.js is available and the model can be loaded
 */
export function isAvailable(): boolean {
  return typeof window !== 'undefined';
}

export function getLoadingState(): { loading: boolean; error: string | null } {
  return { loading, error: loadError };
}

/**
 * Initialize the model and pre-compute category embeddings.
 * Call this once; subsequent calls are no-ops.
 */
export async function initialize(
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<void> {
  if (pipeline) return;
  if (loading) return;

  loading = true;
  loadError = null;

  try {
    onProgress?.({ status: '모델 불러오는 중' });

    // Load from CDN to avoid Vite bundling issues with ONNX runtime
    const mod = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0');
    const createPipeline = mod.pipeline;
    mod.env.allowLocalModels = false;

    pipeline = await createPipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
      dtype: 'q8',
    });

    onProgress?.({ status: '항목 임베딩 계산 중' });

    // Pre-compute category embeddings
    categoryEmbeddings = new Map();
    const entries = Object.entries(CATEGORY_LABELS);

    for (let i = 0; i < entries.length; i++) {
      const [catId, labels] = entries[i]!;
      // Combine all labels for this category into one embedding
      const text = `query: ${labels.join(', ')}`;
      const output = await pipeline(text, { pooling: 'mean', normalize: true });
      categoryEmbeddings.set(catId, new Float32Array(output.data));

      onProgress?.({
        status: '항목 임베딩 계산 중',
        progress: Math.round(((i + 1) / entries.length) * 100),
      });
    }

    onProgress?.({ status: '준비 완료' });
  } catch (e) {
    loadError = e instanceof Error ? e.message : '모델을 불러올 수 없어요';
    pipeline = null;
    categoryEmbeddings = null;
    throw e;
  } finally {
    loading = false;
  }
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface AICategoryResult {
  category: string;
  confidence: number;
  method: 'ai-embedding';
}

/**
 * Categorize a single merchant name using semantic similarity.
 * Must call initialize() first.
 */
export async function categorize(merchantName: string): Promise<AICategoryResult> {
  if (!pipeline || !categoryEmbeddings) {
    throw new Error('모델이 초기화되지 않았어요. initialize()를 먼저 호출해 주세요.');
  }

  const text = `query: ${merchantName}`;
  const output = await pipeline(text, { pooling: 'mean', normalize: true });
  const embedding = new Float32Array(output.data);

  let bestCategory = 'uncategorized';
  let bestScore = -1;

  for (const [catId, catEmb] of categoryEmbeddings) {
    const score = cosineSimilarity(embedding, catEmb);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = catId;
    }
  }

  // Threshold: only accept if similarity is reasonably high
  const MIN_CONFIDENCE = 0.45;
  if (bestScore < MIN_CONFIDENCE) {
    return { category: 'uncategorized', confidence: bestScore, method: 'ai-embedding' };
  }

  // Map score to confidence range 0.6-0.95 (never 1.0, that's reserved for exact keyword match)
  const confidence = Math.min(0.95, 0.6 + (bestScore - MIN_CONFIDENCE) * 0.7);

  return { category: bestCategory, confidence, method: 'ai-embedding' };
}

/**
 * Batch categorize multiple merchants. More efficient than calling categorize() in a loop
 * because it can batch the embedding computation.
 */
export async function categorizeBatch(
  merchants: { id: string; name: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, AICategoryResult>> {
  const results = new Map<string, AICategoryResult>();

  for (let i = 0; i < merchants.length; i++) {
    const m = merchants[i]!;
    const result = await categorize(m.name);
    results.set(m.id, result);
    onProgress?.(i + 1, merchants.length);
  }

  return results;
}
