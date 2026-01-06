# Brand API Scripts

Gemini Interactions API 기반 브랜드 검색 및 분석 CLI 도구입니다.

## 설치

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 GOOGLE_API_KEY 설정
```

## 스크립트

### 1. 검색 API (`search.ts`)

브랜드명, SKU, 회사명으로 관련 브랜드와 회사 목록을 검색합니다.

```bash
npx tsx scripts/brand/search.ts <검색어>
```

**예시**:
```bash
npx tsx scripts/brand/search.ts "설화수"
npx tsx scripts/brand/search.ts "Nike"
npx tsx scripts/brand/search.ts "별자리스틱"
```

**출력 (stdout)**:
```json
{
  "result": {
    "brands": [
      {
        "brandName": "설화수",
        "brandNameKo": "설화수",
        "brandNameEn": "Sulwhasoo",
        "ownerCompany": "아모레퍼시픽",
        "country": "한국",
        "category": "화장품",
        "homepage": "https://www.sulwhasoo.com",
        "relationship": "검색대상"
      }
    ],
    "companies": [
      {
        "companyName": "아모레퍼시픽",
        "companyNameKo": "아모레퍼시픽",
        "companyNameEn": "Amorepacific",
        "role": "소유사",
        "country": "한국",
        "ownedBrands": ["설화수", "라네즈", "이니스프리"],
        "relationship": "검색대상"
      }
    ]
  },
  "interactionId": "interaction_xxx"
}
```

### 2. 분석 API (`analyze.ts`)

브랜드의 상세 정보를 분석합니다. 3-Phase 파이프라인으로 동작합니다.

```bash
npx tsx scripts/brand/analyze.ts <브랜드명> [홈페이지URL] [interactionId]
```

**예시**:
```bash
# URL 자동 탐색
npx tsx scripts/brand/analyze.ts "설화수"

# URL 직접 지정
npx tsx scripts/brand/analyze.ts "설화수" "https://www.sulwhasoo.com"

# 검색 결과와 연결 (interactionId 체이닝)
npx tsx scripts/brand/analyze.ts "설화수" "" "interaction_xxx"
```

**출력 (stdout)**:
```json
{
  "result": {
    "brandName": "설화수",
    "ownerCompany": "아모레퍼시픽",
    "foundedYear": 1997,
    "brandOverview": "한방 화장품 브랜드로...",
    "brandConcept": "아시아의 지혜를 담은 럭셔리 뷰티",
    "mainExportCountries": ["중국", "미국", "일본"],
    "mainCategories": ["스킨케어", "메이크업"],
    "awards": ["2023 뷰티어워드", "2022 브랜드대상"],
    "certifications": ["비건", "크루얼티프리"],
    "country": "한국",
    "manufacturingCountry": "한국",
    "homepage": "https://www.sulwhasoo.com",
    "manufacturingType": "자체생산",
    "history": [
      { "year": 1997, "event": "설화수 브랜드 런칭" },
      { "year": 2004, "event": "중국 시장 진출" }
    ]
  },
  "interactionId": "interaction_yyy"
}
```

## 아키텍처

### 3-Phase 파이프라인 (analyze.ts)

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: URL 확보                                          │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ 1-1. 홈페이지   │───▶│ 1-2. site: 검색 │                │
│  │ URL 탐색       │    │ URL 목록 수집   │                │
│  │ (Google Search) │    │ (Google Search) │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: URL Context 분석                                  │
│  ┌─────────────────────────────────────────┐               │
│  │ 다중 URL 콘텐츠 분석 (최대 10개)         │               │
│  │ About, History, Awards 페이지 우선      │               │
│  │ (URL Context Tool)                      │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 빈 필드 보충                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ 빈 필드 검사 후 Google Search로 보충     │               │
│  │ foundedYear, awards, history 등         │               │
│  │ (Google Search Tool)                    │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Interaction ID 체이닝

모든 Phase는 `previous_interaction_id`로 연결되어 컨텍스트를 유지합니다.

```
search.ts → interactionId → analyze.ts (Phase 1) → Phase 2 → Phase 3
```

검색 결과에서 특정 브랜드를 선택하면, 해당 `interactionId`를 분석 API에 전달하여 이전 검색 맥락을 유지할 수 있습니다.

## 파일 구조

```
search_entities/
├── README.md           # 이 문서
├── package.json        # 프로젝트 설정
├── .env.example        # 환경변수 예시
├── search.ts           # 검색 API CLI
├── analyze.ts          # 분석 API CLI (3-Phase)
└── lib/
    ├── types.ts        # TypeScript 타입 정의
    ├── prompts.ts      # Gemini 시스템 프롬프트
    └── gemini-client.ts # Gemini API 클라이언트
```

## API 스키마

### BrandSearchResult

| 필드 | 타입 | 설명 |
|------|------|------|
| brands | Brand[] | 브랜드 목록 (최대 10개) |
| companies | Company[] | 회사 목록 (최대 10개) |

### Brand

| 필드 | 타입 | 설명 |
|------|------|------|
| brandName | string | 브랜드명 |
| brandNameKo | string \| null | 한글명 |
| brandNameEn | string \| null | 영문명 |
| ownerCompany | string | 소유 회사명 |
| country | string | 국가 |
| category | string | 카테고리 |
| homepage | string \| null | 홈페이지 URL |
| relationship | string | 검색대상/자매브랜드/경쟁브랜드/유통브랜드 |

### Company

| 필드 | 타입 | 설명 |
|------|------|------|
| companyName | string | 회사명 |
| companyNameKo | string \| null | 한글명 |
| companyNameEn | string \| null | 영문명 |
| role | string | 소유사/제조사/유통사/수입사/본사/자회사 |
| country | string | 국가 |
| ownedBrands | string[] \| null | 소유 브랜드 목록 |
| relationship | string | 검색대상/모회사/자회사/제조사/유통사/경쟁사 |

### BrandAnalyzeResult

| 필드 | 타입 | 설명 |
|------|------|------|
| brandName | string | 브랜드명 |
| ownerCompany | string | 소유사명 |
| foundedYear | number \| null | 브랜드 런칭 연도 |
| brandOverview | string | 브랜드 개요 (2-3문장) |
| brandConcept | string \| null | 브랜드 컨셉/철학 |
| mainExportCountries | string[] | 주요 수출국 (최대 5개) |
| mainCategories | string[] | 주요 카테고리 (최대 5개) |
| awards | string[] | 수상 내역 (최대 10개) |
| certifications | string[] | 인증 (비건, ISO 등) |
| country | string | 본사 국가 |
| manufacturingCountry | string \| null | 제조국 |
| homepage | string | 홈페이지 URL |
| manufacturingType | string \| null | 자체생산/OEM/ODM/혼합 |
| history | {year, event}[] | 연혁 (최대 10개) |

## 출력 규칙

- **stdout**: JSON 결과만 출력 (파이프 친화적)
- **stderr**: 로그 메시지 (`[INFO]`, `[Phase X]`, `[ERROR]`)

```bash
# JSON만 파일로 저장
npx tsx scripts/brand/search.ts "설화수" > result.json

# 로그 확인하며 실행
npx tsx scripts/brand/search.ts "설화수" 2>&1 | tee output.log
```

## 의존성

- `@google/genai`: Gemini Interactions API
- `dotenv`: 환경변수 로드
- `jsonrepair`: LLM JSON 출력 복구
