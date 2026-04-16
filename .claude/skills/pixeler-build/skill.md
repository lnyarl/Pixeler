---
name: pixeler-build
description: "Pixeler 프로젝트의 기능을 기획하고 구현하는 오케스트레이터. 기능 요청 → 스펙 → 구현 → QA 전체 빌드 사이클을 조율한다. '만들어줘', '구현해줘', '추가해줘', '기능 개발', 'build', '빌드' 요청 시 반드시 이 스킬을 사용할 것. 단순 버그 수정이나 1개 파일 수정은 제외."
---

# Pixeler Build Orchestrator

Pixeler 프로젝트의 기능 빌드 사이클을 조율하는 오케스트레이터.
스펙 → 구현 → QA 파이프라인을 서브 에이전트로 실행한다.

## 실행 모드: 서브 에이전트

개발 작업은 코드/파일로 소통하므로 실시간 메시지 교환보다 결과 전달이 핵심이다.

## 프로젝트 컨텍스트

Pixeler는 AI 기반 픽셀 스프라이트 제작 웹앱이다:
- **플랫폼:** 웹앱 (나중에 Tauri 래핑 가능한 구조)
- **서버:** 없음. 사용자 본인의 AI API 키 사용, 프론트엔드에서 직접 호출
- **핵심 워크플로우:** 텍스트/스케치 입력 → AI 초안 생성 → 피드백 루프 → 다방향 생성 → 내보내기
- **기술 스택:** React 18+ (TypeScript), HTML Canvas, Vite
- **AI:** 어댑터 패턴, 하이브리드 모델 (범용+후처리 / 특화)

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 출력 |
|---------|--------------|------|------|
| pixeler-planner | pixeler-planner | 기능 스펙 작성 | `_workspace/01_planner_spec.md` |
| pixeler-frontend | pixeler-frontend | 프론트엔드 구현 | `src/` |
| pixeler-ai | pixeler-ai | AI 파이프라인 구현 | `src/services/ai/` |
| pixeler-qa | pixeler-qa | 품질 검증 | `_workspace/qa_report.md` |

## 워크플로우

### Phase 1: 준비
1. 사용자 요청 분석 — 어떤 기능을 만들 것인지 파악
2. `_workspace/` 디렉토리 생성 (없으면)
3. 기존 코드 상태 확인 (프로젝트 초기화 여부, 관련 코드 존재 여부)

### Phase 2: 기획 (Planner)

기능 규모 판단:
- **소규모** (UI 컴포넌트 1개, 로직 변경 등): Phase 2 스킵, 바로 Phase 3
- **중~대규모** (새 기능, 여러 모듈 변경): Planner 에이전트 호출

```
Agent(
  name: "planner",
  subagent_type: "pixeler-planner",
  model: "opus",
  prompt: "[기능 요구사항 + 기존 코드 컨텍스트]"
)
```

Planner 산출물을 Read하여 구현 범위를 확인한다.

### Phase 3: 구현 (Frontend + AI)

기능에 따라 필요한 에이전트만 호출한다:

**프론트엔드만 필요한 경우:**
```
Agent(
  name: "frontend",
  subagent_type: "pixeler-frontend",
  model: "opus",
  prompt: "[스펙 + 구현 지시]"
)
```

**AI 파이프라인만 필요한 경우:**
```
Agent(
  name: "ai",
  subagent_type: "pixeler-ai",
  model: "opus",
  prompt: "[스펙 + 구현 지시]"
)
```

**둘 다 필요한 경우 — 병렬 실행:**
1. 먼저 공유 인터페이스(`src/services/ai/types.ts`)를 정의
2. 두 에이전트를 병렬로 호출 (run_in_background: true)

```
Agent(name: "frontend", subagent_type: "pixeler-frontend", model: "opus",
      prompt: "[스펙 + 인터페이스 정의]", run_in_background: true)
Agent(name: "ai", subagent_type: "pixeler-ai", model: "opus",
      prompt: "[스펙 + 인터페이스 정의]", run_in_background: true)
```

### Phase 4: QA (선택적)

중~대규모 기능이거나 여러 모듈이 변경된 경우 QA 실행:

```
Agent(
  name: "qa",
  subagent_type: "pixeler-qa",
  model: "opus",
  prompt: "[스펙 + 변경된 파일 목록 + 검증 기준]"
)
```

QA 리포트에서 문제가 발견되면:
1. 문제를 분류 (프론트엔드 vs AI vs 통합)
2. 해당 에이전트를 재호출하여 수정
3. 재수정 후 QA 재실행 (최대 2회)

### Phase 5: 정리
1. `_workspace/` 보존
2. 사용자에게 결과 요약:
   - 구현된 기능 목록
   - 변경된 파일 목록
   - QA 결과 요약
   - 알려진 제한사항

## 데이터 흐름

```
사용자 요청
    ↓
[Planner] → spec.md
    ↓
[인터페이스 정의] → types.ts
    ↓
[Frontend] ──→ src/ (UI)
[AI]       ──→ src/services/ai/ (파이프라인)
    ↓
[QA] → qa_report.md
    ↓
(문제 시) → 해당 에이전트 재호출
    ↓
사용자에게 결과 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| Planner 실패 | 1회 재시도. 재실패 시 사용자에게 수동 스펙 작성 요청 |
| Frontend/AI 에이전트 실패 | 1회 재시도. 재실패 시 해당 부분 스킵하고 나머지 결과 보고 |
| QA에서 문제 발견 | 해당 에이전트 재호출 (최대 2회). 그래도 실패 시 문제 목록과 함께 보고 |
| 인터페이스 불일치 | 인터페이스 타입 파일을 기준으로 불일치 부분 식별 → 해당 에이전트 수정 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "캔버스에 펜 도구 추가해줘" 요청
2. Phase 1: 소규모 기능으로 판단
3. Phase 2: 스킵 (소규모)
4. Phase 3: pixeler-frontend만 호출, Canvas 펜 도구 구현
5. Phase 5: 변경 파일 목록과 함께 결과 보고

### 에러 흐름
1. 사용자가 "AI 어댑터 + 생성 화면 만들어줘" 요청
2. Phase 2: Planner가 스펙 작성
3. Phase 3: Frontend + AI 병렬 실행, AI 에이전트 실패
4. AI 에이전트 1회 재시도 → 성공
5. Phase 4: QA에서 인터페이스 불일치 발견
6. 불일치 수정 후 QA 재실행 → 통과
7. Phase 5: 결과 보고 (재시도 이력 포함)
