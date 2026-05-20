/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

import type { MultiMaterialScene } from '../types.js';

/**
 * Uniformly scale every vertex + scene bounds. GLB/glTF 모델이 작가가 정의한
 * 1/10·1/100 스케일로 export 되는 경우(예: Eiffel) 가 흔합니다. clearNodeTransform
 * 으로 정확한 사이즈가 적용된 후 voxelize 결과가 너무 작으면 외부에서 보정.
 *
 * Uniformly scale a {@link MultiMaterialScene}. Useful when GLB/glTF authors
 * export at 1/10 or 1/100 model scale and the post-clearNodeTransform mesh
 * comes out too small for the desired Minecraft footprint.
 *
 * @example
 *   const scene = await loadSceneAsync('eiffel.glb');
 *   applyScaleToScene(scene, 10);  // 10× larger
 */
export function applyScaleToScene(scene: MultiMaterialScene, scale: number): void {
  if (!(scale > 0)) {
    throw new Error(`scale must be > 0 (got ${scale})`);
  }
  if (scale === 1) return; // no-op fast path

  for (const geom of Object.values(scene.geometries)) {
    const v = geom.vertices;
    for (let i = 0; i < v.length; i++) v[i] *= scale;
  }

  scene.bounds.min = [
    scene.bounds.min[0] * scale,
    scene.bounds.min[1] * scale,
    scene.bounds.min[2] * scale,
  ];
  scene.bounds.max = [
    scene.bounds.max[0] * scale,
    scene.bounds.max[1] * scale,
    scene.bounds.max[2] * scale,
  ];
}
