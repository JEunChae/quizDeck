import { Translator } from '@/components/translate/translator'

export const metadata = { title: '번역기 — QuizDeck' }

export default function TranslatePage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-stone-800 mb-8">번역기</h1>
      <Translator />
    </main>
  )
}
