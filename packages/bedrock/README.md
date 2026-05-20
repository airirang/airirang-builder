# airirang-builder-bedrock

**English** | [한국어](README.ko.md)

> **Build precise Minecraft *Bedrock* structures from a single natural-language prompt — installed by double-clicking a `.mcpack`.**

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-stdio-7C3AED.svg)](https://modelcontextprotocol.io)
[![Bedrock](https://img.shields.io/badge/Minecraft-Bedrock%201.21%2B-1C8C3F.svg)](https://www.minecraft.net/)

`airirang-builder-bedrock` is the **Bedrock Edition** sibling of [`airirang-builder`](https://www.npmjs.com/package/airirang-builder). It collapses the full **3D mesh (.obj/.glb) → voxel → greedy-meshed `/fill` → behavior pack** pipeline into a single call and ships the result as a `.mcpack` you install by **double-clicking**.

Bedrock is what most kids on phones, tablets, consoles and Windows 10/11 actually play. No JSON config, no `/reload`, no datapack folder hunt — just double-click.

---

## Quick Start (3 minutes)

### 1. Install

```bash
# Run instantly with npx (recommended)
npx airirang-builder-bedrock list-presets

# Or install globally
npm install -g airirang-builder-bedrock
```

Requirements: **Node 20+**, Minecraft **Bedrock Edition 1.21+** (Windows 10/11, mobile, console, or Education Edition).

### 2. Build a `.mcpack`

Two paths — pick one.

**Path A — CLI (no AI model needed):**

```bash
npx airirang-builder-bedrock build \
  --preset house_3 \
  --name airirang-house3 \
  --out-root ./out
```

Produces:

```
out/airirang-house3/           ← behavior pack folder
out/airirang-house3.mcpack    ← double-clickable installer
```

**Path B — any MCP client (Claude, ChatGPT, Gemini, Cursor, VS Code, …):**

Register the server once:

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

Then ask in chat:

> "Build the `house_3` preset as a Bedrock .mcpack into `./out`."

The client makes a single `quick-build` MCP call and emits the same `.mcpack`.

### 3. Install in Minecraft (Bedrock)

1. **Double-click** `airirang-house3.mcpack` — Minecraft (Bedrock) auto-imports it.
2. Create or edit a world → **Behavior Packs** → activate *airirang-house3*.
3. In-game:

   ```mcfunction
   /function airirang-house3
   ```

A pitched roof with windows materializes in seconds.

---

## Why a separate Bedrock package?

Bedrock and Java are different games with different file formats (`.mcpack` vs datapack, `manifest.json` vs `pack.mcmeta`, different `/fill` syntax). Shipping them as **two packages** means you install only the one you need; the shared voxelizer / greedy mesher lives in `airirang-builder-core` and is pulled in automatically.

| You play… | Install |
|---|---|
| Java Edition (PC, 1.20.5+) | [`airirang-builder`](https://www.npmjs.com/package/airirang-builder) |
| Bedrock Edition (Win10/11, mobile, console, Edu) | **`airirang-builder-bedrock`** (this package) |

---

## MCP Tools

The `serve` command starts a stdio MCP server compatible with **any MCP client** — Claude Desktop, ChatGPT desktop, Gemini CLI, Cursor, VS Code's MCP extensions, and more.

| # | Tool | Purpose |
|---|---|---|
| 1 | `list-presets` | Returns the bundled CC0 preset catalog (5 Quaternius models). |
| 2 | **`quick-build`** | **One-shot:** preset/OBJ/GLB → voxelize → greedy → Bedrock `/fill` → `.mcpack`. |

### `quick-build` example call

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

Response (summary):

```jsonc
{
  "ok": true,
  "behaviorPackRoot": "./out/airirang-house3",
  "mcpackPath": "./out/airirang-house3.mcpack",
  "lineCount": 187,
  "cuboidCount": 184,
  "voxelCount": 9421,
  "installMessage": "Double-click airirang-house3.mcpack, activate in world Behavior Packs, then /function airirang-house3"
}
```

Pass `objPath` instead of `presetId` to build from your own `.obj` / `.glb` / `.gltf`.

---

## CLI usage (no model required)

```bash
# Preset catalog
npx airirang-builder-bedrock list-presets

# preset/OBJ → ready-to-install .mcpack
npx airirang-builder-bedrock build \
  --preset house_3 \
  --name airirang-house3 \
  --out-root ./out

# Or use your own mesh
npx airirang-builder-bedrock build \
  --obj path/to/mesh.obj \
  --name my-build --out-root ./out --pitch 0.1

# MCP server mode (the one your MCP client invokes)
npx airirang-builder-bedrock serve
```

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

No Mojang assets (textures, sounds, logos) are bundled. Bedrock block identifiers are resolved at runtime by the game itself — this package contains zero game resources.

---

## Bedrock v1 scope

v1 maps mesh materials onto a curated palette of known-stable Bedrock blocks. Arbitrary `blockOverrides` (e.g. `"Wood": "minecraft:spruce_planks"`) currently target Java; the Bedrock equivalent is planned for v2 as Bedrock block-state coverage expands.

---

## License

`airirang-builder-bedrock` is licensed under the **Apache License 2.0** ([LICENSE](LICENSE)).

Free for any use — personal, education, open source, **and commercial / closed-source** — as long as you retain the copyright and NOTICE. No copyleft.

---

## Disclaimer

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

"Minecraft" is a registered trademark of Mojang Studios. This project bundles **zero** Mojang assets in compliance with the Mojang Commercial Usage Guidelines. We recommend using AIrirang Builder only in single-player worlds or self-hosted realms / servers you control.

---

*AIrirang Studio*
