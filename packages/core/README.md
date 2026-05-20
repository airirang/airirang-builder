# airirang-builder-core

> Shared edition-agnostic engine for [AIrirang Builder](https://github.com/airirang/airirang-builder) — 3D mesh voxelization, greedy `/fill` meshing, block-palette color matching, and preset loading.

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

This is the internal core library shared by the Minecraft-edition packages. You usually don't install this directly — install the package for your edition instead:

| Edition | Package |
|---|---|
| Java Edition (PC, 1.20.5+) | [`airirang-builder`](https://www.npmjs.com/package/airirang-builder) |
| Bedrock Edition (Win10/11, mobile, console, Edu) | [`airirang-builder-bedrock`](https://www.npmjs.com/package/airirang-builder-bedrock) |

## What's inside

- **voxelizer** — `.obj` / `.gltf` loading, mesh → voxel grid, multi-material voxelization
- **greedy-meshing** — voxel grid → minimal cuboid `/fill` set, 32768-block split guard
- **palette** — Minecraft block palette + sRGB → Lab → Delta E76 color matching
- **presets** — bundled CC0 preset loading

Pure, edition-agnostic geometry — no datapack/behavior-pack or MCP/CLI code lives here.

## License

Apache License 2.0 ([LICENSE](LICENSE)). Bundled presets are CC0 1.0 (Quaternius) — see [NOTICE](NOTICE).

---

*AIrirang Studio*
