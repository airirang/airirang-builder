/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * airirang-builder (Java Edition) — Public Type Definitions.
 *
 * Edition-agnostic 기하·블록·프리셋 타입은 `@airirang/builder-core` 에서 가져와
 * 재수출하고, 본 파일은 Java Edition 고유 타입(`McVersion`, `DatapackOptions`)
 * 과 MCP 응답 envelope 만 정의합니다. 외부 사용자는 `import type { Preset, ... }
 * from 'airirang-builder'` 형태로 동일한 surface 를 그대로 사용합니다.
 *
 * Edition-agnostic geometry/block/preset types come from
 * `@airirang/builder-core`; this file adds Java Edition-only contracts
 * (`McVersion`, `DatapackOptions`) plus the MCP tool result envelope.
 *
 * NOT AN OFFICIAL MINECRAFT PRODUCT.
 * NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
 */

export type {
  BlockId,
  Voxel,
  VoxelGrid,
  Cuboid,
  Material,
  MultiMaterialScene,
  VoxelizeOptions,
  Preset,
  FillCommand,
} from '@airirang/builder-core';

// ---------------------------------------------------------------------------
// Datapack
// ---------------------------------------------------------------------------

/**
 * Java Edition pack_format 타겟 마인크래프트 버전. MVP 는 1.20.5 ~ 1.21.11
 * 만 지원합니다 (`function/` 폴더 명명 규약 변경 이후의 단일 분기).
 *
 * Supported Java Edition target versions. The MVP covers 1.20.5 → 1.21.11
 * only — the single branch where the post-`function/` folder layout applies.
 */
export type McVersion =
  | '1.20.5' | '1.20.6'
  | '1.21' | '1.21.0' | '1.21.1'
  | '1.21.2' | '1.21.3'
  | '1.21.4'
  | '1.21.5' | '1.21.6' | '1.21.7' | '1.21.8'
  | '1.21.9' | '1.21.10' | '1.21.11';

/**
 * Datapack 빌드 옵션. `.mcfunction` 한 개를 받아 Java Edition 1.20.5+
 * 폴더 구조(`pack.mcmeta` + `data/<ns>/function/<id>.mcfunction`) 를 생성합니다.
 *
 * Options for `buildDatapack()`. Takes a single pre-generated `.mcfunction`
 * and emits the Java Edition 1.20.5+ folder layout (`pack.mcmeta` plus
 * `data/<namespace>/function/<functionId>.mcfunction`).
 */
export interface DatapackOptions {
  /** 원본 `.mcfunction` 파일 절대 경로 / Absolute source path. */
  mcfunctionPath: string;
  /** 데이터팩 폴더 이름 / Datapack folder name. @example "airirang_house" */
  name: string;
  /** 함수 네임스페이스 / Function namespace. @example "airirang" */
  namespace: string;
  /** 함수 ID / Function id used as `/function <ns>:<id>`. */
  functionId: string;
  /** 타겟 마인크래프트 버전 / Target Minecraft version. */
  mcVersion: McVersion;
  /** 데이터팩이 생성될 부모 디렉토리 / Parent directory for the datapack root. */
  outRoot: string;
}

// ---------------------------------------------------------------------------
// MCP transport
// ---------------------------------------------------------------------------

/**
 * MCP 도구 응답의 라이브러리 측 envelope. MCP SDK 의 `CallToolResult` 와
 * 별개로, 라이브러리 사용자가 도구 결과를 프로그래밍 방식으로 다룰 때
 * 사용하는 단순화된 형식입니다.
 *
 * Library-facing envelope for MCP tool results. Distinct from the SDK's
 * `CallToolResult` — this is the simplified shape exposed to programmatic
 * consumers of the public API.
 *
 * @example { ok: true, data: { presets: [...] } }
 * @example { ok: false, error: "unknown preset: foo" }
 */
export interface MCPToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
