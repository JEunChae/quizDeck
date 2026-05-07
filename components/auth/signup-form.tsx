'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toKoreanError } from '@/lib/utils/error-message'
export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function clearFields() {
    setEmail('')
    setPassword('')
    if (emailRef.current) emailRef.current.value = ''
    if (passwordRef.current) passwordRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const savedEmail = email
    const savedPassword = password
    clearFields()
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email: savedEmail, password: savedPassword })
    if (error) { setError(toKoreanError(error.message)); setIsLoading(false); return }
    if (!data.session) { setEmailSent(true); setIsLoading(false); return }
    window.location.href = '/dashboard'
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-sm text-center space-y-3">
        <p className="text-3xl">📬</p>
        <h2 className="text-xl font-semibold text-stone-700">이메일을 확인해주세요</h2>
        <p className="text-stone-400 text-sm">인증 링크를 보냈습니다.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-stone-800">QuizDeck</h1>
        <p className="text-stone-400 mt-2 text-base">나만의 단어장</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        <div className="space-y-5">
          {error && <p className="text-sm text-stone-500">{error}</p>}
          <input
            ref={emailRef}
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" required
            autoComplete="off"
            className="input-note"
          />
          <input
            ref={passwordRef}
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)" required minLength={6}
            autoComplete="new-password"
            className="input-note"
          />
        </div>
        <button type="submit" disabled={isLoading} className="btn-note btn-primary w-full py-2 disabled:opacity-50">
          {isLoading ? '가입 중...' : '가입하기'}
        </button>
        <p className="text-sm text-center text-stone-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-stone-600 underline underline-offset-2">로그인</Link>
        </p>
      </form>
    </div>
  )
}
