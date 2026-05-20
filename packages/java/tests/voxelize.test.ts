/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Voxelizer 단위 테스트 — surface voxelize, flood-fill 내부 채움, multi-material
 * 머티리얼 충돌 시 "나중 머티리얼 우선" 규칙(POC 동작 동등).
 *
 * Unit tests for the voxelizer pipeline: triangle surface voxelization,
 * boundary flood-fill, and the multi-material later-wins precedence rule
 * inherited from the Python POC.
 */

import { describe, expect, it } from 'vitest';

import type { Material, MultiMaterialScene } from '../src/types.js';
import {
  voxelizeMesh,
  voxelizeScene,
  type MeshInput,
} from '@airirang/builder-core';

/** 축정렬 [0,L]^3 큐브 메시 — 12 삼각형으로 6 면 트라이앵글화. */
function unitCubeMesh(L: number): MeshInput {
  const vs = new Float32Array([
    0, 0, 0,
    L, 0, 0,
    L, L, 0,
    0, L, 0,
    0, 0, L,
    L, 0, L,
    L, L, L,
    0, L, L,
  ]);
  const fs = new Uint32Array([
    // -z
    0, 2, 1, 0, 3, 2,
    // +z
    4, 5, 6, 4, 6, 7,
    // -y
    0, 1, 5, 0, 5, 4,
    // +y
    3, 6, 2, 3, 7, 6,
    // -x
    0, 4, 7, 0, 7, 3,
    // +x
    1, 2, 6, 1, 6, 5,
  ]);
  return { vertices: vs, faces: fs };
}

describe('voxelizeMesh — surface + flood-fill', () => {
  it('empty mesh → empty indices', () => {
    const empty: MeshInput = {
      vertices: new Float32Array(),
      faces: new Uint32Array(),
    };
    const res = voxelizeMesh(empty, { pitch: 0.1 });
    expect(res.indices).toEqual([]);
  });

  it('1m solid cube at pitch=0.25 → ≈4×4×4 filled voxels (interior flood-filled)', () => {
    const mesh = unitCubeMesh(1);
    const res = voxelizeMesh(mesh, { pitch: 0.25 });
    // Cube spans 4 cells per axis (ceil(1.0/0.25)+1=5; trimmed via floor sample to ≈4).
    expect(res.indices.length).toBeGreaterThanOrEqual(60);
    // Solid → interior + surface ≥ surface alone.
    const surface = voxelizeMesh(mesh, { pitch: 0.25, fillInterior: false });
    expect(res.indices.length).toBeGreaterThanOrEqual(surface.indices.length);
  });

  it('fillInterior=false on a closed cube → only shell voxels (no interior)', () => {
    const mesh = unitCubeMesh(1);
    const solid = voxelizeMesh(mesh, { pitch: 0.2 });
    const shell = voxelizeMesh(mesh, { pitch: 0.2, fillInterior: false });
    expect(shell.indices.length).toBeLessThan(solid.indices.length);
  });

  it('pitch must be > 0', () => {
    const mesh = unitCubeMesh(1);
    expect(() => voxelizeMesh(mesh, { pitch: 0 })).toThrow();
    expect(() => voxelizeMesh(mesh, { pitch: -0.1 })).toThrow();
  });
});

describe('voxelizeScene — multi-material precedence', () => {
  it('blockOverrides bypasses matcher; later material wins on overlap', () => {
    const cubeA = unitCubeMesh(1);
    const cubeB = unitCubeMesh(1);
    const matA: Material = { name: 'A', diffuseLinearRgb: [255, 0, 0] };
    const matB: Material = { name: 'B', diffuseLinearRgb: [0, 255, 0] };
    const scene: MultiMaterialScene = {
      geometries: {
        A: { vertices: cubeA.vertices, faces: cubeA.faces, material: matA },
        B: { vertices: cubeB.vertices, faces: cubeB.faces, material: matB },
      },
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    };

    const res = voxelizeScene(scene, 0.25, {
      pitch: 0.25,
      blockOverrides: {
        A: 'minecraft:stone',
        B: 'minecraft:gold_block',
      },
    });

    expect(res.materialMap).toEqual({
      A: 'minecraft:stone',
      B: 'minecraft:gold_block',
    });
    // Overlap on every voxel → B wins (iterated last).
    const uniqueBlocks = new Set(res.blockIds);
    expect(uniqueBlocks.has('minecraft:gold_block')).toBe(true);
    expect(uniqueBlocks.has('minecraft:stone')).toBe(false);
    // Parallel arrays.
    expect(res.indices.length).toBe(res.blockIds.length);
  });

  it('falls back to minecraft:stone when no matcher and no override is supplied', () => {
    const cube = unitCubeMesh(1);
    const mat: Material = { name: 'Stuff', diffuseLinearRgb: [255, 0, 0] };
    const scene: MultiMaterialScene = {
      geometries: {
        Stuff: { vertices: cube.vertices, faces: cube.faces, material: mat },
      },
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    };

    const res = voxelizeScene(scene, 0.25, { pitch: 0.25 });
    expect(res.materialMap).toEqual({ Stuff: 'minecraft:stone' });
    const uniqueBlocks = new Set(res.blockIds);
    expect(uniqueBlocks.size).toBe(1);
    expect([...uniqueBlocks][0]).toBe('minecraft:stone');
  });
});
