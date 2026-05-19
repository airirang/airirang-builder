/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * 데모 자동 실행 스크립트 — Node 1개 명령으로 한 번에 1회 풀 파이프라인 실행.
 * Single-shot demo: load preset .obj → voxelize → greedy mesh → write
 * .mcfunction → build datapack → verify. Mirrors what `quick-build` MCP tool
 * does internally, but as a plain Node script so it can be recorded as part
 * of the 5-minute demo video (see [demo.md](./demo.md)).
 *
 * 사용 / Usage:
 *   npx tsx examples/end-to-end.ts
 *   npx tsx examples/end-to-end.ts --preset house_3 --out C:/path/to/datapacks
 *
 * 옵션 / Flags:
 *   --preset <id>     기본 "house_3"
 *   --out <dir>       datapack 출력 부모 디렉토리. 기본 OS tmp + airirang-demo.
 *   --pitch <number>  voxel 크기 (m). 기본 0.1.
 *   --mc <version>    마인크래프트 버전. 기본 "1.21".
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  BlockMatcher,
  buildDatapack,
  emitFillCommands,
  formatInstallMessage,
  getPreset,
  greedyMeshing,
  linearToSrgbU8,
  loadScene,
  resolvePresetObjPath,
  splitForFillLimit,
  voxelizeScene,
} from '../src/index.js';
import type { Material, McVersion } from '../src/types.js';

const DISCLAIMER =
  '[airirang-builder] NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.';

interface CliArgs {
  preset: string;
  out: string;
  pitch: number;
  mc: McVersion;
  name: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  const preset = get('--preset') ?? 'house_3';
  const out = get('--out') ?? path.join(os.tmpdir(), 'airirang-demo');
  const pitch = Number(get('--pitch') ?? '0.1');
  const mc = (get('--mc') ?? '1.21') as McVersion;
  const name = `airirang-${preset.replace(/_/g, '')}`;
  return { preset, out, pitch, mc, name };
}

function step(n: number, total: number, label: string, detail: string): void {
  console.log(`[${n}/${total}] ${label.padEnd(10)} : ${detail}`);
}

async function main(): Promise<void> {
  console.log(DISCLAIMER);

  const args = parseArgs(process.argv.slice(2));

  const preset = getPreset(args.preset);
  if (!preset) {
    throw new Error(
      `unknown preset: ${args.preset}. 사용 가능: house_1, house_3, inn, mill, sawmill`,
    );
  }
  const objPath = resolvePresetObjPath(preset);

  // 1/5 — 메시 로드
  const scene = loadScene(objPath);
  const materialCount = Object.keys(scene.geometries).length;
  step(
    1,
    5,
    'loadScene',
    `${path.basename(objPath)} (${materialCount} materials)`,
  );

  // 2/5 — voxelize (multi-material)
  const matcher = new BlockMatcher();
  const matchMaterial = (mat: Material): string => {
    const srgb = linearToSrgbU8(mat.diffuseLinearRgb);
    return matcher.blockAt(matcher.matchOne(srgb));
  };
  const voxResult = voxelizeScene(scene, args.pitch, {
    pitch: args.pitch,
    fillInterior: true,
    matcher: matchMaterial,
    blockOverrides: { ...(preset.blockOverrides ?? {}) },
  });
  step(
    2,
    5,
    'voxelize',
    `${voxResult.indices.length.toLocaleString()} voxels @ pitch=${args.pitch}`,
  );

  // 3/5 — greedy meshing + /fill 32,768 split
  const rawCuboids = greedyMeshing(voxResult.indices, voxResult.blockIds);
  const cuboids = splitForFillLimit(rawCuboids);
  const compression =
    voxResult.indices.length === 0
      ? 0
      : 100 - (cuboids.length / voxResult.indices.length) * 100;
  step(
    3,
    5,
    'greedy',
    `${cuboids.length} cuboids (${compression.toFixed(1)}% compression)`,
  );

  // 4/5 — .mcfunction 작성
  const commands = emitFillCommands(cuboids);
  const outRoot = path.resolve(args.out);
  await fs.mkdir(outRoot, { recursive: true });
  const mcfunctionPath = path.join(outRoot, `${args.name}.mcfunction`);
  await fs.writeFile(mcfunctionPath, commands.join('\n') + '\n', 'utf-8');
  step(4, 5, 'mcfunction', `${commands.length} lines  →  ${mcfunctionPath}`);

  // 5/5 — datapack 패키징
  const build = await buildDatapack({
    mcfunctionPath,
    name: args.name,
    namespace: 'airirang',
    functionId: args.name,
    mcVersion: args.mc,
    outRoot,
  });
  step(
    5,
    5,
    'datapack',
    `${build.datapackRoot}  (pack_format=${build.packFormat})`,
  );

  // 검증 / verification — POC E2E 값과 동일하게 확인 (House_3, pitch=0.1)
  const bbox = computeBbox(voxResult.indices);
  const ok =
    args.preset !== 'house_3' ||
    (bbox.dx === 21 && bbox.dy === 22 && bbox.dz === 23 && build.lineCount <= 250);
  console.log(
    `verify ${ok ? 'ok' : 'WARN'}: bbox=[${bbox.dx},${bbox.dy},${bbox.dz}], lines=${build.lineCount}${
      args.preset === 'house_3' ? ' (목표 [21,22,23] ≤ 250)' : ''
    }.`,
  );

  console.log('');
  console.log(formatInstallMessage(build, 'airirang', args.name, args.mc));
}

function computeBbox(
  indices: ReadonlyArray<{ x: number; y: number; z: number }>,
): { dx: number; dy: number; dz: number } {
  if (indices.length === 0) return { dx: 0, dy: 0, dz: 0 };
  let xmin = Infinity,
    ymin = Infinity,
    zmin = Infinity,
    xmax = -Infinity,
    ymax = -Infinity,
    zmax = -Infinity;
  for (const v of indices) {
    if (v.x < xmin) xmin = v.x;
    if (v.y < ymin) ymin = v.y;
    if (v.z < zmin) zmin = v.z;
    if (v.x > xmax) xmax = v.x;
    if (v.y > ymax) ymax = v.y;
    if (v.z > zmax) zmax = v.z;
  }
  return { dx: xmax - xmin + 1, dy: ymax - ymin + 1, dz: zmax - zmin + 1 };
}

main().catch((err: unknown) => {
  console.error(DISCLAIMER);
  console.error('[end-to-end] FAILED:', err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});
