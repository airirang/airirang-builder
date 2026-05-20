/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * CLI subcommand — `build`.
 *
 * 프리셋 ID 또는 .obj 한 개를 받아 voxelize → greedy meshing → .mcfunction 작성
 * → Java Edition datapack 패키징까지 한 번에 수행합니다. MCP `quick-build` 와
 * 동등한 파이프라인의 CLI 버전.
 *
 * One-shot pipeline (preset/OBJ → datapack). The shell equivalent of the
 * `quick-build` MCP tool.
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { buildDatapack, formatInstallMessage } from '../../datapack/index.js';
import { greedyMeshing, splitForFillLimit, emitFillCommands } from '@airirang/builder-core';
import { BlockMatcher, linearToSrgbU8 } from '@airirang/builder-core';
import { getPreset, resolvePresetObjPath } from '@airirang/builder-core';
import type { Material, McVersion } from '../../types.js';
import {
  applyScaleToScene,
  loadSceneAsync,
  voxelizeScene,
  type UpAxis,
} from '@airirang/builder-core';

/** `build` 서브커맨드 옵션. */
export interface BuildCommandOptions {
  preset?: string;
  obj?: string;
  name: string;
  namespace: string;
  functionId?: string;
  mcVersion: McVersion;
  outRoot: string;
  pitch: number;
  fillInterior: boolean;
  block?: string;
  /** GLB/glTF up-axis 힌트 (auto 기본). OBJ 는 무시. */
  up?: UpAxis;
  /** 메시 사이즈 배수 (GLB scale 보정). 기본 1.0. */
  scale?: number;
}

/**
 * `airirang-builder build` 핸들러. preset 와 obj 는 둘 중 하나만 허용.
 */
export async function runBuild(options: BuildCommandOptions): Promise<void> {
  if ((options.preset && options.obj) || (!options.preset && !options.obj)) {
    throw new Error('provide exactly one of --preset or --obj.');
  }
  if (!(options.pitch > 0)) {
    throw new Error(`--pitch must be > 0 (got ${options.pitch})`);
  }

  let sourcePath: string;
  let presetOverrides: Record<string, string> = {};
  if (options.preset) {
    const preset = getPreset(options.preset);
    if (!preset) throw new Error(`unknown preset id: ${options.preset}`);
    sourcePath = resolvePresetObjPath(preset);
    presetOverrides = preset.blockOverrides ?? {};
  } else {
    sourcePath = path.resolve(options.obj as string);
    if (!existsSync(sourcePath)) {
      throw new Error(`file not found: ${sourcePath}`);
    }
  }

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

  const scene = await loadSceneAsync(sourcePath, { up: options.up ?? 'auto' });
  applyScaleToScene(scene, options.scale ?? 1.0);
  const vox = voxelizeScene(scene, options.pitch, {
    pitch: options.pitch,
    fillInterior: options.fillInterior,
    matcher,
    blockOverrides: presetOverrides,
  });

  const cuboids = splitForFillLimit(greedyMeshing(vox.indices, vox.blockIds));
  const commands = emitFillCommands(cuboids);

  const outRoot = path.resolve(options.outRoot);
  await fs.mkdir(outRoot, { recursive: true });
  const mcfunctionPath = path.join(outRoot, `${options.name}.mcfunction`);
  await fs.writeFile(mcfunctionPath, commands.join('\n') + '\n', 'utf-8');

  const functionId = options.functionId ?? options.name;
  const result = await buildDatapack({
    mcfunctionPath,
    name: options.name,
    namespace: options.namespace,
    functionId,
    mcVersion: options.mcVersion,
    outRoot,
  });

  process.stdout.write(
    [
      `[voxel] count=${vox.indices.length} bbox=[${vox.bbox.x},${vox.bbox.y},${vox.bbox.z}]`,
      `[greedy] ${cuboids.length} cuboids -> ${commands.length} lines`,
      formatInstallMessage(result, options.namespace, functionId, options.mcVersion),
    ].join('\n') + '\n',
  );
}
