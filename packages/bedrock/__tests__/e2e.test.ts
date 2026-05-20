/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * End-to-end 통합 테스트 (Bedrock) — Quaternius `House_3.obj` 한 채를 실제
 * 파일에서 끝까지 흘려본다:
 *   loadSceneAsync → voxelizeScene(pitch=0.1) → greedyMeshing
 *     → splitForFillLimit → emitBedrockFill → buildBehaviorPack(tmp).
 *
 * 회귀 어서션:
 *   - voxel bbox = (21, 22, 23) — 기하학적 사실, 변하지 않음.
 *   - Bedrock 라인 수 ≤ 500 — Java E2E 와 동일한 상한 (회귀 안전망).
 *   - `.mcaddon` zip 안에 manifest.json + functions/house_3.mcfunction 존재.
 *
 * Asset (`asset/Medieval Village Pack - Dec 2020/.../House_3.obj`) 가 없으면
 * `packages/java/src/presets/data/House_3.obj` 로 폴백 — 두 사본은 동일.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import {
  BlockMatcher,
  greedyMeshing,
  linearToSrgbU8,
  loadSceneAsync,
  splitForFillLimit,
  voxelizeScene,
} from 'airirang-builder-core';
import type { Material } from 'airirang-builder-core';

import { emitBedrockFill } from '../src/fill/emitter.js';
import { buildBehaviorPack } from '../src/packager/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const bedrockPkgRoot = path.resolve(here, '..');
const monorepoRoot = path.resolve(bedrockPkgRoot, '..', '..');

function resolveHouseObj(): string {
  const assetPath = path.join(
    monorepoRoot,
    'asset',
    'Medieval Village Pack - Dec 2020',
    'Buildings',
    'OBJ',
    'House_3.obj',
  );
  if (existsSync(assetPath)) return assetPath;
  // 프리셋 .obj 정본은 core 패키지에 동봉됨 (java 사본은 0.2.2에서 제거).
  const presetPath = path.join(
    monorepoRoot,
    'packages',
    'core',
    'src',
    'presets',
    'data',
    'House_3.obj',
  );
  if (existsSync(presetPath)) return presetPath;
  throw new Error('House_3.obj not found in asset/ or packages/core/src/presets/data/');
}

describe('end-to-end (bedrock) — Quaternius House_3 full pipeline', () => {
  it(
    'loadScene → voxelize → greedy → bedrock fill → behavior pack — bbox (21,22,23), ≤500 lines, .mcaddon valid',
    async () => {
      const objPath = resolveHouseObj();
      const scene = await loadSceneAsync(objPath);
      expect(Object.keys(scene.geometries).length).toBeGreaterThan(0);

      // .mtl Kd 는 linear → sRGB 변환 후 매칭 (CLAUDE.md Gotcha #1).
      const matcher = new BlockMatcher();
      const matchMaterial = (material: Material): string => {
        const srgb = linearToSrgbU8(material.diffuseLinearRgb);
        return matcher.blockAt(matcher.matchOne(srgb));
      };

      const vox = voxelizeScene(scene, 0.1, {
        pitch: 0.1,
        matcher: matchMaterial,
      });
      expect(vox.indices.length).toBe(vox.blockIds.length);
      expect(vox.bbox.x).toBe(21);
      expect(vox.bbox.y).toBe(22);
      expect(vox.bbox.z).toBe(23);

      const cuboids = greedyMeshing(vox.indices, vox.blockIds);
      const split = splitForFillLimit(cuboids);
      const lines = emitBedrockFill(split);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBeLessThanOrEqual(500);
      for (const line of lines) {
        expect(line.startsWith('fill ~') || line.startsWith('setblock ~')).toBe(true);
      }

      const workDir = await mkdtemp(path.join(tmpdir(), 'airirang-bedrock-e2e-'));
      try {
        const build = await buildBehaviorPack({
          mcfunctionLines: lines,
          name: 'airirang_house_3_bedrock',
          namespace: 'airirang',
          functionId: 'house_3',
          outRoot: workDir,
        });

        await expect(stat(build.packRoot)).resolves.toBeTruthy();
        await expect(stat(build.mcaddonPath)).resolves.toBeTruthy();
        await expect(stat(build.functionPath)).resolves.toBeTruthy();
        expect(build.lineCount).toBe(lines.length);

        const manifest = JSON.parse(
          await readFile(path.join(build.packRoot, 'manifest.json'), 'utf-8'),
        ) as {
          format_version: number;
          header: { uuid: string; min_engine_version: number[] };
          modules: { type: string }[];
        };
        expect(manifest.format_version).toBe(2);
        expect(manifest.header.min_engine_version).toEqual([1, 21, 0]);
        expect(manifest.modules[0]!.type).toBe('data');

        const writtenBody = await readFile(build.functionPath, 'utf-8');
        const writtenLines = writtenBody
          .split('\n')
          .filter((l) => l.length > 0);
        expect(writtenLines.length).toBe(lines.length);

        const zip = await JSZip.loadAsync(await readFile(build.mcaddonPath));
        expect(zip.file('manifest.json')).not.toBeNull();
        expect(zip.file('functions/house_3.mcfunction')).not.toBeNull();
        const zippedMcf = await zip
          .file('functions/house_3.mcfunction')!
          .async('string');
        const zippedLines = zippedMcf.split('\n').filter((l) => l.length > 0);
        expect(zippedLines.length).toBe(lines.length);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
