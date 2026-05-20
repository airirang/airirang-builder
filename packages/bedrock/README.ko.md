# airirang-builder-bedrock

[English](README.md) | **한국어**

> **AI 자연어 한 줄로 마인크래프트 *베드락*에 정밀 건축물을 솟아오르게 — `.mcaddon` 더블클릭 한 번으로 설치.**

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-stdio-7C3AED.svg)](https://modelcontextprotocol.io)
[![Bedrock](https://img.shields.io/badge/Minecraft-Bedrock%201.21%2B-1C8C3F.svg)](https://www.minecraft.net/)

`airirang-builder-bedrock`은 [`airirang-builder`](https://www.npmjs.com/package/airirang-builder) (Java판)의 **베드락 에디션** 자매 패키지입니다. **3D 메시(.obj/.glb) → voxel → greedy `/fill` → behavior pack** 파이프라인 전체를 한 번의 호출로 압축해, 결과를 **더블클릭으로 설치되는 `.mcaddon`** 으로 떨어뜨립니다.

베드락은 폰·태블릿·콘솔·윈도우 10/11에서 어린이 대다수가 실제로 플레이하는 버전입니다. JSON 설정도, `/reload`도, datapack 폴더 찾기도 없습니다 — **더블클릭 한 번**.

---

## 빠른 시작 (3분)

### 1. 설치

```bash
# npx로 즉시 실행 (권장)
npx airirang-builder-bedrock list-presets

# 또는 글로벌 설치
npm install -g airirang-builder-bedrock
```

요구사항: **Node 20+**, 마인크래프트 **Bedrock Edition 1.21+** (Windows 10/11, 모바일, 콘솔, Education Edition).

### 2. `.mcaddon` 만들기

두 가지 경로 — 하나 고르면 됩니다.

**경로 A — CLI (AI 모델 불필요):**

```bash
npx airirang-builder-bedrock build \
  --preset house_3 \
  --name airirang-house3 \
  --out-root ./out
```

결과:

```
out/airirang-house3/           ← behavior pack 폴더
out/airirang-house3.mcaddon    ← 더블클릭 설치 파일
```

**경로 B — 임의의 MCP 클라이언트 (Claude · ChatGPT · Gemini · Cursor · VS Code …):**

서버를 한 번 등록:

```json
{
  "mcpServers": {
    "airirang-builder-bedrock": {
      "command": "npx",
      "args": ["-y", "airirang-builder-bedrock", "serve"]
    }
  }
}
```

채팅창에 자연어 한 줄:

> "house_3 프리셋을 베드락 .mcaddon으로 `./out` 에 빌드해줘."

클라이언트는 `quick-build` MCP를 **1회** 호출하고 동일한 `.mcaddon`이 나옵니다.

### 3. 마인크래프트(베드락)에서 설치

1. `airirang-house3.mcaddon` 을 **더블클릭** → 마인크래프트(베드락)가 자동 임포트.
2. 월드 생성/편집 → **Behavior Packs** → *airirang-house3* 활성화.
3. 게임 내:

   ```mcfunction
   /function airirang-house3
   ```

박공지붕 + 창문까지 수 초 만에 솟아오릅니다.

---

## 왜 베드락은 별도 패키지인가

베드락과 자바는 파일 포맷이 다른 별개의 게임입니다 (`.mcaddon` vs datapack, `manifest.json` vs `pack.mcmeta`, `/fill` 문법 차이). 그래서 **두 개의 npm 패키지**로 분리해 자기 에디션만 설치하면 되도록 했습니다. voxelizer / greedy mesher는 공유 `@airirang/builder-core`에 한 벌만 두고 자동으로 끌려옵니다.

| 어느 에디션을 플레이하시나요 | 설치 |
|---|---|
| Java Edition (PC, 1.20.5+) | [`airirang-builder`](https://www.npmjs.com/package/airirang-builder) |
| Bedrock Edition (Win10/11, 모바일, 콘솔, Edu) | **`airirang-builder-bedrock`** (본 패키지) |

---

## MCP 도구

`serve` 명령으로 stdio MCP 서버가 켜지며, **임의의 MCP 클라이언트** — Claude Desktop, ChatGPT 데스크탑, Gemini CLI, Cursor, VS Code MCP 확장 등 — 어디서나 자동 노출됩니다.

| # | 도구 | 역할 |
|---|---|---|
| 1 | `list-presets` | 동봉된 Quaternius CC0 프리셋 5개 카탈로그 반환. |
| 2 | **`quick-build`** | **위 파이프라인 전체를 1회 호출로**: preset/OBJ/GLB → voxelize → greedy → Bedrock `/fill` → `.mcaddon`. |

### `quick-build` 예제 호출

```jsonc
{
  "name": "quick-build",
  "arguments": {
    "presetId": "house_3",
    "name": "airirang-house3",
    "namespace": "airirang",
    "functionId": "house_3",
    "outRoot": "./out",
    "minEngineVersion": "1.21.0",
    "pitch": 0.1,
    "fillInterior": true
  }
}
```

응답 (요약):

```jsonc
{
  "ok": true,
  "behaviorPackRoot": "./out/airirang-house3",
  "mcaddonPath": "./out/airirang-house3.mcaddon",
  "lineCount": 187,
  "cuboidCount": 184,
  "voxelCount": 9421,
  "installMessage": "airirang-house3.mcaddon 더블클릭 → 월드 Behavior Packs 활성화 → /function airirang-house3"
}
```

`presetId` 대신 `objPath`를 넘기면 자체 `.obj` / `.glb` / `.gltf` 도 동일하게 처리됩니다.

---

## CLI 사용 (모델 불필요)

```bash
# 프리셋 카탈로그
npx airirang-builder-bedrock list-presets

# preset/OBJ → 바로 설치 가능한 .mcaddon
npx airirang-builder-bedrock build \
  --preset house_3 \
  --name airirang-house3 \
  --out-root ./out

# 자체 메시 사용
npx airirang-builder-bedrock build \
  --obj path/to/mesh.obj \
  --name my-build --out-root ./out --pitch 0.1

# MCP 서버 모드 (MCP 클라이언트가 이걸 호출)
npx airirang-builder-bedrock serve
```

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

Mojang 자산(텍스처·사운드·로고)은 **0% 포함**됩니다. 베드락 블록 식별자는 게임이 런타임에 해석할 뿐, 본 패키지에는 어떠한 게임 리소스도 들어있지 않습니다.

---

## 베드락 v1 범위

v1은 메시 머티리얼을 **검증된 베드락 블록 팔레트**에만 매핑합니다. 임의 `blockOverrides` (예: `"Wood": "minecraft:spruce_planks"`)는 현재 자바판만 지원하며, 베드락 블록 상태 커버리지 확장에 맞춰 v2에서 도입됩니다.

---

## 라이선스

`airirang-builder-bedrock`은 **Apache License 2.0** ([LICENSE](LICENSE)) 라이선스입니다.

개인·교육·오픈소스 **그리고 상업·폐쇄소스까지** 자유롭게 사용 가능 — 저작권 표시와 NOTICE만 유지하면 됩니다. copyleft 없음.

---

## 디스클레이머

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

"Minecraft"는 Mojang Studios의 등록 상표입니다. 본 프로젝트는 Mojang Commercial Usage Guidelines 준수를 위해 Mojang 자산(텍스처·사운드·로고)을 일절 포함하지 않습니다. 사용은 단일 플레이어 또는 본인이 운영하는 Realm/서버에서만 권장합니다.

---

*AIrirang Studio*
