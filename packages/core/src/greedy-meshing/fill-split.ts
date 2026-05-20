/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * /fill 32,768 블록 상한 가드 + Minecraft 명령 출력.
 * /fill 32,768-block cap guard + Minecraft command emission.
 *
 * Python POC 1:1 포팅 — poc/greedy_meshing.py (split_for_fill_limit, emit_fill_commands)
 */

import type { Cuboid, FillCommand } from '../types.js';

/**
 * 바닐라 1.21 기준 단일 /fill 명령의 블록 상한.
 * Vanilla 1.21 cap for a single /fill command.
 */
export const MAX_FILL_BLOCKS = 32768;

/**
 * MAX_FILL_BLOCKS 초과 cuboid를 가장 긴 축 기준으로 재귀 분할.
 * Split any cuboid larger than MAX_FILL_BLOCKS along its longest axis.
 *
 * 총 voxel 수는 보존됨 — 분할 후 합치면 원본과 동일한 영역을 덮음.
 */
export function splitForFillLimit(cuboids: readonly Cuboid[]): Cuboid[] {
  const out: Cuboid[] = [];
  const stack: Cuboid[] = [...cuboids];
  while (stack.length > 0) {
    const c = stack.pop()!;
    const { min, max, blockId } = c;
    const dx = max.x - min.x + 1;
    const dy = max.y - min.y + 1;
    const dz = max.z - min.z + 1;
    if (dx * dy * dz <= MAX_FILL_BLOCKS) {
      out.push(c);
      continue;
    }
    if (dx >= dy && dx >= dz) {
      const mid = min.x + Math.floor(dx / 2) - 1;
      stack.push({
        min: { x: min.x, y: min.y, z: min.z },
        max: { x: mid, y: max.y, z: max.z },
        blockId,
      });
      stack.push({
        min: { x: mid + 1, y: min.y, z: min.z },
        max: { x: max.x, y: max.y, z: max.z },
        blockId,
      });
    } else if (dy >= dz) {
      const mid = min.y + Math.floor(dy / 2) - 1;
      stack.push({
        min: { x: min.x, y: min.y, z: min.z },
        max: { x: max.x, y: mid, z: max.z },
        blockId,
      });
      stack.push({
        min: { x: min.x, y: mid + 1, z: min.z },
        max: { x: max.x, y: max.y, z: max.z },
        blockId,
      });
    } else {
      const mid = min.z + Math.floor(dz / 2) - 1;
      stack.push({
        min: { x: min.x, y: min.y, z: min.z },
        max: { x: max.x, y: max.y, z: mid },
        blockId,
      });
      stack.push({
        min: { x: min.x, y: min.y, z: mid + 1 },
        max: { x: max.x, y: max.y, z: max.z },
        blockId,
      });
    }
  }
  return out;
}

/**
 * cuboid → mcfunction 명령 라인. 1×1×1은 setblock, 그 외는 fill.
 * Convert cuboids to Minecraft commands. 1×1×1 → setblock, else fill.
 *
 * 좌표는 상대 좌표 (`~` prefix) — 빌드 시 플레이어 위치 기준 오프셋.
 */
export function emitFillCommands(cuboids: readonly Cuboid[]): FillCommand[] {
  const lines: FillCommand[] = [];
  for (const { min, max, blockId } of cuboids) {
    if (min.x === max.x && min.y === max.y && min.z === max.z) {
      lines.push(`setblock ~${min.x} ~${min.y} ~${min.z} ${blockId}`);
    } else {
      lines.push(
        `fill ~${min.x} ~${min.y} ~${min.z} ~${max.x} ~${max.y} ~${max.z} ${blockId}`,
      );
    }
  }
  return lines;
}
