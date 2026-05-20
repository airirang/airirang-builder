/**
 * src/voxelizer public surface — MCP 도구·CLI·src/index.ts 가 이 모듈을 import.
 *
 * Public surface of the voxelizer module. MCP tools, CLI, and the library
 * entry all import from here.
 */

import { loadScene as loadObjScene } from './obj-loader.js';
import { loadGltfScene, type LoadGltfOptions } from './gltf-loader.js';
import type { MultiMaterialScene } from '../types.js';

export { loadScene } from './obj-loader.js';
export { loadGltfScene } from './gltf-loader.js';
export type { LoadGltfOptions, UpAxis } from './gltf-loader.js';
export { applyScaleToScene } from './scale-scene.js';
export {
  voxelizeMesh,
  voxelizeSurface,
  floodFillInterior,
} from './voxelize.js';
export type {
  MeshInput,
  VoxelizeMeshOptions,
  VoxelizeMeshResult,
} from './voxelize.js';
export { voxelizeScene } from './multi-material.js';
export type {
  MaterialMatcher,
  VoxelizeSceneOptions,
  VoxelizeSceneResult,
} from './types.js';

/**
 * 확장자 분기 통합 로더. `.obj` 는 기존 동기 `loadScene` 을 그대로 호출하고,
 * `.glb` / `.gltf` 는 비동기 `loadGltfScene` 으로 처리합니다. 외부 사용자에게는
 * 단일 진입점을 제공해 OBJ↔GLB 전환이 투명하도록.
 *
 * Unified async entry that dispatches on file extension: `.obj` → sync
 * `loadScene`, `.glb`/`.gltf` → async `loadGltfScene`. The single async entry
 * means callers don't branch on the source format.
 */
export async function loadSceneAsync(
  path: string,
  options: LoadGltfOptions = {},
): Promise<MultiMaterialScene> {
  const lower = path.toLowerCase();
  if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
    return loadGltfScene(path, options);
  }
  return loadObjScene(path);
}
