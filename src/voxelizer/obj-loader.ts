/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import OBJFile from 'obj-file-parser';

import type { Material, MultiMaterialScene } from '../types.js';

/**
 * .mtl 한 줄 파서 산출물.
 * Diffuse 값은 .mtl 사양에 따라 **linear-RGB 0~1** 이지만, 본 모듈은
 * POC 동작과 맞추기 위해 0~255 정수로 변환해 저장합니다.
 * sRGB 변환은 src/palette/ 의 BlockMatcher 입력 직전에 수행 (CLAUDE.md Gotcha #1).
 *
 * Internal MTL record. Wavefront .mtl `Kd` is linear-light in [0,1]; we
 * keep it as 0–255 linear ints for parity with the Python POC's
 * `material.diffuse` value.
 */
interface MtlMaterial {
  name: string;
  diffuseLinearRgb: [number, number, number];
}

/**
 * 매우 작은 .mtl 텍스트 파서. `newmtl` / `Kd` 두 디렉티브만 추출합니다.
 * 그 외 라인(Ka/Ks/map_Kd 등)은 무시.
 *
 * Minimal .mtl text parser — extracts only `newmtl` and `Kd`. Other
 * directives (Ka, Ks, map_Kd, …) are ignored on purpose.
 */
function parseMtl(text: string): Map<string, MtlMaterial> {
  const out = new Map<string, MtlMaterial>();
  let current: MtlMaterial | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    const tag = parts[0];
    if (tag === 'newmtl') {
      const name = parts.slice(1).join(' ');
      current = { name, diffuseLinearRgb: [255, 255, 255] };
      out.set(name, current);
    } else if (tag === 'Kd' && current && parts.length >= 4) {
      const r = clamp01(parseFloat(parts[1]));
      const g = clamp01(parseFloat(parts[2]));
      const b = clamp01(parseFloat(parts[3]));
      current.diffuseLinearRgb = [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255),
      ];
    }
  }
  return out;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * .obj + 동봉된 .mtl 파일을 로드하여 머티리얼별 서브-메시로 분할된
 * {@link MultiMaterialScene} 을 반환합니다.
 *
 * POC `load_scene(obj_path)` 의 TS 포팅 (poc/multi_material_voxelize.py:109).
 * - 단일 머티리얼 .obj 는 `'default'` 한 개로 wrap.
 * - n-gon 페이스는 fan triangulation 으로 분해.
 * - 머티리얼 정보가 빈 페이스는 `'default'` 그룹으로 모음.
 *
 * Load a multi-material `.obj` (plus its referenced `.mtl` libraries) and
 * return a per-material split mesh scene. Single-material OBJs wrap into
 * one geometry named `'default'`. n-gons are fan-triangulated.
 *
 * @param objPath 절대 또는 상대 .obj 파일 경로
 * @throws .obj 파일이 비어있거나 모든 머티리얼 그룹이 face 0 개일 때
 */
export function loadScene(objPath: string): MultiMaterialScene {
  const objText = readFileSync(objPath, 'utf-8');
  const parsed = new OBJFile(objText).parse();
  const objDir = dirname(objPath);

  const materials = new Map<string, MtlMaterial>();
  for (const libRef of parsed.materialLibraries ?? []) {
    const mtlPath = resolve(objDir, libRef);
    try {
      const mtlText = readFileSync(mtlPath, 'utf-8');
      for (const [name, mat] of parseMtl(mtlText)) {
        materials.set(name, mat);
      }
    } catch {
      // 누락된 .mtl 은 치명적이지 않음 — 해당 머티리얼은 'default' 회색으로 폴백.
    }
  }

  type FaceGroup = {
    /** [v0, v1, v2] 0-based indices into `vertices`. */
    faces: number[][];
    vertices: { x: number; y: number; z: number }[];
  };
  const groups = new Map<string, FaceGroup>();

  for (const model of parsed.models ?? []) {
    for (const face of model.faces ?? []) {
      const matName = face.material && face.material.length > 0 ? face.material : 'default';
      let g = groups.get(matName);
      if (!g) {
        g = { faces: [], vertices: model.vertices };
        groups.set(matName, g);
      }
      const idx = face.vertices.map((v) => v.vertexIndex - 1);
      // Fan triangulation: (0, i, i+1) for i in 1 .. n-2.
      for (let i = 1; i + 1 < idx.length; i++) {
        g.faces.push([idx[0], idx[i], idx[i + 1]]);
      }
    }
  }

  const geometries: MultiMaterialScene['geometries'] = {};
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const [name, g] of groups) {
    if (g.faces.length === 0) continue;
    const remap = new Map<number, number>();
    const verts: number[] = [];
    for (const face of g.faces) {
      for (const vi of face) {
        if (remap.has(vi)) continue;
        const v = g.vertices[vi];
        if (!v) continue;
        remap.set(vi, verts.length / 3);
        verts.push(v.x, v.y, v.z);
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
        if (v.z > maxZ) maxZ = v.z;
      }
    }
    const faceIdx: number[] = [];
    for (const face of g.faces) {
      const a = remap.get(face[0]);
      const b = remap.get(face[1]);
      const c = remap.get(face[2]);
      if (a === undefined || b === undefined || c === undefined) continue;
      faceIdx.push(a, b, c);
    }
    if (faceIdx.length === 0) continue;

    const mtl = materials.get(name);
    const material: Material = {
      name,
      diffuseLinearRgb: mtl?.diffuseLinearRgb ?? [125, 125, 125],
    };
    geometries[name] = {
      vertices: new Float32Array(verts),
      faces: new Uint32Array(faceIdx),
      material,
    };
  }

  if (!Number.isFinite(minX)) {
    throw new Error(`empty mesh: ${objPath}`);
  }

  return {
    geometries,
    bounds: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    },
  };
}
