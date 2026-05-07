import { getSetById, copySetToUser } from '@/lib/supabase/queries/sets'
import { getCardsBySetId } from '@/lib/supabase/queries/cards'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { PublicCardList } from '@/components/cards/public-card-item'

export const dynamic = 'force-dynamic'

export default async function ExploreSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [set, cards] = await Promise.all([
    getSetById(id),
    getCardsBySetId(id),
  ])

  if (!set || !set.is_public) notFound()
  if (user && set.user_id === user.id) redirect(`/sets/${id}`)

  async function handleCopy() {
    'use server'
    const supabase2 = await createClient()
    const { data: { user: actionUser } } = await supabase2.auth.getUser()
    if (!actionUser) redirect('/login')
    await copySetToUser(id)
    revalidatePath('/dashboard')
    redirect('/dashboard')
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/explore" className="text-sm text-stone-400 btn-ghost px-0">← 공개 단어장</Link>
          <h1 className="text-2xl font-bold text-stone-800 mt-1">{set.title}</h1>
          {set.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {set.tags.map(tag => (
                <span key={tag} className="text-xs text-stone-500 border border-stone-300 rounded-sm px-2 py-0.5">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <form action={handleCopy}>
          <button type="submit" className="btn-note btn-primary mt-1">
            {user ? '내 단어장으로 복사' : '로그인 후 복사'}
          </button>
        </form>
      </div>

      <PublicCardList cards={cards} />
    </main>
  )
}
