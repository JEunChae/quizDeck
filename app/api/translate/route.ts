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

export async function POST(req: NextRequest) {
  const { text, from, to } = await req.json() as { text: string; from: Lang; to: Lang }

  if (!text?.trim()) {
    return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 })
  }

  try {
    let translation: string
    let pronunciation: Pronunciation | null

    if (from !== 'ko') {
      // Input is non-Korean: translate and get pronunciation in parallel
      ;[translation, pronunciation] = await Promise.all([
        fetchTranslation(text, from, to),
        getPronunciation(from, text),
      ])
    } else {
      // Input is Korean: translate first, then optionally get pronunciation of result
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
