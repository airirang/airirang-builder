/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * airirang-builder-core — Public Type Definitions.
 *
 * 모든 core 모듈(voxelizer · greedy-meshing · palette · presets)이 공통으로
 * import 하는 핵심 타입을 정의합니다. edition (Java / Bedrock) 무관한 순수
 * 기하·블록·프리셋 타입만 여기 둡니다.
 *
 * Shared type contracts consumed by every core module (voxelizer,
 * greedy-meshing, palette, presets). Edition-agnostic geometry, block and
 * preset shapes only — Java-specific (`McVersion`, `DatapackOptions`) and
 * MCP envelope types live in the consumer (`airirang-builder`) package.
 *
 * NOT AN OFFICIAL MINECRAFT PRODUCT.
 * NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
 */

// ---------------------------------------------------------------------------
// Block identity
// ---------------------------------------------------------------------------

/**
 * 마인크래프트 블록 ID. `minecraft:<path>` 형태의 네임스페이스 문자열.
 * Minecraft block identifier — a namespaced string (`minecraft:<path>`).
 *
 * @example "minecraft:stone"
 * @example "minecraft:oak_planks"
 */
export type BlockId = string;

// ---------------------------------------------------------------------------
// Voxel primitives
// ---------------------------------------------------------------------------

/**
 * 3차원 정수 voxel 좌표. 원점은 voxelize 결과의 bbox min.
 * 3D integer voxel coordinate. The origin is the bbox-min of the source mesh.
 *
 * @example { x: 0, y: 0, z: 0 }
 */
export interface Voxel {
  x: number;
  y: number;
  z: number;
}

/**
 * Voxelizer 가 산출하는 sparse voxel 집합. `indices[i]` ↔ `blockIds[i]` 가
 * 평행 배열로 1:1 대응합니다.
 *
 * Sparse voxel set produced by the voxelizer. `indices[i]` and `blockIds[i]`
 * are parallel arrays of equal length.
 */
export interface VoxelGrid {
  /** Occupied voxel 좌표 / Coordinates of occupied voxels. */
  indices: Voxel[];
  /** {@link indices} 와 평행한 블록 ID 배열 / Parallel block ID array. */
  blockIds: BlockId[];
  /** Voxel 좌표계 bbox 크기 (cell 개수, 좌표 아님) / Bbox size in cells. */
  bbox: { x: number; y: number; z: number };
}

/**
 * Greedy meshing 결과의 axis-aligned 직육면체. 한 cuboid 는 하나의 블록으로
 * 채워진 `/fill` 한 번에 매핑됩니다. `min` · `max` 는 모두 inclusive.
 *
 * Axis-aligned cuboid emitted by the greedy mesher. Each cuboid maps to a
 * single `/fill <min> <max> <block>` command. Both `min` and `max` are
 * inclusive endpoints in bbox-relative voxel space.
 *
 * @example
 * { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 }, blockId: 'minecraft:stone' }
 */
export interface Cuboid {
  min: Voxel;
  max: Voxel;
  blockId: BlockId;
}

// ---------------------------------------------------------------------------
// Materials & scenes
// ---------------------------------------------------------------------------

/**
 * `.mtl` 의 Kd 라인으로부터 파싱된 linear-RGB diffuse 색상 (0~255 정수).
 * sRGB 변환이 필요한 경우 `palette/linearToSrgbU8()` 를 사용하세요.
 *
 * Diffuse colour parsed from a `.mtl` Kd line, in linear RGB (0–255 ints).
 * Apply `palette/linearToSrgbU8()` before colour matching.
 *
 * @example { name: "Wood", diffuseLinearRgb: [128, 64, 32] }
 */
export interface Material {
  name: string;
  diffuseLinearRgb: [number, number, number];
}

/**
 * `loadScene()` 가 반환하는 multi-material OBJ 씬. 머티리얼 이름을 키로
 * sub-mesh (정점·삼각형·머티리얼) 를 묶고, 씬 전체 bounds 를 함께 제공합니다.
 *
 * Multi-material OBJ scene returned by `loadScene()`. Sub-meshes are keyed
 * by material name and ship with their parsed `Material`; scene-wide bounds
 * are reported in world units.
 */
export interface MultiMaterialScene {
  /** 머티리얼명 → sub-mesh / Per-material sub-meshes keyed by material name. */
  geometries: Record<string, {
    vertices: Float32Array;
    faces: Uint32Array;
    material: Material;
  }>;
  /** 월드 단위 씬 bounding box / Scene-wide bounding box in world units. */
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

// ---------------------------------------------------------------------------
// Voxelize options
// ---------------------------------------------------------------------------

/**
 * 모든 voxelizer entry point 가 공유하는 공통 옵션.
 * Base options shared across every voxelizer entry point.
 */
export interface VoxelizeOptions {
  /**
   * 월드 단위당 voxel 크기 (meters). 작을수록 정밀. POC 기본값 0.1.
   * World units per voxel (meters). Smaller = more detail. POC default 0.1.
   *
   * @example 0.1
   */
  pitch: number;
  /**
   * 메시 내부를 flood-fill 로 채울지 여부. 기본 true.
   * 껍데기 메시(에펠탑 같은 lattice) 의 경우 false 권장.
   *
   * Whether to flood-fill the mesh interior (default true). Set false for
   * shell/lattice meshes.
   */
  fillInterior?: boolean;
  /**
   * `materialName → BlockId` 수동 매핑. 색상 매칭을 우회해 머티리얼별
   * 블록을 강제 지정합니다.
   *
   * Manual `materialName → BlockId` overrides that bypass colour matching.
   *
   * @example { Wood: 'minecraft:oak_planks', Stone: 'minecraft:cobblestone' }
   */
  blockOverrides?: Record<string, BlockId>;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * 동봉되는 단일 마인크래프트 프리셋 정의. MVP 는 Quaternius Medieval Village
 * CC0 빌딩 5개(House_1, House_3, Inn, Mill, Sawmill) 를 동봉합니다.
 *
 * A single bundled Minecraft preset definition. The MVP ships 5 Quaternius
 * Medieval Village CC0 buildings (House_1, House_3, Inn, Mill, Sawmill).
 */
export interface Preset {
  /** 프리셋 식별자 / Stable preset identifier. @example "house_3" */
  id: string;
  /** UI 표시명 / Display name shown to end users. @example "Medieval House 3" */
  displayName: string;
  /** 기본 스케일 배수 / Default scale multiplier applied at build time. */
  defaultScale: number;
  /**
   * 머티리얼별 블록 보정. 색상 매칭이 어색한 케이스 (예: Wood→dirt) 를
   * 수동으로 교정합니다.
   *
   * Per-material block overrides curated to fix awkward auto-matches
   * (e.g. Wood mismatching to dirt).
   */
  blockOverrides: Record<string, BlockId>;
  /** 라이선스 — MVP 는 전부 CC0 / License — MVP presets are all CC0. */
  license: 'CC0';
  /** 원작자명 / Original author. @example "Quaternius" */
  author: string;
  /** 출처 URL / Source URL for attribution. */
  sourceUrl: string;
  /** 패키지 루트 상대 `.obj` 경로 / Path under the package root. */
  objPath: string;
}

// ---------------------------------------------------------------------------
// Emitted commands
// ---------------------------------------------------------------------------

/**
 * `.mcfunction` 한 줄 — 보통 `fill <min> <max> <block>` 또는 `setblock`.
 * One emitted Minecraft command line, ready to be written into a
 * `.mcfunction` file (typically `fill <min> <max> <block>` or `setblock`).
 *
 * @example "fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:stone"
 */
export type FillCommand = string;
