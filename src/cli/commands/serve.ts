/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * CLI subcommand — `serve`.
 *
 * MCP stdio 서버를 부팅합니다 (Claude Desktop / VSCode Claude 표준 invocation).
 * 디스클레이머 + 프리셋 개수는 stderr 로 출력되고, stdout 은 JSON-RPC 전용입니다.
 *
 * Boots the MCP stdio server. Stdout is reserved for JSON-RPC traffic; the
 * disclaimer and boot log go to stderr (CLAUDE.md Gotcha #10).
 */

import { startStdioServer } from '../../mcp/index.js';

/** `airirang-builder serve` 핸들러. server.connect() 가 stdin 을 점유. */
export async function runServe(): Promise<void> {
  await startStdioServer();
}
