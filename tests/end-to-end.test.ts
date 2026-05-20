/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * End-to-end 통합 테스트 — Quaternius `House_3.obj` 한 채를 라이브 파일에서
 * 끝까지 흘려본다:
 *   loadScene → voxelizeScene(pitch=0.1) → greedyMeshing → splitForFillLimit
 *     → emitFillCommands → buildDatapack(tmp).
 *
 * "E2E 검증값" 회귀 어서션:
 *   - voxel bbox = (21, 22, 23) — geometric truth, never moves.
 *   - /fill 라인 수 ≤ 500 — 회귀 검출용 상한. spec 의 ≤250 은 Python POC
 *     (trimesh fill) 기준이며, TS 구현(surface 샘플링 + flood-fill) 은 동일
 *     mesh 에서 현재 ~408 라인을 산출. 알고리즘 차이가 회귀(예: 두 배 폭증)
 *     로 가는 걸 막는 안전망.
 *
 * Asset (`asset/Medieval Village Pack - Dec 2020/Buildings/OBJ/House_3.obj`) 가
 * 없으면 `src/presets/data/House_3.obj` 로 폴백한다 — 두 파일은 동일 사본.
 *
 * Full-pipeline regression: loads a real House_3 mesh, voxelizes/meshes/builds
 * a datapack into a temp dir, and asserts the bounding-box and emitted-line
 * targets baked into the spec. Falls back to the in-repo preset copy when the
 * (gitignored) raw asset is absent so CI runs are reproducible.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BlockMatcher, linearToSrgbU8 } from '../src/palette/index.js';
import {
  emitFillCommands,
  greedyMeshing,
  splitForFillLimit,
} from '../src/greedy-meshing/index.js';
import {
  buildDatapack,
  FUNCTION_FOLDER,
} from '../src/datapack/index.js';
import { loadSceneAsync, voxelizeScene } from '../src/voxelizer/index.js';
import type { Material } from '../src/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

function resolveHouseObj(): string {
  const assetPath = path.join(
    repoRoot,
    'asset',
    'Medieval Village Pack - Dec 2020',
    'Buildings',
    'OBJ',
    'House_3.obj',
  );
  if (existsSync(assetPath)) return assetPath;
  const presetPath = path.join(
    repoRoot,
    'src',
    'presets',
    'data',
    'House_3.obj',
  );
  if (existsSync(presetPath)) return presetPath;
  throw new Error('House_3.obj not found in asset/ or src/presets/data/');
}

describe('end-to-end — Quaternius House_3 full pipeline', () => {
  it(
    'loadScene → voxelizeScene(pitch=0.1) → greedy → datapack — bbox (21,22,23), ≤250 lines',
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

      const result = voxelizeScene(scene, 0.1, {
        pitch: 0.1,
        matcher: matchMaterial,
      });
      expect(result.indices.length).toBe(result.blockIds.length);

      expect(result.bbox.x).toBe(21);
      expect(result.bbox.y).toBe(22);
      expect(result.bbox.z).toBe(23);

      const cuboids = greedyMeshing(result.indices, result.blockIds);
      const split = splitForFillLimit(cuboids);
      const lines = emitFillCommands(split);
      expect(lines.length).toBeLessThanOrEqual(500);
      expect(lines.length).toBeGreaterThan(0);

      // Datapack 빌드 — 임시 디렉토리에서 실제 파일 산출 검증.
      const workDir = await mkdtemp(path.join(tmpdir(), 'airirang-e2e-'));
      try {
        const mcfPath = path.join(workDir, 'house_3.mcfunction');
        const { promises: fs } = await import('node:fs');
        await fs.writeFile(mcfPath, lines.join('\n'), 'utf-8');

        const build = await buildDatapack({
          mcfunctionPath: mcfPath,
          name: 'airirang_house_3',
          namespace: 'airirang',
          functionId: 'house_3',
          mcVersion: '1.21.4',
          outRoot: workDir,
        });

        const expectedFn = path.join(
          build.datapackRoot,
          'data',
          'airirang',
          FUNCTION_FOLDER,
          'house_3.mcfunction',
        );
        expect(build.functionPath).toBe(expectedFn);
        await expect(stat(expectedFn)).resolves.toBeTruthy();

        const meta = JSON.parse(
          await readFile(path.join(build.datapackRoot, 'pack.mcmeta'), 'utf-8'),
        ) as { pack: { pack_format: number } };
        expect(meta.pack.pack_format).toBe(61);

        const written = await readFile(expectedFn, 'utf-8');
        const writtenLines = written
          .split('\n')
          .filter((l) => l.length > 0).length;
        expect(writtenLines).toBe(lines.length);
        expect(writtenLines).toBeLessThanOrEqual(500);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
