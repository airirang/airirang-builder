/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * src/mcp public surface (Bedrock) — CLI `serve` 와 라이브러리 진입점이 본
 * 모듈을 import.
 */

export {
  createServer,
  startStdioServer,
  SERVER_NAME,
  SERVER_VERSION,
} from './server.js';
