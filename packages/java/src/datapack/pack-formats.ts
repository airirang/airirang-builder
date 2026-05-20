/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * Java Edition pack_format 매핑.
 * Java Edition pack_format lookup table.
 *
 * 출처 / Source: https://minecraft.wiki/w/Pack_format
 *
 * MVP는 1.20.5+만 지원합니다 (data/<ns>/function/ 단수형 폴더).
 * 1.20.4 이하(data/<ns>/functions/ 복수형)는 본 빌드 범위에서 제외.
 */

import type { McVersion } from '../types.js';

/**
 * 마인크래프트 버전 → pack_format 정수 매핑.
 * Map of Minecraft version string to pack_format integer.
 */
export const PACK_FORMATS: Readonly<Record<McVersion, number>> = Object.freeze({
  '1.20.5': 41,
  '1.20.6': 41,
  '1.21': 48,
  '1.21.0': 48,
  '1.21.1': 48,
  '1.21.2': 57,
  '1.21.3': 57,
  '1.21.4': 61,
  '1.21.5': 71,
  '1.21.6': 71,
  '1.21.7': 71,
  '1.21.8': 71,
  '1.21.9': 81,
  '1.21.10': 81,
  '1.21.11': 81,
});

/**
 * MVP가 사용하는 함수 폴더 이름.
 * 1.20.5+ uses singular `function`. Earlier versions used plural `functions`
 * (not supported by this MVP).
 */
export const FUNCTION_FOLDER = 'function' as const;

/**
 * 알려진 버전이면 pack_format 반환, 아니면 throw.
 * Look up pack_format or throw if the version is unsupported.
 */
export function resolvePackFormat(mcVersion: McVersion): number {
  const fmt = PACK_FORMATS[mcVersion];
  if (fmt === undefined) {
    const known = (Object.keys(PACK_FORMATS) as McVersion[]).sort().join(', ');
    throw new Error(
      `unknown mc-version ${JSON.stringify(mcVersion)}. known: ${known}`,
    );
  }
  return fmt;
}
