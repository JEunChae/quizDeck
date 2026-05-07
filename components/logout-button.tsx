import { signOutAction } from '@/app/actions/auth'

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm text-slate-500 hover:text-rose-500 transition-colors">
        로그아웃
      </button>
    </form>
  )
}
