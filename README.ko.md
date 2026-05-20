# AIrirang Builder

[English](README.md) | **한국어**

> **AI 자연어 한 줄로 마인크래프트에 정밀 건축물을 솟아오르게 하는 MCP 서버.**

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)
[![Commercial license available](https://img.shields.io/badge/Commercial-available-success.svg)](LICENSE-COMMERCIAL.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-stdio-7C3AED.svg)](https://modelcontextprotocol.io)

AIrirang Builder는 **3D 메시(.obj) → voxel → /fill greedy meshing → datapack** 파이프라인을 MCP 도구 한 번의 호출(`quick-build`)로 압축합니다. 기존 마인크래프트 AI 봇이 블록당 `place-block`을 수백 번 호출하는 동안, AIrirang Builder는 **1회 호출**로 datapack을 떨어뜨리고 `/function airirang:<id>` 한 줄로 건축이 솟아오릅니다.

---

## 빠른 시작 (5분)

### 1. 설치

```bash
# npx로 즉시 실행 (권장)
npx airirang-builder list-presets

# 또는 글로벌 설치
npm install -g airirang-builder
```

요구사항: **Node 20+**, 마인크래프트 **Java Edition 1.20.5 ~ 1.21.x**.

### 2. Claude Desktop 등록

`claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`)에 다음을 추가하세요.

```json
{
  "mcpServers": {
    "airirang-builder": {
      "command": "npx",
      "args": ["-y", "airirang-builder", "serve"]
    }
  }
}
```

Claude Desktop을 재시작하면 7개 MCP 도구가 자동 등록됩니다.

### 3. 첫 빌드

채팅창에 자연어로 한 줄.

> "House_3 프리셋으로 datapack 만들어줘. outRoot는 `~/minecraft/saves/world/datapacks`로."

클라이언트는 내부적으로 `quick-build` 도구를 **1회** 호출합니다. AIrirang Builder가:

1. 프리셋 `.obj` + `.mtl` 로드
2. 멀티 머티리얼 voxelize
3. greedy meshing으로 `/fill` 압축
4. `pack.mcmeta` + `data/<ns>/function/<id>.mcfunction` 생성

→ 사용자 월드 `datapacks/` 폴더에 즉시 설치됩니다.

### 4. 마인크래프트에서 실행

```mcfunction
# 월드 진입 후 한 번만:
/reload
/function airirang:house_3
```

박공지붕 + 창문까지 수 초 만에 솟아오릅니다.

---

## MCP 도구 (7개)

`serve` 명령으로 stdio MCP 서버가 켜지며, Claude Desktop·VSCode Claude 등 어느 MCP 호환 클라이언트에서나 자동 노출됩니다.

| # | 도구 | 역할 |
|---|---|---|
| 1 | `list-presets` | 동봉된 Quaternius CC0 프리셋 5개 카탈로그 반환. |
| 2 | `voxelize-preset` | 프리셋을 voxelize + greedy → `/fill` 명령 배열 반환 (파일 출력 없음). |
| 3 | `voxelize-custom` | 사용자 `.obj` 경로를 받아 같은 파이프라인 실행. |
| 4 | `generate-mcfunction` | 명령 배열을 `.mcfunction` 파일로 저장. |
| 5 | `execute-build` | 기존 `.mcfunction`을 Java Edition datapack으로 패키징. |
| 6 | **`quick-build`** | **위 파이프라인 전체를 1회 호출로**: load → voxelize → greedy → mcfunction → datapack. |
| 7 | `list-builds` | `outRoot` 아래 빌드된 datapack 목록을 반환. |

### `quick-build` 예제 호출

```jsonc
// MCP tool call (클라이언트가 자동 생성하지만 직접 호출도 가능)
{
  "name": "quick-build",
  "arguments": {
    "presetId": "house_3",
    "name": "airirang-house3",
    "namespace": "airirang",
    "functionId": "house_3",
    "outRoot": "/Users/me/minecraft/saves/world/datapacks",
    "mcVersion": "1.21",
    "pitch": 0.1,
    "fillInterior": true,
    "blockOverrides": {
      "Wood": "minecraft:spruce_planks"
    }
  }
}
```

응답 (요약):

```jsonc
{
  "ok": true,
  "datapackRoot": ".../datapacks/airirang-house3",
  "lineCount": 187,
  "cuboidCount": 184,
  "voxelCount": 9421,
  "packFormat": 57,
  "installMessage": "/reload && /function airirang:house_3"
}
```

`presetId` 대신 `objPath`를 넘기면 자체 메시도 동일하게 처리됩니다.

### CLI 사용

MCP 서버 없이 단독 실행도 지원합니다.

```bash
# 프리셋 카탈로그
npx airirang-builder list-presets

# .obj → voxelize → .mcfunction
npx airirang-builder voxelize path/to/mesh.obj --pitch 0.1 --out mesh.mcfunction

# datapack까지 한 번에
npx airirang-builder build path/to/mesh.obj \
  --name airirang-mesh --out-root ~/minecraft/saves/world/datapacks

# MCP 서버 모드 (Claude Desktop이 이걸 호출)
npx airirang-builder serve
```

---

## 차별점

### vs. yuniko-software/minecraft-mcp-server

| 항목 | yuniko-software | **AIrirang Builder** |
|---|---|---|
| 건축 방식 | 봇이 블록당 `place-block` MCP 호출 | 단 1회 `quick-build` 호출 → datapack |
| 정밀도 | 봇 이동·치팅 한계 (가끔 블록 누락) | voxel 격자 100% 결정론적 |
| 속도 (큰 건축) | 수십 분 ~ 수 시간 | 수 초 (greedy `/fill` 압축) |
| 토큰 효율 | 건축 1개당 수백~수천 토큰 (호출 반복) | 건축 1개당 ~수십 토큰 (1회) |
| 입력 형식 | 자연어 + 좌표 | 자연어 + 3D 메시(.obj) 또는 프리셋 |
| 라이선스 | MIT | AGPL-3.0 + 상업 라이선스 듀얼 |

### 압축 실적

- **Quaternius House_3** (`asset/.../House_3.obj`, pitch=0.1): voxel ~9.4K → `/fill` 명령 **≤ 250 라인**, bbox `[21, 22, 23]`.
- **POC 벤치마크** (TS Vitest로 회귀 보존):
  - `realistic-building`: ≥ **95%** `/fill` 압축
  - `eiffel-lattice`: ≥ **80%** `/fill` 압축 (격자 구조에서도)
- **마크 1.21 실측**: 200 `/fill` 라인 → 박공지붕 + 창문까지 솟아오름.

자세한 검증 데이터는 [doc/02-MCP서버-기술설계서.md](doc/02-MCP서버-기술설계서.md)와 [poc/](poc/) 참조.

---

## 프리셋 — Quaternius CC0

본 패키지는 [Quaternius](https://quaternius.com)가 **CC0 1.0 Universal**로 공개한 *Medieval Village Pack — Dec 2020* 중 5개 모델을 동봉합니다.

| `id` | Display Name | Source |
|---|---|---|
| `house_1` | Medieval House (Plaster + Tile Roof) | Quaternius — Medieval Village Pack (Dec 2020) |
| `house_3` | Medieval House 3 (Stone + Timber) | Quaternius — Medieval Village Pack (Dec 2020) |
| `inn` | Medieval Inn | Quaternius — Medieval Village Pack (Dec 2020) |
| `mill` | Medieval Mill | Quaternius — Medieval Village Pack (Dec 2020) |
| `sawmill` | Medieval Sawmill | Quaternius — Medieval Village Pack (Dec 2020) |

- **저자**: Quaternius
- **출처**: <https://quaternius.com>
- **라이선스**: CC0 1.0 Universal — No Rights Reserved
- **표기 의무**: CC0는 강제하지 않지만, AIrirang Builder는 윤리적 의무로 README와 `src/presets/manifest.json`에 출처·저자를 명기합니다.

Mojang 자산(텍스처·사운드·로고)은 **0% 포함**됩니다. Block ID(`minecraft:spruce_planks` 등)는 게임이 런타임에 해석하는 식별자일 뿐, 본 패키지에는 어떠한 게임 리소스도 들어있지 않습니다.

---

## 라이선스

AIrirang Builder는 **듀얼 라이선스(dual licensing)** 입니다.

| 트랙 | 라이선스 | 대상 | 비용 |
|---|---|---|---|
| 무료 | **AGPL-3.0-or-later** ([LICENSE](LICENSE)) | 개인·교육·오픈소스·AGPL 호환 프로젝트 | 무료 |
| 상업 | **Commercial License** ([LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)) | 사내 폐쇄 소스, 폐쇄 소스 SaaS, AGPL 의무 회피 | 협의 |

- **AGPL-3.0 핵심**: 본 소프트웨어를 수정해 **네트워크 서비스(SaaS·API)** 로 제공하려면 그 수정·서버 측 코드도 AGPL로 공개해야 합니다.
- **상업 라이선스 문의**: 운영 주체 및 연락처는 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) 참조.

전체 약관은 [LICENSE](LICENSE)와 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) 참조.

---

## 디스클레이머

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

"Minecraft"는 Mojang Studios의 등록 상표입니다. 본 프로젝트는 Mojang Commercial Usage Guidelines 준수를 위해 Mojang 자산(텍스처·사운드·로고)을 일절 포함하지 않습니다. 봇 사용은 단일 플레이어 또는 본인이 운영하는 서버에서만 권장합니다.

---

## 기여

작업 흐름은 [CONTRIBUTING.md](CONTRIBUTING.md), 변경 이력은 [CHANGELOG.md](CHANGELOG.md) 참조.

---

*AIrirang Studio*
