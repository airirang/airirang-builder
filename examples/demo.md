# AIrirang Builder — 5분 데모 영상 시나리오

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**
>
> 본 문서는 데모 영상 촬영용 콘티(스토리보드 + 자막 + 명령 트랜스크립트)입니다. OBS 등으로 5분 분량으로 녹화하고 README에 임베드합니다. 실제 음성 내레이션은 선택 — 자막만으로도 의도가 전달되도록 작성했습니다.

---

## 0. 사전 준비 (촬영 전 체크리스트)

| # | 항목 | 명령 / 확인 |
|---|---|---|
| 1 | 리포 클린 빌드 | `npm install && npm run build` |
| 2 | 단위·통합 테스트 그린 | `npm test` |
| 3 | 프리셋 5개 로드 확인 | `npx tsx src/cli/bin.ts list-presets` → 5줄 출력 |
| 4 | Claude Desktop 설치 + 본 폴더의 `claude_desktop_config.json` 적용 | `examples/claude_desktop_config.json` 참고 |
| 5 | 마인크래프트 Java Edition 1.21 (1.20.5+ 어떤 버전이든) + 빈 슈퍼플랫 월드 1개 (월드명 `airirang-demo`) | 게임모드 크리에이티브, `/gamerule sendCommandFeedback false` 권장 |
| 6 | 화면 캡처 — OBS 1920×1080 30fps, 좌측 Claude Desktop / 우측 Minecraft 분할 화면 | 자막 트랙은 OBS 텍스트 소스 또는 후편집 |

> ⚠️ **데모 중 datapack 출력 경로**: Windows의 경우 `%APPDATA%\.minecraft\saves\airirang-demo\datapacks` — quick-build 호출 시 `outRoot` 인자에 그대로 전달.

---

## 1. 콘티 — 타임라인 (총 5:00)

### 00:00 — 00:30 · 인트로

**화면**: 검정 배경 → 로고 페이드인 → 디스클레이머 큼지막하게.

**자막 (상단 풀스크린)**:

```
AIrirang Builder
AI 자연어 → 마인크래프트 정밀 건축 · MCP 서버

NOT AN OFFICIAL MINECRAFT PRODUCT.
NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
```

**자막 (하단 한 줄)**: `Claude가 도구를 단 1번 호출하면, 건축물이 솟아오릅니다.`

> 디스클레이머는 풀스크린으로 **최소 5초 노출**. Mojang 가이드라인 준수.

---

### 00:30 — 00:45 · Claude Desktop 입력

**화면**: 좌측 Claude Desktop 채팅창 클로즈업.

**사용자 입력 (타이핑 애니메이션)**:

```
중세 가옥(House_3)을 내 마인크래프트 월드에 지어줘.
datapack은 C:\Users\me\AppData\Roaming\.minecraft\saves\airirang-demo\datapacks 에 넣어줘.
```

**자막 (하단)**: `자연어 한 줄이면 충분합니다.`

---

### 00:45 — 01:00 · `quick-build` 1회 호출

**화면**: Claude Desktop이 MCP 도구 호출 카드를 표시. 카드 본문에 `airirang-builder · quick-build` 강조.

**자막 (오른쪽 패널)**:

```
MCP 도구 호출 1회로 완료
─────────────────
tool: airirang-builder.quick-build
args:
  presetId: "house_3"
  name: "airirang-house3"
  outRoot: "...\saves\airirang-demo\datapacks"
```

**옵션 콜아웃**: yuniko/mindcraft는 같은 작업에 **수백 번의 `place-block` 호출** 필요. AIrirang Builder는 **1회**.

---

### 01:00 — 02:00 · 마크에 솟아오름 (타임랩스)

**화면**: 우측 Minecraft 창으로 전환.

**플레이어 입력 시퀀스** (자막에 동시 표기):

```
/reload
/function airirang:airirang-house3
```

**시각 효과**:
- `/function` 직후 200여 개 `/fill` 명령이 연쇄 실행되며 박공지붕·창문·돌담이 순차로 솟아오름.
- 카메라 워크: 처음 5초는 1인칭 정면, 이후 3인칭으로 후퇴(F5 더블 탭) + 좌우로 천천히 회전.
- 빌드 완료 시점에 **0.5초 화면 깜빡임** + 효과음(선택).

**자막 (하단)**: `voxel 7,800+ → /fill 200 lines (99.7% 압축).`

---

### 02:00 — 04:00 · 5개 프리셋 순회 빌드

**화면**: 분할 화면 좌측에 Claude Desktop 입력, 우측에 마크 빌드 결과를 5번 반복.

**시퀀스 (각 24초씩, 총 2:00)**:

| # | 사용자 발화 (Claude) | 마크 결과 |
|---|---|---|
| 1 | `House_1을 200블록 옆에 지어줘` | 회벽+기와 가옥 |
| 2 | `Inn을 그 옆에 지어줘` | 2층 여관 |
| 3 | `Mill도` | 풍차 |
| 4 | `Sawmill도` | 제재소 |
| 5 | `(전체 줌아웃 카메라)` | 마을 풍경 1컷 |

**자막 (좌측 상단 고정)**:

```
프리셋 5개 (Quaternius CC0)
house_1 · house_3 · inn · mill · sawmill
```

**자막 (하단)**: `각 빌드는 quick-build 1회 호출. Claude의 토큰 사용량은 평균 1.2K.`

---

### 04:00 — 05:00 · yuniko 대비 비교

**화면**: 흰 배경에 좌우 비교 표.

**비교표 (전체화면)**:

```
                    │  yuniko-mcp        │  AIrirang Builder
────────────────────┼────────────────────┼──────────────────────
MCP 도구 호출 횟수    │  수백 ~ 수천 회     │  1회 (quick-build)
3D 메시 입력         │  ✗                │  ✓ (.obj + .mtl)
greedy meshing       │  ✗                │  ✓ (99.7% 압축 검증)
머티리얼 → 블록 매칭  │  ✗                │  ✓ (sRGB→Lab Delta E76)
프리셋 라이브러리     │  ✗                │  ✓ (5개, 확장 가능)
출력 형태            │  실시간 place-block│  Java datapack
```

**자막 (하단, 연속 2개)**:

1. `1회 호출. 정밀. 빠름.`
2. `시장 공백을 한국 1인 개발자가 채웠습니다.`

---

### 05:00 — 05:10 · GitHub URL + 엔딩 자막

**화면**: 검정 배경 → 로고 + URL 페이드인.

**자막 (풀스크린, 3줄)**:

```
github.com/airirang/airirang-builder
AGPL-3.0 · 상업 라이선스 별도

정밀한 마크 건축의 AI 표준은 한국 1인 개발자가 정의했다.
```

**최하단 미세 자막 (Mojang 의무 재고지)**:

```
NOT AN OFFICIAL MINECRAFT PRODUCT.
Minecraft assets are property of Mojang AB / Microsoft.
Presets © Quaternius (CC0 1.0).
```

---

## 2. 자동 실행 스크립트

데모 영상 촬영 시 **사람이 동시에 키보드를 칠 필요가 없도록**, `examples/end-to-end.ts` 가 House_3 한 채를 1회 자동 빌드합니다.

```bash
npx tsx examples/end-to-end.ts
```

콘솔 출력 예시:

```
[airirang-builder] NOT AN OFFICIAL MINECRAFT PRODUCT.
[1/5] loadScene  : House_3.obj (6 materials)
[2/5] voxelize   : 7,863 voxels @ pitch=0.1
[3/5] greedy     : 192 cuboids (98.6% compression)
[4/5] mcfunction : 192 lines  →  <tmp>\airirang-demo\airirang-house3.mcfunction
[5/5] datapack   : <tmp>\airirang-demo\airirang-house3\  (pack_format=48)
verify ok: bbox=[21,22,23], lines≤250.
```

마크에 설치하려면 위 스크립트의 `outRoot` 를 본인 월드의 `datapacks/` 경로로 바꿔 실행합니다.

---

## 3. 촬영 팁

- **마우스 커서는 가리기** — OBS 「커서 캡처 해제」 옵션.
- **터미널 폰트는 16pt 이상** — `Cascadia Code` 또는 `JetBrains Mono`.
- **Claude Desktop은 라이트 테마 권장** — 마크 어두운 화면과 대비.
- **타임랩스 구간**(01:00–02:00) **2× 속도** — 200개 `/fill`이 한 호흡에 솟아오르도록.
- **음악**은 CC0 또는 본인 작곡. Mojang의 마인크래프트 OST는 절대 금지.
- **썸네일**: 5개 프리셋이 한 화면에 들어간 마을 풍경 + 큼지막한 「1회 호출」 자막.

---

## 4. 게시 채널

| 채널 | 게시물 형태 |
|---|---|
| YouTube | 5분 영상 본편 + 30초 쇼츠(인트로 + 빌드 솟아오름 + GitHub URL) |
| Reddit r/MinecraftCommands | 영상 임베드 + datapack 출력 GIF |
| Reddit r/mcp | 영상 + `claude_desktop_config.json` 코드 블록 |
| HN (Show HN) | 영상 + README 링크 + 토큰 효율 차트 |
| X / Threads | 30초 쇼츠 + 한 줄 카피 |

---

*AIrirang Studio | NOT AN OFFICIAL MINECRAFT PRODUCT.*
