/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * 동봉 프리셋 로더 (5개 Quaternius Medieval Village 빌딩).
 *
 * `manifest.json` 을 읽어 {@link Preset} 배열로 변환하고, 각 프리셋의
 * `.obj` 파일 절대 경로를 해석합니다.
 *
 * Preset loader for the 5 Quaternius CC0 buildings bundled with the
 * package. Reads `manifest.json` and resolves each preset's `.obj` to an
 * absolute path. tsx 개발 모드(`src/`) 와 빌드 산출물(`dist/`) 양쪽에서
 * 동작하도록 폴백 경로를 시도합니다.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BlockId, Preset } from '../types.js';

import manifestData from './manifest.json' with { type: 'json' };

/**
 * manifest.json 한 줄의 raw shape. `objFile` 은 `data/` 내부 파일명.
 * Public {@link Preset} 의 `objPath` 는 패키지 루트 상대 경로로 노출됩니다.
 */
interface ManifestEntry {
  id: string;
  displayName: string;
  objFile: string;
  defaultScale: number;
  defaultPitch: number;
  blockOverrides: Record<string, BlockId>;
  license: 'CC0';
  author: string;
  sourceUrl: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * `data/` 디렉토리의 절대 경로를 찾습니다. tsx 실행(`src/presets/`) 시
 * `./data/` 가 존재하고, 빌드 산출물(`dist/presets/`)에서 데이터가
 * 동봉되지 않은 경우 소스 트리(`../../src/presets/data/`)로 폴백합니다.
 */
function resolveDataDir(): string {
  const candidates = [
    resolve(HERE, 'data'),
    resolve(HERE, '..', '..', 'src', 'presets', 'data'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

const DATA_DIR = resolveDataDir();

function toPreset(entry: ManifestEntry): Preset {
  return {
    id: entry.id,
    displayName: entry.displayName,
    defaultScale: entry.defaultScale,
    blockOverrides: { ...entry.blockOverrides },
    license: entry.license,
    author: entry.author,
    sourceUrl: entry.sourceUrl,
    objPath: `src/presets/data/${entry.objFile}`,
  };
}

const PRESETS: readonly Preset[] = (manifestData as ManifestEntry[]).map(toPreset);
const RAW_BY_ID: Map<string, ManifestEntry> = new Map(
  (manifestData as ManifestEntry[]).map((e) => [e.id, e]),
);

/** 동봉된 모든 프리셋 메타데이터. */
export function listPresets(): Preset[] {
  return PRESETS.map((p) => ({ ...p, blockOverrides: { ...p.blockOverrides } }));
}

/** id 로 프리셋 하나 조회. 없으면 undefined. */
export function getPreset(id: string): Preset | undefined {
  const p = PRESETS.find((x) => x.id === id);
  return p ? { ...p, blockOverrides: { ...p.blockOverrides } } : undefined;
}

/**
 * 프리셋의 `.obj` 절대 경로를 해석합니다.
 * `preset.objPath` 가 절대 경로면 그대로, 패키지 상대('src/presets/data/...')
 * 또는 파일명만 들어온 경우 동봉 `data/` 디렉토리에서 찾습니다.
 */
export function resolvePresetObjPath(preset: Preset): string {
  const p = preset.objPath;
  if (!p) {
    const raw = RAW_BY_ID.get(preset.id);
    if (raw) return resolve(DATA_DIR, raw.objFile);
    throw new Error(`preset has no objPath: ${preset.id}`);
  }
  if (p.startsWith('src/presets/data/')) {
    return resolve(DATA_DIR, p.slice('src/presets/data/'.length));
  }
  if (!p.includes('/') && !p.includes('\\')) {
    return resolve(DATA_DIR, p);
  }
  return resolve(p);
}

/** 프리셋 기본 voxelize pitch (manifest 의 defaultPitch). */
export function getPresetDefaultPitch(id: string): number | undefined {
  return RAW_BY_ID.get(id)?.defaultPitch;
}

/** 동봉 `data/` 절대 경로 — 디버깅·툴 용도. */
export function getPresetDataDir(): string {
  return DATA_DIR;
}
