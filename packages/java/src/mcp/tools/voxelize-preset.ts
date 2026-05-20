/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — voxelize-preset.
 * 동봉 프리셋을 voxelize + greedy meshing 하여 /fill·/setblock 명령 배열을 반환.
 *
 * Loads a bundled preset, runs the full voxelize → greedy → /fill pipeline,
 * and returns the resulting Minecraft command lines without writing to disk.
 * Use {@link generate-mcfunction} or {@link quick-build} to persist them.
 */

import { z } from 'zod';

import { greedyMeshing, splitForFillLimit, emitFillCommands } from 'airirang-builder-core';
import { BlockMatcher, linearToSrgbU8 } from 'airirang-builder-core';
import { getPreset, resolvePresetObjPath } from 'airirang-builder-core';
import type { Material } from '../../types.js';
import { applyScaleToScene, loadSceneAsync, voxelizeScene, type UpAxis } from 'airirang-builder-core';
import { safeHandler, toolOk } from './shared.js';

export const name = 'voxelize-preset';

export const config = {
  title: 'Voxelize a bundled preset',
  description:
    '프리셋 ID 로 .obj 로드 → multi-material voxelize → greedy meshing → /fill 명령 배열 반환. ' +
    'Runs voxelize+greedy on a bundled preset and returns the command lines.',
  inputSchema: {
    presetId: z
      .string()
      .describe('list-presets 가 반환한 id (예: "house_3")'),
    pitch: z
      .number()
      .positive()
      .optional()
      .describe('월드 단위당 voxel 크기. 미지정 시 0.1.'),
    scale: z
      .number()
      .positive()
      .optional()
      .describe('메시 사이즈 배수. GLB preset 이 1/10 스케일이면 10 등. 기본 1.0.'),
    fillInterior: z
      .boolean()
      .optional()
      .describe('true(기본) 내부 채움, false 면 표면만.'),
    up: z
      .enum(['auto', '+y', '-y', '+z', '-z', '+x', '-x'])
      .optional()
      .describe(
        'GLB/glTF 의 up-axis 힌트 (auto 기본). 누워서/거꾸로 솟으면 다른 값 시도. OBJ 는 무시.',
      ),
    blockOverrides: z
      .record(z.string(), z.string())
      .optional()
      .describe('머티리얼명 → minecraft:block 강제 매핑. 프리셋 기본값 위에 추가 덮어쓰기.'),
  },
  outputSchema: {
    ok: z.boolean(),
    commands: z.array(z.string()),
    stats: z.object({
      voxelCount: z.number(),
      cuboidCount: z.number(),
      lineCount: z.number(),
      bbox: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      materialMap: z.record(z.string(), z.string()),
    }),
  },
} as const;

type Args = {
  presetId: string;
  pitch?: number;
  scale?: number;
  fillInterior?: boolean;
  up?: UpAxis;
  blockOverrides?: Record<string, string>;
};

export const handler = safeHandler(async (args: Args) => {
  const preset = getPreset(args.presetId);
  if (!preset) {
    throw new Error(`unknown preset id: ${args.presetId}`);
  }
  const objPath = resolvePresetObjPath(preset);
  const pitch = args.pitch ?? 0.1;
  const fillInterior = args.fillInterior !== false;

  const matcher = new BlockMatcher();
  const matchMaterial = (mat: Material): string => {
    const srgb = linearToSrgbU8(mat.diffuseLinearRgb);
    return matcher.blockAt(matcher.matchOne(srgb));
  };

  const scene = await loadSceneAsync(objPath, { up: args.up ?? 'auto' });
  applyScaleToScene(scene, args.scale ?? 1.0);
  const voxResult = voxelizeScene(scene, pitch, {
    pitch,
    fillInterior,
    matcher: matchMaterial,
    blockOverrides: { ...preset.blockOverrides, ...(args.blockOverrides ?? {}) },
  });

  const cuboids = splitForFillLimit(greedyMeshing(voxResult.indices, voxResult.blockIds));
  const commands = emitFillCommands(cuboids);

  return toolOk(
    `voxelized ${preset.id}: ${voxResult.indices.length} voxels → ${cuboids.length} cuboids → ${commands.length} commands.`,
    {
      commands,
      stats: {
        voxelCount: voxResult.indices.length,
        cuboidCount: cuboids.length,
        lineCount: commands.length,
        bbox: voxResult.bbox,
        materialMap: voxResult.materialMap,
      },
    },
  );
});
