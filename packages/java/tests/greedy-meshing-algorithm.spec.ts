/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Greedy meshing 알고리즘 회귀 스위트 — Python POC 6 케이스의 TS 미러:
 *   empty / single / cube / shell / mixed / split.
 *
 * 통합·벤치마크 테스트(realistic-building / eiffel-lattice)는 tests/ 폴더의
 * 별도 스위트가 담당합니다. 본 spec 은 알고리즘 변경 시 즉시 실패하도록.
 */

import { describe, expect, it } from 'vitest';

import type { BlockId, Cuboid, Voxel } from '@airirang/builder-core';
import {
  greedyMeshing,
  MAX_FILL_BLOCKS,
  splitForFillLimit,
} from '@airirang/builder-core';

/**
 * 모든 (voxel, block) 쌍이 cuboid 정확히 1개로 커버되는지 검증.
 * Equivalent of POC `_assert_covers`.
 */
function assertCovers(
  indices: readonly Voxel[],
  blockIds: readonly BlockId[],
  cuboids: readonly Cuboid[],
): void {
  let minX = indices[0]!.x;
  let minY = indices[0]!.y;
  let minZ = indices[0]!.z;
  for (const v of indices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
  }
  const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

  const expected = new Map<string, BlockId>();
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i]!;
    expected.set(key(v.x - minX, v.y - minY, v.z - minZ), blockIds[i]!);
  }

  const covered = new Map<string, BlockId>();
  for (const c of cuboids) {
    for (let xi = c.min.x; xi <= c.max.x; xi++) {
      for (let yi = c.min.y; yi <= c.max.y; yi++) {
        for (let zi = c.min.z; zi <= c.max.z; zi++) {
          const k = key(xi, yi, zi);
          if (covered.has(k)) {
            throw new Error(
              `overlap at ${k}: ${covered.get(k)} vs ${c.blockId}`,
            );
          }
          covered.set(k, c.blockId);
        }
      }
    }
  }
  expect(covered.size).toBe(expected.size);
  for (const [k, b] of expected) {
    expect(covered.get(k)).toBe(b);
  }
}

describe('greedyMeshing — POC case parity', () => {
  it('empty: 0 voxels → 0 cuboids', () => {
    const out = greedyMeshing([], []);
    expect(out).toEqual([]);
  });

  it('single voxel → exactly 1 cuboid at origin', () => {
    const idx: Voxel[] = [{ x: 5, y: 5, z: 5 }];
    const blocks: BlockId[] = ['minecraft:stone'];
    const out = greedyMeshing(idx, blocks);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      blockId: 'minecraft:stone',
    });
    assertCovers(idx, blocks, out);
  });

  it('solid 10×10×10 cube → exactly 1 cuboid (1000 ≤ MAX_FILL_BLOCKS)', () => {
    const coords: Voxel[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        for (let z = 0; z < 10; z++) {
          coords.push({ x, y, z });
        }
      }
    }
    const blocks: BlockId[] = coords.map(() => 'minecraft:stone');
    const out = greedyMeshing(coords, blocks);
    assertCovers(coords, blocks, out);
    expect(out).toHaveLength(1);
    expect(out[0]!.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(out[0]!.max).toEqual({ x: 9, y: 9, z: 9 });
  });

  it('hollow 10×10×10 shell → fewer cuboids than voxels (compression > 0)', () => {
    const coords: Voxel[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        for (let z = 0; z < 10; z++) {
          const onShell =
            x === 0 || x === 9 || y === 0 || y === 9 || z === 0 || z === 9;
          if (onShell) coords.push({ x, y, z });
        }
      }
    }
    const blocks: BlockId[] = coords.map(() => 'minecraft:stone');
    const out = greedyMeshing(coords, blocks);
    assertCovers(coords, blocks, out);
    expect(out.length).toBeLessThan(coords.length);
  });

  it('mixed blocks: adjacent stone + gold must NOT merge', () => {
    const coords: Voxel[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];
    const blocks: BlockId[] = ['minecraft:stone', 'minecraft:gold_block'];
    const out = greedyMeshing(coords, blocks);
    assertCovers(coords, blocks, out);
    expect(out).toHaveLength(2);
  });

  it('splitForFillLimit: 50×50×50 (=125,000) → all sub-cuboids ≤ MAX_FILL_BLOCKS, volume preserved', () => {
    const big: Cuboid[] = [
      {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 49, y: 49, z: 49 },
        blockId: 'minecraft:stone',
      },
    ];
    const out = splitForFillLimit(big);
    let total = 0;
    for (const c of out) {
      const dx = c.max.x - c.min.x + 1;
      const dy = c.max.y - c.min.y + 1;
      const dz = c.max.z - c.min.z + 1;
      expect(dx * dy * dz).toBeLessThanOrEqual(MAX_FILL_BLOCKS);
      total += dx * dy * dz;
    }
    expect(total).toBe(50 ** 3);
  });
});
