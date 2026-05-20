/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * CLI subcommand — `build` (Bedrock).
 *
 * 프리셋 ID 또는 .obj 한 개를 받아 voxelize → greedy meshing → Bedrock /fill
 * 변환 → behavior pack 패키징(.mcaddon) 까지 한 번에 수행합니다. MCP `quick-build`
 * 의 CLI 카운터파트.
 *
 * One-shot pipeline (preset/OBJ → Bedrock .mcaddon). The shell equivalent of
 * the bedrock `quick-build` MCP tool.
 */

import { existsSync } from 'node:fs';
import * as path from 'node:path';

import {
  BlockMatcher,
  applyScaleToScene,
  emitFillCommands as _emitJavaFill,
  getPreset,
  greedyMeshing,
  linearToSrgbU8,
  loadSceneAsync,
  resolvePresetObjPath,
  splitForFillLimit,
  voxelizeScene,
  type Material,
  type UpAxis,
} from '@airirang/builder-core';

import { emitBedrockFill } from '../../fill/index.js';
import { buildBehaviorPack, formatInstallMessage } from '../../packager/index.js';
import type { BedrockVersion } from '../../packager/index.js';

// _emitJavaFill 은 본 파이프라인에서 사용하지 않지만(Bedrock fill emitter 로 교체)
// 시그니처 호환성을 위해 import 만 보존. tsc unused 회피 위해 명시 참조.
void _emitJavaFill;

/** `build` 서브커맨드 옵션. */
export interface BuildCommandOptions {
  preset?: string;
  obj?: string;
  name: string;
  namespace: string;
  functionId?: string;
  /** "1.21.0" 형태 문자열. parse 실패 시 기본값 [1,21,0]. */
  minEngineVersion?: string;
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
 * "1.21.0" 같은 dotted 문자열 → BedrockVersion 튜플. 실패 시 [1,21,0].
 * Parse a dotted version string into a BedrockVersion tuple.
 */
function parseEngineVersion(v: string | undefined): BedrockVersion {
  if (!v) return [1, 21, 0];
  const parts = v.split('.').map((s) => Number.parseInt(s, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error(`invalid --min-engine-version: ${v} (expected "MAJOR.MINOR.PATCH")`);
  }
  return [parts[0]!, parts[1]!, parts[2]!];
}

/**
 * `airirang-builder-bedrock build` 핸들러. preset 와 obj 는 둘 중 하나만 허용.
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

  // core 의 Java fill emitter 가 아닌 Bedrock emitter 로 변환.
  const cuboids = splitForFillLimit(greedyMeshing(vox.indices, vox.blockIds));
  const lines = emitBedrockFill(cuboids);

  const functionId = options.functionId ?? options.name;
  const result = await buildBehaviorPack({
    mcfunctionLines: lines,
    name: options.name,
    namespace: options.namespace,
    functionId,
    minEngineVersion: parseEngineVersion(options.minEngineVersion),
    outRoot: path.resolve(options.outRoot),
  });

  process.stdout.write(
    [
      `[voxel] count=${vox.indices.length} bbox=[${vox.bbox.x},${vox.bbox.y},${vox.bbox.z}]`,
      `[greedy] ${cuboids.length} cuboids -> ${lines.length} lines`,
      formatInstallMessage(result, functionId),
    ].join('\n') + '\n',
  );
}
