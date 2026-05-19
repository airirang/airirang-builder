/**
 * Voxelizer 내부 타입. src/types.ts 의 공유 public 타입에 포함시키지 않고
 * voxelizer 모듈 로컬에만 노출할 보조 타입을 정의합니다.
 *
 * Local helper types for the voxelizer module. Kept separate from the shared
 * public types in src/types.ts.
 */

import type { BlockId, Material, Voxel, VoxelizeOptions } from '../types.js';

/**
 * 머티리얼 → 마인크래프트 블록 ID 매칭 함수.
 * src/palette/ 의 BlockMatcher 가 이 시그니처를 구현해 주입됩니다.
 *
 * Material → Minecraft block ID resolver. Injected by callers so the
 * voxelizer module stays decoupled from src/palette/.
 */
export type MaterialMatcher = (material: Material) => BlockId;

/** voxelizeScene 옵션. {@link VoxelizeOptions} + matcher 주입. */
export interface VoxelizeSceneOptions extends VoxelizeOptions {
  /**
   * 머티리얼별 자동 매칭에 사용할 함수. 미지정 시 모든 미오버라이드
   * 머티리얼은 'minecraft:stone' 로 폴백합니다.
   *
   * Color-matcher to resolve a block per material. When omitted, materials
   * not present in `blockOverrides` fall back to `minecraft:stone`.
   */
  matcher?: MaterialMatcher;
}

/**
 * voxelizeScene 결과.
 * - `indices`/`blockIds` 는 1:1 길이로 평행 배열.
 * - `materialMap` 은 디버깅/검사용 (어떤 머티리얼이 어떤 블록으로 매핑됐는지).
 */
export interface VoxelizeSceneResult {
  /** Sparse 절대 voxel 좌표 (origin = scene bbox min). */
  indices: Voxel[];
  /** {@link indices} 와 평행한 블록 ID 배열. */
  blockIds: BlockId[];
  /** 머티리얼명 → 매핑된 블록. 자동 매칭 결과 검토용. */
  materialMap: Record<string, BlockId>;
  /** Voxel 좌표계 bbox 크기 (개수 단위). */
  bbox: { x: number; y: number; z: number };
}
