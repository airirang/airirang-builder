/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * Java → Bedrock 블록 매핑 (v1, preset 범위).
 * Java → Bedrock block-id mapping (v1, preset-scoped).
 *
 * core 의 색 매칭 + 프리셋 `blockOverrides` 가 산출하는 Java block id 집합을 입력으로,
 * Bedrock Edition 1.21+ 에서 통하는 block id (+ 필요 시 block states) 로 변환한다.
 *
 * v1 정책 — [doc/09 §1 D3](../../../../doc/09-멀티에디션-멀티클라이언트-아키텍처-계획.md):
 *   - 5 개 프리셋(House_1/House_3/Inn/Mill/Sawmill)이 실제로 쓰는 블록만 정확히 매핑.
 *   - 임의 `blockOverrides` 전 매핑(예: 모든 colored concrete, 계단/기둥/유리)은 범위 밖(v2).
 *   - 매핑 못 한 Java id 는 안전한 fallback ({@link BEDROCK_FALLBACK}) + 경고 메시지.
 *
 * 매핑 원천(Bedrock 1.21+):
 *   - Bedrock 1.21+ 는 wood planks·concrete 등 다수 블록을 Java 와 동일하게 flatten.
 *   - 그러나 `bricks → brick_block`, `nether_bricks → nether_brick`, `snow_block → snow`
 *     처럼 ID 자체가 다른 케이스는 여전히 남아 있으므로 명시 매핑.
 *
 * 데이터 주도(plain object literal). 새 블록을 지원하려면 {@link JAVA_TO_BEDROCK} 에 한 줄 추가.
 *
 * NOT AN OFFICIAL MINECRAFT PRODUCT.
 */

/**
 * Bedrock block state value — Bedrock 의 block-state 는 string / int / bool 만 받음.
 * Allowed Bedrock block-state value types.
 */
export type BedrockStateValue = string | number | boolean;

/**
 * Bedrock 블록 식별자 + 선택적 상태.
 * Bedrock block identifier plus optional block states.
 *
 * `/fill … <id> [ "state"="value" ]` 형태로 직렬화되는 데이터 — fill emitter (M3) 가 소비.
 *
 * @example { id: 'minecraft:spruce_planks' }
 * @example { id: 'minecraft:brick_block' }
 */
export interface BedrockBlock {
  /** Bedrock namespaced id. e.g. `minecraft:spruce_planks`. */
  id: string;
  /**
   * 선택적 block states (Bedrock /fill bracket syntax 에 들어감).
   * Optional Bedrock block states. Omit when defaults are fine.
   * @example { color: 'red' }
   */
  states?: Readonly<Record<string, BedrockStateValue>>;
}

/**
 * `toBedrockBlock()` 반환 — fallback 여부 + 경고를 함께 노출.
 * Result of {@link toBedrockBlock} including fallback flag + warning text.
 */
export interface BedrockMapResult {
  /** 매핑된(또는 fallback) Bedrock 블록. */
  block: BedrockBlock;
  /** `true` = 정식 매핑, `false` = unmapped → fallback. */
  mapped: boolean;
  /** fallback 이 발동했을 때 호출부 로깅용 한·영 경고 문자열. */
  warning?: string;
}

/**
 * 매핑 실패 시 사용하는 안전한 Bedrock 블록. 어느 Bedrock 버전에서도 존재.
 * Safe fallback block used when no Java→Bedrock mapping is registered.
 */
export const BEDROCK_FALLBACK: BedrockBlock = { id: 'minecraft:stone' };

/**
 * Java block id → Bedrock block 매핑 테이블 (v1).
 *
 * 범위: 5 개 medieval-village 프리셋이 실제로 쓰는 블록 — Plaster/Wood/Wood_Light/
 * RoofTiles_Red `blockOverrides` + 그 외 색 매칭으로 도달 가능한 stone/wood/dirt
 * 계열 소수.
 *
 * 키는 항상 `minecraft:` 네임스페이스 포함 full Java id.
 */
export const JAVA_TO_BEDROCK: Readonly<Record<string, BedrockBlock>> = {
  // ── preset blockOverrides (manifest.json 의 4 가지) ─────────────────────────
  'minecraft:sandstone': { id: 'minecraft:sandstone' },
  'minecraft:spruce_planks': { id: 'minecraft:spruce_planks' },
  'minecraft:oak_planks': { id: 'minecraft:oak_planks' },
  'minecraft:bricks': { id: 'minecraft:brick_block' },

  // ── stone family (벽·기단 색 매칭으로 자주 잡힘) ────────────────────────────
  'minecraft:stone': { id: 'minecraft:stone' },
  'minecraft:cobblestone': { id: 'minecraft:cobblestone' },
  'minecraft:smooth_stone': { id: 'minecraft:smooth_stone' },
  'minecraft:andesite': { id: 'minecraft:andesite' },
  'minecraft:granite': { id: 'minecraft:granite' },
  'minecraft:diorite': { id: 'minecraft:diorite' },

  // ── wood plank variants (지붕·문틀·들보 색 매칭) ─────────────────────────────
  'minecraft:birch_planks': { id: 'minecraft:birch_planks' },
  'minecraft:dark_oak_planks': { id: 'minecraft:dark_oak_planks' },

  // ── ground & misc (지면/자갈/흙 색 매칭) ────────────────────────────────────
  'minecraft:dirt': { id: 'minecraft:dirt' },
  'minecraft:gravel': { id: 'minecraft:gravel' },
};

/**
 * Java block id 를 Bedrock {@link BedrockBlock} 로 변환.
 * Convert a Java block id to its Bedrock equivalent.
 *
 * 매핑 테이블({@link JAVA_TO_BEDROCK})에 없는 id 는 {@link BEDROCK_FALLBACK} 으로
 * 대체하고 `mapped=false` + `warning` 을 함께 반환한다 — 호출부는 경고를
 * stderr(`console.error`)로 흘려 사용자가 인지하게 해야 한다.
 *
 * @example
 *   toBedrockBlock('minecraft:spruce_planks')
 *   // → { block: { id: 'minecraft:spruce_planks' }, mapped: true }
 *
 * @example
 *   toBedrockBlock('minecraft:bricks')
 *   // → { block: { id: 'minecraft:brick_block' }, mapped: true }
 *
 * @example
 *   toBedrockBlock('minecraft:purple_concrete')
 *   // → { block: { id: 'minecraft:stone' }, mapped: false,
 *   //     warning: '[bedrock-palette] no Bedrock mapping for minecraft:purple_concrete — falling back to minecraft:stone' }
 */
export function toBedrockBlock(javaId: string): BedrockMapResult {
  const hit = JAVA_TO_BEDROCK[javaId];
  if (hit) return { block: hit, mapped: true };
  return {
    block: BEDROCK_FALLBACK,
    mapped: false,
    warning: `[bedrock-palette] no Bedrock mapping for ${javaId} — falling back to ${BEDROCK_FALLBACK.id}`,
  };
}
