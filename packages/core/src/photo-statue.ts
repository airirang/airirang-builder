/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * Local photo relief / statue voxelizer.
 *
 * It does not infer hidden geometry or call a remote AI model. Visible,
 * non-transparent pixels become a colour-matched Minecraft relief with a
 * fixed depth. A transparent PNG therefore becomes a silhouette statue.
 */

import { intToRGBA, Jimp } from 'jimp';

import type { BlockId, VoxelGrid } from './types.js';
import { BlockMatcher } from './palette/color-match.js';

/** Image pixels in Jimp-compatible RGBA order. */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Options for a local, deterministic photo → voxel relief conversion. */
export interface PhotoStatueOptions {
  /** Output width in Minecraft blocks. Height keeps the image aspect ratio. */
  width: number;
  /** Fixed front-to-back depth in Minecraft blocks. */
  depth: number;
  /** Pixels below this alpha are omitted. Useful for transparent PNG cutouts. */
  alphaThreshold?: number;
  /** Skip nearly-white pixels; useful for white studio backgrounds. */
  whiteThreshold?: number;
}

function assertOptions(options: PhotoStatueOptions): void {
  if (!Number.isInteger(options.width) || options.width < 1) {
    throw new Error(`width must be a positive integer (got ${options.width})`);
  }
  if (!Number.isInteger(options.depth) || options.depth < 1) {
    throw new Error(`depth must be a positive integer (got ${options.depth})`);
  }
}

/** Convert decoded RGBA image data to a coloured, fixed-depth Minecraft relief. */
export function photoToVoxelGridFromRgba(
  image: RgbaImage,
  options: PhotoStatueOptions,
): VoxelGrid {
  assertOptions(options);
  if (
    image.width < 1 ||
    image.height < 1 ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw new Error('invalid RGBA image dimensions or data length');
  }

  const targetHeight = Math.max(
    1,
    Math.round((image.height / image.width) * options.width),
  );
  const matcher = new BlockMatcher();
  const alphaThreshold = options.alphaThreshold ?? 16;
  const whiteThreshold = options.whiteThreshold ?? 256;
  const indices: VoxelGrid['indices'] = [];
  const blockIds: BlockId[] = [];

  for (let y = 0; y < targetHeight; y++) {
    const sourceY = Math.min(
      image.height - 1,
      Math.floor((y / targetHeight) * image.height),
    );
    for (let x = 0; x < options.width; x++) {
      const sourceX = Math.min(
        image.width - 1,
        Math.floor((x / options.width) * image.width),
      );
      const offset = (sourceY * image.width + sourceX) * 4;
      const r = image.data[offset]!;
      const g = image.data[offset + 1]!;
      const b = image.data[offset + 2]!;
      const alpha = image.data[offset + 3]!;
      if (
        alpha < alphaThreshold ||
        (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold)
      ) {
        continue;
      }

      const blockId = matcher.blockAt(matcher.matchOne([r, g, b]));
      for (let z = 0; z < options.depth; z++) {
        // Invert image Y so the finished model stands upright in Minecraft.
        indices.push({ x, y: targetHeight - 1 - y, z });
        blockIds.push(blockId);
      }
    }
  }

  return {
    indices,
    blockIds,
    bbox: { x: options.width, y: targetHeight, z: options.depth },
  };
}

/** Decode a local JPEG/PNG/WebP file, resize it, then make a voxel relief. */
export async function photoToVoxelGrid(
  imagePath: string,
  options: PhotoStatueOptions,
): Promise<VoxelGrid> {
  assertOptions(options);
  const decoded = await Jimp.read(imagePath);
  const targetHeight = Math.max(
    1,
    Math.round((decoded.height / decoded.width) * options.width),
  );
  decoded.resize({ w: options.width, h: targetHeight });

  const rgba = new Uint8Array(decoded.width * decoded.height * 4);
  for (let y = 0; y < decoded.height; y++) {
    for (let x = 0; x < decoded.width; x++) {
      const { r, g, b, a } = intToRGBA(decoded.getPixelColor(x, y));
      const offset = (y * decoded.width + x) * 4;
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = a;
    }
  }

  return photoToVoxelGridFromRgba(
    { width: decoded.width, height: decoded.height, data: rgba },
    options,
  );
}
