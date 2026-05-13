'use client'
import { useState, useRef } from 'react'
import type { Card, Difficulty } from '@/types/database'

interface CardFormProps {
  onSave: (values: Pick<Card, 'front' | 'back' | 'difficulty'>) => Promise<void>
  defaultValues?: Partial<Card>
  onCancel?: () => void
}

export function CardForm({ onSave, defaultValues, onCancel }: CardFormProps) {
  const [front, setFront] = useState(defaultValues?.front ?? '')
  const [back, setBack] = useState(defaultValues?.back ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultValues?.difficulty ?? 'medium')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const frontComposing = useRef(false)
  const backComposing = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await onSave({ front, back, difficulty })
      if (!defaultValues) { setFront(''); setBack(''); setDifficulty('medium') }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-rose-500 text-sm">{error}</p>
      )}
      <div className="flex flex-col gap-4">
        <input
          value={front}
          onChange={e => { if (!frontComposing.current) setFront(e.target.value) }}
          onCompositionStart={() => { frontComposing.current = true }}
          onCompositionEnd={e => { frontComposing.current = false; setFront((e.target as HTMLInputElement).value) }}
          placeholder="단어 (앞면)" required
          className="input-note"
        />
        <input
          value={back}
          onChange={e => { if (!backComposing.current) setBack(e.target.value) }}
          onCompositionStart={() => { backComposing.current = true }}
          onCompositionEnd={e => { backComposing.current = false; setBack((e.target as HTMLInputElement).value) }}
          placeholder="뜻 (뒷면)" required
          className="input-note"
        />
        <select
          value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}
          className="select-note w-fit"
        >
          <option value="easy">쉬움</option>
          <option value="medium">보통</option>
          <option value="hard">어려움</option>
        </select>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={isLoading} className="btn-note btn-primary disabled:opacity-50">
          {isLoading ? '저장 중...' : '저장'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-note btn-ghost">취소</button>
        )}
      </div>
    </form>
  )
}
