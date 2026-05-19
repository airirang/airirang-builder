/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — quick-build.
 * **AIrirang Builder 의 핵심 차별점.** Claude 가 단 1번 호출로 전체 파이프라인
 * (load → voxelize → greedy → emit → write mcfunction → buildDatapack) 을 수행.
 *
 * yuniko 류 봇은 블록당 `place-block` 호출이 필요하지만, quick-build 는 단
 * 1번이면 전체 건축물의 datapack 이 떨어집니다.
 *
 * The flagship one-shot pipeline: a single tool call performs preset/OBJ
 * load → voxelize → greedy meshing → fill emission → .mcfunction write →
 * datapack assembly. This is the headline efficiency win versus per-block
 * agent loops.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { z } from 'zod';

import { buildDatapack, formatInstallMessage } from '../../datapack/index.js';
import { greedyMeshing, splitForFillLimit, emitFillCommands } from '../../greedy-meshing/index.js';
import { BlockMatcher, linearToSrgbU8 } from '../../palette/index.js';
import { getPreset, resolvePresetObjPath } from '../../presets/index.js';
import type { Material, McVersion } from '../../types.js';
import { applyScaleToScene, loadSceneAsync, voxelizeScene, type UpAxis } from '../../voxelizer/index.js';
import { safeHandler, toolOk } from './shared.js';

export const name = 'quick-build';

const SUPPORTED_VERSIONS = [
  '1.20.5',
  '1.20.6',
  '1.21',
  '1.21.0',
  '1.21.1',
  '1.21.2',
  '1.21.3',
  '1.21.4',
  '1.21.5',
  '1.21.6',
  '1.21.7',
  '1.21.8',
  '1.21.9',
  '1.21.10',
  '1.21.11',
] as const;

export const config = {
  title: 'One-shot: voxelize → greedy → mcfunction → datapack',
  description:
    '프리셋 ID 또는 .obj 경로를 받아 voxelize + greedy meshing + .mcfunction 작성 + datapack 빌드를 ' +
    '한 번에 수행합니다. presetId 와 objPath 중 정확히 하나를 제공하세요. ' +
    'End-to-end pipeline in a single MCP call. Provide exactly one of presetId or objPath.',
  inputSchema: {
    presetId: z
      .string()
      .optional()
      .describe('list-presets 의 id 중 하나. objPath 와 둘 중 하나만.'),
    objPath: z
      .string()
      .optional()
      .describe('사용자 .obj / .glb / .gltf 경로. presetId 와 둘 중 하나만.'),
    name: z.string().describe('datapack 폴더명 (예: "airirang-house3")'),
    namespace: z
      .string()
      .optional()
      .describe('함수 namespace. 기본 "airirang".'),
    functionId: z
      .string()
      .optional()
      .describe('함수 id. 기본은 name 그대로.'),
    mcVersion: z
      .enum(SUPPORTED_VERSIONS)
      .optional()
      .describe('대상 마인크래프트 버전. 기본 "1.21".'),
    outRoot: z.string().describe('datapack 폴더가 생성될 부모 디렉토리'),
    pitch: z.number().positive().optional().describe('voxel 크기. 기본 0.1.'),
    scale: z
      .number()
      .positive()
      .optional()
      .describe(
        '메시 사이즈 배수. GLB 가 작가 export 스케일(예: 1/10) 로 작으면 10 등 사용. 기본 1.0.',
      ),
    fillInterior: z.boolean().optional().describe('true(기본) 내부 채움.'),
    up: z
      .enum(['auto', '+y', '-y', '+z', '-z', '+x', '-x'])
      .optional()
      .describe(
        'GLB/glTF up-axis 힌트 (auto 기본). 결과가 누워서/거꾸로 솟으면 +z/-z/+x/-x 시도. OBJ 는 무시.',
      ),
    blockOverrides: z
      .record(z.string(), z.string())
      .optional()
      .describe('머티리얼명 → minecraft:block 강제 매핑.'),
  },
  outputSchema: {
    ok: z.boolean(),
    datapackRoot: z.string(),
    functionPath: z.string(),
    mcfunctionPath: z.string(),
    packFormat: z.number(),
    lineCount: z.number(),
    cuboidCount: z.number(),
    voxelCount: z.number(),
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
  mcVersion?: McVersion;
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
  const mcVersion = args.mcVersion ?? '1.21';

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
  const commands = emitFillCommands(cuboids);

  // Stage the .mcfunction next to the datapack root so users can re-pack manually.
  const outRoot = path.resolve(args.outRoot);
  await fs.mkdir(outRoot, { recursive: true });
  const mcfunctionPath = path.join(outRoot, `${args.name}.mcfunction`);
  await fs.writeFile(mcfunctionPath, commands.join('\n') + '\n', 'utf-8');

  const build = await buildDatapack({
    mcfunctionPath,
    name: args.name,
    namespace,
    functionId,
    mcVersion,
    outRoot,
  });

  const installMessage = formatInstallMessage(build, namespace, functionId, mcVersion);

  return toolOk(
    `quick-build ok: ${voxResult.indices.length} voxels → ${cuboids.length} cuboids → ${commands.length} lines → datapack ${build.datapackRoot}`,
    {
      datapackRoot: build.datapackRoot,
      functionPath: build.functionPath,
      mcfunctionPath,
      packFormat: build.packFormat,
      lineCount: build.lineCount,
      cuboidCount: cuboids.length,
      voxelCount: voxResult.indices.length,
      materialMap: voxResult.materialMap,
      installMessage,
    },
  );
});
