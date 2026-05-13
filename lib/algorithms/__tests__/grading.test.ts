import { describe, it, expect } from 'vitest'
import { gradeShortAnswer, generateMCQOptions, calculateScore, gradeVoiceAnswer } from '../grading'
import type { Card, CardResult } from '@/types/database'

const makeCard = (id: string, back: string): Card => ({
  id, set_id: 's1', front: `Q${id}`, back, difficulty: 'medium', created_at: '', updated_at: ''
})

describe('gradeShortAnswer', () => {
  it('exact match is correct', () => expect(gradeShortAnswer('apple', 'apple')).toBe(true))
  it('case insensitive', () => expect(gradeShortAnswer('Apple', 'apple')).toBe(true))
  it('trims whitespace', () => expect(gradeShortAnswer(' apple ', 'apple')).toBe(true))
  it('wrong answer is false', () => expect(gradeShortAnswer('banana', 'apple')).toBe(false))
})

describe('generateMCQOptions', () => {
  const cards = ['apple','banana','cherry','date'].map((b, i) => makeCard(String(i), b))
  it('returns 4 options', () => expect(generateMCQOptions(cards[0], cards).length).toBe(4))
  it('contains correct answer', () => expect(generateMCQOptions(cards[0], cards)).toContain('apple'))
  it('has no duplicates', () => {
    const opts = generateMCQOptions(cards[0], cards)
    expect(new Set(opts).size).toBe(4)
  })
  it('deduplicates by back value', () => {
    const dupeCards = [
      makeCard('a', 'apple'), makeCard('b', 'apple'), makeCard('c', 'banana'), makeCard('d', 'cherry')
    ]
    const opts = generateMCQOptions(dupeCards[0], dupeCards)
    expect(new Set(opts).size).toBe(opts.length)
  })
  it('handles fewer than 4 available distractors gracefully', () => {
    const fewCards = [makeCard('a', 'apple'), makeCard('b', 'banana')]
    const opts = generateMCQOptions(fewCards[0], fewCards)
    expect(opts).toContain('apple')
    expect(new Set(opts).size).toBe(opts.length)
  })
})

describe('gradeVoiceAnswer', () => {
  it('정확히 일치하면 true', () => expect(gradeVoiceAnswer('apple', 'apple')).toBe(true))
  it('대소문자 무시', () => expect(gradeVoiceAnswer('APPLE', 'apple')).toBe(true))
  it('앞뒤 공백 무시', () => expect(gradeVoiceAnswer(' apple ', 'apple')).toBe(true))
  it('80% 유사도(경계값)이면 true', () => expect(gradeVoiceAnswer('aple', 'apple')).toBe(true))
  it('유사도 79% 이하면 false', () => expect(gradeVoiceAnswer('사과', '사관')).toBe(false))
  it('전혀 다른 단어면 false', () => expect(gradeVoiceAnswer('hello', 'world')).toBe(false))
  it('빈 문자열 vs 빈 문자열은 true', () => expect(gradeVoiceAnswer('', '')).toBe(true))
  it('한쪽만 빈 문자열이면 false', () => expect(gradeVoiceAnswer('', 'apple')).toBe(false))
})

describe('calculateScore', () => {
  it('calculates percentage', () => {
    const results = [
      { id:'1', card_id:'c1', session_id:'s', is_correct: true, answered_at: '' },
      { id:'2', card_id:'c2', session_id:'s', is_correct: false, answered_at: '' },
    ] as CardResult[]
    const score = calculateScore(results)
    expect(score.score).toBe(50)
    expect(score.correct).toBe(1)
    expect(score.total).toBe(2)
  })
  it('returns 0 for empty results', () => expect(calculateScore([]).score).toBe(0))
})
