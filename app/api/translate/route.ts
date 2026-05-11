import { NextRequest, NextResponse } from 'next/server'
import { getKuroshiro } from '@/lib/translate/kuroshiro-singleton'
import { ipaToKorean, hiraganaToKorean, pinyinToKorean } from '@/lib/translate/phonetics'

type Lang = 'ko' | 'en' | 'ja' | 'zh'
type Pronunciation = { romanization: string; koreanPhonetic: string }

const GOOGLE_LANG: Record<Lang, string> = {
  ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-CN',
}

async function fetchTranslation(text: string, from: Lang, to: Lang): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${GOOGLE_LANG[from]}&tl=${GOOGLE_LANG[to]}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  const data = await res.json()
  const result = data?.[0]?.[0]?.[0]
  if (!result) throw new Error('번역 결과를 가져올 수 없습니다.')
  return result as string
}

async function getPronunciation(lang: Lang, text: string): Promise<Pronunciation | null> {
  try {
    if (lang === 'en') {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`)
      if (!res.ok) return null
      const data = await res.json()
      const phonetic: string = data[0]?.phonetic ??
        data[0]?.phonetics?.find((p: { text?: string }) => p.text)?.text ?? ''
      if (!phonetic) return null
      return { romanization: text.toLowerCase(), koreanPhonetic: ipaToKorean(phonetic) }
    }
    if (lang === 'ja') {
      const kuroshiro = await getKuroshiro()
      const hiragana: string = await kuroshiro.convert(text, { to: 'hiragana' })
      return { romanization: hiragana, koreanPhonetic: hiraganaToKorean(hiragana) }
    }
    if (lang === 'zh') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pinyin4js = require('pinyin4js') as {
        WITH_TONE_MARK: string
        convertToPinyinString: (str: string, separator: string, format: string) => string
      }
      const romanization: string = pinyin4js.convertToPinyinString(text, ' ', pinyin4js.WITH_TONE_MARK)
      return { romanization, koreanPhonetic: pinyinToKorean(romanization) }
    }
    return null
  } catch {
    return null
  }
}

// 발음이 필요한 언어와 텍스트 결정:
// JA/ZH는 항상 읽기 표기 필요 → 우선순위 높음
// EN은 한국 학습자를 위해 표시
function getPronunciationTarget(
  text: string, from: Lang, to: Lang, translation: string
): { lang: Lang; pronounceText: string } | null {
  if (to === 'ja' || to === 'zh') return { lang: to, pronounceText: translation }
  if (from === 'ja' || from === 'zh') return { lang: from, pronounceText: text }
  if (to === 'en') return { lang: 'en', pronounceText: translation }
  if (from === 'en') return { lang: 'en', pronounceText: text }
  return null
}

export async function POST(req: NextRequest) {
  const { text, from, to } = await req.json() as { text: string; from: Lang; to: Lang }

  if (!text?.trim()) {
    return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 })
  }

  try {
    const translation = await fetchTranslation(text, from, to)
    const target = getPronunciationTarget(text, from, to, translation)
    const pronunciation = target ? await getPronunciation(target.lang, target.pronounceText) : null

    return NextResponse.json({
      translation,
      romanization: pronunciation?.romanization ?? null,
      koreanPhonetic: pronunciation?.koreanPhonetic ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '번역 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
