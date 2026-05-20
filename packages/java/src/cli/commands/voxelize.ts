/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * CLI subcommand — `voxelize <obj>`.
 *
 * .obj 한 개를 voxelize → greedy meshing → .mcfunction 파일로 출력.
 * POC `python obj_to_mcfunction.py <obj> --pitch 0.1 --out house.mcfunction`
 * 와 동일한 시그니처를 유지해 마이그레이션 비용을 0 으로 만듭니다.
 *
 * Voxelize a single .obj into a .mcfunction file (greedy-meshed). Signature
 * mirrors the Python POC so users can swap python → npx airirang-builder
 * without changing flags.
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { greedyMeshing, splitForFillLimit, emitFillCommands } from '@airirang/builder-core';
import { BlockMatcher, linearToSrgbU8 } from '@airirang/builder-core';
import type { Material } from '../../types.js';
import {
  applyScaleToScene,
  loadSceneAsync,
  voxelizeScene,
  type UpAxis,
} from '@airirang/builder-core';

/** `voxelize` 서브커맨드 옵션. commander option 타입 매핑과 1:1. */
export interface VoxelizeCommandOptions {
  pitch: number;
  out?: string;
  block?: string;
  fillInterior: boolean;
  /** GLB/glTF up-axis 힌트 (auto 기본). OBJ 는 무시. */
  up?: UpAxis;
  /** 메시 사이즈 배수 (GLB scale 보정용). 기본 1.0. */
  scale?: number;
}

/**
 * `airirang-builder voxelize` 핸들러. cwd 상대 경로 지원.
 *
 * @param objPath  사용자 입력 .obj 경로 (절대 또는 cwd 상대).
 * @param options  pitch / out / block / fillInterior.
 */
export async function runVoxelize(
  objPath: string,
  options: VoxelizeCommandOptions,
): Promise<void> {
  const absObj = path.resolve(objPath);
  if (!existsSync(absObj)) {
    throw new Error(`file not found: ${absObj}`);
  }
  if (!(options.pitch > 0)) {
    throw new Error(`--pitch must be > 0 (got ${options.pitch})`);
  }

  const scene = await loadSceneAsync(absObj, { up: options.up ?? 'auto' });
  applyScaleToScene(scene, options.scale ?? 1.0);

  // --block 우선: 모든 머티리얼을 동일 블록으로 강제.
  // 미지정 시 sRGB→Lab→Delta E76 매칭 (palette BlockMatcher).
  let matcher: ((mat: Material) => string) | undefined;
  if (options.block) {
    const block = options.block;
    matcher = (): string => block;
  } else {
    const m = new BlockMatcher();
    matcher = (mat: Material): string => {
      const srgb = linearToSrgbU8(mat.diffuseLinearRgb);
      return m.blockAt(m.matchOne(srgb));
    };
  }

  const vox = voxelizeScene(scene, options.pitch, {
    pitch: options.pitch,
    fillInterior: options.fillInterior,
    matcher,
  });

  const cuboids = splitForFillLimit(greedyMeshing(vox.indices, vox.blockIds));
  const commands = emitFillCommands(cuboids);

  const outPath = path.resolve(
    options.out ?? `${path.basename(absObj, path.extname(absObj))}.mcfunction`,
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, commands.join('\n') + '\n', 'utf-8');

  process.stdout.write(
    [
      `[voxelize] ${path.basename(absObj)} pitch=${options.pitch}`,
      `[voxel] count=${vox.indices.length} bbox=[${vox.bbox.x},${vox.bbox.y},${vox.bbox.z}]`,
      `[greedy] ${vox.indices.length} voxels -> ${cuboids.length} cuboids -> ${commands.length} lines`,
      `[out] ${outPath}`,
    ].join('\n') + '\n',
  );
}
