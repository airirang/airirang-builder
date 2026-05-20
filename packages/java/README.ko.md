# airirang-builder

[English](README.md) | **한국어**

> **AI 자연어 한 줄 — 또는 CLI 한 줄 — 로 마인크래프트 *자바 에디션*에 정밀 건축물을 솟아오르게. Claude · ChatGPT · Gemini · Cursor · VS Code 등 임의의 MCP 클라이언트에서 동작하며, AI 모델 없이도 사용 가능.**

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-stdio-7C3AED.svg)](https://modelcontextprotocol.io)

`airirang-builder`는 **3D 메시(.obj/.glb) → voxel → /fill greedy meshing → datapack** 파이프라인을 단 1회의 도구 호출(`quick-build`)로 압축합니다. 기존 마인크래프트 AI 봇이 블록당 `place-block`을 수백 번 호출하는 동안, `airirang-builder`는 **1회 호출**로 datapack을 떨어뜨리고 `/function airirang:<id>` 한 줄로 건축이 솟아오릅니다.

**베드락**(Win10/11·모바일·콘솔·Education) 플레이어이시라면 [`airirang-builder-bedrock`](https://www.npmjs.com/package/airirang-builder-bedrock) 을 사용하세요 — datapack 대신 더블클릭으로 설치되는 `.mcaddon` 을 만들어 줍니다.

---

## 세 가지 사용 경로

| 사용자 | 사용 방법 | AI 모델 필요? |
|---|---|:--:|
| 개발자 / 파워유저 | **CLI** (`airirang-builder build …`) | **불필요** |
| AI 도구 사용자 | **MCP 서버**를 임의의 MCP 클라이언트(Claude · ChatGPT · Gemini · Cursor · VS Code · Cline …)에 등록 | 그 클라이언트의 모델 |
| 라이브러리 사용자 | **프로그래매틱 API** (`import { quickBuild } from 'airirang-builder'`) | 불필요 |

MCP는 Claude 전용이 아닌 **개방 표준** 입니다. MCP 호환 클라이언트라면 어디서나 동일하게 본 서버를 구동할 수 있습니다.

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

### 2a. CLI로 사용 (AI 모델 불필요)

```bash
# 프리셋을 바로 월드 datapacks 폴더에 빌드
npx airirang-builder build \
  --preset house_3 \
  --name airirang-house3 \
  --out-root ~/minecraft/saves/world/datapacks

# 또는 자체 .obj / .glb / .gltf
npx airirang-builder build \
  --obj path/to/mesh.obj \
  --name my-build \
  --out-root ~/minecraft/saves/world/datapacks \
  --pitch 0.1
```

JSON 설정도 MCP 클라이언트도 LLM 토큰 비용도 없습니다.

### 2b. MCP 서버로 사용 (임의의 MCP 클라이언트)

**사용하는 MCP 클라이언트의 설정 파일** 에 서버를 한 번 등록합니다. 아래는 모든 주요 MCP 클라이언트가 지원하는 stdio MCP 표준 형식입니다 — 키 이름은 클라이언트마다 다를 수 있습니다 (예: Claude Desktop은 `mcpServers`, Cursor / VS Code MCP 확장 / Gemini CLI / Cline / Continue 등도 유사한 필드).

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

채팅창에 자연어 한 줄:

> "House_3 프리셋으로 datapack 만들어줘. outRoot는 `~/minecraft/saves/world/datapacks`로."

클라이언트는 `quick-build` 도구를 **1회** 호출하고, `airirang-builder`가:

1. 프리셋 `.obj` + `.mtl` 로드
2. 멀티 머티리얼 voxelize
3. greedy meshing으로 `/fill` 압축
4. `pack.mcmeta` + `data/<ns>/function/<id>.mcfunction` 생성

→ 사용자 월드 `datapacks/` 폴더에 즉시 설치됩니다.

### 3. 마인크래프트에서 실행

```mcfunction
# 월드 진입 후 한 번만:
/reload
/function airirang:house_3
```

박공지붕 + 창문까지 수 초 만에 솟아오릅니다.

---

## MCP 도구 (7개)

`serve` 명령으로 stdio MCP 서버가 켜지며, **임의의 MCP 호환 클라이언트** — Claude 만이 아닙니다 — 에서 자동 노출됩니다.

| # | 도구 | 역할 |
|---|---|---|
| 1 | `list-presets` | 동봉된 Quaternius CC0 프리셋 5개 카탈로그 반환. |
| 2 | `voxelize-preset` | 프리셋을 voxelize + greedy → `/fill` 명령 배열 반환 (파일 출력 없음). |
| 3 | `voxelize-custom` | 사용자 `.obj` / `.glb` / `.gltf` 경로를 받아 같은 파이프라인 실행. |
| 4 | `generate-mcfunction` | 명령 배열을 `.mcfunction` 파일로 저장. |
| 5 | `execute-build` | 기존 `.mcfunction`을 Java Edition datapack으로 패키징. |
| 6 | **`quick-build`** | **위 파이프라인 전체를 1회 호출로**: load → voxelize → greedy → mcfunction → datapack. |
| 7 | `list-builds` | `outRoot` 아래 빌드된 datapack 목록을 반환. |

### `quick-build` 예제 호출

```jsonc
// MCP tool call — 클라이언트가 자동 생성하지만 직접 호출도 가능.
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

---

## CLI 사용

MCP 서버 없이 단독 실행도 지원합니다.

```bash
# 프리셋 카탈로그
npx airirang-builder list-presets

# .obj → voxelize → .mcfunction
npx airirang-builder voxelize path/to/mesh.obj --pitch 0.1 --out mesh.mcfunction

# datapack까지 한 번에
npx airirang-builder build path/to/mesh.obj \
  --name airirang-mesh --out-root ~/minecraft/saves/world/datapacks

# MCP 서버 모드 (임의의 MCP 클라이언트가 이걸 호출)
npx airirang-builder serve
```

---

## 차별점

### vs. yuniko-software/minecraft-mcp-server

| 항목 | yuniko-software | **airirang-builder** |
|---|---|---|
| 건축 방식 | 봇이 블록당 `place-block` MCP 호출 | 단 1회 `quick-build` 호출 → datapack |
| 정밀도 | 봇 이동·치팅 한계 (가끔 블록 누락) | voxel 격자 100% 결정론적 |
| 속도 (큰 건축) | 수십 분 ~ 수 시간 | 수 초 (greedy `/fill` 압축) |
| 토큰 효율 | 건축 1개당 수백~수천 토큰 (호출 반복) | 건축 1개당 ~수십 토큰 (1회) |
| 입력 형식 | 자연어 + 좌표 | 자연어 + 3D 메시(.obj/.glb) 또는 프리셋 |
| MCP 클라이언트 | Claude 중심 | 임의의 MCP 호환 클라이언트 |
| 라이선스 | MIT | Apache-2.0 |

### 압축 실적

- **Quaternius House_3** (pitch=0.1): voxel ~9.4K → `/fill` 명령 **≤ 250 라인**, bbox `[21, 22, 23]`.
- **회귀 보존 벤치마크** (Vitest):
  - `realistic-building`: ≥ **95%** `/fill` 압축
  - `eiffel-lattice`: ≥ **80%** `/fill` 압축 (격자 구조에서도)
- **마크 1.21 실측**: 200 `/fill` 라인 → 박공지붕 + 창문까지 솟아오름.

---

## 프리셋 — Quaternius CC0

본 패키지는 [Quaternius](https://quaternius.com)가 **CC0 1.0 Universal**로 공개한 *Medieval Village Pack — Dec 2020* 중 5개 모델을 동봉합니다.

| `id` | Display Name |
|---|---|
| `house_1` | Medieval House (Plaster + Tile Roof) |
| `house_3` | Medieval House 3 (Stone + Timber) |
| `inn` | Medieval Inn |
| `mill` | Medieval Mill |
| `sawmill` | Medieval Sawmill |

- **저자**: Quaternius
- **출처**: <https://quaternius.com>
- **라이선스**: CC0 1.0 Universal — No Rights Reserved

Mojang 자산(텍스처·사운드·로고)은 **0% 포함**됩니다. Block ID(`minecraft:spruce_planks` 등)는 게임이 런타임에 해석하는 식별자일 뿐, 본 패키지에는 어떠한 게임 리소스도 들어있지 않습니다.

---

## 라이선스

`airirang-builder`는 **Apache License 2.0** ([LICENSE](LICENSE)) 라이선스입니다.

개인·교육·오픈소스 **그리고 상업·폐쇄소스까지** 자유롭게 사용 가능 — 저작권 표시와 NOTICE만 유지하면 됩니다. copyleft 없음, 별도 상업 라이선스 불필요.

---

## 디스클레이머

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

"Minecraft"는 Mojang Studios의 등록 상표입니다. 본 프로젝트는 Mojang Commercial Usage Guidelines 준수를 위해 Mojang 자산(텍스처·사운드·로고)을 일절 포함하지 않습니다. 사용은 단일 플레이어 또는 본인이 운영하는 서버에서만 권장합니다.

---

*AIrirang Studio*
