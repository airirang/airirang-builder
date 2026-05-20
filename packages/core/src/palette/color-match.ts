/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * 컬러 매칭 — sRGB → CIE Lab (D65) → Delta E76 최근접 블록 검색.
 * Color matching — sRGB → CIE Lab (D65) → Delta E76 nearest-block lookup.
 *
 * Python POC 1:1 포팅 — poc/mc_palette.py (rgb_to_lab, BlockMatcher, linear_to_srgb_u8)
 *
 * 주의 (Gotcha #1): `.mtl` Kd는 linear RGB이므로 `linearToSrgbU8()`로 먼저
 * sRGB 변환 후 BlockMatcher.match()에 넘길 것. 미적용 시 모든 블록이
 * 어두운 톤(deepslate/obsidian)으로 쏠림.
 */

import type { BlockId } from '../types.js';
import { PALETTE, type PaletteEntry } from './blocks.js';

/** RGB triplet (각 채널 0–255). 정수 또는 부동소수점. */
export type Rgb = readonly [number, number, number];

/** CIE Lab triplet — L* in [0,100], a* and b* can be negative. */
export type Lab = readonly [number, number, number];

function srgbToLinear(c: number): number {
  const n = c / 255.0;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

/**
 * Linear-light RGB (0–255, trimesh가 .mtl Kd × 255로 패킹) → sRGB 0–255.
 * Linear-light RGB (0–255 as packed by trimesh from .mtl Kd) → sRGB-encoded
 * 0–255 uint8. Blender/Wavefront .mtl Kd는 *linear*이지만 BlockMatcher 팔레트와
 * rgbToLab은 sRGB 입력을 가정함 — 변환 필수.
 *
 * @param linear  Linear RGB 0–255 triplet.
 * @returns       sRGB-encoded 0–255 정수 triplet (clamp 적용).
 */
export function linearToSrgbU8(linear: Rgb): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const c = Math.min(1, Math.max(0, linear[i]! / 255.0));
    const s =
      c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
    out[i] = Math.max(0, Math.min(255, Math.round(s * 255.0)));
  }
  return out;
}

// sRGB → XYZ (D65)
const M00 = 0.4124564;
const M01 = 0.3575761;
const M02 = 0.1804375;
const M10 = 0.2126729;
const M11 = 0.7151522;
const M12 = 0.072175;
const M20 = 0.0193339;
const M21 = 0.119192;
const M22 = 0.9503041;

const WHITE_X = 0.95047;
const WHITE_Y = 1.0;
const WHITE_Z = 1.08883;

const DELTA = 6 / 29;
const DELTA_CUBED = DELTA * DELTA * DELTA;
const THREE_DELTA_SQ = 3 * DELTA * DELTA;
const FOUR_OVER_29 = 4 / 29;

function labF(t: number): number {
  return t > DELTA_CUBED
    ? Math.pow(t, 1 / 3)
    : t / THREE_DELTA_SQ + FOUR_OVER_29;
}

/**
 * sRGB (0–255) → CIE Lab (D65). NumPy `rgb_to_lab` 1:1.
 * sRGB (0–255) → CIE Lab (D65). Matches NumPy POC element-wise.
 */
export function rgbToLab(rgb: Rgb): Lab {
  const lr = srgbToLinear(rgb[0]);
  const lg = srgbToLinear(rgb[1]);
  const lb = srgbToLinear(rgb[2]);

  const x = lr * M00 + lg * M01 + lb * M02;
  const y = lr * M10 + lg * M11 + lb * M12;
  const z = lr * M20 + lg * M21 + lb * M22;

  const fx = labF(x / WHITE_X);
  const fy = labF(y / WHITE_Y);
  const fz = labF(z / WHITE_Z);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
}

/**
 * 팔레트 기반 최근접 블록 매처 (Delta E76 = Lab 유클리드 거리).
 * Palette-based nearest-block matcher using Delta E76 (Euclidean in Lab).
 *
 * 생성자에서 팔레트 Lab을 미리 계산 — match() 호출당 비용을 줄임.
 */
export class BlockMatcher {
  readonly blockIds: readonly BlockId[];
  private readonly labs: readonly Lab[];

  constructor(palette: readonly PaletteEntry[] = PALETTE) {
    this.blockIds = palette.map((p) => p.blockId);
    this.labs = palette.map((p) => rgbToLab([p.r, p.g, p.b]));
  }

  /** 단일 sRGB triplet → 팔레트 인덱스. */
  matchOne(rgb: Rgb): number {
    const lab = rgbToLab(rgb);
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.labs.length; i++) {
      const ref = this.labs[i]!;
      const dL = lab[0] - ref[0];
      const da = lab[1] - ref[1];
      const db = lab[2] - ref[2];
      const d = dL * dL + da * da + db * db;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /** sRGB triplet 배열 → 팔레트 인덱스 배열 (POC `match`와 1:1). */
  match(rgbs: readonly Rgb[]): number[] {
    const out: number[] = new Array(rgbs.length);
    for (let i = 0; i < rgbs.length; i++) {
      out[i] = this.matchOne(rgbs[i]!);
    }
    return out;
  }

  /** 팔레트 인덱스 → 블록 ID. */
  blockAt(idx: number): BlockId {
    const id = this.blockIds[idx];
    if (id === undefined) {
      throw new Error(`palette index out of range: ${idx}`);
    }
    return id;
  }
}
