/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — voxelize-custom.
 * 사용자가 지정한 .obj/.mtl 경로를 voxelize + greedy meshing.
 *
 * Same pipeline as {@link voxelize-preset} but reads an arbitrary .obj path
 * the caller provides. The model is responsible for supplying a path the
 * MCP server process can read.
 */

import { z } from 'zod';

import { greedyMeshing, splitForFillLimit, emitFillCommands } from '@airirang/builder-core';
import { BlockMatcher, linearToSrgbU8 } from '@airirang/builder-core';
import type { Material } from '../../types.js';
import { applyScaleToScene, loadSceneAsync, voxelizeScene, type UpAxis } from '@airirang/builder-core';
import { safeHandler, toolOk } from './shared.js';

export const name = 'voxelize-custom';

export const config = {
  title: 'Voxelize a user-supplied .obj',
  description:
    '경로로 지정한 .obj(+.mtl) 를 voxelize 하고 /fill·/setblock 명령 배열을 반환. ' +
    'Voxelizes an arbitrary user-supplied OBJ and returns the command lines.',
  inputSchema: {
    objPath: z
      .string()
      .describe('절대 또는 작업디렉토리 기준 .obj / .glb / .gltf 경로'),
    pitch: z.number().positive().optional().describe('월드 단위당 voxel 크기. 기본 0.1.'),
    scale: z
      .number()
      .positive()
      .optional()
      .describe('메시 사이즈 배수 (GLB 가 1/10 등으로 작으면 10 사용). 기본 1.0.'),
    fillInterior: z.boolean().optional().describe('true(기본) 내부 채움, false 면 표면만.'),
    up: z
      .enum(['auto', '+y', '-y', '+z', '-z', '+x', '-x'])
      .optional()
      .describe(
        'GLB/glTF 의 up-axis 힌트. auto(기본)·+y(Y-up 마크 정합)·' +
          '+z/-z(Blender Z-up)·+x/-x(드물게). 결과가 누워서 솟거나 거꾸로면 다른 값 시도. OBJ 는 무시.',
      ),
    blockOverrides: z
      .record(z.string(), z.string())
      .optional()
      .describe('머티리얼명 → minecraft:block 강제 매핑.'),
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
  objPath: string;
  pitch?: number;
  scale?: number;
  fillInterior?: boolean;
  up?: UpAxis;
  blockOverrides?: Record<string, string>;
};

export const handler = safeHandler(async (args: Args) => {
  const pitch = args.pitch ?? 0.1;
  const fillInterior = args.fillInterior !== false;

  const matcher = new BlockMatcher();
  const matchMaterial = (mat: Material): string => {
    const srgb = linearToSrgbU8(mat.diffuseLinearRgb);
    return matcher.blockAt(matcher.matchOne(srgb));
  };

  const scene = await loadSceneAsync(args.objPath, { up: args.up ?? 'auto' });
  applyScaleToScene(scene, args.scale ?? 1.0);
  const voxResult = voxelizeScene(scene, pitch, {
    pitch,
    fillInterior,
    matcher: matchMaterial,
    blockOverrides: args.blockOverrides ?? {},
  });

  const cuboids = splitForFillLimit(greedyMeshing(voxResult.indices, voxResult.blockIds));
  const commands = emitFillCommands(cuboids);

  return toolOk(
    `voxelized ${args.objPath}: ${voxResult.indices.length} voxels → ${cuboids.length} cuboids → ${commands.length} commands.`,
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
