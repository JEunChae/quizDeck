// @ts-ignore — kuroshiro has no bundled types
import Kuroshiro from 'kuroshiro'
// @ts-ignore
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'

let instance: any = null
let initPromise: Promise<any> | null = null

export async function getKuroshiro(): Promise<any> {
  if (instance) return instance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const k = new Kuroshiro()
    await k.init(new KuromojiAnalyzer())
    instance = k
    return k
  })()

  return initPromise
}
