# 음성 학습 모드 설계

**날짜:** 2026-05-13
**상태:** 승인됨

---

## 개요

기존 학습 모드(카드 뒤집기, 객관식, 주관식)에 음성 학습 모드를 추가한다.
TTS로 질문을 읽어주고, 사용자가 음성으로 답변하면 유사도 기반으로 채점한다.

---

## 전체 흐름

```
모드 선택 화면
  └─ "음성 학습" 클릭
       └─ 방향 선택 화면
            ├─ 앞→뒤 (앞면을 듣고 뒷면 말하기)
            └─ 뒤→앞 (뒷면을 듣고 앞면 말하기)
                 └─ VoiceCard (반복)
                      ├─ [reading]         질문 TTS 자동 재생
                      ├─ [listening]       마이크 버튼 → STT
                      ├─ [result-correct]  ✅ 1.5초 후 자동 다음
                      └─ [result-wrong]    ❌ 정답 확인 후 수동 다음
```

---

## VoiceCard 컴포넌트

### Phase 상태머신

| Phase | 화면 구성 | 전환 조건 |
|---|---|---|
| `reading` | 질문 텍스트 + 🔊 애니메이션 | TTS 종료 → `listening` |
| `listening` | 질문 텍스트 + 🎤 버튼 | 인식 결과 수신 → `result-correct` or `result-wrong` |
| `result-correct` | 질문 텍스트 + ✅ 인식 텍스트 | 1.5초 후 자동 `onResult(true)` |
| `result-wrong` | 질문 텍스트 + ❌ 인식 텍스트 + 정답 + 다음 버튼 | 버튼 클릭 → `onResult(false)` |

### 모든 phase에서 질문 텍스트 유지

### 엣지케이스

- **STT 미지원 브라우저**: "이 브라우저는 음성 인식을 지원하지 않습니다" 안내 표시
- **마이크 권한 거부**: 에러 메시지 표시, 재시도 버튼
- **묵음 / 인식 결과 없음**: "다시 말해주세요" 안내 후 `listening` 유지

---

## 언어 감지

카드에 언어 필드가 없으므로 텍스트 내 한글 포함 여부로 판별한다.

```ts
function detectLang(text: string): string {
  return /[가-힣]/.test(text) ? 'ko-KR' : 'en-US'
}
```

- 한글 포함 → `ko-KR`
- 그 외 → `en-US`

> 일본어·중국어 카드는 현재 범위 밖. 추후 확장 예정.

---

## 채점 (Fuzzy Matching)

Levenshtein 거리 기반 유사도 80% 이상이면 정답으로 판정한다.

```ts
// lib/algorithms/grading.ts 에 추가
export function gradeVoiceAnswer(transcript: string, correct: string): boolean {
  return similarity(transcript, correct) >= 0.8
}
```

---

## 방향 선택 UI

`mode === 'voice'` 이고 `voiceDirection === null`일 때 방향 선택 화면을 렌더한다.
기존 모드 선택 버튼과 동일한 스타일 사용.

---

## 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `types/database.ts` | 수정 | `StudyMode`에 `'voice'` 추가 |
| `lib/algorithms/grading.ts` | 수정 | `gradeVoiceAnswer()` 추가 |
| `components/learn/voice-card.tsx` | 신규 | VoiceCard 컴포넌트 |
| `app/learn/[id]/page.tsx` | 수정 | MODES 추가, 방향 선택 UI, VoiceCard 렌더링 |

---

## 브라우저 지원

| 브라우저 | TTS | STT |
|---|---|---|
| Chrome / Edge | ✅ | ✅ (`SpeechRecognition`) |
| Safari | ✅ | ✅ (`webkitSpeechRecognition`) |
| Firefox | ✅ | ❌ (안내 메시지 표시) |
