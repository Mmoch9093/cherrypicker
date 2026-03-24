<div align="center">

<img src="https://raw.githubusercontent.com/hletrd/cherrypicker/main/apps/web/public/icon.svg" width="120" alt="CherryPicker icon" />

# CherryPicker

**카드 혜택 체리피킹 최적화 도구**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![Svelte](https://img.shields.io/badge/Svelte-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cards](https://img.shields.io/badge/Cards-145-DC2626)](packages/rules/data/cards/)
[![Issuers](https://img.shields.io/badge/Issuers-18-16A34A)](packages/rules/data/cards/)

</div>

---

## CherryPicker란?

한국 소비자들은 대부분 여러 장의 신용카드를 보유하고 있지만, 카드사마다 다른 카테고리 할인 구조, 전월실적 조건, 월별 할인한도 때문에 어떤 상황에서 어떤 카드를 써야 이득인지 파악하기 어렵습니다.

CherryPicker는 실제 카드 명세서를 분석해 각 소비 카테고리별로 가장 유리한 카드를 추천합니다. 단순한 혜택 비교가 아니라 **내 소비 패턴에 맞는 최적 조합**을 계산해 실질적인 절약 효과를 시뮬레이션합니다.

> Korean consumers often hold multiple credit cards, each with distinct category-based reward structures, minimum spending requirements, and monthly discount caps. CherryPicker analyzes your actual statement data and recommends the optimal card for each spending category — maximizing total rewards across your entire portfolio.

---

## 주요 기능

- 📊 **명세서 자동 인식** — CSV, Excel, PDF 형식 지원 (10+ 카드사)
- 🏆 **카테고리별 최적 카드 추천** — 전월실적, 할인한도 고려한 정밀 계산
- 💰 **절약 시뮬레이션** — 체리피킹 vs 단일카드 사용 시 절약액 비교
- 🤖 **LLM 카드 규칙 스크래핑** — Claude API로 카드사 홈페이지에서 혜택 정보 자동 추출
- 📱 **웹 대시보드** — Astro + Svelte 5 기반 인터랙티브 소비 분석 화면
- 🖥️ **CLI 도구** — 터미널에서 빠른 명세서 분석 및 최적화

---

## 지원 카드사

### 대형 카드사

| 카드사 | 영문명 | 카드 수 |
|--------|--------|---------|
| 신한카드 | Shinhan Card | 15 |
| 하나카드 | Hana Card | 16 |
| 현대카드 | Hyundai Card | 15 |
| 삼성카드 | Samsung Card | 14 |
| 우리카드 | Woori Card | 14 |
| KB국민카드 | KB Kookmin Card | 13 |
| 롯데카드 | Lotte Card | 13 |
| IBK기업은행 | IBK Bank | 12 |
| BC카드 | BC Card | 11 |
| NH농협카드 | NH Nonghyup Card | 11 |

### 인터넷·지역 은행

| 카드사 | 영문명 | 카드 수 |
|--------|--------|---------|
| 토스뱅크 | Toss Bank | 1 |
| 카카오뱅크 | Kakao Bank | 1 |
| 케이뱅크 | KBank | 2 |
| BNK (부산·경남은행) | BNK (Busan/Gyeongnam) | 2 |
| 수협은행 | Suhyup Bank | 2 |
| DGB대구은행 | DGB Daegu Bank | 1 |
| 전북은행 | Jeonbuk Bank | 1 |
| 광주은행 | Kwangju Bank | 1 |

---

## 기술 스택

| 구성요소 | 기술 |
|----------|------|
| 웹 앱 | Astro 6 + Svelte 5 |
| 스타일링 | Tailwind CSS 4 |
| 차트 | LayerChart + D3 |
| 데이터 파이프라인 | Bun |
| 스키마 검증 | Zod + YAML |
| LLM 연동 | Claude API |
| 모노레포 | Turborepo |
| 언어 | TypeScript |

---

## 프로젝트 구조

```
cherrypicker/
├── apps/
│   └── web/              # Astro 6 + Svelte 5 웹 대시보드
├── packages/
│   ├── core/             # 최적화 엔진 (분류기, 계산기, 옵티마이저)
│   ├── parser/           # 명세서 파서 (CSV, XLSX, PDF)
│   ├── rules/            # 카드 규칙 Zod 스키마 + YAML 데이터
│   │   └── data/
│   │       └── cards/    # 카드사별 카드 규칙 YAML (145개)
│   └── viz/              # 터미널 테이블 + HTML 리포트
├── tools/
│   ├── cli/              # CLI 진입점
│   └── scraper/          # LLM 기반 카드 규칙 스크래퍼
└── turbo.json
```

---

## 빠른 시작

```bash
git clone https://github.com/hletrd/cherrypicker.git
cd cherrypicker
bun install

# Astro 개발 서버 실행
bun run dev:web

# CLI: 명세서 분석
bun run analyze

# CLI: 최적 카드 조합 계산
bun run optimize

# 카드 데이터베이스 JSON 빌드
bun run scripts/build-json.ts
```

---

## 카드 데이터

카드 규칙은 `packages/rules/data/cards/{issuer}/{card-name}.yaml` 형식의 YAML 파일로 관리됩니다. 각 파일은 전월실적 구간, 카테고리별 혜택, 월별 한도 등을 구조화된 형태로 정의합니다.

```yaml
card:
  id: "shinhan-b-big"
  issuer: "shinhan"
  name: "B.Big"
  nameKo: "삑"
  type: credit
  annualFee:
    domestic: 10000
    international: 13000

performanceTiers:
  - id: tier1
    label: "전월 30만원 이상"
    minSpending: 300000
    maxSpending: 499999
  - id: tier2
    label: "전월 50만원 이상"
    minSpending: 500000
    maxSpending: 999999

rewards:
  - category: "public_transit"
    label: "대중교통 (버스/지하철) 일별 할인"
    type: discount
    tiers:
      - performanceTier: tier1
        fixedAmount: 200
        unit: "won_per_day"
        monthlyCap: 6000
      - performanceTier: tier2
        fixedAmount: 400
        unit: "won_per_day"
        monthlyCap: 12000

globalConstraints:
  monthlyTotalDiscountCap: 15000
```

카드 데이터에 오류가 있거나 새로운 카드 추가를 원하신다면 Pull Request를 환영합니다.

---

## 라이선스

[MIT](LICENSE)
