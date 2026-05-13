'use client'
import { useState, useEffect, useRef } from 'react'
import type { Card } from '@/types/database'
import { gradeVoiceAnswer } from '@/lib/algorithms/grading'

type Phase = 'reading' | 'listening' | 'result-correct' | 'result-wrong'

interface SpeechRec {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  abort(): void
}

type WinWithSpeech = Window & typeof globalThis & {
  SpeechRecognition?: new () => SpeechRec
  webkitSpeechRecognition?: new () => SpeechRec
}

function detectLang(text: string): string {
  return /[가-힣]/.test(text) ? 'ko-KR' : 'en-US'
}

export function VoiceCard({ card, direction, onResult }: {
  card: Card
  direction: 'front-to-back' | 'back-to-front'
  onResult: (isCorrect: boolean) => void
}) {
  const question = direction === 'front-to-back' ? card.front : card.back
  const answer   = direction === 'front-to-back' ? card.back  : card.front

  const [phase, setPhase]           = useState<Phase>('reading')
  const [transcript, setTranscript] = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [canSkip, setCanSkip]       = useState(false)
  const recRef = useRef<SpeechRec | null>(null)

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setTimeout(() => setPhase('listening'), 0)
      return
    }
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(question)
    utt.lang = detectLang(question)
    utt.onend   = () => setPhase('listening')
    utt.onerror = () => setPhase('listening')
    window.speechSynthesis.speak(utt)
    return () => { window.speechSynthesis.cancel() }
  }, [question])

  useEffect(() => {
    if (phase !== 'result-correct') return
    const t = setTimeout(() => onResult(true), 1500)
    return () => clearTimeout(t)
  }, [phase, onResult])

  useEffect(() => {
    return () => { recRef.current?.abort() }
  }, [])

  function startListening() {
    setError(null)
    recRef.current?.abort()
    const win = window as WinWithSpeech
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!SR) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다.')
      setCanSkip(true)
      return
    }
    const rec = new SR()
    rec.lang            = detectLang(answer)
    rec.interimResults  = false
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      const t = e.results[0][0].transcript
      setTranscript(t)
      setPhase(gradeVoiceAnswer(t, answer) ? 'result-correct' : 'result-wrong')
    }
    rec.onerror = (e) => {
      recRef.current = null
      if (e.error === 'no-speech')        setError('말씀이 인식되지 않았습니다. 다시 시도해주세요.')
      else if (e.error === 'not-allowed') { setError('마이크 권한이 필요합니다.'); setCanSkip(true) }
      else                                { setError('음성 인식 오류가 발생했습니다.'); setCanSkip(true) }
    }
    recRef.current = rec
    rec.start()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 text-xl font-medium text-center text-stone-700 min-h-[100px] flex items-center justify-center gap-2">
        {question}
        {phase === 'reading' && <span className="animate-pulse text-2xl">🔊</span>}
      </div>

      {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
      {canSkip && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onResult(false)}
            className="btn-note btn-secondary px-6"
          >
            건너뛰기 (오답 처리)
          </button>
        </div>
      )}

      {phase === 'listening' && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={startListening}
            className="btn-note btn-primary px-8 py-3 text-lg"
          >
            🎤 말하기
          </button>
        </div>
      )}

      {phase === 'result-correct' && (
        <div className="text-center space-y-1">
          <p className="text-emerald-600 font-semibold text-lg">✅ 정답!</p>
          <p className="text-stone-400 text-sm">&quot;{transcript}&quot;</p>
        </div>
      )}

      {phase === 'result-wrong' && (
        <div className="space-y-3">
          <div className="text-center space-y-1">
            <p className="text-rose-600 font-semibold">❌ 내가 말한 것: &quot;{transcript || '(인식 없음)'}&quot;</p>
            <p className="text-stone-600 text-sm">정답: <span className="font-medium">{answer}</span></p>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => onResult(false)}
              className="btn-note btn-primary px-6"
            >
              다음 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
