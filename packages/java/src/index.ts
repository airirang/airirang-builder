/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * airirang-builder (Java Edition) — Library public API.
 *
 * `import { voxelize, greedyMesh, buildDatapack, BlockMatcher, MCP_TOOLS }
 * from 'airirang-builder'` 형태의 외부 사용자 진입점. 기하·매칭·프리셋 등
 * edition 무관한 API 는 `@airirang/builder-core` 를 그대로 재수출하고, Java
 * Edition 고유 부분(datapack / mcp) 만 본 패키지가 추가합니다.
 *
 * The single public entry consumed by Java Edition users. Edition-agnostic
 * APIs are re-exported from `@airirang/builder-core`; Java-specific surfaces
 * (datapack builder, MCP server + 7 tools) are added on top.
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
// Voxelizer · Greedy meshing · Palette · Presets — re-exported from core
// ---------------------------------------------------------------------------
export {
  loadScene,
  loadSceneAsync,
  loadGltfScene,
  applyScaleToScene,
  voxelizeMesh,
  voxelizeSurface,
  floodFillInterior,
  voxelizeScene,
  voxelize,
  greedyMeshing,
  greedyMesh,
  MAX_FILL_BLOCKS,
  splitForFillLimit,
  emitFillCommands,
  PALETTE,
  BlockMatcher,
  linearToSrgbU8,
  rgbToLab,
  listPresets,
  getPreset,
  resolvePresetObjPath,
  getPresetDefaultPitch,
  getPresetDataDir,
  setPresetDataDir,
} from '@airirang/builder-core';
export type {
  LoadGltfOptions,
  UpAxis,
  MeshInput,
  VoxelizeMeshOptions,
  VoxelizeMeshResult,
  MaterialMatcher,
  VoxelizeSceneOptions,
  VoxelizeSceneResult,
  PaletteEntry,
  Lab,
  Rgb,
} from '@airirang/builder-core';

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
