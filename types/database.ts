export type Difficulty = 'easy' | 'medium' | 'hard'
export type StudyMode = 'flip' | 'mcq' | 'short_answer' | 'exam' | 'voice'
export type ExamState = 'idle' | 'running' | 'completed'

export interface FlashSet {
  id: string
  user_id: string
  title: string
  folder: string | null
  tags: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Card {
  id: string
  set_id: string
  front: string
  back: string
  difficulty: Difficulty
  created_at: string
  updated_at: string
}

export interface StudySession {
  id: string
  user_id: string
  set_id: string
  mode: StudyMode
  started_at: string
  ended_at: string | null
}

export interface CardResult {
  id: string
  card_id: string
  session_id: string
  is_correct: boolean
  answered_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  card_id: string | null
  set_id: string | null
  created_at: string
}
