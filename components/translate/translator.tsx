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
