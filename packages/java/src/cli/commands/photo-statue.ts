/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/** Local photo → fixed-depth Minecraft statue/relief command. */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

import {
  emitFillCommands,
  greedyMeshing,
  photoToVoxelGrid,
  splitForFillLimit,
} from 'airirang-builder-core';

export interface PhotoStatueCommandOptions {
  width: number;
  depth: number;
  out?: string;
  alphaThreshold?: number;
  whiteThreshold?: number;
}

/** Convert a local image into a Java Edition `.mcfunction` without an AI API. */
export async function runPhotoStatue(
  imagePath: string,
  options: PhotoStatueCommandOptions,
): Promise<void> {
  const absImage = path.resolve(imagePath);
  if (!existsSync(absImage)) {
    throw new Error(`file not found: ${absImage}`);
  }

  const voxels = await photoToVoxelGrid(absImage, options);
  if (voxels.indices.length === 0) {
    throw new Error('no visible pixels found; lower --alpha-threshold or check the image');
  }
  const cuboids = splitForFillLimit(
    greedyMeshing(voxels.indices, voxels.blockIds),
  );
  const commands = emitFillCommands(cuboids);
  const outPath = path.resolve(
    options.out ?? `${path.basename(absImage, path.extname(absImage))}.mcfunction`,
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, commands.join('\n') + '\n', 'utf-8');

  process.stdout.write(
    [
      `[photo-statue] ${path.basename(absImage)} width=${options.width} depth=${options.depth}`,
      `[voxel] count=${voxels.indices.length} bbox=[${voxels.bbox.x},${voxels.bbox.y},${voxels.bbox.z}]`,
      `[greedy] ${voxels.indices.length} voxels -> ${cuboids.length} cuboids -> ${commands.length} lines`,
      `[out] ${outPath}`,
    ].join('\n') + '\n',
  );
}
