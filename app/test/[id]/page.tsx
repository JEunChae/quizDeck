'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { drawCards } from '@/lib/algorithms/card-draw'
import { createExamSession, startExam, answerCard, tickTimer } from '@/lib/algorithms/exam-state'
import { generateMCQOptions } from '@/lib/algorithms/grading'
import { ExamTimer } from '@/components/test/exam-timer'
import { ResultReport } from '@/components/test/result-report'
import { VoiceCard } from '@/components/learn/voice-card'
import type { Card } from '@/types/database'
import type { ExamSession } from '@/lib/algorithms/exam-state'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSessionSize } from '@/hooks/use-session-size'

const TIME_LIMIT = 300

export default function TestPage() {
  const { id: setId } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeSessionId = searchParams.get('session')
  const supabase = useMemo(() => createClient(), [])
  const [sessionSize] = useSessionSize()

  const [cards, setCards] = useState<Card[]>([])
  const [session, setSession] = useState<ExamSession | null>(null)
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [mcqOptions, setMcqOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [testMode, setTestMode] = useState<'mcq' | 'voice' | null>(null)
  const endedRef = useRef(false)
  const submittingCardIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: cardsData } = await supabase.from('cards').select('*').eq('set_id', setId)
      const all = cardsData ?? []

      let drawn: Card[]
      let sessId: string | null

      if (resumeSessionId) {
        const { data: ownSession } = await supabase
          .from('study_sessions').select('id').eq('id', resumeSessionId).eq('user_id', user.id).single()
        if (!ownSession) { router.push(`/sets/${setId}`); return }
        const { data: sessionResults } = await supabase
          .from('card_results').select('card_id').eq('session_id', resumeSessionId)
        const answeredIds = new Set((sessionResults ?? []).map(r => r.card_id))
        drawn = all.filter(c => !answeredIds.has(c.id))
        sessId = resumeSessionId
      } else {
        drawn = drawCards(all, [], { shuffle: true, limit: sessionSize })
        await supabase
          .from('study_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('set_id', setId)
          .is('ended_at', null)
        const { data: sess } = await supabase.from('study_sessions')
          .insert({ user_id: user.id, set_id: setId, mode: 'exam' }).select().single()
        sessId = sess?.id ?? null
      }

      if (drawn.length < 2) { router.push(`/sets/${setId}`); return }
      setCards(drawn)
      setDbSessionId(sessId)
      const examSess = startExam(createExamSession(drawn, TIME_LIMIT))
      setSession(examSess)
      if (drawn[0]) setMcqOptions(generateMCQOptions(drawn[0], drawn))
    }
    init()
  }, [setId, supabase, resumeSessionId])

  const handleTick = useCallback(() => {
    setSession(s => s ? tickTimer(s) : s)
  }, [])

  useEffect(() => {
    if (!session || session.state !== 'completed' || !dbSessionId || endedRef.current) return
    endedRef.current = true

    const answeredIds = new Set(session.results.map(r => r.card_id))
    if (submittingCardIdRef.current) answeredIds.add(submittingCardIdRef.current)
    const unanswered = session.cards.filter(c => !answeredIds.has(c.id))

    async function finalize() {
      await supabase.from('study_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', dbSessionId!)
      if (unanswered.length > 0) {
        await supabase.from('card_results').insert(
          unanswered.map(c => ({ card_id: c.id, session_id: dbSessionId!, is_correct: false }))
        )
      }
    }
    finalize()
  }, [session, dbSessionId, supabase])

  async function handleAnswer(isCorrect: boolean) {
    if (!session || !dbSessionId || submitting || session.state === 'completed') return
    setSubmitting(true)
    const card = session.cards[session.currentIndex]
    submittingCardIdRef.current = card.id
    try {
      await supabase.from('card_results').insert({ card_id: card.id, session_id: dbSessionId, is_correct: isCorrect })
      const next = answerCard(session, card.id, isCorrect)
      if (next.state !== 'completed') {
        setMcqOptions(generateMCQOptions(next.cards[next.currentIndex], cards))
      }
      setSession(next)
    } finally {
      submittingCardIdRef.current = null
      setSubmitting(false)
    }
  }

  if (!session || cards.length === 0) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-stone-400">로딩 중...</p>
    </div>
  )

  if (testMode === null) return (
    <main className="max-w-lg mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-stone-700 mb-5 text-center">테스트 방식 선택</h2>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setTestMode('mcq')}
          className="w-full border border-stone-200 rounded p-4 text-left transition-all hover:border-stone-400"
          style={{ backgroundColor: '#fafaf5' }}
        >
          <p className="font-semibold text-stone-700">객관식</p>
          <p className="text-sm text-stone-400 mt-1">4개 보기 중 정답 선택 · 제한 시간 {TIME_LIMIT / 60}분</p>
        </button>
        <button
          type="button"
          onClick={() => setTestMode('voice')}
          className="w-full border border-stone-200 rounded p-4 text-left transition-all hover:border-stone-400"
          style={{ backgroundColor: '#fafaf5' }}
        >
          <p className="font-semibold text-stone-700">음성</p>
          <p className="text-sm text-stone-400 mt-1">질문을 듣고 음성으로 답하기 · 제한 시간 {TIME_LIMIT / 60}분</p>
        </button>
      </div>
    </main>
  )

  if (session.state === 'completed') {
    return (
      <main className="max-w-2xl mx-auto px-6 py-8">
        <ResultReport
          cards={cards}
          results={session.results}
          onRetry={() => router.push(`/test/${setId}`)}
          onBack={() => router.push(`/sets/${setId}`)}
        />
      </main>
    )
  }

  const card = session.cards[session.currentIndex]

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-stone-500 font-medium">{session.currentIndex + 1} / {session.cards.length}</p>
        <ExamTimer seconds={session.timeRemaining} onTick={handleTick} />
      </div>
      {testMode === 'voice' ? (
        <VoiceCard key={card.id} card={card} direction="front-to-back" onResult={handleAnswer} />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-xl font-medium text-center text-stone-700 mb-4 min-h-[100px] flex items-center justify-center">
            {card.front}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mcqOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt === card.back)}
                disabled={submitting}
                className="p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-400 text-left text-stone-700 disabled:opacity-50 transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
