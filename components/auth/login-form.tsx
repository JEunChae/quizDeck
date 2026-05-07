'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toKoreanError } from '@/lib/utils/error-message'

function detectEnv(): 'inapp-ios' | 'inapp-android' | 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  const isInApp = /KAKAOTALK|kakaotalk|Instagram|FBAN|FBAV|Line\/|NaverApp|naver_app/i.test(ua)
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  if (isInApp && isIos) return 'inapp-ios'
  if (isInApp && isAndroid) return 'inapp-android'
  if (isInApp) return 'inapp-android'
  if (isIos) return 'ios'
  if (isAndroid) return 'android'
  return 'other'
}

function InstallGuide() {
  const [prompt, setPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [env, setEnv] = useState<'inapp-ios' | 'inapp-android' | 'ios' | 'android' | 'other'>('other')

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as any).standalone === true)
    if (isStandalone) return
    setEnv(detectEnv())
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  if (installed) {
    return (
      <div className="mt-6 text-center space-y-1">
        <p className="text-xs text-stone-500">설치 완료 ✓</p>
        <p className="text-xs text-stone-400">홈 화면의 QuizDeck 아이콘을 눌러 시작하세요</p>
      </div>
    )
  }

  // 카카오톡 iOS: Safari로 열기 안내
  if (env === 'inapp-ios') {
    return (
      <div className="mt-6 text-center">
        <p className="text-xs text-stone-400">
          앱 설치는 <span className="text-stone-600 font-semibold">Safari</span>에서 가능합니다
        </p>
        <p className="text-xs text-stone-300 mt-1">우측 하단 공유 버튼 → Safari로 열기</p>
      </div>
    )
  }

  // 카카오톡 Android: Chrome으로 열기 안내
  if (env === 'inapp-android') {
    return (
      <div className="mt-6 text-center">
        <p className="text-xs text-stone-400">
          앱 설치는 <span className="text-stone-600 font-semibold">Chrome</span>에서 가능합니다
        </p>
        <p className="text-xs text-stone-300 mt-1">좌측 하단 Chrome으로 열기 버튼을 눌러주세요</p>
      </div>
    )
  }

  // Android/Chrome: 직접 설치 버튼
  if (prompt) {
    return (
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={handleInstall}
          className="text-xs text-stone-500 border border-stone-300 rounded px-3 py-1.5"
        >
          홈 화면에 앱 설치
        </button>
      </div>
    )
  }

  // Android: Chrome 안내 (beforeinstallprompt 미지원 브라우저)
  if (env === 'android') {
    return (
      <div className="mt-6 text-center">
        <p className="text-xs text-stone-400">
          앱 설치는 <span className="text-stone-600 font-semibold">Chrome</span>에서 가능합니다
        </p>
        <p className="text-xs text-stone-300 mt-1">Chrome 주소창 우측 ⋮ → 홈 화면에 추가</p>
      </div>
    )
  }

  // iOS: Safari 안내
  if (env === 'ios') {
    return (
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setShowGuide(v => !v)}
          className="text-xs text-stone-400 underline underline-offset-2"
        >
          앱으로 설치하는 방법
        </button>
        {showGuide && (
          <div className="mt-3 text-left text-xs text-stone-500 border border-stone-200 rounded p-4 space-y-3">
            <div>
              <p className="font-semibold text-stone-600 mb-1">iPhone · iPad (Safari)</p>
              <p><span className="text-stone-700">···</span> → <span className="text-stone-700">공유</span> → <span className="text-stone-700">홈 화면에 추가</span></p>
            </div>
            <p className="text-stone-400 pt-1 border-t border-stone-100">설치 후 주소창 없이 앱처럼 실행됩니다.</p>
          </div>
        )}
      </div>
    )
  }

  return null
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(toKoreanError(error.message)); setIsLoading(false); return }
    window.location.href = '/dashboard'
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1
          className="text-4xl font-bold text-stone-800 inline-block"
          style={{
            backgroundColor: '#fef9c3',
            padding: '2px 16px 6px',
            boxShadow: '3px 3px 7px rgba(0,0,0,0.13)',
            transform: 'rotate(-1.5deg)',
            borderRadius: '1px',
          }}
        >QuizDeck</h1>
        <p className="text-stone-400 mt-2 text-base">나만의 단어장</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          {error && <p className="text-sm text-stone-500">{error}</p>}
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" required
            className="input-note"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호" required
            className="input-note"
          />
        </div>
        <button type="submit" disabled={isLoading} className="btn-note btn-primary w-full py-2 disabled:opacity-50">
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
        <p className="text-sm text-center text-stone-400">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-stone-600 underline underline-offset-2">회원가입</Link>
        </p>
      </form>
      <InstallGuide />
    </div>
  )
}
