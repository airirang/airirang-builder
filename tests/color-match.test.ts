/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * 컬러 매칭 단위 테스트 — sRGB→Lab 정확도, Delta E76 최근접 검색,
 * .mtl Kd linear→sRGB 변환 (Gotcha #1) 회귀 보장.
 *
 * Unit tests for the palette colour-matching pipeline: sRGB→Lab conversion,
 * Delta E76 nearest-block lookup, and the linear→sRGB step required to fix
 * the .mtl Kd gamma issue (CLAUDE.md Gotcha #1).
 */

import { describe, expect, it } from 'vitest';

import {
  BlockMatcher,
  PALETTE,
  linearToSrgbU8,
  rgbToLab,
} from '../src/palette/index.js';

const close = (a: number, b: number, eps = 0.5): boolean =>
  Math.abs(a - b) <= eps;

describe('rgbToLab — sRGB(0–255) → CIE Lab (D65)', () => {
  it('black → L≈0, a≈0, b≈0', () => {
    const [L, a, b] = rgbToLab([0, 0, 0]);
    expect(close(L, 0)).toBe(true);
    expect(close(a, 0)).toBe(true);
    expect(close(b, 0)).toBe(true);
  });

  it('white → L≈100, a≈0, b≈0', () => {
    const [L, a, b] = rgbToLab([255, 255, 255]);
    expect(close(L, 100)).toBe(true);
    expect(close(a, 0)).toBe(true);
    expect(close(b, 0)).toBe(true);
  });

  it('mid-gray 128 → L≈53.6 (sRGB gamma)', () => {
    const [L] = rgbToLab([128, 128, 128]);
    // Reference: colormath sRGB(128,128,128) → L*≈53.585
    expect(close(L, 53.59, 0.5)).toBe(true);
  });
});

describe('BlockMatcher — Delta E76 nearest palette block', () => {
  const matcher = new BlockMatcher();

  it('pure red sRGB → closest palette red (orange_concrete in current palette)', () => {
    // [255,0,0] 는 Delta E76 상 orange_concrete(224,97,1) 가 redstone_block(171,21,10)
    // 보다 가깝다. 팔레트가 바뀌면 매칭 결과도 바뀌므로 회귀 어서션으로 박는다.
    const idx = matcher.matchOne([255, 0, 0]);
    const blockId = matcher.blockAt(idx);
    expect(blockId).toBe('minecraft:orange_concrete');
  });

  it('pure gold-ish yellow → gold_block', () => {
    const idx = matcher.matchOne([249, 236, 78]);
    expect(matcher.blockAt(idx)).toBe('minecraft:gold_block');
  });

  it('match() returns indices in input order, same length', () => {
    const inputs: [number, number, number][] = [
      [255, 255, 255],
      [0, 0, 0],
      [125, 125, 125],
    ];
    const out = matcher.match(inputs);
    expect(out).toHaveLength(3);
    expect(matcher.blockAt(out[0]!)).toBe('minecraft:snow_block');
    // [0,0,0] 은 black_concrete(8,10,15) 가 obsidian(15,12,23) 보다 Lab 상 가깝다.
    expect(matcher.blockAt(out[1]!)).toBe('minecraft:black_concrete');
    expect(matcher.blockAt(out[2]!)).toBe('minecraft:stone');
  });

  it('exact palette colours map to themselves (no off-by-one)', () => {
    for (const entry of PALETTE) {
      const idx = matcher.matchOne([entry.r, entry.g, entry.b]);
      expect(matcher.blockAt(idx)).toBe(entry.blockId);
    }
  });

  it('blockAt: out-of-range index throws', () => {
    expect(() => matcher.blockAt(-1)).toThrow();
    expect(() => matcher.blockAt(matcher.blockIds.length)).toThrow();
  });
});

describe('linearToSrgbU8 — .mtl Kd gamma correction (Gotcha #1)', () => {
  it('endpoints preserved: 0 → 0, 255 → 255', () => {
    expect(linearToSrgbU8([0, 0, 0])).toEqual([0, 0, 0]);
    expect(linearToSrgbU8([255, 255, 255])).toEqual([255, 255, 255]);
  });

  it('mid linear value brightens via gamma (linear 128 → sRGB ≈188)', () => {
    const out = linearToSrgbU8([128, 128, 128]);
    // sRGB transfer: 1.055·(128/255)^(1/2.4) - 0.055 ≈ 0.737 → 188
    expect(out[0]).toBeGreaterThanOrEqual(186);
    expect(out[0]).toBeLessThanOrEqual(190);
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
  });

  it('without sRGB conversion, dark wood would mismatch; with conversion, plausible', () => {
    // Wood-ish linear Kd: ~ (0.5, 0.25, 0.1) × 255 → (128, 64, 26)
    const matcher = new BlockMatcher();
    const linear: [number, number, number] = [128, 64, 26];

    const srgb = linearToSrgbU8(linear);
    const idxSrgb = matcher.matchOne(srgb);
    const blockSrgb = matcher.blockAt(idxSrgb);

    // 변환 후 매칭은 어두운 쏠림(deepslate/obsidian) 이 아닌
    // 갈색 계열(wood / brick / granite / dirt / soul_sand 등) 이 와야 함.
    const darkPalette = new Set<string>([
      'minecraft:obsidian',
      'minecraft:deepslate',
      'minecraft:black_concrete',
      'minecraft:nether_bricks',
    ]);
    expect(darkPalette.has(blockSrgb)).toBe(false);
  });
});
