# Changelog

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

All notable changes to **AIrirang Builder** are documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned

- Korean landmark presets (.obj) — Gyeongbokgung, N Seoul Tower, etc. (license-clean sources)
- Automatic `pitch` recommendation based on mesh size (currently user-specified)
- Bedrock block-state coverage beyond the v1 preset palette (arbitrary `blockOverrides`)
- Streaming MCP tool responses (progress for large builds)
- Demo video (5-minute scenario — see `examples/demo.md`)

---

## [0.2.1] — 2026-05-21

### Fixed

- **Preset builds were broken in 0.2.0**: the bundled `.obj` mesh files were missing from the published `airirang-builder-core` package (a `.gitignore` `*.obj` rule shadowed the new monorepo path, so CI never committed/published them). `list-presets` worked but `build`/`quick-build --preset …` failed with `ENOENT … House_3.obj`. The `.obj` assets are now shipped in `airirang-builder-core`. Caught by a clean-room `npm install` dogfood test.

---

## [0.2.0] — 2026-05-21

Multi-edition monorepo, Bedrock support, and an Apache-2.0 relicense. Published as three packages.

### Added

- **`airirang-builder-bedrock`** — Bedrock Edition sibling package. Emits a double-clickable `.mcaddon` (behavior pack: `manifest.json` v2 + `functions/`), with a Java→Bedrock block map and a Bedrock `/fill` emitter.
- **`airirang-builder-core`** — shared, edition-agnostic engine package (voxelizer, greedy-meshing, palette, presets). Both editions depend on it.
- Bundled preset `.obj`/`.mtl` data now ships inside `airirang-builder-core`, so either edition resolves presets standalone.

### Changed

- **License: AGPL-3.0-or-later (+ commercial) → Apache-2.0.** Permissive, with a patent grant; free for any use including commercial and closed-source. The dual/commercial track is removed.
- Restructured into an npm workspaces monorepo: `packages/{core,java,bedrock}`. The Java package keeps the name `airirang-builder`.
- `LICENSE` replaced with Apache-2.0; added `NOTICE` (disclaimer + Quaternius CC0 attribution); removed `LICENSE-COMMERCIAL.md`.

### Notes

- Already-published `0.1.0` / `0.1.1` remain under AGPL-3.0 (npm versions are immutable). Apache-2.0 applies from `0.2.0` onward.

---

## [0.1.1] — 2026-05-20

### Changed

- README split into English-primary `README.md` + `README.ko.md` (was line-by-line bilingual).
- `publish` workflow made idempotent — skips when the version is already on npm.

---

## [0.1.0] — 2026-05-19

Initial public release: TypeScript MCP server ported from the verified Python POC, packaged for `npx airirang-builder`. (Published under AGPL-3.0; relicensed to Apache-2.0 in 0.2.0.)

### Added

- **MCP server (stdio)** on `@modelcontextprotocol/sdk` 1.x — auto-exposed to standard MCP clients (Claude Desktop, VS Code, etc.).
- **7 MCP tools**: `list-presets`, `voxelize-preset`, `voxelize-custom`, `generate-mcfunction`, `execute-build`, **`quick-build`** (one-shot load → voxelize → greedy → mcfunction → datapack), `list-builds`.
- **voxelizer** — `obj-file-parser`-based OBJ + MTL loader, mesh→voxel grid, multi-material voxelization.
- **greedy-meshing** — voxel → cuboid `/fill` compression + automatic split at the 32,768-block `/fill` limit.
- **palette** — 48-block Minecraft palette + sRGB→Lab→Delta E76 matching, with a linear→sRGB guard (`.mtl` Kd is linear).
- **datapack** — Java Edition 1.20.5 ~ 1.21.11 `pack_format` mapping, `pack.mcmeta` + `data/<ns>/function/<id>.mcfunction`.
- **5 presets (Quaternius CC0)** — `house_1`, `house_3`, `inn`, `mill`, `sawmill`.
- **CLI** (`commander`) and a library public API.
- **GitHub Actions** — `npm publish` automation on release tags.

### Verified

- Quaternius `House_3.obj` (pitch=0.1): ~9.4K voxels → **≤ 250** `/fill` lines, bbox `[21, 22, 23]`.
- Greedy compression — `realistic-building` ≥ **95%**, `eiffel-lattice` ≥ **80%** (Vitest assertions).
- Minecraft 1.21 measured — pitched roof + windows render fully.

### Known Limitations

- Single-material mesh + `fillInterior=true` compresses to one large cuboid — use `fillInterior=false` for surface detail.
- Meshes with extents < 3 m want `pitch ≤ 0.1` (coarser pitch loses the silhouette).
- Minecraft ≤ 1.20.4 unsupported (the `functions/` folder-name change) — 1.20.5+ only.
- The mesh→voxel implementation is face-bounding-box based (POC parity first); BVH acceleration is a future consideration for large meshes.

---

[Unreleased]: https://github.com/airirang/airirang-builder/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/airirang/airirang-builder/releases/tag/v0.2.0
[0.1.1]: https://github.com/airirang/airirang-builder/releases/tag/v0.1.1
[0.1.0]: https://github.com/airirang/airirang-builder/releases/tag/v0.1.0
