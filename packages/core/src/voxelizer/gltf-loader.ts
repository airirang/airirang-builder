/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

import { NodeIO } from '@gltf-transform/core';
import { clearNodeTransform, dequantize, flatten } from '@gltf-transform/functions';

import type { Material, MultiMaterialScene } from '../types.js';

/**
 * GLB/glTF axis 명시. 외부 작가가 Blender(Z-up) → glTF export 시 root node 에
 * 회전을 적용하는 케이스가 흔하지만, 그게 mesh primitive 의 raw vertex 에는
 * baking 되지 않아 voxelize 결과가 누워서/거꾸로 나옴. 사용자가 결과를 보고
 * 6가지(+y/-y/+x/-x/+z/-z) 중 정상 모양을 고르도록.
 *
 * GLB/glTF up-axis hint. External authors often export from Z-up apps and the
 * mesh primitive's raw vertices stay Z-up even though Y-up is the spec. Users
 * pick the correct option from 6 choices after seeing the result.
 *
 * - `'auto'`: dominant axis가 2nd 대비 ≥2.5배면 그쪽이 수직이라고 추정
 * - `'+y'`: 기본 (Y-up, identity)
 * - `'-y'`: Y-up 거꾸로
 * - `'+z'`, `'-z'`: Z-up (Blender 기본)
 * - `'+x'`, `'-x'`: X-up (드물지만 가능)
 */
export type UpAxis = 'auto' | '+y' | '-y' | '+z' | '-z' | '+x' | '-x';

export interface LoadGltfOptions {
  /** @default 'auto' */
  up?: UpAxis;
}

/** 6가지 up-axis 매핑. 각 행: [원본 축 인덱스, 부호]. */
const AXIS_TRANSFORMS: Record<Exclude<UpAxis, 'auto'>, [number, number][]> = {
  '+y': [
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  '-y': [
    [0, 1],
    [1, -1],
    [2, 1],
  ],
  '+z': [
    [0, 1],
    [2, 1],
    [1, 1],
  ],
  '-z': [
    [0, 1],
    [2, -1],
    [1, 1],
  ],
  '+x': [
    [1, 1],
    [0, 1],
    [2, 1],
  ],
  '-x': [
    [1, 1],
    [0, -1],
    [2, 1],
  ],
};

/**
 * GLB/glTF 파일을 voxelizer 가 소비하는 {@link MultiMaterialScene} 형태로 변환.
 *
 * 핵심 처리:
 * 1. `@gltf-transform/functions` 의 `dequantize` + `flatten` 으로 양자화 해제 + node hierarchy 평탄화
 * 2. 모든 mesh primitive 를 머티리얼 이름별로 그룹핑 (같은 mat 의 여러 primitive 가 한 mesh 로)
 * 3. 사용자 지정 (또는 자동 추정) up-axis 로 vertices + bbox remap (Y-up Minecraft 정합)
 * 4. baseColorFactor (linear 0~1) → 0~255 정수 (POC `.mtl Kd` 와 같은 컨벤션)
 *
 * Load a GLB/glTF as a {@link MultiMaterialScene}: dequantize + flatten, group
 * primitives by material name, remap vertices to Y-up via the chosen axis hint,
 * and convert baseColorFactor to 0–255 linear ints (parity with .mtl Kd).
 *
 * @example
 *   const scene = await loadGltfScene('eiffel.glb', { up: '+z' });
 *   const result = voxelizeScene(scene, 0.5);
 */
export async function loadGltfScene(
  gltfPath: string,
  options: LoadGltfOptions = {},
): Promise<MultiMaterialScene> {
  const up: UpAxis = options.up ?? 'auto';

  const io = new NodeIO();
  const doc = await io.read(gltfPath);
  // Critical: bake node TRS into mesh vertex data so root rotation
  // (Sketchfab's standard -90° X tilt for Z-up→Y-up, plus per-node rotations)
  // ends up in the raw positions. flatten() alone only hoists nodes — without
  // clearNodeTransform on each node the vertices stay in pre-rotated space and
  // produce diagonally-skewed builds (e.g. Eiffel Tower leaning).
  await doc.transform(dequantize(), flatten());
  const root = doc.getRoot();
  for (const node of root.listNodes()) {
    clearNodeTransform(node);
  }

  // Pass 1 — collect primitives grouped by material name.
  interface MatGroup {
    positions: number[];
    indices: number[];
    color: [number, number, number];
  }
  const groups = new Map<string, MatGroup>();
  const sceneMin: [number, number, number] = [Infinity, Infinity, Infinity];
  const sceneMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAttr = prim.getAttribute('POSITION');
      if (!posAttr) continue;
      const positions = posAttr.getArray() as Float32Array | null;
      if (!positions) continue;
      const indices =
        (prim.getIndices()?.getArray() as Uint16Array | Uint32Array | null) ?? null;

      const mat = prim.getMaterial();
      const matName = mat?.getName() || 'default';
      const baseColor = mat?.getBaseColorFactor() ?? [1, 1, 1, 1];
      const color: [number, number, number] = [
        Math.round(baseColor[0] * 255),
        Math.round(baseColor[1] * 255),
        Math.round(baseColor[2] * 255),
      ];

      for (let i = 0; i < positions.length; i += 3) {
        if (positions[i]! < sceneMin[0]) sceneMin[0] = positions[i]!;
        if (positions[i + 1]! < sceneMin[1]) sceneMin[1] = positions[i + 1]!;
        if (positions[i + 2]! < sceneMin[2]) sceneMin[2] = positions[i + 2]!;
        if (positions[i]! > sceneMax[0]) sceneMax[0] = positions[i]!;
        if (positions[i + 1]! > sceneMax[1]) sceneMax[1] = positions[i + 1]!;
        if (positions[i + 2]! > sceneMax[2]) sceneMax[2] = positions[i + 2]!;
      }

      let g = groups.get(matName);
      if (!g) {
        g = { positions: [], indices: [], color };
        groups.set(matName, g);
      }
      const indexOffset = g.positions.length / 3;
      for (let i = 0; i < positions.length; i++) g.positions.push(positions[i]!);
      if (indices) {
        for (let i = 0; i < indices.length; i++) g.indices.push(indices[i]! + indexOffset);
      } else {
        const vertexCount = positions.length / 3;
        for (let i = 0; i < vertexCount; i++) g.indices.push(i + indexOffset);
      }
    }
  }

  if (groups.size === 0) {
    throw new Error(`gltf scene has no mesh primitives: ${gltfPath}`);
  }

  // Pass 2 — pick axis transform.
  const rawExtents: [number, number, number] = [
    sceneMax[0] - sceneMin[0],
    sceneMax[1] - sceneMin[1],
    sceneMax[2] - sceneMin[2],
  ];
  let upKey: Exclude<UpAxis, 'auto'>;
  if (up === 'auto') {
    const maxAxis = rawExtents.indexOf(Math.max(...rawExtents));
    const sorted = [...rawExtents].sort((a, b) => b - a);
    const ratio = sorted[0]! / sorted[1]!;
    if (ratio < 2.5) upKey = '+y';
    else if (maxAxis === 2) upKey = '+z';
    else if (maxAxis === 0) upKey = '+x';
    else upKey = '+y';
  } else {
    upKey = up;
  }
  const M = AXIS_TRANSFORMS[upKey];
  const remap = (xyz: readonly [number, number, number]): [number, number, number] => [
    M[0]![1] * xyz[M[0]![0]]!,
    M[1]![1] * xyz[M[1]![0]]!,
    M[2]![1] * xyz[M[2]![0]]!,
  ];

  // Pass 3 — emit final scene with remapped vertices.
  const geometries: MultiMaterialScene['geometries'] = {};
  for (const [matName, g] of groups.entries()) {
    const verts = new Float32Array(g.positions.length);
    for (let i = 0; i < g.positions.length; i += 3) {
      const v = remap([g.positions[i]!, g.positions[i + 1]!, g.positions[i + 2]!]);
      verts[i] = v[0];
      verts[i + 1] = v[1];
      verts[i + 2] = v[2];
    }
    const material: Material = { name: matName, diffuseLinearRgb: g.color };
    geometries[matName] = {
      vertices: verts,
      faces: new Uint32Array(g.indices),
      material,
    };
  }

  // Remapped scene bbox (account for sign flips → corner swap).
  const c1 = remap(sceneMin);
  const c2 = remap(sceneMax);
  const bounds: MultiMaterialScene['bounds'] = {
    min: [Math.min(c1[0], c2[0]), Math.min(c1[1], c2[1]), Math.min(c1[2], c2[2])],
    max: [Math.max(c1[0], c2[0]), Math.max(c1[1], c2[1]), Math.max(c1[2], c2[2])],
  };

  return { geometries, bounds };
}
