import { createClient } from '@/lib/supabase/server'
import type { FlashSet } from '@/types/database'

export async function getUserSets(): Promise<FlashSet[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSetById(id: string): Promise<FlashSet | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('sets').select('*').eq('id', id).single()
  if (error) return null
  return data
}

export async function createSet(values: Pick<FlashSet, 'title' | 'folder' | 'tags' | 'is_public'>): Promise<FlashSet> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('sets')
    .insert({ ...values, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSet(id: string, values: Partial<Pick<FlashSet, 'title' | 'folder' | 'tags' | 'is_public'>>): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('sets').update(values).eq('id', id).eq('user_id', user.id)
  if (error) throw error
}

export async function deleteSet(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('sets').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw error
}

export async function getPublicSets(): Promise<FlashSet[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function copySetToUser(sourceSetId: string): Promise<FlashSet> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: sourceSet }, { data: sourceCards }] = await Promise.all([
    supabase.from('sets').select('*').eq('id', sourceSetId).single(),
    supabase.from('cards').select('*').eq('set_id', sourceSetId),
  ])
  if (!sourceSet) throw new Error('Set not found')
  if (!sourceSet.is_public) throw new Error('Not authorized')

  const { data: newSet, error: setError } = await supabase
    .from('sets')
    .insert({ title: sourceSet.title, folder: sourceSet.folder, tags: sourceSet.tags, is_public: false, user_id: user.id })
    .select().single()
  if (setError) throw setError

  if (sourceCards && sourceCards.length > 0) {
    const cards = sourceCards.map((c: import('@/types/database').Card) => ({
      set_id: newSet.id, front: c.front, back: c.back, difficulty: c.difficulty,
    }))
    const { error: cardsError } = await supabase.from('cards').insert(cards)
    if (cardsError) throw cardsError
  }

  return newSet
}
