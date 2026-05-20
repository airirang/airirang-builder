# AIrirang Builder

**English** | [한국어](README.ko.md)

> **Build precise Minecraft structures from a single natural-language prompt — via MCP.**

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)
[![Commercial license available](https://img.shields.io/badge/Commercial-available-success.svg)](LICENSE-COMMERCIAL.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-stdio-7C3AED.svg)](https://modelcontextprotocol.io)

AIrirang Builder collapses the full **3D mesh (.obj) → voxel → greedy-meshed `/fill` → datapack** pipeline into a single MCP tool call (`quick-build`). Where existing Minecraft AI agents fire hundreds of `place-block` calls, AIrirang Builder ships a datapack in one shot and the world renders in seconds with `/function airirang:<id>`.

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

### 2. Register with Claude Desktop

Add this to your Claude Desktop config (`claude_desktop_config.json` — macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

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

Restart Claude Desktop and the seven tools are exposed automatically.

### 3. First build

In the chat, ask in one line:

> "Build the House_3 preset into `~/minecraft/saves/world/datapacks`."

The client calls the `quick-build` tool **once**. AIrirang Builder then:

1. Loads the preset `.obj` + `.mtl`
2. Voxelizes across multiple materials
3. Compresses to `/fill` commands via greedy meshing
4. Generates `pack.mcmeta` + `data/<ns>/function/<id>.mcfunction`

→ The datapack is installed straight into your world's `datapacks/` folder.

### 4. Run in Minecraft

```mcfunction
# Once, after entering the world:
/reload
/function airirang:house_3
```

A pitched roof with windows materializes in seconds.

---

## MCP Tools (7)

The `serve` command starts a stdio MCP server, auto-exposed to any MCP-compatible client (Claude Desktop, VSCode Claude, etc.).

| # | Tool | Purpose |
|---|---|---|
| 1 | `list-presets` | Returns the bundled CC0 preset catalog (5 Quaternius models). |
| 2 | `voxelize-preset` | Voxelize + greedy-mesh a preset → array of `/fill` command lines (no disk writes). |
| 3 | `voxelize-custom` | Same pipeline on a user-supplied `.obj` path. |
| 4 | `generate-mcfunction` | Persist a command array to a `.mcfunction` file. |
| 5 | `execute-build` | Wrap an existing `.mcfunction` into a Java Edition datapack. |
| 6 | **`quick-build`** | **The flagship one-shot tool:** load → voxelize → greedy → mcfunction → datapack. |
| 7 | `list-builds` | Lists previously built datapacks under `outRoot`. |

### `quick-build` example call

```jsonc
// MCP tool call (the client generates this automatically; you can also call it directly)
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

Pass `objPath` instead of `presetId` to build from your own `.obj`.

### CLI usage

A standalone CLI is available without the MCP server.

```bash
# Preset catalog
npx airirang-builder list-presets

# .obj → voxelize → .mcfunction
npx airirang-builder voxelize path/to/mesh.obj --pitch 0.1 --out mesh.mcfunction

# All the way to a datapack
npx airirang-builder build path/to/mesh.obj \
  --name airirang-mesh --out-root ~/minecraft/saves/world/datapacks

# MCP server mode (what Claude Desktop invokes)
npx airirang-builder serve
```

---

## Why AIrirang Builder

### vs. yuniko-software/minecraft-mcp-server

| Dimension | yuniko-software | **AIrirang Builder** |
|---|---|---|
| Build mechanism | Bot issues a `place-block` MCP call per block | Single `quick-build` call emits a datapack |
| Precision | Bound by bot pathing (blocks occasionally missed) | Deterministic voxel grid, 100% |
| Speed (large build) | Minutes to hours | Seconds (greedy `/fill` compression) |
| Token efficiency | Hundreds–thousands per build (repeated calls) | Tens per build (single call) |
| Input | Natural language + coordinates | Natural language + 3D mesh (`.obj`) or preset |
| License | MIT | AGPL-3.0 + commercial dual license |

### Compression metrics

- **Quaternius House_3** (`asset/.../House_3.obj`, pitch=0.1): ~9.4K voxels → **≤ 250** `/fill` lines, bbox `[21, 22, 23]`.
- **POC benchmarks** (regression-locked with Vitest):
  - `realistic-building`: ≥ **95%** `/fill` compression
  - `eiffel-lattice`: ≥ **80%** `/fill` compression (even on lattice structures)
- **Minecraft 1.21 measured**: 200 `/fill` lines → pitched roof + windows render fully.

See [doc/02-MCP서버-기술설계서.md](doc/02-MCP서버-기술설계서.md) and [poc/](poc/) for the underlying numbers.

---

## Bundled Presets — Quaternius CC0

This package bundles five models from [Quaternius](https://quaternius.com)' *Medieval Village Pack — Dec 2020*, released under **CC0 1.0 Universal**.

| `id` | Display Name | Source |
|---|---|---|
| `house_1` | Medieval House (Plaster + Tile Roof) | Quaternius — Medieval Village Pack (Dec 2020) |
| `house_3` | Medieval House 3 (Stone + Timber) | Quaternius — Medieval Village Pack (Dec 2020) |
| `inn` | Medieval Inn | Quaternius — Medieval Village Pack (Dec 2020) |
| `mill` | Medieval Mill | Quaternius — Medieval Village Pack (Dec 2020) |
| `sawmill` | Medieval Sawmill | Quaternius — Medieval Village Pack (Dec 2020) |

- **Author**: Quaternius
- **Source**: <https://quaternius.com>
- **License**: CC0 1.0 Universal — No Rights Reserved
- **Attribution**: Not required by CC0, but AIrirang Builder records the source and author in this README and in `src/presets/manifest.json` by convention.

No Mojang assets (textures, sounds, logos) are bundled. Block identifiers (e.g. `minecraft:spruce_planks`) are resolved at runtime by the game itself — this package contains zero game resources.

---

## License

AIrirang Builder is offered under **dual licensing**.

| Track | License | Audience | Cost |
|---|---|---|---|
| Open | **AGPL-3.0-or-later** ([LICENSE](LICENSE)) | Personal, education, OSS, AGPL-compatible projects | Free |
| Commercial | **Commercial License** ([LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)) | Internal closed-source, closed-source SaaS, AGPL-exempt deployments | Contact |

- **AGPL-3.0 in short**: if you modify this software and offer it as a **network service (SaaS / API)**, you must publish your modified, server-side code under AGPL too.
- **Commercial inquiries**: see [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) for the maintainer's contact details.

See [LICENSE](LICENSE) and [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) for the full terms.

---

## Disclaimer

> **NOT AN OFFICIAL MINECRAFT PRODUCT.**
> **NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

"Minecraft" is a registered trademark of Mojang Studios. This project bundles **zero** Mojang assets in compliance with the Mojang Commercial Usage Guidelines. We recommend using AIrirang Builder only in single-player worlds or self-hosted servers you control.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [CHANGELOG.md](CHANGELOG.md) for release notes.

---

*AIrirang Studio*
