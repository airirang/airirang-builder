/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * @airirang/builder-core — Public API.
 *
 * Edition (Java / Bedrock) 무관한 핵심 엔진의 공개 진입점.
 * voxelizer / greedy-meshing / palette / presets 의 curated re-export 입니다.
 *
 * Public entry of the edition-agnostic core engine — voxelizer, greedy
 * meshing, colour palette and bundled preset metadata.
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
} from './types.js';

// ---------------------------------------------------------------------------
// Voxelizer — .obj/.gltf loading + mesh→voxel + multi-material scene voxelization
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
} from './voxelizer/index.js';
export type {
  LoadGltfOptions,
  UpAxis,
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
// Presets — bundled preset metadata (asset files ship with the edition package)
// ---------------------------------------------------------------------------
export {
  listPresets,
  getPreset,
  resolvePresetObjPath,
  getPresetDefaultPitch,
  getPresetDataDir,
  setPresetDataDir,
} from './presets/index.js';
