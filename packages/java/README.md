# airirang-builder

**English** | [한국어](README.ko.md)

> **Build precise Minecraft *Java Edition* structures from a single natural-language prompt — or one CLI call. Works with any MCP client (Claude, ChatGPT, Gemini, Cursor, VS Code, …) or with no AI model at all.**

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-stdio-7C3AED.svg)](https://modelcontextprotocol.io)

`airirang-builder` collapses the full **3D mesh (.obj/.glb) → voxel → greedy-meshed `/fill` → datapack** pipeline into a single tool call (`quick-build`). Where existing Minecraft AI agents fire hundreds of `place-block` calls, `airirang-builder` ships a datapack in one shot and the world renders in seconds with `/function airirang:<id>`.

Playing **Bedrock** (Win10/11, mobile, console, Education)? Use [`airirang-builder-bedrock`](https://www.npmjs.com/package/airirang-builder-bedrock) — it emits a double-clickable `.mcaddon` instead of a datapack.

---

## Three ways to use it

| You are… | Use | AI model needed? |
|---|---|:--:|
| Developer / power user | **CLI** (`airirang-builder build …`) | **No** |
| AI tool user | **MCP server** registered with any MCP client (Claude, ChatGPT, Gemini, Cursor, VS Code, Cline, …) | Your client's model |
| Library author | **Programmatic API** (`import { quickBuild } from 'airirang-builder'`) | No |

MCP is an **open standard**, not a Claude-only feature. Any MCP-compatible client can drive this server identically.

---

## Quick Start (5 minutes)

### 1. Install

```bash
# Run instantly with npx (recommended)
npx airirang-builder list-presets

# Or install globally
npm install -g airirang-builder
```

Requirements: **Node 20+**, Minecraft **Java Edition 1.20.5 ~ 1.21.x**.

### 2a. Use as a CLI (no AI model)

```bash
# Build a preset straight into your world's datapacks folder
npx airirang-builder build \
  --preset house_3 \
  --name airirang-house3 \
  --out-root ~/minecraft/saves/world/datapacks

# Or use your own .obj / .glb / .gltf
npx airirang-builder build \
  --obj path/to/mesh.obj \
  --name my-build \
  --out-root ~/minecraft/saves/world/datapacks \
  --pitch 0.1
```

That's it — no JSON config, no MCP client, no LLM bill.

### 2b. Use as an MCP server (any MCP client)

Register the server once in **your MCP client's config**. The block below is generic stdio MCP syntax that every major MCP client supports — keys may vary (e.g. `mcpServers` for Claude Desktop, similar fields for Cursor / VS Code MCP extensions / Gemini CLI / Cline / Continue).

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

Then ask the assistant in one line:

> "Build the `house_3` preset into `~/minecraft/saves/world/datapacks`."

The client calls `quick-build` **once** and `airirang-builder`:

1. Loads the preset `.obj` + `.mtl`
2. Voxelizes across multiple materials
3. Compresses to `/fill` commands via greedy meshing
4. Generates `pack.mcmeta` + `data/<ns>/function/<id>.mcfunction`

→ The datapack is installed straight into your world's `datapacks/` folder.

### 3. Run in Minecraft

```mcfunction
# Once, after entering the world:
/reload
/function airirang:house_3
```

A pitched roof with windows materializes in seconds.

---

## MCP Tools (7)

The `serve` command starts a stdio MCP server, auto-exposed to **any MCP-compatible client** — not just Claude.

| # | Tool | Purpose |
|---|---|---|
| 1 | `list-presets` | Returns the bundled CC0 preset catalog (5 Quaternius models). |
| 2 | `voxelize-preset` | Voxelize + greedy-mesh a preset → array of `/fill` command lines (no disk writes). |
| 3 | `voxelize-custom` | Same pipeline on a user-supplied `.obj` / `.glb` / `.gltf` path. |
| 4 | `generate-mcfunction` | Persist a command array to a `.mcfunction` file. |
| 5 | `execute-build` | Wrap an existing `.mcfunction` into a Java Edition datapack. |
| 6 | **`quick-build`** | **The flagship one-shot tool:** load → voxelize → greedy → mcfunction → datapack. |
| 7 | `list-builds` | Lists previously built datapacks under `outRoot`. |

### `quick-build` example call

```jsonc
// MCP tool call — the client generates this; you can also call it directly.
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

Response (summary):

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

Pass `objPath` instead of `presetId` to build from your own mesh.

---

## CLI usage

A standalone CLI is available without the MCP server.

```bash
# Preset catalog
npx airirang-builder list-presets

# .obj → voxelize → .mcfunction
npx airirang-builder voxelize path/to/mesh.obj --pitch 0.1 --out mesh.mcfunction

# All the way to a datapack
npx airirang-builder build path/to/mesh.obj \
  --name airirang-mesh --out-root ~/minecraft/saves/world/datapacks

# MCP server mode (what any MCP client invokes)
npx airirang-builder serve
```

---

## Why airirang-builder

### vs. yuniko-software/minecraft-mcp-server

| Dimension | yuniko-software | **airirang-builder** |
|---|---|---|
| Build mechanism | Bot issues a `place-block` MCP call per block | Single `quick-build` call emits a datapack |
| Precision | Bound by bot pathing (blocks occasionally missed) | Deterministic voxel grid, 100% |
| Speed (large build) | Minutes to hours | Seconds (greedy `/fill` compression) |
| Token efficiency | Hundreds–thousands per build (repeated calls) | Tens per build (single call) |
| Input | Natural language + coordinates | Natural language + 3D mesh (`.obj` / `.glb`) or preset |
| MCP clients | Claude focus | Any MCP-compatible client |
| License | MIT | Apache-2.0 |

### Compression metrics

- **Quaternius House_3** (pitch=0.1): ~9.4K voxels → **≤ 250** `/fill` lines, bbox `[21, 22, 23]`.
- **Regression-locked benchmarks** (Vitest):
  - `realistic-building`: ≥ **95%** `/fill` compression
  - `eiffel-lattice`: ≥ **80%** `/fill` compression (even on lattice structures)
- **Minecraft 1.21 measured**: 200 `/fill` lines → pitched roof + windows render fully.

---

## Bundled Presets — Quaternius CC0

This package bundles five models from [Quaternius](https://quaternius.com)' *Medieval Village Pack — Dec 2020*, released under **CC0 1.0 Universal**.

| `id` | Display Name |
|---|---|
| `house_1` | Medieval House (Plaster + Tile Roof) |
| `house_3` | Medieval House 3 (Stone + Timber) |
| `inn` | Medieval Inn |
| `mill` | Medieval Mill |
| `sawmill` | Medieval Sawmill |

- **Author**: Quaternius
- **Source**: <https://quaternius.com>
- **License**: CC0 1.0 Universal — No Rights Reserved

No Mojang assets (textures, sounds, logos) are bundled. Block identifiers (e.g. `minecraft:spruce_planks`) are resolved at runtime by the game itself — this package contains zero game resources.

---

## License

`airirang-builder` is licensed under the **Apache License 2.0** ([LICENSE](LICENSE)).

Free for any use — personal, education, open source, **and commercial / closed-source** — as long as you retain the copyright and NOTICE. No copyleft, no separate commercial license required.

---

## Disclaimer

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

"Minecraft" is a registered trademark of Mojang Studios. This project bundles **zero** Mojang assets in compliance with the Mojang Commercial Usage Guidelines. We recommend using `airirang-builder` only in single-player worlds or self-hosted servers you control.

---

*AIrirang Studio*
