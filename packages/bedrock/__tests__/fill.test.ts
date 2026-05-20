/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Bedrock /fill emitter 테스트 — Cuboid → Bedrock 문법 (fill/setblock, 상태
 * bracket, 상대 좌표) + 32,768 블록 분할이 통째로 유지되는지 확인.
 *
 * Java emitter 와 달리 Bedrock 의 `/fill` 은 상태가 있을 때 `replace` 모드를
 * 명시해야 bracket 을 잘못 파싱하지 않는다 — formatter 가 이를 자동으로
 * 채우는지도 검증.
 */

import { describe, expect, it } from 'vitest';

import { MAX_FILL_BLOCKS, splitForFillLimit } from '@airirang/builder-core';
import type { Cuboid } from '@airirang/builder-core';

import {
  emitBedrockFill,
  serializeBedrockStates,
} from '../src/fill/emitter.js';
import type { BedrockMapResult } from '../src/palette/blocks.js';

describe('emitBedrockFill — Bedrock /fill 문법', () => {
  it('일반 cuboid → "fill ~x1 ~y1 ~z1 ~x2 ~y2 ~z2 <id>"', () => {
    const cuboids: Cuboid[] = [
      {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 5, y: 5, z: 5 },
        blockId: 'minecraft:bricks',
      },
    ];
    const lines = emitBedrockFill(cuboids);
    expect(lines).toEqual([
      'fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:brick_block',
    ]);
  });

  it('1×1×1 큐보이드 → setblock 명령 (상대 좌표, ~ prefix)', () => {
    const cuboids: Cuboid[] = [
      {
        min: { x: 3, y: 4, z: 5 },
        max: { x: 3, y: 4, z: 5 },
        blockId: 'minecraft:oak_planks',
      },
    ];
    expect(emitBedrockFill(cuboids)).toEqual([
      'setblock ~3 ~4 ~5 minecraft:oak_planks',
    ]);
  });

  it('블록 state 가 있는 fill 은 `replace` 모드 + bracket 을 자동 추가', () => {
    const stateMapper = (_javaId: string): BedrockMapResult => ({
      block: { id: 'minecraft:wool', states: { color: 'red' } },
      mapped: true,
    });

    const cuboids: Cuboid[] = [
      {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 2, y: 2, z: 2 },
        blockId: 'minecraft:red_wool',
      },
    ];
    const lines = emitBedrockFill(cuboids, stateMapper);
    expect(lines).toEqual([
      'fill ~0 ~0 ~0 ~2 ~2 ~2 minecraft:wool replace ["color"="red"]',
    ]);
  });

  it('상태가 있는 setblock 은 블록 바로 뒤에 bracket 만 붙는다 (oldBlockHandling 생략)', () => {
    const mapper = (_javaId: string): BedrockMapResult => ({
      block: { id: 'minecraft:wool', states: { color: 'blue' } },
      mapped: true,
    });
    const cuboids: Cuboid[] = [
      {
        min: { x: 1, y: 2, z: 3 },
        max: { x: 1, y: 2, z: 3 },
        blockId: 'minecraft:blue_wool',
      },
    ];
    expect(emitBedrockFill(cuboids, mapper)).toEqual([
      'setblock ~1 ~2 ~3 minecraft:wool ["color"="blue"]',
    ]);
  });

  it('빈 cuboid 입력 → 빈 라인 배열', () => {
    expect(emitBedrockFill([])).toEqual([]);
  });
});

describe('serializeBedrockStates — bracket 문법 직렬화', () => {
  it('string 값은 따옴표, int·bool 은 따옴표 없이', () => {
    expect(
      serializeBedrockStates({ color: 'red', age: 3, open: true }),
    ).toBe('["color"="red","age"=3,"open"=true]');
  });

  it('빈 객체는 빈 bracket', () => {
    expect(serializeBedrockStates({})).toBe('[]');
  });
});

describe('emitBedrockFill — 32,768 분할 가드는 splitForFillLimit 에 위임 (유지)', () => {
  it('상한 초과 단일 cuboid 를 splitForFillLimit 으로 쪼개면 모두 ≤ MAX_FILL_BLOCKS', () => {
    const big: Cuboid = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 63, y: 63, z: 63 },
      blockId: 'minecraft:stone',
    };
    const volume =
      (big.max.x - big.min.x + 1) *
      (big.max.y - big.min.y + 1) *
      (big.max.z - big.min.z + 1);
    expect(volume).toBeGreaterThan(MAX_FILL_BLOCKS);

    const split = splitForFillLimit([big]);
    expect(split.length).toBeGreaterThan(1);
    for (const c of split) {
      const v =
        (c.max.x - c.min.x + 1) *
        (c.max.y - c.min.y + 1) *
        (c.max.z - c.min.z + 1);
      expect(v).toBeLessThanOrEqual(MAX_FILL_BLOCKS);
    }

    const lines = emitBedrockFill(split);
    expect(lines.length).toBe(split.length);
    for (const line of lines) {
      expect(line.startsWith('fill ~')).toBe(true);
      expect(line.endsWith('minecraft:stone')).toBe(true);
    }
  });

  it('emitBedrockFill 은 재분할하지 않는다 (입력 cuboid 1개 → 라인 1개)', () => {
    const c: Cuboid = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 10, z: 10 },
      blockId: 'minecraft:cobblestone',
    };
    expect(emitBedrockFill([c]).length).toBe(1);
  });
});

