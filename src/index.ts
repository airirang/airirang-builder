/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * AIrirang Builder — Library public API.
 *
 * `import { voxelize, greedyMesh, buildDatapack, BlockMatcher, MCP_TOOLS }
 * from 'airirang-builder'` 형태의 외부 사용자 진입점. 본 파일은 의도된
 * public surface 만 re-export 합니다 — 내부 helper 는 노출하지 않습니다.
 *
 * The single public entry consumed by library users (Node API, alternative
 * MCP transports, custom pipelines). The CLI/MCP server import the same
 * sub-modules directly; this file is the curated convenience surface.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  BlockId,
  Voxel,
  VoxelGrid,
  Cuboid,
  Material,
  MultiMaterialScene,
  VoxelizeOptions,
  Preset,
  FillCommand,
  McVersion,
  DatapackOptions,
  MCPToolResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Voxelizer — .obj loading + mesh→voxel + multi-material scene voxelization
// ---------------------------------------------------------------------------
export {
  loadScene,
  voxelizeMesh,
  voxelizeSurface,
  floodFillInterior,
  voxelizeScene,
} from './voxelizer/index.js';
export type {
  MeshInput,
  VoxelizeMeshOptions,
  VoxelizeMeshResult,
  MaterialMatcher,
  VoxelizeSceneOptions,
  VoxelizeSceneResult,
} from './voxelizer/index.js';

/**
 * Library-friendly alias of {@link voxelizeScene}.
 * POC `voxelize_scene()` 와 같은 이름을 원하는 사용자를 위한 단축 이름.
 */
export { voxelizeScene as voxelize } from './voxelizer/index.js';

// ---------------------------------------------------------------------------
// Greedy meshing — voxel grid → /fill cuboid compression
// ---------------------------------------------------------------------------
export {
  greedyMeshing,
  MAX_FILL_BLOCKS,
  splitForFillLimit,
  emitFillCommands,
} from './greedy-meshing/index.js';

/** POC `greedy_meshing()` 별칭. */
export { greedyMeshing as greedyMesh } from './greedy-meshing/index.js';

// ---------------------------------------------------------------------------
// Palette — Minecraft block table + sRGB→Lab→Delta E76 matching
// ---------------------------------------------------------------------------
export {
  PALETTE,
  BlockMatcher,
  linearToSrgbU8,
  rgbToLab,
} from './palette/index.js';
export type { PaletteEntry, Lab, Rgb } from './palette/index.js';

// ---------------------------------------------------------------------------
// Datapack — Java Edition pack.mcmeta + function packaging
// ---------------------------------------------------------------------------
export {
  buildDatapack,
  formatInstallMessage,
  FUNCTION_FOLDER,
  PACK_FORMATS,
  resolvePackFormat,
} from './datapack/index.js';
export type { DatapackBuildResult } from './datapack/index.js';

// ---------------------------------------------------------------------------
// Presets — 5 bundled Quaternius CC0 buildings
// ---------------------------------------------------------------------------
export {
  listPresets,
  getPreset,
  resolvePresetObjPath,
  getPresetDefaultPitch,
  getPresetDataDir,
} from './presets/index.js';

// ---------------------------------------------------------------------------
// MCP server — stdio bootstrap + tool registry
// ---------------------------------------------------------------------------
export {
  createServer,
  startStdioServer,
  SERVER_NAME,
  SERVER_VERSION,
} from './mcp/index.js';

import * as listPresetsTool from './mcp/tools/list-presets.js';
import * as voxelizePresetTool from './mcp/tools/voxelize-preset.js';
import * as voxelizeCustomTool from './mcp/tools/voxelize-custom.js';
import * as generateMcfunctionTool from './mcp/tools/generate-mcfunction.js';
import * as executeBuildTool from './mcp/tools/execute-build.js';
import * as quickBuildTool from './mcp/tools/quick-build.js';
import * as listBuildsTool from './mcp/tools/list-builds.js';

/**
 * 등록된 7개 MCP 도구의 메타데이터 (name + config). 외부에서 도구 카탈로그를
 * 표시하거나 alternative transport (e.g. HTTP) 에 그대로 다시 등록할 때
 * 사용합니다. handler 는 의도적으로 노출하지 않습니다 — `createServer()` 를
 * 통해 사용하세요.
 *
 * Read-only metadata for the 7 registered MCP tools. Handlers are
 * deliberately not exposed here; use {@link createServer} to mount them on
 * a transport.
 */
export const MCP_TOOLS = [
  { name: listPresetsTool.name, config: listPresetsTool.config },
  { name: voxelizePresetTool.name, config: voxelizePresetTool.config },
  { name: voxelizeCustomTool.name, config: voxelizeCustomTool.config },
  { name: generateMcfunctionTool.name, config: generateMcfunctionTool.config },
  { name: executeBuildTool.name, config: executeBuildTool.config },
  { name: quickBuildTool.name, config: quickBuildTool.config },
  { name: listBuildsTool.name, config: listBuildsTool.config },
] as const;
