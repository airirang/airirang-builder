/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Greedy meshing 회귀 테스트 — Python POC `poc/test_greedy_meshing.py` 1:1 미러.
 *
 * 6 단위 케이스 (empty / single / cube / shell / mixed / split) + 2 합성 벤치마크
 * (realistic-building ≥ 95% 압축 / eiffel-lattice ≥ 80% 압축). 압축률은 회귀
 * 어서션으로 박혀 있어, greedy 알고리즘이나 분할 휴리스틱을 건드리면 즉시 실패.
 *
 * Mirrors `poc/test_greedy_meshing.py` 1:1 so the Python POC and the TS port
 * stay in lockstep. Compression ratios are asserted to catch regressions in
 * the greedy meshing or fill-split heuristics.
 */

import { describe, expect, it } from 'vitest';

import type { BlockId, Cuboid, Voxel } from '../src/types.js';
import {
  MAX_FILL_BLOCKS,
  emitFillCommands,
  greedyMeshing,
  splitForFillLimit,
} from '../src/greedy-meshing/index.js';

/**
 * 모든 (voxel, block) 쌍이 cuboid 정확히 1개로 커버되는지 검증.
 * Equivalent of POC `_assert_covers` — exactly-once coverage check.
 */
function assertCovers(
  indices: readonly Voxel[],
  blockIds: readonly BlockId[],
  cuboids: readonly Cuboid[],
): void {
  if (indices.length === 0) {
    expect(cuboids).toHaveLength(0);
    return;
  }
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

describe('greedyMeshing — POC unit cases (6)', () => {
  it('empty: 0 voxels → 0 cuboids', () => {
    const out = greedyMeshing([], []);
    expect(out).toEqual([]);
  });

  it('single voxel → exactly 1 cuboid at relative origin', () => {
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

  it('hollow 10×10×10 shell → covers full shell with compression > 0', () => {
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

  it('splitForFillLimit: 50×50×50 → all ≤ MAX_FILL_BLOCKS, volume preserved', () => {
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

describe('greedyMeshing — synthetic compression benchmarks (2)', () => {
  it('realistic-building (hollow house with door) ≥ 95% reduction', () => {
    const W = 23;
    const D = 23;
    const H = 18;
    const coords: Voxel[] = [];
    const blocks: BlockId[] = [];
    const add = (x: number, y: number, z: number, b: BlockId): void => {
      coords.push({ x, y, z });
      blocks.push(b);
    };

    for (let x = 0; x < W; x++) {
      for (let z = 0; z < D; z++) {
        add(x, 0, z, 'minecraft:oak_planks');
      }
    }
    for (let x = 0; x < W; x++) {
      for (let z = 0; z < D; z++) {
        add(x, H - 1, z, 'minecraft:dark_oak_planks');
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 0; x < W; x++) {
        add(x, y, 0, 'minecraft:bricks');
        add(x, y, D - 1, 'minecraft:bricks');
      }
      for (let z = 1; z < D - 1; z++) {
        add(0, y, z, 'minecraft:bricks');
        add(W - 1, y, z, 'minecraft:bricks');
      }
    }

    const doorKeys = new Set<string>([
      `${Math.floor(W / 2)},1,0`,
      `${Math.floor(W / 2)},2,0`,
    ]);
    const coordsFiltered: Voxel[] = [];
    const blocksFiltered: BlockId[] = [];
    for (let i = 0; i < coords.length; i++) {
      const v = coords[i]!;
      if (!doorKeys.has(`${v.x},${v.y},${v.z}`)) {
        coordsFiltered.push(v);
        blocksFiltered.push(blocks[i]!);
      }
    }

    const cuboids = greedyMeshing(coordsFiltered, blocksFiltered);
    assertCovers(coordsFiltered, blocksFiltered, cuboids);
    const split = splitForFillLimit(cuboids);
    const lines = emitFillCommands(split);

    const nVox = coordsFiltered.length;
    const nLines = lines.length;
    const reduction = 1 - nLines / nVox;
    expect(reduction).toBeGreaterThanOrEqual(0.95);
  });

  it('eiffel-lattice (sparse tapered tower) ≥ 80% reduction', () => {
    const H = 80;
    const coords: Voxel[] = [];
    const blocks: BlockId[] = [];
    const block: BlockId = 'minecraft:iron_block';

    for (let y = 0; y < H; y++) {
      const half = Math.max(2, Math.trunc(20 * Math.pow(1 - y / H, 1.5)));
      if (y % 8 === 0) {
        for (let x = -half; x <= half; x++) {
          for (let z = -half; z <= half; z++) {
            if (Math.abs(x) === half || Math.abs(z) === half) {
              coords.push({ x: x + 25, y, z: z + 25 });
              blocks.push(block);
            }
          }
        }
      } else {
        for (const sx of [-half, half]) {
          for (const sz of [-half, half]) {
            coords.push({ x: sx + 25, y, z: sz + 25 });
            blocks.push(block);
          }
        }
      }
    }

    const cuboids = greedyMeshing(coords, blocks);
    assertCovers(coords, blocks, cuboids);
    const split = splitForFillLimit(cuboids);
    const lines = emitFillCommands(split);

    const nVox = coords.length;
    const nLines = lines.length;
    const reduction = 1 - nLines / nVox;
    expect(reduction).toBeGreaterThanOrEqual(0.8);
  });
});

describe('emitFillCommands — output format', () => {
  it('1×1×1 cuboid → setblock, larger → fill', () => {
    const cuboids: Cuboid[] = [
      {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
        blockId: 'minecraft:stone',
      },
      {
        min: { x: 1, y: 2, z: 3 },
        max: { x: 4, y: 5, z: 6 },
        blockId: 'minecraft:gold_block',
      },
    ];
    const lines = emitFillCommands(cuboids);
    expect(lines[0]).toBe('setblock ~0 ~0 ~0 minecraft:stone');
    expect(lines[1]).toBe('fill ~1 ~2 ~3 ~4 ~5 ~6 minecraft:gold_block');
  });
});
