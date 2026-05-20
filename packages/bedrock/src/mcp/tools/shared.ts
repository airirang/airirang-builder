/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool 공용 헬퍼 (Bedrock) — 응답 포맷 / 에러 래퍼.
 *
 * MCP 도구는 `{ content, isError?, structuredContent? }` 형태를 반환해야 합니다.
 * Java 패키지의 동명 헬퍼와 동일한 시그니처 — 두 패키지의 도구 코드가 시그니처
 * 호환을 유지하도록 1:1 동기.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** 텍스트 + 구조화 데이터를 함께 묶어 성공 결과로 반환. */
export function toolOk<T extends Record<string, unknown>>(
  summary: string,
  data: T,
): CallToolResult {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: { ok: true, ...data },
  };
}

/** 에러를 `isError:true` 봉투에 담아 반환. */
export function toolError(err: unknown): CallToolResult {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text', text: `error: ${msg}` }],
    structuredContent: { ok: false, error: msg },
    isError: true,
  };
}

/** try/catch 보일러플레이트 제거 데코레이터. */
export function safeHandler<A>(
  fn: (args: A) => Promise<CallToolResult> | CallToolResult,
): (args: A) => Promise<CallToolResult> {
  return async (args) => {
    try {
      return await fn(args);
    } catch (err) {
      return toolError(err);
    }
  };
}
