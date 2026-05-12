import type { Card } from '@/types/database'

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function gradeShortAnswer(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
}

export function generateMCQOptions(card: Card, allCards: Card[], count = 4): string[] {
  // 정답과 동일하거나 back 값이 중복되는 카드를 제거 (중복 방해초 방지)
  const seenBacks = new Set<string>([card.back])
  const unique = allCards.filter(c => {
    if (c.id === card.id || seenBacks.has(c.back)) return false
    seenBacks.add(c.back)
    return true
  })

  // 난이도별 버킷으로 분리 후 각각 셔플 (클러스터 내부 랜덤화)
  const buckets: Record<string, Card[]> = {}
  for (const c of unique) {
    ;(buckets[c.difficulty] ??= []).push(c)
  }
  for (const key of Object.keys(buckets)) {
    buckets[key] = fisherYates(buckets[key])
  }

  // 난이도 버킷을 라운드로빈으로 순회해 균등 분포 샘플링 (클러스터링 방지)
  const needed = count - 1
  const distractors: string[] = []
  let i = 0
  while (distractors.length < needed) {
    const active = Object.keys(buckets).filter(k => buckets[k].length > 0)
    if (active.length === 0) break
    const key = active[i % active.length]
    distractors.push(buckets[key].pop()!.back)
    i++
  }

  return fisherYates([...distractors, card.back])
}

export function calculateScore(results: Array<{ is_correct: boolean }>): {
  total: number; correct: number; incorrect: number; score: number
} {
  const total = results.length
  const correct = results.filter(r => r.is_correct).length
  return { total, correct, incorrect: total - correct, score: total > 0 ? Math.round(correct / total * 100) : 0 }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function voiceSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase()
  const s2 = b.trim().toLowerCase()
  if (s1 === s2) return 1
  const longer = s1.length >= s2.length ? s1 : s2
  const shorter = s1.length >= s2.length ? s2 : s1
  const dist = levenshtein(longer, shorter)
  return (longer.length - dist) / longer.length
}

export function gradeVoiceAnswer(transcript: string, correct: string): boolean {
  return voiceSimilarity(transcript, correct) >= 0.8
}
