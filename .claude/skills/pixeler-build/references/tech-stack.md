# Pixeler 기술 스택 레퍼런스

구현 시 참조하는 기술 스택 및 아키텍처 가이드.

## 목차
1. [프론트엔드](#프론트엔드)
2. [AI 파이프라인](#ai-파이프라인)
3. [프로젝트 구조](#프로젝트-구조)
4. [내보내기](#내보내기)

---

## 프론트엔드

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | React 18+ (TypeScript) | 컴포넌트 기반, Tauri 호환 |
| 빌드 | Vite | 빠른 HMR, 가벼운 설정 |
| 상태 관리 | Zustand 또는 React Context | 단순함 우선 |
| 캔버스 | HTML Canvas API 직접 사용 | 픽셀 단위 제어 필요 |
| 스타일 | Tailwind CSS 또는 CSS Modules | 빠른 개발 |

### Canvas 구현 가이드
- `ImageData`로 직접 픽셀 조작
- `CanvasRenderingContext2D.getImageData()` / `putImageData()` 사용
- Undo/Redo: ImageData 스냅샷 스택 (메모리 고려하여 최대 50개)
- 줌: CSS transform으로 캔버스 스케일링, 실제 데이터는 원본 해상도 유지
- 그리드 오버레이: 별도 캔버스 레이어로 렌더링

## AI 파이프라인

### 어댑터 패턴 구조

```typescript
// src/services/ai/types.ts
interface AIAdapter {
  generateImage(prompt: string, options: GenerateOptions): Promise<GeneratedImage>;
  inpaint(image: ImageData, mask: ImageData, prompt: string): Promise<GeneratedImage>;
  generateDirections(baseImage: ImageData, directions: Direction[]): Promise<DirectionSet>;
}

interface GenerateOptions {
  width: number;
  height: number;
  style: 'pixel-art' | 'general';
  palette?: string[];  // hex colors
  viewType: 'top-down' | 'side' | 'quarter';
}

interface GeneratedImage {
  imageData: ImageData;
  metadata: {
    model: string;
    prompt: string;
    timestamp: number;
  };
}
```

### 후처리 파이프라인

```
AI 원본 출력
  → 1. 다운스케일 (목표 해상도로 nearest-neighbor)
  → 2. 팔레트 매핑 (사용자 팔레트 또는 자동 추출)
  → 3. 안티앨리어싱 제거 (중간색 → 가장 가까운 팔레트 색)
  → 4. 아웃라인 정리 (1px 외곽선 일관성)
  → 5. 투명 배경 처리
```

후처리 강도는 모델 타입에 따라 자동 조절:
- 범용 모델 (DALL-E, GPT Image 등): 전체 파이프라인 적용
- 픽셀아트 특화 모델: 팔레트 매핑 + 투명 배경만 적용

### 지원 AI 제공자 (MVP)

| 제공자 | API | 특징 |
|--------|-----|------|
| OpenAI | GPT Image / DALL-E 3 | 범용, 프롬프트 이해력 높음 |
| Stability AI | Stable Diffusion API | 이미지 특화, inpainting 강점 |

추후 확장: Anthropic (이미지 생성 지원 시), 로컬 AI (Tauri 전환 시)

## 프로젝트 구조

```
pixeler/
├── src/
│   ├── components/         # React 컴포넌트
│   │   ├── Canvas/         # 픽셀 에디터 캔버스
│   │   ├── Toolbar/        # 도구 패널 (펜, 지우개, 색 등)
│   │   ├── AIPanel/        # AI 생성/피드백 패널
│   │   ├── Preview/        # 스프라이트 프리뷰, 애니메이션
│   │   ├── History/        # 대화 히스토리
│   │   └── Export/         # 내보내기 UI
│   ├── services/
│   │   └── ai/
│   │       ├── types.ts    # 공유 인터페이스 (프론트+AI 공통)
│   │       ├── adapter.ts  # 어댑터 팩토리
│   │       ├── providers/  # 각 AI 제공자별 어댑터
│   │       └── postprocess/ # 후처리 파이프라인
│   ├── stores/             # 상태 관리
│   ├── utils/              # 유틸리티
│   └── types/              # 전역 타입
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 내보내기

### PNG 단일 이미지
- 개별 방향/프레임을 PNG로 저장
- 투명 배경 지원

### 스프라이트 시트
- 모든 방향 × 모든 프레임을 하나의 PNG에 배치
- 배치 방식: 행 = 방향, 열 = 프레임 (커스터마이즈 가능)
- 메타데이터 JSON 동봉:

```json
{
  "frameWidth": 32,
  "frameHeight": 32,
  "animations": {
    "idle": { "row": 0, "frames": 4, "fps": 8 },
    "walk": { "row": 1, "frames": 6, "fps": 12 }
  },
  "directions": ["down", "left", "right", "up", "down-left", "down-right", "up-left", "up-right"]
}
```

### Unity 호환
- PNG + 위 JSON 메타데이터면 Unity에서 Sprite Editor로 자동 슬라이싱 가능
- 추후: `.unitypackage` 직접 생성 (확장 기능)
