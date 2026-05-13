import { NextRequest, NextResponse } from 'next/server'

type Lang = 'ko' | 'en' | 'ja' | 'zh'

const GOOGLE_LANG: Record<Lang, string> = {
  ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-CN',
}

const VALID_LANGS = new Set<string>(['ko', 'en', 'ja', 'zh'])

async function fetchTranslation(text: string, from: Lang, to: Lang): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${GOOGLE_LANG[from]}&tl=${GOOGLE_LANG[to]}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`번역 서비스 오류 (${res.status})`)
  const data = await res.json()
  const result = data?.[0]?.[0]?.[0]
  if (!result) throw new Error('번역 결과를 가져올 수 없습니다.')
  return result as string
}

export async function POST(req: NextRequest) {
  const { text, from, to } = await req.json() as { text: string; from: string; to: string }

  if (!text?.trim()) {
    return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 })
  }
  if (text.length > 500) {
    return NextResponse.json({ error: '텍스트는 500자 이하여야 합니다.' }, { status: 400 })
  }
  if (!VALID_LANGS.has(from) || !VALID_LANGS.has(to)) {
    return NextResponse.json({ error: '지원하지 않는 언어입니다.' }, { status: 400 })
  }

  try {
    const translation = await fetchTranslation(text, from as Lang, to as Lang)
    return NextResponse.json({ translation })
  } catch (err) {
    const message = err instanceof Error ? err.message : '번역 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
