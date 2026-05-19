# AIrirang Builder

> **AI 자연어 한 줄로 마인크래프트에 정밀 건축물을 솟아오르게 하는 MCP 서버.**
> Build precise Minecraft structures from a single natural-language prompt — via MCP.

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)
[![Commercial license available](https://img.shields.io/badge/Commercial-available-success.svg)](LICENSE-COMMERCIAL.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-stdio-7C3AED.svg)](https://modelcontextprotocol.io)

AIrirang Builder는 **3D 메시(.obj) → voxel → /fill greedy meshing → datapack** 파이프라인을 MCP 도구 한 번의 호출(`quick-build`)로 압축합니다. yuniko 류 봇이 블록당 `place-block`을 수백 번 호출하는 동안, AIrirang Builder는 **1회 호출**로 datapack 을 떨어뜨리고 `/function airirang:<id>` 한 줄로 건축이 솟아오릅니다.

AIrirang Builder collapses the full 3D-mesh → voxel → greedy-meshed `/fill` → datapack pipeline into a single MCP tool call (`quick-build`). Where existing Minecraft AI agents fire hundreds of `place-block` calls, AIrirang Builder ships a datapack in one shot and the world renders in seconds.

---

## Quick Start (5분 / 5-minute)

### 1. 설치 / Install

```bash
# npx 로 즉시 실행 (권장)
npx airirang-builder list-presets

# 또는 글로벌 설치
npm install -g airirang-builder
```

요구사항 / Requirements: **Node 20+**, Minecraft **Java Edition 1.20.5 ~ 1.21.x**.

### 2. Claude Desktop 등록 / Register with Claude Desktop

`claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`)에 다음을 추가하세요. Add this to your Claude Desktop config:

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

Claude Desktop을 재시작하면 7개 MCP 도구가 자동 등록됩니다. Restart Claude Desktop and the seven tools are exposed automatically.

### 3. 첫 빌드 / First build

Claude 채팅창에 자연어로 한 줄.

> "House_3 프리셋으로 datapack 만들어줘. outRoot는 `~/minecraft/saves/world/datapacks` 로."
>
> *Or in English:* "Build the House_3 preset into `~/minecraft/saves/world/datapacks`."

Claude는 내부적으로 `quick-build` 도구를 **1회** 호출합니다. AIrirang Builder가:

1. 프리셋 `.obj` + `.mtl` 로드
2. 멀티 머티리얼 voxelize
3. greedy meshing 으로 `/fill` 압축
4. `pack.mcmeta` + `data/<ns>/function/<id>.mcfunction` 생성

→ 사용자 월드 `datapacks/` 폴더에 즉시 설치됩니다.

### 4. 마인크래프트에서 실행 / Run in Minecraft

```mcfunction
# 월드 진입 후 한 번만:
/reload
/function airirang:house_3
```

박공지붕 + 창문까지 솟아오릅니다. Pitched roof + windows materialize in seconds.

---

## MCP 도구 (7개) / MCP Tools (7)

`serve` 명령으로 stdio MCP 서버가 켜지며, Claude Desktop·VSCode Claude 등 어느 MCP 호환 클라이언트에서나 자동 노출됩니다.

| # | 도구 / Tool | 역할 / Purpose |
|---|---|---|
| 1 | `list-presets` | 동봉된 5개 Quaternius CC0 프리셋 카탈로그 반환. Returns the bundled CC0 preset catalog. |
| 2 | `voxelize-preset` | 프리셋을 voxelize + greedy → `/fill` 명령 배열 반환 (파일 출력 없음). Pipeline output as command lines, no disk writes. |
| 3 | `voxelize-custom` | 사용자 `.obj` 경로를 받아 같은 파이프라인 실행. Same pipeline on a user-supplied `.obj`. |
| 4 | `generate-mcfunction` | 명령 배열을 `.mcfunction` 파일로 저장. Persist commands to a `.mcfunction` file. |
| 5 | `execute-build` | 기존 `.mcfunction` 을 Java Edition datapack으로 패키징. Wrap a `.mcfunction` into a datapack. |
| 6 | **`quick-build`** | **위 파이프라인 전체를 1회 호출로**: load → voxelize → greedy → mcfunction → datapack. Flagship one-shot tool. |
| 7 | `list-builds` | `outRoot` 아래 빌드된 datapack 목록을 반환. Lists previously built datapacks under `outRoot`. |

### `quick-build` 예제 / Example call

```jsonc
// MCP tool call (Claude가 자동으로 생성하지만 직접 호출도 가능)
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

응답 / Response (요약):

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

`objPath` 를 대신 넘기면 자체 메시도 동일하게 처리됩니다. Pass `objPath` instead of `presetId` to build from your own `.obj`.

### CLI 사용 / CLI Usage

MCP 서버 없이 단독 실행도 지원합니다. Standalone CLI is available too.

```bash
# 프리셋 카탈로그
npx airirang-builder list-presets

# .obj voxelize → .mcfunction
npx airirang-builder voxelize path/to/mesh.obj --pitch 0.1 --out mesh.mcfunction

# datapack 까지 한 번에
npx airirang-builder build path/to/mesh.obj \
  --name airirang-mesh --out-root ~/minecraft/saves/world/datapacks

# MCP 서버 모드 (Claude Desktop 이 이걸 호출)
npx airirang-builder serve
```

---

## 차별점 / Why AIrirang Builder

### vs. yuniko-software/minecraft-mcp-server

| 항목 / Dimension | yuniko-software | **AIrirang Builder** |
|---|---|---|
| 건축 방식 / Build mechanism | 봇이 블록당 `place-block` MCP 호출 | 단 1회 `quick-build` 호출 → datapack |
| Build mechanism (EN) | Bot issues `place-block` per block | Single `quick-build` call emits a datapack |
| 정밀도 / Precision | 봇 이동·치팅 한계 (가끔 블록 누락) | voxel 격자 100% 결정론적 |
| Precision (EN) | Bound by bot pathing | Deterministic voxel grid |
| 속도 (큰 건축) / Speed (large build) | 수십 분 ~ 수 시간 | 수 초 (greedy `/fill` 압축) |
| Speed (EN) | Minutes to hours | Seconds (greedy `/fill`) |
| 토큰 효율 / Token efficiency | 건축 1개당 수백~수천 토큰 (호출 반복) | 건축 1개당 ~수십 토큰 (1회) |
| Token efficiency (EN) | Hundreds–thousands per build | Tens (single call) |
| 입력 형식 / Input | 자연어 + 좌표 | 자연어 + 3D 메시(.obj) 또는 프리셋 |
| Input (EN) | NL + coordinates | NL + `.obj` / preset |
| 라이선스 / License | MIT | AGPL-3.0 + 상업 라이선스 듀얼 |

### 압축 실적 / Compression metrics

- **Quaternius House_3** (`asset/.../House_3.obj`, pitch=0.1): voxel ~9.4K → /fill 명령 **≤ 250 라인**, bbox `[21, 22, 23]`.
- **POC 벤치마크 / POC benchmarks** (TS Vitest로 회귀 보존):
  - `realistic-building`: ≥ **95%** /fill 압축
  - `eiffel-lattice`: ≥ **80%** /fill 압축 (격자 구조에서도)
- **마크 1.21 실측**: 200 /fill 라인 → 박공지붕 + 창문까지 솟아오름.

자세한 검증 데이터는 [doc/02-MCP서버-기술설계서.md](doc/02-MCP서버-기술설계서.md) 와 [poc/](poc/) 참조. See those docs/scripts for the underlying numbers.

---

## 프리셋 / Bundled Presets — Quaternius CC0

본 패키지는 [Quaternius](https://quaternius.com) 가 **CC0 1.0 Universal** 로 공개한 *Medieval Village Pack — Dec 2020* 중 5개 모델을 동봉합니다.

This package bundles five models from [Quaternius](https://quaternius.com)' *Medieval Village Pack — Dec 2020*, released under **CC0 1.0 Universal**.

| `id` | Display Name | Source |
|---|---|---|
| `house_1` | Medieval House (Plaster + Tile Roof) | Quaternius — Medieval Village Pack (Dec 2020) |
| `house_3` | Medieval House 3 (Stone + Timber) | Quaternius — Medieval Village Pack (Dec 2020) |
| `inn` | Medieval Inn | Quaternius — Medieval Village Pack (Dec 2020) |
| `mill` | Medieval Mill | Quaternius — Medieval Village Pack (Dec 2020) |
| `sawmill` | Medieval Sawmill | Quaternius — Medieval Village Pack (Dec 2020) |

- **저자 / Author**: Quaternius
- **출처 / Source**: <https://quaternius.com>
- **라이선스 / License**: CC0 1.0 Universal — No Rights Reserved
- **표기 의무 / Attribution**: 강제되지 않지만(Not required) AIrirang Builder는 윤리적 의무로 README + `src/presets/manifest.json` 에 출처·저자를 명기합니다. Recorded by convention even though CC0 does not mandate attribution.

Mojang 자산(텍스처·사운드·로고)은 **0% 포함**됩니다. Block IDs(`minecraft:spruce_planks` 등)는 게임이 런타임에 해석하는 식별자일 뿐, 본 패키지에는 어떠한 게임 리소스도 들어있지 않습니다.

No Mojang assets (textures, sounds, logos) are bundled. Block identifiers are resolved at runtime by the game itself.

---

## 라이선스 / License

AIrirang Builder는 **듀얼 라이선스(dual licensing)** 입니다. AIrirang Builder is offered under **dual licensing**.

| 트랙 / Track | 라이선스 / License | 대상 / Audience | 비용 / Cost |
|---|---|---|---|
| 무료 / Open | **AGPL-3.0-or-later** ([LICENSE](LICENSE)) | 개인·교육·오픈소스·AGPL 호환 프로젝트 / Personal, education, OSS, AGPL-compatible projects | 무료 / Free |
| 상업 / Commercial | **Commercial License** ([LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)) | 사내 폐쇄 소스, 폐쇄 소스 SaaS, AGPL 의무 회피 / Internal closed-source, closed-source SaaS, AGPL-exempt deployments | 협의 / Contact |

- **AGPL-3.0 핵심**: 본 소프트웨어를 가져다 수정해 **네트워크 서비스(SaaS·API)** 로 제공하려면 그 수정·서버 측 코드도 AGPL로 공개해야 합니다. AGPL requires that derived network services also be published under AGPL.
- **상업 라이선스 문의 / Commercial inquiries**: 운영 주체 및 연락처는 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) 참조. See LICENSE-COMMERCIAL.md for the maintainer's contact details.

전체 약관은 [LICENSE](LICENSE) 및 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) 참조. See those files for full terms.

---

## 디스클레이머 / Disclaimer

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

"Minecraft" 는 Mojang Studios의 등록 상표입니다. 본 프로젝트는 Mojang Commercial Usage Guidelines 준수를 위해 Mojang 자산(텍스처·사운드·로고)을 일절 포함하지 않습니다. 봇 사용은 단일 플레이어 또는 본인이 운영하는 서버에서만 권장합니다.

"Minecraft" is a registered trademark of Mojang Studios. This project bundles **zero** Mojang assets in compliance with the Mojang Commercial Usage Guidelines. We recommend using AIrirang Builder only in single-player or self-hosted servers you control.

---

## 기여 / Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) 참조. 변경 이력은 [CHANGELOG.md](CHANGELOG.md). See CONTRIBUTING for workflow, CHANGELOG for release notes.

---

*AIrirang Studio*
