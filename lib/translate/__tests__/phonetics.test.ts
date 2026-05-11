import { ipaToKorean, hiraganaToKorean, pinyinToKorean } from '../phonetics'

describe('ipaToKorean', () => {
  it('기본 모음 변환', () => {
    expect(ipaToKorean('hɛloʊ')).toBe('헬로우')
  })
  it('자음 변환', () => {
    expect(ipaToKorean('wɔːtər')).toBe('워터')
  })
  it('빈 문자열', () => {
    expect(ipaToKorean('')).toBe('')
  })
})

describe('hiraganaToKorean', () => {
  it('기본 음절 변환', () => {
    expect(hiraganaToKorean('ろせんず')).toBe('로센즈')
  })
  it('혼합 음절', () => {
    expect(hiraganaToKorean('こんにちは')).toBe('콘니치하')
  })
  it('빈 문자열', () => {
    expect(hiraganaToKorean('')).toBe('')
  })
})

describe('pinyinToKorean', () => {
  it('기본 변환', () => {
    expect(pinyinToKorean('nǐ hǎo')).toBe('니하오')
  })
  it('성조 기호 처리', () => {
    expect(pinyinToKorean('zhōng guó')).toBe('중궈')
  })
  it('빈 문자열', () => {
    expect(pinyinToKorean('')).toBe('')
  })
})
