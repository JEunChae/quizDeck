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

// route.ts의 getPronunciationTarget 로직과 동일:
// 발음이 번역 결과(output)에 속하는지, 입력(input)에 속하는지 판별
function getPronunciationSide(from: Lang, to: Lang): 'input' | 'output' | null {
  if (to === 'ja' || to === 'zh') return 'output'
  if (from === 'ja' || from === 'zh') return 'input'
  if (to === 'en') return 'output'
  if (from === 'en') return 'input'
  return null
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

  const pronunciationSide = getPronunciationSide(from, to)
  const speakText = result
    ? pronunciationSide === 'output' ? result.translation : text
    : ''
  const speakLang = pronunciationSide === 'output' ? TTS_LOCALE[to] : TTS_LOCALE[from]

  const speak = useCallback(() => {
    if (!speakText || speaking) return
    const utterance = new SpeechSynthesisUtterance(speakText)
    utterance.lang = speakLang
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [speakText, speakLang, speaking])

  const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window
  const hasPronunciation = !!(result?.romanization && result?.koreanPhonetic)

  function SpeakerButton() {
    if (!hasTts || !result) return null
    return (
      <button
        type="button"
        onClick={speak}
        disabled={speaking}
        aria-label="발음 듣기"
        className="btn-note btn-ghost text-stone-400 hover:text-stone-700 disabled:opacity-40 text-xl px-1 shrink-0"
      >
        🔊
      </button>
    )
  }

  function PronunciationLine() {
    if (!hasPronunciation) return null
    return (
      <p className="text-sm text-stone-400">{result!.romanization} / {result!.koreanPhonetic}</p>
    )
  }

  // 입력(input) 행
  const inputBlock = (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-medium text-stone-800">{text}</p>
        {pronunciationSide === 'input' && <SpeakerButton />}
      </div>
      {pronunciationSide === 'input' && <PronunciationLine />}
    </div>
  )

  // 번역 결과(output) 행
  const outputBlock = result && (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-medium text-stone-800">{result.translation}</p>
        {pronunciationSide === 'output' && <SpeakerButton />}
      </div>
      {pronunciationSide === 'output' && <PronunciationLine />}
    </div>
  )

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

      {/* 결과: 입력 → 번역 순서로 표시, 발음/스피커는 해당 언어 행에 */}
      {result && (
        <div className="notebook-paper rounded border border-stone-200 p-4 space-y-3">
          {inputBlock}
          <div className="border-t border-stone-200 pt-3">{outputBlock}</div>
        </div>
      )}
    </div>
  )
}
