'use client'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-rose-500 transition-colors">
      로그아웃
    </button>
  )
}
