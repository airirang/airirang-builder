/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — quick-build (Bedrock).
 * 단 1번 호출로 전체 파이프라인 수행:
 *   load → voxelize → greedy → Bedrock fill → behavior pack(.mcaddon).
 *
 * Java quick-build 와 동일한 입력 표면을 노출하되 출력은 Bedrock `.mcaddon`.
 * mcVersion 대신 minEngineVersion (3-tuple semver) 을 사용.
 */

import * as path from 'node:path';

import { z } from 'zod';

import {
  BlockMatcher,
  applyScaleToScene,
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
import { safeHandler, toolOk } from './shared.js';

export const name = 'quick-build';

export const config = {
  title: 'One-shot: voxelize → greedy → Bedrock fill → .mcaddon',
  description:
    '프리셋 ID 또는 .obj/.glb/.gltf 경로를 받아 voxelize + greedy meshing + Bedrock /fill 변환 + ' +
    'behavior pack(.mcaddon) 빌드를 한 번에 수행합니다. presetId 와 objPath 중 정확히 하나를 ' +
    '제공하세요. End-to-end Bedrock pipeline in a single MCP call.',
  inputSchema: {
    presetId: z
      .string()
      .optional()
      .describe('list-presets 의 id 중 하나. objPath 와 둘 중 하나만.'),
    objPath: z
      .string()
      .optional()
      .describe('사용자 .obj / .glb / .gltf 경로. presetId 와 둘 중 하나만.'),
    name: z.string().describe('패키지 이름 (예: "airirang-house3") — 폴더+.mcaddon 파일명'),
    namespace: z
      .string()
      .optional()
      .describe('manifest 식별용 namespace. 기본 "airirang".'),
    functionId: z
      .string()
      .optional()
      .describe('함수 id. 기본은 name 그대로. /function <id> 로 호출.'),
    minEngineVersion: z
      .tuple([z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().nonnegative()])
      .optional()
      .describe('Bedrock min_engine_version 3-tuple. 기본 [1,21,0].'),
    outRoot: z.string().describe('behavior pack 폴더와 .mcaddon 이 생성될 부모 디렉토리'),
    pitch: z.number().positive().optional().describe('voxel 크기. 기본 0.1.'),
    scale: z
      .number()
      .positive()
      .optional()
      .describe('메시 사이즈 배수. GLB 가 작가 export 스케일(예: 1/10) 로 작으면 10 등. 기본 1.0.'),
    fillInterior: z.boolean().optional().describe('true(기본) 내부 채움.'),
    up: z
      .enum(['auto', '+y', '-y', '+z', '-z', '+x', '-x'])
      .optional()
      .describe('GLB/glTF up-axis 힌트 (auto 기본). OBJ 는 무시.'),
    blockOverrides: z
      .record(z.string(), z.string())
      .optional()
      .describe('머티리얼명 → Java minecraft:block 강제 매핑 (Bedrock 으로 변환됨).'),
  },
  outputSchema: {
    ok: z.boolean(),
    packRoot: z.string(),
    mcaddonPath: z.string(),
    functionPath: z.string(),
    lineCount: z.number(),
    cuboidCount: z.number(),
    voxelCount: z.number(),
    headerUuid: z.string(),
    moduleUuid: z.string(),
    materialMap: z.record(z.string(), z.string()),
    installMessage: z.string(),
  },
} as const;

type Args = {
  presetId?: string;
  objPath?: string;
  name: string;
  namespace?: string;
  functionId?: string;
  minEngineVersion?: BedrockVersion;
  outRoot: string;
  pitch?: number;
  scale?: number;
  fillInterior?: boolean;
  up?: UpAxis;
  blockOverrides?: Record<string, string>;
};

export const handler = safeHandler(async (args: Args) => {
  if ((args.presetId && args.objPath) || (!args.presetId && !args.objPath)) {
    throw new Error('provide exactly one of presetId or objPath.');
  }

  let sourcePath: string;
  let presetOverrides: Record<string, string> = {};
  if (args.presetId) {
    const preset = getPreset(args.presetId);
    if (!preset) throw new Error(`unknown preset id: ${args.presetId}`);
    sourcePath = resolvePresetObjPath(preset);
    presetOverrides = preset.blockOverrides ?? {};
  } else {
    sourcePath = args.objPath as string;
  }

  const pitch = args.pitch ?? 0.1;
  const fillInterior = args.fillInterior !== false;
  const namespace = args.namespace ?? 'airirang';
  const functionId = args.functionId ?? args.name;
  const minEngineVersion: BedrockVersion = args.minEngineVersion ?? [1, 21, 0];

  const matcher = new BlockMatcher();
  const matchMaterial = (mat: Material): string => {
    const srgb = linearToSrgbU8(mat.diffuseLinearRgb);
    return matcher.blockAt(matcher.matchOne(srgb));
  };

  const scene = await loadSceneAsync(sourcePath, { up: args.up ?? 'auto' });
  applyScaleToScene(scene, args.scale ?? 1.0);
  const voxResult = voxelizeScene(scene, pitch, {
    pitch,
    fillInterior,
    matcher: matchMaterial,
    blockOverrides: { ...presetOverrides, ...(args.blockOverrides ?? {}) },
  });

  const cuboids = splitForFillLimit(greedyMeshing(voxResult.indices, voxResult.blockIds));
  const lines = emitBedrockFill(cuboids);

  const outRoot = path.resolve(args.outRoot);
  const build = await buildBehaviorPack({
    mcfunctionLines: lines,
    name: args.name,
    namespace,
    functionId,
    minEngineVersion,
    outRoot,
  });

  const installMessage = formatInstallMessage(build, functionId);

  return toolOk(
    `quick-build ok: ${voxResult.indices.length} voxels → ${cuboids.length} cuboids → ${lines.length} lines → .mcaddon ${build.mcaddonPath}`,
    {
      packRoot: build.packRoot,
      mcaddonPath: build.mcaddonPath,
      functionPath: build.functionPath,
      lineCount: build.lineCount,
      cuboidCount: cuboids.length,
      voxelCount: voxResult.indices.length,
      headerUuid: build.headerUuid,
      moduleUuid: build.moduleUuid,
      materialMap: voxResult.materialMap,
      installMessage,
    },
  );
});
