/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * Bedrock /fill emitter — Cuboid 배열 → Bedrock mcfunction 라인.
 * Bedrock /fill emitter — converts cuboids into Bedrock mcfunction lines.
 *
 * Java emitter ([packages/core/src/greedy-meshing/fill-split.ts](../../../core/src/greedy-meshing/fill-split.ts))
 * 의 1:1 카운터파트. 문법 차이만 반영:
 *
 *   - mcfunction 한 줄 = 명령 1개, `/` 접두사 없음.
 *   - Java block state `[facing=north]` ↔ Bedrock `["facing"="north"]`
 *     (키 따옴표 + string 값 따옴표 + 정수/불은 따옴표 없음).
 *   - Bedrock `/fill` 인자 순서: `fill x1 y1 z1 x2 y2 z2 <block> [oldBlockHandling] [blockStates]`.
 *     상태가 있는 경우 oldBlockHandling 을 생략하면 파서가 bracket 을 모드로
 *     오해할 수 있으므로 명시적으로 `replace` 를 채워 준다.
 *   - Bedrock `/setblock` 은 `setblock x y z <block> [blockStates] [oldBlockHandling]`
 *     순서라 상태가 블록 바로 뒤에 온다.
 *   - 32,768 블록 상한은 Java 와 동일하며 입력 cuboid 는 이미
 *     [splitForFillLimit](../../../core/src/greedy-meshing/fill-split.ts) 로
 *     분할되었다고 가정한다 — 여기서는 재분할하지 않는다.
 *
 * Java→Bedrock 블록 변환은 [palette/blocks.ts](../palette/blocks.ts) 의
 * {@link toBedrockBlock} 을 기본 매퍼로 사용한다. 매핑이 없으면 fallback
 * (minecraft:stone) + stderr 경고를 흘려 사용자가 인지하게 한다.
 *
 * NOT AN OFFICIAL MINECRAFT PRODUCT.
 */

import type { Cuboid } from '@airirang/builder-core';
import type {
  BedrockBlock,
  BedrockMapResult,
  BedrockStateValue,
} from '../palette/blocks.js';
import { toBedrockBlock } from '../palette/blocks.js';

/**
 * Java block id 를 Bedrock 으로 변환하는 함수 시그니처.
 * Function shape that converts a Java block id to its Bedrock equivalent.
 *
 * 기본값은 {@link toBedrockBlock} 이며, 테스트에서 fake 매퍼를 주입할 때 사용.
 */
export type BedrockBlockMapper = (javaId: string) => BedrockMapResult;

/**
 * Bedrock block states 를 명령 문자열용 bracket 문법으로 직렬화.
 * Serialize Bedrock block states into the command-line bracket syntax.
 *
 *   { color: 'red', age: 3, open: true } → `["color"="red","age"=3,"open"=true]`
 */
export function serializeBedrockStates(
  states: Readonly<Record<string, BedrockStateValue>>,
): string {
  const parts = Object.entries(states).map(([key, value]) => {
    const rhs =
      typeof value === 'string'
        ? `"${value}"`
        : typeof value === 'boolean'
          ? String(value)
          : String(value);
    return `"${key}"=${rhs}`;
  });
  return `[${parts.join(',')}]`;
}

/**
 * cuboid 배열 → Bedrock mcfunction 라인.
 * Convert cuboids to Bedrock mcfunction command lines.
 *
 * 좌표는 Java 카운터파트와 동일하게 상대 좌표(`~` prefix). 1×1×1 큐보이드는
 * `setblock`, 그 외는 `fill` 을 생성한다.
 *
 * @param cuboids splitForFillLimit 으로 이미 분할된 큐보이드 배열.
 * @param blockMap Java→Bedrock 변환 함수 (기본 {@link toBedrockBlock}).
 * @returns 한 줄당 한 명령 (mcfunction body 그대로 join 가능).
 *
 * @example
 *   emitBedrockFill(
 *     [{ min: {x:0,y:0,z:0}, max: {x:5,y:5,z:5}, blockId: 'minecraft:bricks' }],
 *   )
 *   // → ['fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:brick_block']
 */
export function emitBedrockFill(
  cuboids: readonly Cuboid[],
  blockMap: BedrockBlockMapper = toBedrockBlock,
): string[] {
  const lines: string[] = [];
  for (const { min, max, blockId } of cuboids) {
    const result = blockMap(blockId);
    if (!result.mapped && result.warning) {
      console.error(result.warning);
    }
    const { block } = result;
    const isSingle =
      min.x === max.x && min.y === max.y && min.z === max.z;

    if (isSingle) {
      lines.push(formatSetblock(min.x, min.y, min.z, block));
    } else {
      lines.push(
        formatFill(min.x, min.y, min.z, max.x, max.y, max.z, block),
      );
    }
  }
  return lines;
}

function hasStates(block: BedrockBlock): boolean {
  return block.states !== undefined && Object.keys(block.states).length > 0;
}

function formatSetblock(
  x: number,
  y: number,
  z: number,
  block: BedrockBlock,
): string {
  const tail = hasStates(block)
    ? ` ${serializeBedrockStates(block.states!)}`
    : '';
  return `setblock ~${x} ~${y} ~${z} ${block.id}${tail}`;
}

function formatFill(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  block: BedrockBlock,
): string {
  const tail = hasStates(block)
    ? ` replace ${serializeBedrockStates(block.states!)}`
    : '';
  return `fill ~${x1} ~${y1} ~${z1} ~${x2} ~${y2} ~${z2} ${block.id}${tail}`;
}
