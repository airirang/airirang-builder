/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

import type { Voxel } from '../types.js';

/**
 * voxelizeMesh 입력 메시. 삼각화된 평행 배열 — 정점 (n*3) Float32, 페이스 (m*3) Uint32.
 *
 * Triangulated mesh input — parallel arrays of vertex coords (n*3 Float32)
 * and triangle indices (m*3 Uint32).
 */
export interface MeshInput {
  vertices: Float32Array;
  faces: Uint32Array;
}

/** voxelizeMesh 옵션. */
export interface VoxelizeMeshOptions {
  /** 월드 단위당 voxel 크기. Smaller = more detail. POC 기본값 0.1. */
  pitch: number;
  /**
   * true(기본) 면 surface voxelize 후 flood-fill 로 내부도 채움.
   * false 면 표면만 voxelize (껍데기 메시 / lattice 구조용).
   *
   * When true (default) the mesh interior is flood-filled after surface
   * voxelization. Set false for shell-only output.
   */
  fillInterior?: boolean;
  /**
   * 공통 grid 좌표계 사용 시 외부에서 주입.
   * multi-material voxelizer 가 머티리얼별 sub-mesh 를 동일한 grid 에 정렬할 때 사용.
   *
   * Optional shared-grid overrides used by the multi-material voxelizer
   * to align sub-meshes against the scene-wide bbox.
   */
  origin?: [number, number, number];
  shape?: [number, number, number];
}

/** voxelizeMesh 산출물. */
export interface VoxelizeMeshResult {
  /** Sparse voxel 좌표 (`origin` 기준 0-based). */
  indices: Voxel[];
  /** Voxel grid 의 월드 원점 (cell (0,0,0) 의 min corner). */
  origin: [number, number, number];
  /** Voxel grid 크기 (cell 개수). */
  shape: [number, number, number];
  pitch: number;
}

/**
 * 한 삼각형 메시를 padded grid 안에서 surface voxelize.
 * 각 삼각형을 barycentric (u,v,w) 격자로 약 pitch/2 간격으로 샘플링한 뒤,
 * 각 샘플 점이 속한 voxel 셀을 occupied 로 마킹합니다.
 *
 * Surface voxelization via barycentric sampling. Each triangle is sampled
 * at ≈ pitch/2 spacing in world units; every sample marks its enclosing
 * voxel cell. Reliable for triangles up to ≈ 10× pitch in edge length.
 */
export function voxelizeSurface(
  mesh: MeshInput,
  pitch: number,
  origin: [number, number, number],
  shape: [number, number, number],
): Set<number> {
  const occupied = new Set<number>();
  const ox = origin[0];
  const oy = origin[1];
  const oz = origin[2];
  const sx = shape[0];
  const sy = shape[1];
  const sz = shape[2];
  const inv = 1 / pitch;
  const verts = mesh.vertices;
  const faces = mesh.faces;
  const halfPitch = pitch * 0.5;

  for (let f = 0; f < faces.length; f += 3) {
    const a = faces[f] * 3;
    const b = faces[f + 1] * 3;
    const c = faces[f + 2] * 3;
    const ax = verts[a];
    const ay = verts[a + 1];
    const az = verts[a + 2];
    const bx = verts[b];
    const by = verts[b + 1];
    const bz = verts[b + 2];
    const cx = verts[c];
    const cy = verts[c + 1];
    const cz = verts[c + 2];

    const e1 = Math.hypot(bx - ax, by - ay, bz - az);
    const e2 = Math.hypot(cx - ax, cy - ay, cz - az);
    const e3 = Math.hypot(cx - bx, cy - by, cz - bz);
    const maxEdge = Math.max(e1, e2, e3, pitch * 1e-3);
    // 샘플 수: 가장 긴 변을 pitch/2 단위로 나눠 sub-voxel 해상도 보장.
    const samples = Math.max(2, Math.ceil(maxEdge / halfPitch));

    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const jmax = samples - i;
      for (let j = 0; j <= jmax; j++) {
        const v = j / samples;
        const w = 1 - u - v;
        const px = u * ax + v * bx + w * cx;
        const py = u * ay + v * by + w * cy;
        const pz = u * az + v * bz + w * cz;
        const ix = Math.floor((px - ox) * inv);
        const iy = Math.floor((py - oy) * inv);
        const iz = Math.floor((pz - oz) * inv);
        if (ix < 0 || ix >= sx || iy < 0 || iy >= sy || iz < 0 || iz >= sz) continue;
        occupied.add((ix * sy + iy) * sz + iz);
      }
    }
  }
  return occupied;
}

/**
 * 6-connected flood-fill 로 surface 외부를 마킹한 뒤, 남은 unknown 셀을
 * "내부"로 간주해 occupied 집합에 합칩니다. 경계 셀이 비어 있을 때만 작동하므로,
 * 호출자는 padded grid 를 사용해야 합니다 ({@link voxelizeMesh} 가 처리).
 *
 * Flood-fill the exterior of the surface from boundary cells, then any
 * remaining unvisited cell is interior and gets added to the occupied set.
 * Requires the boundary layer to be empty — callers must pad the grid.
 */
export function floodFillInterior(
  surface: ReadonlySet<number>,
  shape: [number, number, number],
): Set<number> {
  const sx = shape[0];
  const sy = shape[1];
  const sz = shape[2];
  const total = sx * sy * sz;
  // state: 0 unknown, 1 surface, 2 exterior
  const state = new Uint8Array(total);
  for (const idx of surface) state[idx] = 1;

  const stack: number[] = [];
  const push = (idx: number) => {
    if (state[idx] === 0) {
      state[idx] = 2;
      stack.push(idx);
    }
  };

  // Seed from every boundary cell. Padded grid guarantees boundary is empty.
  for (let i = 0; i < sx; i++) {
    for (let j = 0; j < sy; j++) {
      push((i * sy + j) * sz);
      push((i * sy + j) * sz + sz - 1);
    }
  }
  for (let i = 0; i < sx; i++) {
    for (let k = 0; k < sz; k++) {
      push(i * sy * sz + k);
      push(i * sy * sz + (sy - 1) * sz + k);
    }
  }
  for (let j = 0; j < sy; j++) {
    for (let k = 0; k < sz; k++) {
      push(j * sz + k);
      push((sx - 1) * sy * sz + j * sz + k);
    }
  }

  const stepX = sy * sz;
  const stepY = sz;
  while (stack.length > 0) {
    const idx = stack.pop() as number;
    const k = idx % sz;
    const rem = (idx - k) / sz;
    const j = rem % sy;
    const i = (rem - j) / sy;
    if (i > 0) push(idx - stepX);
    if (i + 1 < sx) push(idx + stepX);
    if (j > 0) push(idx - stepY);
    if (j + 1 < sy) push(idx + stepY);
    if (k > 0) push(idx - 1);
    if (k + 1 < sz) push(idx + 1);
  }

  const filled = new Set<number>(surface);
  for (let idx = 0; idx < total; idx++) {
    if (state[idx] === 0) filled.add(idx);
  }
  return filled;
}

/**
 * 한 삼각형 메시를 sparse voxel 인덱스 집합으로 변환합니다.
 * POC `voxelize(mesh, pitch)` (poc/obj_to_mcfunction.py:36) 의 TS 포팅.
 *
 * trimesh `voxelized(pitch).fill()` 의 대체로 다음 파이프라인을 씁니다:
 *   1. 메시 bbox 기준 grid 결정 (외부에서 origin/shape 주입 가능)
 *   2. 1-cell 패딩된 내부 grid 에 surface voxelize
 *   3. 패딩된 경계에서 flood-fill 로 외부 마킹 → 내부 채움
 *   4. 인덱스를 unpadded 좌표계로 변환해 반환
 *
 * Voxelize one triangle mesh into a sparse voxel index list. Mirrors the
 * Python POC `voxelize()`; uses surface-sampling + flood-fill as the
 * trimesh-free substitute for `mesh.voxelized().fill()`.
 *
 * @param mesh 삼각화된 메시 (n-gon 은 호출 전 분해)
 * @param opts pitch · fillInterior · 공통 grid origin/shape override
 */
export function voxelizeMesh(mesh: MeshInput, opts: VoxelizeMeshOptions): VoxelizeMeshResult {
  const pitch = opts.pitch;
  if (!(pitch > 0)) throw new Error(`pitch must be > 0 (got ${pitch})`);
  if (mesh.faces.length === 0) {
    const o = opts.origin ?? [0, 0, 0];
    const s = opts.shape ?? [0, 0, 0];
    return { indices: [], origin: o, shape: s, pitch };
  }

  let origin = opts.origin;
  let shape = opts.shape;
  if (!origin || !shape) {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    const v = mesh.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const x = v[i];
      const y = v[i + 1];
      const z = v[i + 2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    origin = [minX, minY, minZ];
    shape = [
      Math.max(1, Math.ceil((maxX - minX) / pitch) + 1),
      Math.max(1, Math.ceil((maxY - minY) / pitch) + 1),
      Math.max(1, Math.ceil((maxZ - minZ) / pitch) + 1),
    ];
  }

  // Pad by 1 cell on every side so flood-fill always has empty boundary cells
  // to seed from, regardless of whether the mesh surface touches the bbox.
  const paddedOrigin: [number, number, number] = [
    origin[0] - pitch,
    origin[1] - pitch,
    origin[2] - pitch,
  ];
  const paddedShape: [number, number, number] = [
    shape[0] + 2,
    shape[1] + 2,
    shape[2] + 2,
  ];

  let occupied = voxelizeSurface(mesh, pitch, paddedOrigin, paddedShape);
  if (opts.fillInterior !== false) {
    occupied = floodFillInterior(occupied, paddedShape);
  }

  const sy = paddedShape[1];
  const sz = paddedShape[2];
  const ux = shape[0];
  const uy = shape[1];
  const uz = shape[2];
  const indices: Voxel[] = [];
  for (const idx of occupied) {
    const z = idx % sz;
    const rem = (idx - z) / sz;
    const y = rem % sy;
    const x = (rem - y) / sy;
    const tx = x - 1;
    const ty = y - 1;
    const tz = z - 1;
    if (tx < 0 || tx >= ux || ty < 0 || ty >= uy || tz < 0 || tz >= uz) continue;
    indices.push({ x: tx, y: ty, z: tz });
  }

  return { indices, origin, shape, pitch };
}
