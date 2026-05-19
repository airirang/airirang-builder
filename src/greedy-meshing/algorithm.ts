/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Greedy meshing — voxel grid을 동일 블록의 축정렬 직육면체로 압축.
 * Greedy meshing — pack a voxel grid into axis-aligned cuboids of identical block.
 *
 * Iterates voxels in (x outer, y mid, z inner) order. For each unprocessed voxel
 * of block b, grows a cuboid +z first (longest 1D run), then +y (whole z-row must
 * match), then +x (whole y,z-plane must match). Marks the cuboid processed and
 * moves on.
 *
 * 결과: 원본 voxel 집합을 완전히 타일링하는 직육면체 목록.
 * Result: list of cuboids that perfectly tile the original voxel set with no
 * overlap. Suitable for emitting Minecraft /fill commands.
 *
 * Python POC 1:1 포팅 — poc/greedy_meshing.py
 */

import type { BlockId, Cuboid, Voxel } from '../types.js';

/**
 * voxel index 배열 + 병렬 블록 ID 배열을 greedy meshing으로 압축.
 * Pack sparse voxels into cuboids of identical block.
 *
 * @param indices  (N) voxel 좌표 배열 (원점 자유). 정수.
 * @param blockIds 길이 N의 블록 ID 배열 — `indices`와 병렬.
 * @returns ((x1,y1,z1), (x2,y2,z2), blockId) 직육면체 리스트. 좌표는
 *          `indices.min(axis=0)` 상대값. 모든 원본 voxel은 정확히 1개
 *          cuboid로 커버되며 겹침 없음.
 * @throws indices와 blockIds 길이 불일치 시.
 */
export function greedyMeshing(
  indices: readonly Voxel[],
  blockIds: readonly BlockId[],
): Cuboid[] {
  if (indices.length === 0) {
    return [];
  }
  if (indices.length !== blockIds.length) {
    throw new Error(
      `len mismatch: ${indices.length} vs ${blockIds.length}`,
    );
  }

  let minX = indices[0]!.x;
  let minY = indices[0]!.y;
  let minZ = indices[0]!.z;
  let maxX = minX;
  let maxY = minY;
  let maxZ = minZ;
  for (const v of indices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  }

  const sx = maxX - minX + 1;
  const sy = maxY - minY + 1;
  const sz = maxZ - minZ + 1;

  // Encode blocks as int ids in a dense grid; 0 = empty.
  const uniqueBlocks: BlockId[] = [];
  const blockToIdx = new Map<BlockId, number>();
  const grid = new Int32Array(sx * sy * sz);

  const idx = (x: number, y: number, z: number): number =>
    (x * sy + y) * sz + z;

  for (let i = 0; i < indices.length; i++) {
    const v = indices[i]!;
    const b = blockIds[i]!;
    let bi = blockToIdx.get(b);
    if (bi === undefined) {
      bi = uniqueBlocks.length + 1;
      blockToIdx.set(b, bi);
      uniqueBlocks.push(b);
    }
    grid[idx(v.x - minX, v.y - minY, v.z - minZ)] = bi;
  }

  const processed = new Uint8Array(sx * sy * sz);
  const cuboids: Cuboid[] = [];

  for (let x = 0; x < sx; x++) {
    for (let y = 0; y < sy; y++) {
      for (let z = 0; z < sz; z++) {
        const startIdx = idx(x, y, z);
        if (processed[startIdx] !== 0 || grid[startIdx] === 0) {
          continue;
        }
        const bi = grid[startIdx]!;

        // Grow +z (innermost, cheapest).
        let z2 = z;
        while (
          z2 + 1 < sz &&
          processed[idx(x, y, z2 + 1)] === 0 &&
          grid[idx(x, y, z2 + 1)] === bi
        ) {
          z2++;
        }

        // Grow +y: whole z-row must match and be unprocessed.
        let y2 = y;
        growY: while (y2 + 1 < sy) {
          for (let zi = z; zi <= z2; zi++) {
            const k = idx(x, y2 + 1, zi);
            if (grid[k] !== bi || processed[k] !== 0) {
              break growY;
            }
          }
          y2++;
        }

        // Grow +x: whole y,z-plane must match and be unprocessed.
        let x2 = x;
        growX: while (x2 + 1 < sx) {
          for (let yi = y; yi <= y2; yi++) {
            for (let zi = z; zi <= z2; zi++) {
              const k = idx(x2 + 1, yi, zi);
              if (grid[k] !== bi || processed[k] !== 0) {
                break growX;
              }
            }
          }
          x2++;
        }

        for (let xi = x; xi <= x2; xi++) {
          for (let yi = y; yi <= y2; yi++) {
            for (let zi = z; zi <= z2; zi++) {
              processed[idx(xi, yi, zi)] = 1;
            }
          }
        }

        cuboids.push({
          min: { x, y, z },
          max: { x: x2, y: y2, z: z2 },
          blockId: uniqueBlocks[bi - 1]!,
        });
      }
    }
  }

  return cuboids;
}
