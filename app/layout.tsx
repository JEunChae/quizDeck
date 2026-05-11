import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import localFont from 'next/font/local'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const memoment = localFont({
  src: './fonts/MemomentKkukkukk.ttf',
  variable: '--font-memoment',
})

export const metadata: Metadata = {
  title: 'QuizDeck',
  description: '플래시카드 기반 학습 앱',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QuizDeck',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  themeColor: '#292524',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="ko" className={memoment.variable}>
      <body className="min-h-screen" style={{ backgroundColor: '#fafaf5' }}>
        <nav className="border-b border-stone-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10" style={{ backgroundColor: '#fafaf5' }}>
          <Link
            href="/dashboard"
            className="whitespace-nowrap font-bold text-stone-800 tracking-tight"
            style={{
              fontSize: 'clamp(0.9rem, 3.5vw, 1.25rem)',
              backgroundColor: '#fef9c3',
              padding: '1px 10px 3px',
              display: 'inline-block',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.13)',
              transform: 'rotate(-1.5deg)',
              borderRadius: '1px',
            }}
          >
            QuizDeck
          </Link>
          <div className="flex items-center text-stone-500" style={{ fontSize: 'clamp(0.72rem, 2.5vw, 1rem)', gap: 'clamp(0.5rem, 3vw, 1.25rem)' }}>
            <Link href="/explore" className="hover:text-stone-900 transition-colors whitespace-nowrap" aria-label="탐색">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>
            <Link href="/translate" className="hover:text-stone-900 transition-colors whitespace-nowrap">
              번역기
            </Link>
            {user && (
              <>
                <Link href="/dashboard" className="hover:text-stone-900 transition-colors whitespace-nowrap">내 단어장</Link>
                <Link href="/history" className="hover:text-stone-900 transition-colors whitespace-nowrap">학습 기록</Link>
                <span className="text-stone-300 whitespace-nowrap">|</span>
                <LogoutButton />
              </>
            )}
          </div>
        </nav>
        <main>{children}</main>
        <PwaRegister />
      </body>
    </html>
  )
}
