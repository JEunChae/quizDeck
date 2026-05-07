import { createClient } from '@/lib/supabase/server'
import type { Card } from '@/types/database'

export async function getCardsBySetId(setId: string): Promise<Card[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards').select('*').eq('set_id', setId).order('created_at')
  if (error) throw error
  return data
}

export async function createCard(values: Pick<Card, 'set_id' | 'front' | 'back' | 'difficulty'>): Promise<Card> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: set } = await supabase.from('sets').select('id').eq('id', values.set_id).eq('user_id', user.id).single()
  if (!set) throw new Error('Not authorized')
  const { data, error } = await supabase.from('cards').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateCard(id: string, values: Partial<Pick<Card, 'front' | 'back' | 'difficulty'>>): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: card } = await supabase.from('cards').select('set_id').eq('id', id).single()
  if (!card) throw new Error('Card not found')
  const { data: set } = await supabase.from('sets').select('id').eq('id', card.set_id).eq('user_id', user.id).single()
  if (!set) throw new Error('Not authorized')
  const { error } = await supabase.from('cards').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteCard(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // 카드가 본인 소유 세트에 속하는지 확인 후 삭제
  const { data: card } = await supabase.from('cards').select('set_id').eq('id', id).single()
  if (!card) throw new Error('Card not found')
  const { data: set } = await supabase.from('sets').select('id').eq('id', card.set_id).eq('user_id', user.id).single()
  if (!set) throw new Error('Not authorized')
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}

export async function deleteAllCardsBySetId(setId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: set } = await supabase.from('sets').select('id').eq('id', setId).eq('user_id', user.id).single()
  if (!set) throw new Error('Not authorized')
  const { error } = await supabase.from('cards').delete().eq('set_id', setId)
  if (error) throw error
}
