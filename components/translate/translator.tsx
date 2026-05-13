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
  sourceText: string
}

function speak(text: string, lang: string, onStart: () => void, onEnd: () => void) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.onstart = onStart
  utterance.onend = onEnd
  utterance.onerror = onEnd
  window.speechSynthesis.speak(utterance)
}

export function Translator() {
  const [from, setFrom] = useState<Lang>('en')
  const [to, setTo] = useState<Lang>('ko')
  const [text, setText] = useState('')
  const [result, setResult] = useState<TranslateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speakingSource, setSpeakingSource] = useState(false)
  const [speakingTarget, setSpeakingTarget] = useState(false)

  async function translate(inputText: string, fromLang: Lang, toLang: Lang) {
    if (!inputText.trim()) { setResult(null); return }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, from: fromLang, to: toLang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '번역 실패')
      setResult({ translation: data.translation, sourceText: inputText })
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleTranslate(e: React.FormEvent) {
    e.preventDefault()
    void translate(text, from, to)
  }

  function swap() {
    const newFrom = to
    const newTo = from
    setFrom(newFrom)
    setTo(newTo)
    void translate(text, newFrom, newTo)
  }

  const speakSource = useCallback(() => {
    speak(text, TTS_LOCALE[from], () => setSpeakingSource(true), () => setSpeakingSource(false))
  }, [text, from])

  const speakTarget = useCallback(() => {
    if (!result) return
    speak(result.translation, TTS_LOCALE[to], () => setSpeakingTarget(true), () => setSpeakingTarget(false))
  }, [result, to])

  const trimmed = text.trim()

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
        <div className="relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="번역할 텍스트 입력..."
            rows={4}
            maxLength={500}
            className="input-note resize-none pr-10"
          />
          <button
            type="button"
            onClick={speakSource}
            disabled={speakingSource || !trimmed}
            aria-label="원문 발음 듣기"
            className={`absolute bottom-2 right-2 text-stone-400 hover:text-stone-700 disabled:opacity-40 text-xl transition-opacity ${trimmed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            🔊
          </button>
        </div>
        <button type="submit" disabled={loading || !trimmed} className="btn-note btn-primary w-full disabled:opacity-50">
          {loading ? '번역 중...' : '번역하기'}
        </button>
      </form>

      {/* 에러 */}
      {error && <p className="text-rose-500 text-sm">{error}</p>}

      {/* 결과 */}
      {result && (
        <div className="notebook-paper rounded border border-stone-200 p-4 space-y-3">
          <p className="text-lg font-medium text-stone-800">{result.sourceText}</p>
          <div className="border-t border-stone-200 pt-3 flex items-center justify-between gap-3">
            <p className="text-lg font-medium text-stone-800">{result.translation}</p>
            <button
              type="button"
              onClick={speakTarget}
              disabled={speakingTarget}
              aria-label="번역 발음 듣기"
              className="btn-note btn-ghost text-stone-400 hover:text-stone-700 disabled:opacity-40 text-xl px-1 shrink-0"
            >
              🔊
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
