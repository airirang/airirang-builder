/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool 공용 헬퍼 — 응답 포맷 / 에러 래퍼.
 * Shared helpers for MCP tool handlers — response shaping and error wrapping.
 *
 * MCP 도구는 `{ content: [{ type: 'text', text }], isError?, structuredContent? }`
 * 형태로 응답해야 합니다. 본 모듈은 그 boilerplate 를 1줄로 줄여 줍니다.
 *
 * MCP tool handlers must return a CallToolResult shape. These helpers fold the
 * boilerplate so each tool stays focused on its pipeline call.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * 텍스트 + 구조화 데이터를 함께 묶어 성공 결과로 반환.
 * Wrap a success payload as a CallToolResult — text summary + structured data.
 */
export function toolOk<T extends Record<string, unknown>>(
  summary: string,
  data: T,
): CallToolResult {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: { ok: true, ...data },
  };
}

/**
 * 에러를 사용자에게 친절하게 노출. MCP 클라이언트는 `isError:true` 를 보고
 * 모델에게 재시도 / 정정을 요청합니다.
 *
 * Surface an error in the standard MCP `isError:true` envelope so the client
 * can prompt the model to retry or correct its arguments.
 */
export function toolError(err: unknown): CallToolResult {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text', text: `error: ${msg}` }],
    structuredContent: { ok: false, error: msg },
    isError: true,
  };
}

/**
 * try/catch 보일러플레이트 제거. 핸들러는 비즈니스 로직만 작성하고
 * 실패는 자동으로 {@link toolError} 로 변환됩니다.
 *
 * Decorator that turns a throwing async fn into a CallToolResult-returning
 * handler. Keeps each tool body free of try/catch noise.
 */
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
