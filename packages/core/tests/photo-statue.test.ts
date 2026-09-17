/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
import { describe, expect, it } from 'vitest';

import { photoToVoxelGridFromRgba } from '../src/photo-statue.js';

describe('photoToVoxelGridFromRgba', () => {
  it('maps opaque pixels to fixed-depth voxels and omits transparent pixels', () => {
    const grid = photoToVoxelGridFromRgba(
      {
        width: 2,
        height: 1,
        data: new Uint8Array([0, 0, 0, 255, 255, 255, 255, 0]),
      },
      { width: 2, depth: 3 },
    );

    expect(grid.bbox).toEqual({ x: 2, y: 1, z: 3 });
    expect(grid.indices).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 2 },
    ]);
    expect(grid.blockIds).toEqual([
      'minecraft:black_concrete',
      'minecraft:black_concrete',
      'minecraft:black_concrete',
    ]);
  });
});
