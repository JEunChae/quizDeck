// ─── Korean Jamo Tables ───────────────────────────────────────────────────────
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function makeSyllable(cho: string, jung: string, jong: string = ''): string {
  const ci = CHO.indexOf(cho)
  const vi = JUNG.indexOf(jung)
  const fi = JONG.indexOf(jong)
  if (ci === -1 || vi === -1 || fi === -1) return cho + jung + jong
  return String.fromCodePoint(0xAC00 + (ci * 21 + vi) * 28 + fi)
}

function decompose(char: string): { cho: string; jung: string; jong: string } | null {
  const code = char.codePointAt(0)!
  if (code < 0xAC00 || code > 0xD7A3) return null
  const offset = code - 0xAC00
  const jong = offset % 28
  const jung = Math.floor(offset / 28) % 21
  const cho = Math.floor(offset / 28 / 21)
  return { cho: CHO[cho], jung: JUNG[jung], jong: JONG[jong] }
}

// ─── IPA → 한글 ───────────────────────────────────────────────────────────────

interface IpaToken {
  type: 'vowel' | 'consonant'
  sym: string
  // vowel properties
  jamos?: string[]
  // consonant properties
  cho?: string
  jong?: string
  canDouble?: boolean
  isGlide?: boolean
}

const IPA_VOWELS: [string, string[]][] = [
  ['eɪ', ['ㅔ','ㅣ']], ['aɪ', ['ㅏ','ㅣ']], ['ɔɪ', ['ㅗ','ㅣ']], ['aʊ', ['ㅏ','ㅜ']],
  ['oʊ', ['ㅗ','ㅜ']], ['iː', ['ㅣ']], ['uː', ['ㅜ']], ['ɜː', ['ㅓ']],
  ['ɑː', ['ㅏ']], ['ɔː', ['ㅗ']],
  ['æ', ['ㅐ']], ['ɛ', ['ㅔ']], ['ɪ', ['ㅣ']], ['ʊ', ['ㅜ']],
  ['ʌ', ['ㅓ']], ['ə', ['ㅓ']], ['ɔ', ['ㅗ']],
  ['a', ['ㅏ']], ['e', ['ㅔ']], ['i', ['ㅣ']], ['o', ['ㅗ']], ['u', ['ㅜ']],
]

// [sym, cho, jong, canDouble, isGlide]
const IPA_CONSONANTS: [string, string, string, boolean?, boolean?][] = [
  ['tʃ', 'ㅊ', ''], ['dʒ', 'ㅈ', ''], ['ŋ', 'ㅇ', 'ㅇ'],
  ['ʃ', 'ㅅ', ''], ['ʒ', 'ㅈ', ''], ['θ', 'ㅅ', ''], ['ð', 'ㄷ', ''],
  ['p', 'ㅍ', 'ㅂ'], ['b', 'ㅂ', 'ㅂ'], ['t', 'ㅌ', 'ㄷ'], ['d', 'ㄷ', 'ㄷ'],
  ['k', 'ㅋ', 'ㄱ'], ['g', 'ㄱ', 'ㄱ'], ['f', 'ㅍ', 'ㅂ'], ['v', 'ㅂ', 'ㅂ'],
  ['s', 'ㅅ', 'ㅅ'], ['z', 'ㅈ', ''], ['m', 'ㅁ', 'ㅁ'], ['n', 'ㄴ', 'ㄴ'],
  ['l', 'ㄹ', 'ㄹ', true, false],
  ['r', 'ㄹ', '', true, false],   // word-final r is dropped
  ['w', 'ㅇ', '', false, true],
  ['j', 'ㅇ', '', false, true],
  ['h', 'ㅎ', ''],
]

const W_MOD: Record<string, string> = {
  'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅗ': 'ㅝ', 'ㅣ': 'ㅟ',
}
const J_MOD: Record<string, string> = {
  'ㅏ': 'ㅑ', 'ㅓ': 'ㅕ', 'ㅔ': 'ㅖ', 'ㅗ': 'ㅛ', 'ㅜ': 'ㅠ',
}

function ipaTokenize(ipa: string): IpaToken[] {
  const tokens: IpaToken[] = []
  const clean = ipa.replace(/[ˈˌː]/g, '')
  let i = 0
  while (i < clean.length) {
    let matched = false
    for (const [sym, jamos] of IPA_VOWELS) {
      if (clean.startsWith(sym, i)) {
        tokens.push({ type: 'vowel', sym, jamos: [...jamos] })
        i += sym.length
        matched = true
        break
      }
    }
    if (matched) continue
    for (const [sym, cho, jong, canDouble, isGlide] of IPA_CONSONANTS) {
      if (clean.startsWith(sym, i)) {
        tokens.push({ type: 'consonant', sym, cho, jong: jong || '', canDouble: !!canDouble, isGlide: !!isGlide })
        i += sym.length
        matched = true
        break
      }
    }
    if (!matched) i++
  }
  return tokens
}

function ipaAssemble(tokens: IpaToken[]): string {
  // Pre-process glides: w/j before a vowel modifies the vowel's first jamo
  for (let k = 0; k < tokens.length - 1; k++) {
    const tok = tokens[k]
    const next = tokens[k + 1]
    if (tok.isGlide && next.type === 'vowel' && next.jamos) {
      const modMap = tok.sym === 'w' ? W_MOD : J_MOD
      const mod = modMap[next.jamos[0]]
      if (mod) next.jamos[0] = mod
      tok.cho = 'ㅇ'
      tok.isGlide = false
    }
  }

  // Context-sensitive ə→ɛ: ə immediately before l (canDouble) + vowel → ɛ (Korean 외래어 표기법)
  for (let k = 0; k < tokens.length - 2; k++) {
    const tok = tokens[k]
    const next = tokens[k + 1]
    const afterNext = tokens[k + 2]
    if (
      tok.type === 'vowel' && tok.sym === 'ə' &&
      next.type === 'consonant' && next.sym === 'l' && next.canDouble &&
      afterNext.type === 'vowel'
    ) {
      tok.jamos = ['ㅔ']
    }
  }

  const syllables: string[] = []
  let i = 0

  function buildSyllables(cho: string, vowJamos: string[], jong: string) {
    if (vowJamos.length === 1) {
      syllables.push(makeSyllable(cho, vowJamos[0], jong))
    } else {
      syllables.push(makeSyllable(cho, vowJamos[0], ''))
      for (let k = 1; k < vowJamos.length; k++) {
        const isLast = k === vowJamos.length - 1
        syllables.push(makeSyllable('ㅇ', vowJamos[k], isLast ? jong : ''))
      }
    }
  }

  function getCoda(i: number): { jong: string; consume: boolean } {
    const codaTok = tokens[i]
    if (!codaTok || codaTok.type !== 'consonant' || codaTok.isGlide) return { jong: '', consume: false }
    const afterCoda = tokens[i + 1]
    if (!afterCoda || afterCoda.type !== 'vowel') {
      const jong = codaTok.jong || ''
      return { jong, consume: !!jong }
    }
    if (codaTok.canDouble && codaTok.jong) {
      return { jong: codaTok.jong, consume: false }
    }
    return { jong: '', consume: false }
  }

  while (i < tokens.length) {
    const tok = tokens[i]
    if (tok.type === 'consonant') {
      const next = tokens[i + 1]
      if (next && next.type === 'vowel' && next.jamos) {
        i += 2
        const { jong, consume } = getCoda(i)
        buildSyllables(tok.cho!, next.jamos, jong)
        if (consume) i++
      } else {
        // Word-final consonant with no following vowel: skip
        i++
      }
    } else if (tok.type === 'vowel' && tok.jamos) {
      i++
      const { jong, consume } = getCoda(i)
      buildSyllables('ㅇ', tok.jamos, jong)
      if (consume) i++
    } else {
      i++
    }
  }

  return syllables.join('')
}

export function ipaToKorean(ipa: string): string {
  if (!ipa) return ''
  const tokens = ipaTokenize(ipa)
  return ipaAssemble(tokens)
}

// ─── 히라가나 → 한글 ───────────────────────────────────────────────────────────

const HIRA_MAP: [string, string][] = [
  ['きゃ','캬'],['きゅ','큐'],['きょ','쿄'],['しゃ','샤'],['しゅ','슈'],['しょ','쇼'],
  ['ちゃ','챠'],['ちゅ','츄'],['ちょ','쵸'],['にゃ','냐'],['にゅ','뉴'],['によ','뇨'],
  ['ひゃ','햐'],['ひゅ','휴'],['ひょ','효'],['みゃ','먀'],['みゅ','뮤'],['みょ','묘'],
  ['りゃ','랴'],['りゅ','류'],['りょ','료'],['ぎゃ','갸'],['ぎゅ','규'],['ぎょ','교'],
  ['じゃ','자'],['じゅ','주'],['じょ','조'],['びゃ','뱌'],['びゅ','뷰'],['びょ','뵤'],
  ['ぴゃ','퍄'],['ぴゅ','퓨'],['ぴょ','표'],
  ['あ','아'],['い','이'],['う','우'],['え','에'],['お','오'],
  ['か','카'],['き','키'],['く','쿠'],['け','케'],['こ','코'],
  ['さ','사'],['し','시'],['す','스'],['せ','세'],['そ','소'],
  ['た','타'],['ち','치'],['つ','츠'],['て','테'],['と','토'],
  ['な','나'],['に','니'],['ぬ','누'],['ね','네'],['の','노'],
  ['は','하'],['ひ','히'],['ふ','후'],['へ','헤'],['ほ','호'],
  ['ま','마'],['み','미'],['む','무'],['め','메'],['も','모'],
  ['や','야'],['ゆ','유'],['よ','요'],
  ['ら','라'],['り','리'],['る','루'],['れ','레'],['ろ','로'],
  ['わ','와'],['を','오'],['ん','은'],
  ['が','가'],['ぎ','기'],['ぐ','구'],['げ','게'],['ご','고'],
  ['ざ','자'],['じ','지'],['ず','즈'],['ぜ','제'],['ぞ','조'],
  ['だ','다'],['ぢ','지'],['づ','즈'],['で','데'],['ど','도'],
  ['ば','바'],['び','비'],['ぶ','부'],['べ','베'],['ぼ','보'],
  ['ぱ','파'],['ぴ','피'],['ぷ','푸'],['ぺ','페'],['ぽ','포'],
  ['っ',''],['ー',''],
]

// Post-process: merge 은 (ん) as coda ㄴ of preceding syllable
function applyNasal(kor: string): string {
  const chars = [...kor]
  const result: string[] = []
  for (const c of chars) {
    if (c === '은' && result.length > 0) {
      const prev = result[result.length - 1]
      const dec = decompose(prev)
      if (dec && !dec.jong) {
        const merged = makeSyllable(dec.cho, dec.jung, 'ㄴ')
        if (merged.codePointAt(0)! >= 0xAC00) {
          result[result.length - 1] = merged
          continue
        }
      }
    }
    result.push(c)
  }
  return result.join('')
}

export function hiraganaToKorean(hira: string): string {
  if (!hira) return ''
  let result = hira
  for (const [from, to] of HIRA_MAP) {
    result = result.split(from).join(to)
  }
  return applyNasal(result)
}

// ─── 병음(Pinyin) → 한글 ─────────────────────────────────────────────────────

function normalizePinyin(p: string): string {
  return p
    .replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i').replace(/[ōóǒò]/g, 'o')
    .replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'v')
}

// Pinyin initials: [pinyin_initial, Korean cho jamo]
const PINYIN_INITIALS: [string, string][] = [
  ['zh', 'ㅈ'], ['ch', 'ㅊ'], ['sh', 'ㅅ'],
  ['b', 'ㅂ'], ['p', 'ㅍ'], ['m', 'ㅁ'], ['f', 'ㅍ'],
  ['d', 'ㄷ'], ['t', 'ㅌ'], ['n', 'ㄴ'], ['l', 'ㄹ'],
  ['g', 'ㄱ'], ['k', 'ㅋ'], ['h', 'ㅎ'],
  ['j', 'ㅈ'], ['q', 'ㅊ'], ['x', 'ㅅ'],
  ['r', 'ㄹ'], ['z', 'ㅈ'], ['c', 'ㅊ'], ['s', 'ㅅ'],
  ['y', 'ㅇ'], ['w', 'ㅇ'],
]

// Pinyin finals: [pinyin_final, jung_jamo, jong_jamo]  (jong_jamo='' means no coda)
// Order: longer first
const PINYIN_FINALS: [string, string, string][] = [
  ['iang', 'ㅑ', 'ㅇ'], ['iong', 'ㅛ', 'ㅇ'], ['uang', 'ㅘ', 'ㅇ'],
  ['ang', 'ㅏ', 'ㅇ'], ['eng', 'ㅓ', 'ㅇ'], ['ing', 'ㅣ', 'ㅇ'],
  ['ong', 'ㅜ', 'ㅇ'],
  ['ian', 'ㅣ', 'ㄴ'], ['uan', 'ㅝ', 'ㄴ'],
  ['an', 'ㅏ', 'ㄴ'], ['en', 'ㅓ', 'ㄴ'], ['in', 'ㅣ', 'ㄴ'], ['un', 'ㅜ', 'ㄴ'],
  ['er', 'ㅓ', ''],
  ['a', 'ㅏ', ''], ['e', 'ㅓ', ''], ['i', 'ㅣ', ''],
  ['o', 'ㅗ', ''], ['u', 'ㅜ', ''], ['v', 'ㅜ', ''],
]

// Diphthong finals that expand or use combined jamo
const PINYIN_DIPHTHONGS: Record<string, Array<[string, string]>> = {
  'ao': [['ㅏ', ''], ['ㅗ', '']],
  'ai': [['ㅏ', ''], ['ㅣ', '']],
  'ei': [['ㅔ', ''], ['ㅣ', '']],
  'ou': [['ㅗ', ''], ['ㅜ', '']],
  'ia': [['ㅣ', ''], ['ㅏ', '']],
  'ie': [['ㅣ', ''], ['ㅔ', '']],
  'iu': [['ㅣ', ''], ['ㅜ', '']],
  'ua': [['ㅘ', '']],
  'uo': [['ㅝ', '']],
  'ui': [['ㅜ', ''], ['ㅣ', '']],
  'uai': [['ㅘ', ''], ['ㅣ', '']],
}

function convertPinyinSyllable(syl: string): string {
  // Find initial
  let initialCho = 'ㅇ'
  let finalStr = syl
  for (const [ini, cho] of PINYIN_INITIALS) {
    if (syl.startsWith(ini)) {
      initialCho = cho
      finalStr = syl.slice(ini.length)
      break
    }
  }

  // Check diphthong finals first
  if (PINYIN_DIPHTHONGS[finalStr]) {
    const parts = PINYIN_DIPHTHONGS[finalStr]
    return parts.map(([jung, jong], idx) =>
      makeSyllable(idx === 0 ? initialCho : 'ㅇ', jung, jong)
    ).join('')
  }

  // Check regular finals
  for (const [fin, jung, jong] of PINYIN_FINALS) {
    if (finalStr === fin) {
      return makeSyllable(initialCho, jung, jong)
    }
  }

  // Fallback: return as-is
  return syl
}

export function pinyinToKorean(pinyin: string): string {
  if (!pinyin) return ''
  const normalized = normalizePinyin(pinyin.toLowerCase())
  return normalized.split(' ').filter(Boolean).map(convertPinyinSyllable).join('')
}
