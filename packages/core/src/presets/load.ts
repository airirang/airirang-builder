/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * 동봉 프리셋 로더 (5개 Quaternius Medieval Village 빌딩).
 *
 * `manifest.json` 을 읽어 {@link Preset} 배열로 변환하고, 각 프리셋의
 * `.obj` 파일 절대 경로를 해석합니다. 프리셋 메타데이터(manifest)는 core 와
 * 함께 동봉되지만, 실제 `.obj`/`.mtl` 에셋은 소비 패키지(현재
 * `airirang-builder` — Java Edition)와 함께 배포됩니다. 그래서 core 는
 * 자체 디렉토리에서 데이터를 찾지 못하면 호스팅 패키지의 `src/presets/data/`
 * 와 `dist/presets/data/` 까지 폴백 탐색합니다.
 *
 * Bundled preset loader for the 5 Quaternius CC0 buildings. The metadata
 * (`manifest.json`) ships with `@airirang/builder-core`, but the `.obj`/`.mtl`
 * assets ship with the consuming edition package (currently
 * `airirang-builder` — Java Edition). When the local `data/` directory is
 * absent the loader walks up to the consumer to find the assets.
 */

import { createRequire } from 'node:module';
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

/** monorepo / production / 수동 등록 등 다양한 환경에서 `data/` 절대 경로를 찾기 위한 후보 목록. */
function dataDirCandidates(): string[] {
  const candidates: string[] = [
    // 1) core 와 함께 동봉된 경우 (sub-class 패키지가 data/ 를 core 안에 다시 깔아둘 수도 있음)
    resolve(HERE, 'data'),
    // 2) core 의 같은 패키지 안 소스 트리 (dist→src 폴백)
    resolve(HERE, '..', '..', 'src', 'presets', 'data'),
    // 3) monorepo: packages/core/{src|dist}/presets → packages/java/src/presets/data
    resolve(HERE, '..', '..', '..', 'java', 'src', 'presets', 'data'),
    // 4) monorepo: packages/core/{src|dist}/presets → packages/java/dist/presets/data
    resolve(HERE, '..', '..', '..', 'java', 'dist', 'presets', 'data'),
  ];

  // 5) production: airirang-builder 가 어딘가 설치돼 있다면 그 패키지의 src/presets/data 를 찾는다.
  try {
    const req = createRequire(import.meta.url);
    const pkgJson = req.resolve('airirang-builder/package.json');
    const pkgRoot = dirname(pkgJson);
    candidates.push(resolve(pkgRoot, 'src', 'presets', 'data'));
    candidates.push(resolve(pkgRoot, 'dist', 'presets', 'data'));
  } catch {
    // airirang-builder 가 없는 환경 (예: core 단독 사용) — 무시.
  }

  return candidates;
}

function resolveDataDir(): string {
  for (const c of dataDirCandidates()) {
    if (existsSync(c)) return c;
  }
  return dataDirCandidates()[0]!;
}

let DATA_DIR = resolveDataDir();

/**
 * 프리셋 에셋 디렉토리를 명시적으로 지정합니다. 자동 탐색이 실패하는
 * 환경(예: 패키지 외부 위치)에서 호스트 패키지가 부팅 시 호출합니다.
 *
 * Override the preset asset directory. Hosts (e.g. the Java edition package)
 * can call this at startup when the bundled assets live somewhere the
 * auto-resolver wouldn't find.
 */
export function setPresetDataDir(dir: string): void {
  DATA_DIR = resolve(dir);
}

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
