/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

import type { BlockId, Material, MultiMaterialScene, Voxel } from '../types.js';
import type {
  MaterialMatcher,
  VoxelizeSceneOptions,
  VoxelizeSceneResult,
} from './types.js';
import { voxelizeMesh } from './voxelize.js';

/**
 * 모든 머티리얼 sub-mesh 를 공통 voxel grid 에 voxelize 한 뒤,
 * 머티리얼별 블록 ID 와 함께 평행 배열로 반환합니다.
 *
 * POC `voxelize_scene()` (poc/multi_material_voxelize.py:35) 의 TS 포팅.
 * 두 머티리얼이 같은 voxel 을 차지하면 **순회 순서상 나중 머티리얼이 우선**
 * 합니다 (POC 79~99 라인 동일).
 *
 * Multi-material voxelizer: voxelizes every sub-mesh into a shared grid
 * (origin = scene bbox min) and tags each cell with the block chosen for
 * its source material. Later materials in iteration order win on collisions.
 *
 * @param scene   {@link loadScene} 산출물
 * @param pitch   월드 단위당 voxel 크기 (POC 기본 0.1)
 * @param options fillInterior · matcher · blockOverrides
 */
export function voxelizeScene(
  scene: MultiMaterialScene,
  pitch: number,
  options: VoxelizeSceneOptions = { pitch },
): VoxelizeSceneResult {
  if (!(pitch > 0)) throw new Error(`pitch must be > 0 (got ${pitch})`);
  const fillInterior = options.fillInterior !== false;
  const overrides = options.blockOverrides ?? {};
  const matcher: MaterialMatcher = options.matcher ?? defaultMatcher;

  // Pass 1 — pick a block per material (override > matcher > 'stone' fallback).
  const materialMap: Record<string, BlockId> = {};
  for (const [name, geom] of Object.entries(scene.geometries)) {
    if (Object.prototype.hasOwnProperty.call(overrides, name)) {
      materialMap[name] = overrides[name];
    } else {
      materialMap[name] = matcher(geom.material);
    }
  }

  // Shared grid — origin = scene bbox min, shape covers full extent.
  const [minX, minY, minZ] = scene.bounds.min;
  const [maxX, maxY, maxZ] = scene.bounds.max;
  const origin: [number, number, number] = [minX, minY, minZ];
  const shape: [number, number, number] = [
    Math.max(1, Math.ceil((maxX - minX) / pitch) + 1),
    Math.max(1, Math.ceil((maxY - minY) / pitch) + 1),
    Math.max(1, Math.ceil((maxZ - minZ) / pitch) + 1),
  ];

  // Pass 2 — voxelize each sub-mesh into the shared grid; later wins.
  const sy = shape[1];
  const sz = shape[2];
  const stride = (x: number, y: number, z: number) => (x * sy + y) * sz + z;
  const voxelToBlock = new Map<number, BlockId>();

  for (const [name, geom] of Object.entries(scene.geometries)) {
    if (geom.faces.length === 0) continue;
    const res = voxelizeMesh(
      { vertices: geom.vertices, faces: geom.faces },
      { pitch, fillInterior, origin, shape },
    );
    const block = materialMap[name];
    for (const v of res.indices) {
      voxelToBlock.set(stride(v.x, v.y, v.z), block);
    }
  }

  const indices: Voxel[] = [];
  const blockIds: BlockId[] = [];
  for (const [packed, block] of voxelToBlock) {
    const z = packed % sz;
    const rem = (packed - z) / sz;
    const y = rem % sy;
    const x = (rem - y) / sy;
    indices.push({ x, y, z });
    blockIds.push(block);
  }

  return {
    indices,
    blockIds,
    materialMap,
    bbox: { x: shape[0], y: shape[1], z: shape[2] },
  };
}

/** matcher 미주입 시 폴백 — 모든 머티리얼이 stone 으로 매핑. */
function defaultMatcher(_material: Material): BlockId {
  return 'minecraft:stone';
}
