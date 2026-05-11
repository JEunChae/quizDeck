# 번역기 기능 설계 — 2026-05-11

## 개요

QuizDeck 네비게이션에 "번역기" 탭을 추가한다. 파파고와 유사한 UI로 한국어·영어·일본어·중국어 간 양방향 번역을 제공하고, 발음 표기와 TTS 재생 기능을 포함한다. 모든 API는 무료이며 별도 과금이 없다.

---

## 기능 요구사항

### 번역
- 지원 언어: 한국어(ko), 영어(en), 일본어(ja), 중국어(zh)
- 방향: 양방향 (6가지 조합)
- 언어 스왑 버튼(⇄)으로 출발어·도착어 즉시 교체
- 번역 API: MyMemory (`https://api.mymemory.translated.net/get`)

### 발음 표기
목적어가 한국어가 아닐 때만 발음 행 표시.

표시 포맷:
```
원문 (로마자읽기 / 한글발음) : 번역결과
```

예시:
- 영어: `Hello (hello / 헬로우) : 안녕`
- 일본어: `路線図 (ろせんず / 로센즈) : 노선도`
- 중국어: `你好 (nǐ hǎo / 니하오) : 안녕`

| 언어 | 로마자/읽기 출처 | 한글 발음 출처 |
|------|----------------|--------------|
| 영어 | Free Dictionary API → IPA | IPA → 한글 변환 규칙 |
| 일본어 | Kuroshiro + kuromoji → 히라가나 | 히라가나 → 한글 변환 규칙 |
| 중국어 | pinyin4js → 병음 | 병음 → 한글 변환 규칙 |

### TTS (스피커)
- 결과 텍스트를 브라우저 내장 Web Speech API (`SpeechSynthesis`)로 재생
- 목적어 언어의 locale 사용 (en-US, ja-JP, zh-CN)
- 🔊 아이콘 버튼, 재생 중 비활성화

---

## UI 레이아웃

```
┌──────────────────────────────────────────┐
│  [한국어 ▼]  ⇄  [영어 ▼]               │
├──────────────────────────────────────────┤
│                                          │
│  번역할 텍스트 입력...                    │
│                                          │
├──────────────────────────────────────────┤
│              [번역하기]                   │
├──────────────────────────────────────────┤
│  결과                                    │
│                                          │
│  Hello (hello / 헬로우) : 안녕    🔊     │
│                                          │
└──────────────────────────────────────────┘
```

- 기존 QuizDeck 디자인 시스템 (stone 계열, `input-note`, `btn-note` 클래스) 따름
- 로그인 없이 접근 가능 (explore와 동일)

---

## 아키텍처

### 파일 구조

```
app/
  translate/
    page.tsx                  ← 서버 컴포넌트 (타이틀 + Translator 마운트)
  api/
    translate/
      route.ts                ← POST 핸들러 (MyMemory + 발음 API 병렬 호출)

components/
  translate/
    translator.tsx            ← 클라이언트 메인 UI

lib/
  translate/
    phonetics.ts              ← 한글 발음 변환 규칙 (영·일·중)
    kuroshiro-singleton.ts    ← Kuroshiro 싱글톤 초기화
```

### 데이터 흐름

```
클라이언트 → POST /api/translate { text, from, to }
                    ↓
        ┌─────────────────────┐
        │  MyMemory (번역)     │  병렬
        │  발음 API (언어별)   │  fetch
        └─────────────────────┘
                    ↓
        { translation, romanization, koreanPhonetic }
                    ↓
클라이언트 ← 결과 렌더링 + Web Speech API TTS
```

### API Route 상세 (`/api/translate`)

Request:
```ts
{ text: string, from: 'ko'|'en'|'ja'|'zh', to: 'ko'|'en'|'ja'|'zh' }
```

Response:
```ts
{
  translation: string,
  romanization: string | null,   // 목적어가 한국어면 null
  koreanPhonetic: string | null  // 목적어가 한국어면 null
}
```

---

## 패키지 추가

```
npm install kuroshiro kuroshiro-analyzer-kuromoji pinyin4js
```

---

## 에러 처리

| 상황 | 동작 |
|------|------|
| MyMemory 번역 실패 | "번역에 실패했습니다. 다시 시도해주세요." 메시지 표시 |
| MyMemory 1,000건 초과 | "번역 한도를 초과했습니다. 잠시 후 다시 시도해주세요." |
| 발음 API 실패 | 번역 결과만 표시, 발음 행 생략 (앱 중단 없음) |
| Web Speech 미지원 | 🔊 버튼 숨김 |

---

## 네비게이션 변경

`app/layout.tsx`에서 돋보기 링크 바로 다음에 추가:

```tsx
<Link href="/translate" className="hover:text-stone-900 transition-colors whitespace-nowrap">
  번역기
</Link>
```

---

## 범위 외 (이번 구현에서 제외)

- 번역 이력 저장
- 카드 자동 생성 연동
- 즐겨찾기
