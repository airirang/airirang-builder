/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Bedrock 블록 매핑 단위 테스트 — 프리셋 `blockOverrides` 가 산출하는 Java
 * 블록이 전부 Bedrock id 로 매핑되는지(`mapped=true`) + 미등록 id 의 fallback
 * 동작(`mapped=false`, `warning`, `minecraft:stone`)을 검증.
 */

import { describe, expect, it } from 'vitest';

import { listPresets } from '@airirang/builder-core';
import {
  BEDROCK_FALLBACK,
  JAVA_TO_BEDROCK,
  toBedrockBlock,
} from '../src/palette/blocks.js';

describe('toBedrockBlock — preset palette coverage', () => {
  it('5개 프리셋의 모든 blockOverrides 값이 Bedrock id 로 매핑된다', () => {
    const presets = listPresets();
    expect(presets.length).toBeGreaterThan(0);

    const javaIds = new Set<string>();
    for (const p of presets) {
      for (const id of Object.values(p.blockOverrides)) {
        javaIds.add(id);
      }
    }

    for (const javaId of javaIds) {
      const result = toBedrockBlock(javaId);
      expect(result.mapped, `expected mapping for ${javaId}`).toBe(true);
      expect(result.block.id.startsWith('minecraft:')).toBe(true);
      expect(result.warning).toBeUndefined();
    }
  });

  it('명시적 Java→Bedrock 매핑 — bricks → brick_block', () => {
    const r = toBedrockBlock('minecraft:bricks');
    expect(r.mapped).toBe(true);
    expect(r.block.id).toBe('minecraft:brick_block');
  });

  it('동일 id 패스스루 매핑 — spruce_planks / oak_planks / sandstone', () => {
    expect(toBedrockBlock('minecraft:spruce_planks').block.id).toBe(
      'minecraft:spruce_planks',
    );
    expect(toBedrockBlock('minecraft:oak_planks').block.id).toBe(
      'minecraft:oak_planks',
    );
    expect(toBedrockBlock('minecraft:sandstone').block.id).toBe(
      'minecraft:sandstone',
    );
  });
});

describe('toBedrockBlock — fallback behaviour', () => {
  it('미등록 Java id 는 stone fallback + warning 을 반환', () => {
    const r = toBedrockBlock('minecraft:purple_concrete');
    expect(r.mapped).toBe(false);
    expect(r.block).toEqual(BEDROCK_FALLBACK);
    expect(r.block.id).toBe('minecraft:stone');
    expect(r.warning).toBeDefined();
    expect(r.warning).toMatch(/purple_concrete/);
    expect(r.warning).toMatch(/minecraft:stone/);
  });

  it('빈 문자열·완전 알 수 없는 id 도 안전하게 fallback 처리', () => {
    const r1 = toBedrockBlock('');
    expect(r1.mapped).toBe(false);
    expect(r1.block.id).toBe('minecraft:stone');

    const r2 = toBedrockBlock('minecraft:does_not_exist_xyz');
    expect(r2.mapped).toBe(false);
    expect(r2.block.id).toBe('minecraft:stone');
  });

  it('JAVA_TO_BEDROCK 테이블의 모든 entry 도 round-trip 가능', () => {
    for (const javaId of Object.keys(JAVA_TO_BEDROCK)) {
      const r = toBedrockBlock(javaId);
      expect(r.mapped).toBe(true);
      expect(r.block).toEqual(JAVA_TO_BEDROCK[javaId]);
    }
  });
});
