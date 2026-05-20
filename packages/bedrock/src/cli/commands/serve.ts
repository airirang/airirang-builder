/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * CLI subcommand — `serve` (Bedrock).
 *
 * MCP stdio 서버 부팅. stdout 은 JSON-RPC 채널이므로 디스클레이머/로그는
 * stderr 로 출력됩니다 (CLAUDE.md Gotcha #10).
 */

import { startStdioServer } from '../../mcp/index.js';

/** `airirang-builder-bedrock serve` 핸들러. server.connect() 가 stdin 을 점유. */
export async function runServe(): Promise<void> {
  await startStdioServer();
}
