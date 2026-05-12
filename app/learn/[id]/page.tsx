'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { drawCards } from '@/lib/algorithms/card-draw'
import { Flashcard } from '@/components/learn/flashcard'
import { MCQCard } from '@/components/learn/mcq-card'
import { ShortAnswerCard } from '@/components/learn/short-answer-card'
import { VoiceCard } from '@/components/learn/voice-card'
import { useSessionSize } from '@/hooks/use-session-size'
import type { Card, CardResult, StudyMode } from '@/types/database'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const MODES: { value: StudyMode; label: string; desc: string }[] = [
  { value: 'flip',         label: '카드 뒤집기', desc: '카드를 보고 뒤집어 정답 확인' },
  { value: 'mcq',          label: '객관식',      desc: '4개 보기 중 정답 선택' },
  { value: 'short_answer', label: '주관식',      desc: '직접 입력으로 정답 확인' },
  { value: 'voice',        label: '음성 학습',   desc: '질문을 듣고 음성으로 답하기' },
]

export default function LearnPage() {
  const { id: setId } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeSessionId = searchParams.get('session')
  const supabase = useMemo(() => createClient(), [])
  const [sessionSize, setSessionSize] = useSessionSize()

  const [allCards, setAllCards] = useState<Card[]>([])
  const [prevResults, setPrevResults] = useState<CardResult[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<StudyMode | null>(null)
  const [done, setDone] = useState(false)
  const [voiceDirection, setVoiceDirection] = useState<'front-to-back' | 'back-to-front' | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); router.push('/login'); return }

      const { data: cardsData } = await supabase.from('cards').select('*').eq('set_id', setId)
      const all = cardsData ?? []
      setAllCards(all)

      if (resumeSessionId) {
        const [{ data: sessionResults }, { data: sessionData }] = await Promise.all([
          supabase.from('card_results').select('card_id').eq('session_id', resumeSessionId),
          supabase.from('study_sessions').select('mode').eq('id', resumeSessionId).eq('user_id', user.id).single(),
        ])
        if (!sessionData) { setLoading(false); router.push(`/sets/${setId}`); return }
        const answeredIds = new Set((sessionResults ?? []).map(r => r.card_id))
        const remaining = all.filter(c => !answeredIds.has(c.id))
        setCards(remaining)
        setSessionId(resumeSessionId)
        setMode((sessionData?.mode as StudyMode) ?? 'flip')
      } else {
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('set_id', setId)
        const sessionIds = (sessions ?? []).map(s => s.id)
        if (sessionIds.length > 0) {
          const { data: results } = await supabase
            .from('card_results')
            .select('*')
            .in('session_id', sessionIds)
          setPrevResults(results ?? [])
        }
      }
      setLoading(false)
    }
    init()
  }, [setId, supabase, resumeSessionId])

  async function startSession(selectedMode: StudyMode) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const drawn = drawCards(allCards, prevResults, { wrongFirst: true, difficultyFirst: true, limit: sessionSize })

    await supabase
      .from('study_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('set_id', setId)
      .is('ended_at', null)

    const { data: session } = await supabase
      .from('study_sessions')
      .insert({ user_id: user.id, set_id: setId, mode: selectedMode })
      .select().single()

    setCards(drawn)
    setSessionId(session?.id ?? null)
    setMode(selectedMode)
    setIndex(0)
    setDone(false)
  }

  const handleResult = useCallback(async (isCorrect: boolean) => {
    if (!sessionId || !cards[index] || submitting) return
    setSubmitting(true)
    try {
      await supabase.from('card_results').insert({
        card_id: cards[index].id,
        session_id: sessionId,
        is_correct: isCorrect,
      })
      if (index + 1 >= cards.length) {
        await supabase.from('study_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', sessionId)
        setDone(true)
      } else {
        setIndex(i => i + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }, [sessionId, cards, index, submitting, supabase])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-slate-500">로딩 중...</p>
    </div>
  )

  if (!loading && (resumeSessionId ? cards.length === 0 : allCards.length === 0)) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-slate-500">{resumeSessionId ? '이어할 카드가 없습니다. 학습이 완료됐어요!' : '카드가 없습니다.'}</p>
      <Link href={`/sets/${setId}`} className="text-stone-500 hover:underline font-medium">세트로 돌아가기</Link>
    </div>
  )

  if (mode === 'voice' && voiceDirection === null) return (
    <main className="max-w-lg mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <button
          type="button"
          onClick={() => setMode(null)}
          className="text-sm text-stone-400 btn-ghost px-0"
        >
          ← 모드 선택
        </button>
      </div>
      <h2 className="text-xl font-semibold text-stone-700 mb-5 text-center">방향 선택</h2>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setVoiceDirection('front-to-back')}
          className="w-full border border-stone-200 rounded p-4 text-left transition-all hover:border-stone-400"
          style={{ backgroundColor: '#fafaf5' }}
        >
          <p className="font-semibold text-stone-700">앞 → 뒤</p>
          <p className="text-sm text-stone-400 mt-1">앞면을 듣고 뒷면 말하기</p>
        </button>
        <button
          type="button"
          onClick={() => setVoiceDirection('back-to-front')}
          className="w-full border border-stone-200 rounded p-4 text-left transition-all hover:border-stone-400"
          style={{ backgroundColor: '#fafaf5' }}
        >
          <p className="font-semibold text-stone-700">뒤 → 앞</p>
          <p className="text-sm text-stone-400 mt-1">뒷면을 듣고 앞면 말하기</p>
        </button>
      </div>
    </main>
  )

  if (!mode) return (
    <main className="max-w-lg mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <Link href={`/sets/${setId}`} className="text-sm text-stone-400 btn-ghost px-0">← 세트로</Link>
        <p className="text-sm text-stone-400">전체 {allCards.length}개 · 세션 {sessionSize}개</p>
      </div>
      <h2 className="text-xl font-semibold text-stone-700 mb-5 text-center">학습 모드 선택</h2>
      <div className="space-y-3">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => startSession(m.value)}
            className="w-full border border-stone-200 rounded p-4 text-left transition-all hover:border-stone-400"
            style={{ backgroundColor: '#fafaf5' }}
          >
            <p className="font-semibold text-stone-700">{m.label}</p>
            <p className="text-sm text-stone-400 mt-1">{m.desc}</p>
          </button>
        ))}
      </div>
    </main>
  )

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <div className="border border-stone-200 rounded p-8 text-center max-w-sm w-full" style={{ backgroundColor: '#fafaf5' }}>
        <p className="text-3xl mb-4">✓</p>
        <h2 className="text-2xl font-bold text-stone-800">학습 완료!</h2>
        <p className="text-stone-400 mt-2">총 {cards.length}개 카드를 학습했습니다.</p>
        <div className="flex gap-3 mt-6 justify-center">
          <button
            onClick={() => { setMode(null); setSessionId(null); setCards([]); setVoiceDirection(null) }}
            className="btn-note btn-primary"
          >
            다시 학습
          </button>
          <Link href={`/sets/${setId}`} className="btn-note btn-secondary">세트로 돌아가기</Link>
        </div>
      </div>
    </div>
  )

  const card = cards[index]

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href={`/sets/${setId}`} className="text-sm text-stone-400 btn-ghost px-0">← 세트로</Link>
        <p className="text-sm text-slate-500 font-medium">{index + 1} / {cards.length}</p>
      </div>
      {mode === 'flip'         && <Flashcard card={card} onResult={handleResult} />}
      {mode === 'mcq'          && <MCQCard key={card.id} card={card} allCards={allCards} onResult={handleResult} />}
      {mode === 'short_answer' && <ShortAnswerCard card={card} onResult={handleResult} />}
      {mode === 'voice' && voiceDirection && (
        <VoiceCard key={card.id} card={card} direction={voiceDirection} onResult={handleResult} />
      )}
    </main>
  )
}
