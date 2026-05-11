# 번역기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QuizDeck 네비게이션에 번역기 페이지를 추가한다. 영어·일본어·중국어 ↔ 한국어 양방향 번역, 발음 표기(로마자/한글발음), TTS 스피커를 제공한다.

**Architecture:** API Route(`/api/translate`)가 MyMemory(번역) + 언어별 발음 API를 병렬로 호출해 `{ translation, romanization, koreanPhonetic }`을 반환한다. 클라이언트 컴포넌트(`translator.tsx`)가 결과를 렌더링하고 Web Speech API로 TTS를 처리한다. Kuroshiro는 서버사이드 싱글톤으로 초기화해 반복 초기화를 방지한다.

**Tech Stack:** Next.js 16 App Router, MyMemory API, Free Dictionary API(영어 IPA), Kuroshiro + kuromoji(일본어 히라가나), pinyin4js(중국어 병음), Web Speech API(TTS), Vitest + Testing Library

---

## 파일 맵

| 역할 | 경로 |
|------|------|
| 신규 | `app/translate/page.tsx` |
| 신규 | `app/api/translate/route.ts` |
| 신규 | `components/translate/translator.tsx` |
| 신규 | `lib/translate/phonetics.ts` |
| 신규 | `lib/translate/kuroshiro-singleton.ts` |
| 신규 | `lib/translate/__tests__/phonetics.test.ts` |
| 수정 | `app/layout.tsx` |

---

## Task 1: 패키지 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 패키지 설치**

```bash
npm install kuroshiro kuroshiro-analyzer-kuromoji pinyin4js
```

- [ ] **Step 2: 타입 선언 확인**

```bash
ls node_modules/kuroshiro/dist && ls node_modules/pinyin4js
```

pinyin4js는 별도 `@types` 없이 번들 타입 제공됨. kuroshiro는 타입 없으면 아래 Task 5에서 `declare module` 처리.

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: kuroshiro, pinyin4js 패키지 추가"
```

---

## Task 2: 한글 발음 변환 규칙 (`phonetics.ts`) — TDD

**Files:**
- Create: `lib/translate/phonetics.ts`
- Create: `lib/translate/__tests__/phonetics.test.ts`

### 2-A: 영어 IPA → 한글

- [ ] **Step 1: 실패 테스트 작성**

`lib/translate/__tests__/phonetics.test.ts`:

```typescript
import { ipaToKorean, hiraganaToKorean, pinyinToKorean } from '../phonetics'

describe('ipaToKorean', () => {
  it('기본 모음 변환', () => {
    expect(ipaToKorean('hɛloʊ')).toBe('헬로우')
  })
  it('자음 변환', () => {
    expect(ipaToKorean('wɔːtər')).toBe('워터')
  })
  it('빈 문자열', () => {
    expect(ipaToKorean('')).toBe('')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run lib/translate/__tests__/phonetics.test.ts
```

Expected: FAIL — `ipaToKorean is not defined`

- [ ] **Step 3: 구현**

`lib/translate/phonetics.ts`:

```typescript
// IPA 기호 → 한글 음절 매핑 (순서 중요: 긴 기호 먼저)
const IPA_MAP: [string, string][] = [
  ['tʃ', '치'], ['dʒ', '지'], ['ŋ', '응'], ['ʃ', '시'], ['ʒ', '지'],
  ['θ', '스'], ['ð', '드'], ['æ', '애'], ['ɑː', '아'], ['ɔː', '오'],
  ['ɛ', '에'], ['ɪ', '이'], ['ʊ', '우'], ['ʌ', '어'], ['ə', '어'],
  ['eɪ', '에이'], ['aɪ', '아이'], ['ɔɪ', '오이'], ['aʊ', '아우'],
  ['oʊ', '오우'], ['iː', '이'], ['uː', '우'], ['ɜː', '어'],
  ['p', '프'], ['b', '브'], ['t', '트'], ['d', '드'], ['k', '크'],
  ['g', '그'], ['f', '프'], ['v', '브'], ['s', '스'], ['z', '즈'],
  ['m', '므'], ['n', '느'], ['l', '르'], ['r', '르'], ['w', '우'],
  ['j', '이'], ['h', '흐'], ['ː', ''], ['ˈ', ''], ['ˌ', ''],
]

export function ipaToKorean(ipa: string): string {
  if (!ipa) return ''
  let result = ipa.replace(/\//g, '').replace(/\[/g, '').replace(/\]/g, '')
  for (const [from, to] of IPA_MAP) {
    result = result.split(from).join(to)
  }
  // 남은 ASCII 제거
  return result.replace(/[a-zA-Z,. ]/g, '').trim()
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run lib/translate/__tests__/phonetics.test.ts
```

Expected: PASS (ipaToKorean 테스트)

### 2-B: 히라가나 → 한글

- [ ] **Step 5: 실패 테스트 추가**

`lib/translate/__tests__/phonetics.test.ts`에 추가:

```typescript
describe('hiraganaToKorean', () => {
  it('기본 음절 변환', () => {
    expect(hiraganaToKorean('ろせんず')).toBe('로센즈')
  })
  it('혼합 음절', () => {
    expect(hiraganaToKorean('こんにちは')).toBe('콘니치하')
  })
  it('빈 문자열', () => {
    expect(hiraganaToKorean('')).toBe('')
  })
})
```

- [ ] **Step 6: 실패 확인**

```bash
npx vitest run lib/translate/__tests__/phonetics.test.ts
```

Expected: FAIL — `hiraganaToKorean is not defined`

- [ ] **Step 7: 구현 추가**

`lib/translate/phonetics.ts`에 추가:

```typescript
const HIRA_MAP: [string, string][] = [
  ['きゃ','캬'],['きゅ','큐'],['きょ','쿄'],['しゃ','샤'],['しゅ','슈'],['しょ','쇼'],
  ['ちゃ','챠'],['ちゅ','츄'],['ちょ','쵸'],['にゃ','냐'],['にゅ','뉴'],['によ','뇨'],
  ['ひゃ','햐'],['ひゅ','휴'],['ひょ','효'],['みゃ','먀'],['みゅ','뮤'],['みょ','묘'],
  ['りゃ','랴'],['りゅ','류'],['りょ','료'],['ぎゃ','갸'],['ぎゅ','규'],['ぎょ','교'],
  ['じゃ','자'],['じゅ','주'],['じょ','조'],['びゃ','뱌'],['びゅ','뷰'],['びょ','뵤'],
  ['ぴゃ','퍄'],['ぴゅ','퓨'],['ぴょ','표'],
  ['あ','아'],['い','이'],['う','우'],['え','에'],['お','오'],
  ['か','카'],['き','키'],['く','쿠'],['け','케'],['こ','코'],
  ['さ','사'],['し','시'],['す','스'],['せ','세'],['そ','소'],
  ['た','타'],['ち','치'],['つ','츠'],['て','테'],['と','토'],
  ['な','나'],['に','니'],['ぬ','누'],['ね','네'],['の','노'],
  ['は','하'],['ひ','히'],['ふ','후'],['へ','헤'],['ほ','호'],
  ['ま','마'],['み','미'],['む','무'],['め','메'],['も','모'],
  ['や','야'],['ゆ','유'],['よ','요'],
  ['ら','라'],['り','리'],['る','루'],['れ','레'],['ろ','로'],
  ['わ','와'],['を','오'],['ん','은'],
  ['が','가'],['ぎ','기'],['ぐ','구'],['げ','게'],['ご','고'],
  ['ざ','자'],['じ','지'],['ず','즈'],['ぜ','제'],['ぞ','조'],
  ['だ','다'],['ぢ','지'],['づ','즈'],['で','데'],['ど','도'],
  ['ば','바'],['び','비'],['ぶ','부'],['べ','베'],['ぼ','보'],
  ['ぱ','파'],['ぴ','피'],['ぷ','푸'],['ぺ','페'],['ぽ','포'],
  ['っ',''],['ー',''],
]

export function hiraganaToKorean(hira: string): string {
  if (!hira) return ''
  let result = hira
  for (const [from, to] of HIRA_MAP) {
    result = result.split(from).join(to)
  }
  return result
}
```

- [ ] **Step 8: 통과 확인**

```bash
npx vitest run lib/translate/__tests__/phonetics.test.ts
```

Expected: PASS

### 2-C: 병음 → 한글

- [ ] **Step 9: 실패 테스트 추가**

`lib/translate/__tests__/phonetics.test.ts`에 추가:

```typescript
describe('pinyinToKorean', () => {
  it('기본 변환', () => {
    expect(pinyinToKorean('nǐ hǎo')).toBe('니하오')
  })
  it('성조 기호 처리', () => {
    expect(pinyinToKorean('zhōng guó')).toBe('중궈')
  })
  it('빈 문자열', () => {
    expect(pinyinToKorean('')).toBe('')
  })
})
```

- [ ] **Step 10: 실패 확인**

```bash
npx vitest run lib/translate/__tests__/phonetics.test.ts
```

Expected: FAIL — `pinyinToKorean is not defined`

- [ ] **Step 11: 구현 추가**

`lib/translate/phonetics.ts`에 추가:

```typescript
// 성조 기호 제거 후 기본 병음으로 정규화
function normalizePinyin(pinyin: string): string {
  return pinyin
    .replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i').replace(/[ōóǒò]/g, 'o')
    .replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'v')
}

const PINYIN_MAP: [string, string][] = [
  ['zhi','즈'],['chi','츠'],['shi','스'],['rhi','르'],
  ['zh','주'],['ch','추'],['sh','수'],['ng','응'],
  ['ian','이안'],['iang','이앙'],['iong','이옹'],['uan','우안'],['uang','우앙'],
  ['uai','우아이'],['üan','위안'],['ün','윈'],['üe','위에'],
  ['ai','아이'],['ao','아오'],['an','안'],['ang','앙'],['en','언'],
  ['eng','엉'],['ei','에이'],['er','얼'],['ia','이아'],['ie','이에'],
  ['in','인'],['ing','잉'],['iu','이우'],['ou','오우'],['ong','옹'],
  ['ua','우아'],['ui','우이'],['un','운'],['uo','우오'],['ue','위에'],
  ['a','아'],['e','어'],['i','이'],['o','오'],['u','우'],['v','위'],
  ['b','브'],['p','프'],['m','므'],['f','프'],['d','드'],['t','트'],
  ['n','느'],['l','르'],['g','그'],['k','크'],['h','흐'],
  ['j','지'],['q','치'],['x','시'],['r','르'],['s','스'],
  ['z','즈'],['c','츠'],['y','이'],['w','우'],
]

export function pinyinToKorean(pinyin: string): string {
  if (!pinyin) return ''
  const normalized = normalizePinyin(pinyin.toLowerCase())
  const syllables = normalized.split(' ')
  return syllables.map(syl => {
    let result = syl
    for (const [from, to] of PINYIN_MAP) {
      result = result.split(from).join(to)
    }
    return result
  }).join('')
}
```

- [ ] **Step 12: 전체 통과 확인**

```bash
npx vitest run lib/translate/__tests__/phonetics.test.ts
```

Expected: PASS (9개 테스트 전부)

- [ ] **Step 13: 커밋**

```bash
git add lib/translate/phonetics.ts lib/translate/__tests__/phonetics.test.ts
git commit -m "feat: 한글 발음 변환 유틸 추가 (IPA, 히라가나, 병음)"
```

---

## Task 3: Kuroshiro 싱글톤 (`kuroshiro-singleton.ts`)

**Files:**
- Create: `lib/translate/kuroshiro-singleton.ts`

- [ ] **Step 1: 타입 선언 파일 확인**

```bash
ls node_modules/kuroshiro/dist/index.d.ts 2>/dev/null && echo "타입 있음" || echo "타입 없음"
```

타입 없으면 아래 구현 파일 상단에 `declare module 'kuroshiro'` 블록 추가(Step 2에 포함됨).

- [ ] **Step 2: 싱글톤 구현**

`lib/translate/kuroshiro-singleton.ts`:

```typescript
// @ts-ignore — kuroshiro has no bundled types
import Kuroshiro from 'kuroshiro'
// @ts-ignore
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'

let instance: InstanceType<typeof Kuroshiro> | null = null
let initPromise: Promise<InstanceType<typeof Kuroshiro>> | null = null

export async function getKuroshiro(): Promise<InstanceType<typeof Kuroshiro>> {
  if (instance) return instance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const k = new Kuroshiro()
    await k.init(new KuromojiAnalyzer())
    instance = k
    return k
  })()

  return initPromise
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/translate/kuroshiro-singleton.ts
git commit -m "feat: Kuroshiro 싱글톤 초기화 모듈 추가"
```

---

## Task 4: API Route (`/api/translate/route.ts`)

**Files:**
- Create: `app/api/translate/route.ts`

- [ ] **Step 1: route.ts 작성**

`app/api/translate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getKuroshiro } from '@/lib/translate/kuroshiro-singleton'
import { ipaToKorean, hiraganaToKorean, pinyinToKorean } from '@/lib/translate/phonetics'

type Lang = 'ko' | 'en' | 'ja' | 'zh'
type Pronunciation = { romanization: string; koreanPhonetic: string }

const MYMEMORY_EMAIL = 'dmsco3949@gmail.com'

async function fetchTranslation(text: string, from: Lang, to: Lang): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}&de=${MYMEMORY_EMAIL}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.responseStatus !== 200) throw new Error(data.responseDetails ?? '번역 실패')
  return data.responseData.translatedText as string
}

async function getPronunciation(lang: Lang, text: string): Promise<Pronunciation | null> {
  try {
    if (lang === 'en') {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`)
      if (!res.ok) return null
      const data = await res.json()
      const phonetic: string = data[0]?.phonetic ?? data[0]?.phonetics?.[0]?.text ?? ''
      if (!phonetic) return null
      return { romanization: text.toLowerCase(), koreanPhonetic: ipaToKorean(phonetic) }
    }
    if (lang === 'ja') {
      const kuroshiro = await getKuroshiro()
      const hiragana: string = await kuroshiro.convert(text, { to: 'hiragana' })
      return { romanization: hiragana, koreanPhonetic: hiraganaToKorean(hiragana) }
    }
    if (lang === 'zh') {
      const { default: pinyin4js } = await import('pinyin4js')
      const romanization: string = pinyin4js.convertToPinyinString(text, ' ', pinyin4js.WITH_TONE_MARK)
      return { romanization, koreanPhonetic: pinyinToKorean(romanization) }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { text, from, to } = await req.json() as { text: string; from: Lang; to: Lang }

  if (!text?.trim()) {
    return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 })
  }

  try {
    // 발음은 항상 비한국어 텍스트 기준:
    //   from이 비한국어 → 입력(text) 발음을 번역과 병렬로 가져옴
    //   to가 비한국어   → 번역 결과 발음은 번역 완료 후 순차적으로 가져옴
    let translation: string
    let pronunciation: Pronunciation | null

    if (from !== 'ko') {
      // 입력 텍스트와 번역을 병렬 처리 가능
      ;[translation, pronunciation] = await Promise.all([
        fetchTranslation(text, from, to),
        getPronunciation(from, text),
      ])
    } else {
      // to가 비한국어 → 번역 결과를 먼저 받아야 발음을 가져올 수 있음
      translation = await fetchTranslation(text, from, to)
      pronunciation = to !== 'ko' ? await getPronunciation(to, translation) : null
    }

    return NextResponse.json({
      translation,
      romanization: pronunciation?.romanization ?? null,
      koreanPhonetic: pronunciation?.koreanPhonetic ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '번역 실패'
    const status = message.includes('한도') ? 429 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
```

> **발음 표시 규칙:** 비한국어 텍스트의 발음을 항상 표시. `from`이 비한국어면 입력 텍스트, `to`가 비한국어면 번역 결과 텍스트 기준.

- [ ] **Step 2: 로컬에서 curl 테스트**

```bash
# dev 서버가 켜져 있어야 함 (npm run dev)
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"안녕","from":"ko","to":"en"}'
```

Expected: `{"translation":"Hello","romanization":"hello","koreanPhonetic":"헬로우"}`

- [ ] **Step 3: 커밋**

```bash
git add app/api/translate/route.ts
git commit -m "feat: /api/translate route 추가 (번역 + 발음 병렬)"
```

---

## Task 5: 클라이언트 UI (`translator.tsx`)

**Files:**
- Create: `components/translate/translator.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/translate/translator.tsx`:

```typescript
'use client'
import { useState, useCallback } from 'react'

type Lang = 'ko' | 'en' | 'ja' | 'zh'

const LANG_LABEL: Record<Lang, string> = {
  ko: '한국어', en: '영어', ja: '일본어', zh: '중국어',
}

const TTS_LOCALE: Record<Lang, string> = {
  ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN',
}

interface TranslateResult {
  translation: string
  romanization: string | null
  koreanPhonetic: string | null
}

export function Translator() {
  const [from, setFrom] = useState<Lang>('en')
  const [to, setTo] = useState<Lang>('ko')
  const [text, setText] = useState('')
  const [result, setResult] = useState<TranslateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)

  function swap() {
    setFrom(to)
    setTo(from)
    setResult(null)
  }

  async function handleTranslate(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from, to }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '번역 실패')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const speak = useCallback(() => {
    if (!result || speaking) return
    const utterance = new SpeechSynthesisUtterance(result.translation)
    utterance.lang = TTS_LOCALE[to]
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [result, to, speaking])

  const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* 언어 선택 */}
      <div className="flex items-center gap-3">
        <select value={from} onChange={e => { setFrom(e.target.value as Lang); setResult(null) }} className="select-note flex-1">
          {(Object.keys(LANG_LABEL) as Lang[]).map(l => (
            <option key={l} value={l}>{LANG_LABEL[l]}</option>
          ))}
        </select>
        <button type="button" onClick={swap} className="btn-note btn-ghost text-stone-500 px-2 text-lg">⇄</button>
        <select value={to} onChange={e => { setTo(e.target.value as Lang); setResult(null) }} className="select-note flex-1">
          {(Object.keys(LANG_LABEL) as Lang[]).map(l => (
            <option key={l} value={l}>{LANG_LABEL[l]}</option>
          ))}
        </select>
      </div>

      {/* 입력 */}
      <form onSubmit={handleTranslate} className="space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="번역할 텍스트 입력..."
          rows={4}
          maxLength={500}
          className="input-note resize-none"
        />
        <button type="submit" disabled={loading || !text.trim()} className="btn-note btn-primary w-full disabled:opacity-50">
          {loading ? '번역 중...' : '번역하기'}
        </button>
      </form>

      {/* 에러 */}
      {error && <p className="text-rose-500 text-sm">{error}</p>}

      {/* 결과 */}
      {result && (
        <div className="notebook-paper rounded border border-stone-200 p-4 space-y-1">
          {result.romanization && result.koreanPhonetic && (
            <p className="text-sm text-stone-400">
              {text} ({result.romanization} / {result.koreanPhonetic})
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-medium text-stone-800">{result.translation}</p>
            {hasTts && (
              <button
                type="button"
                onClick={speak}
                disabled={speaking}
                aria-label="발음 듣기"
                className="btn-note btn-ghost text-stone-400 hover:text-stone-700 disabled:opacity-40 text-xl px-1"
              >
                🔊
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/translate/translator.tsx
git commit -m "feat: Translator 클라이언트 컴포넌트 추가"
```

---

## Task 6: 번역기 페이지 + 네비게이션 연결

**Files:**
- Create: `app/translate/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 페이지 작성**

`app/translate/page.tsx`:

```typescript
import { Translator } from '@/components/translate/translator'

export const metadata = { title: '번역기 — QuizDeck' }

export default function TranslatePage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-8">번역기</h1>
      <Translator />
    </main>
  )
}
```

- [ ] **Step 2: 네비게이션에 번역기 링크 추가**

`app/layout.tsx` 54번째 줄 돋보기 `<Link>` 바로 다음에 삽입:

```tsx
<Link href="/translate" className="hover:text-stone-900 transition-colors whitespace-nowrap">
  번역기
</Link>
```

수정 후 해당 블록:

```tsx
<div className="flex items-center text-stone-500" style={{ fontSize: 'clamp(0.72rem, 2.5vw, 1rem)', gap: 'clamp(0.5rem, 3vw, 1.25rem)' }}>
  <Link href="/explore" className="hover:text-stone-900 transition-colors whitespace-nowrap" aria-label="탐색">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  </Link>
  <Link href="/translate" className="hover:text-stone-900 transition-colors whitespace-nowrap">
    번역기
  </Link>
  {user && (
    ...
  )}
</div>
```

- [ ] **Step 3: 브라우저 동작 확인**

```bash
npm run dev
```

1. `http://localhost:3000` 접속 → 네비게이션에 "번역기" 텍스트 확인
2. "번역기" 클릭 → `/translate` 이동 확인
3. "안녕" 입력, 한→영 번역 → `Hello (hello / 헬로우)` 형태 확인
4. 🔊 버튼 클릭 → 영어 TTS 재생 확인
5. ⇄ 버튼 → 언어 스왑 확인
6. 한→일, 한→중 번역도 발음 표시 확인

- [ ] **Step 4: 커밋**

```bash
git add app/translate/page.tsx app/layout.tsx
git commit -m "feat: 번역기 페이지 추가 및 네비게이션 연결"
```

---

## Task 7: 최종 검증

- [ ] **Step 1: 전체 테스트 통과**

```bash
npm test
```

Expected: PASS (phonetics 테스트 포함)

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 빌드 완료

- [ ] **Step 3: 6방향 번역 수동 확인**

| 방향 | 입력 | 기대 결과 예시 |
|------|------|---------------|
| 한→영 | 안녕 | Hello (hello / 헬로우) |
| 한→일 | 노선도 | 路線図 (ろせんず / 로센즈) |
| 한→중 | 안녕 | 你好 (nǐ hǎo / 니하오) |
| 영→한 | Hello | 안녕 (발음 행 없음) |
| 일→한 | こんにちは | 안녕하세요 (발음 행 없음) |
| 중→한 | 你好 | 안녕 (발음 행 없음) |

- [ ] **Step 4: 최종 커밋**

```bash
git add .
git commit -m "feat: 번역기 기능 완성 (번역 + 발음 + TTS)"
```
