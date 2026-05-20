/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * src/mcp public surface — CLI (`src/cli/commands/serve.ts`) 와 라이브러리
 * (`src/index.ts`) 가 본 모듈로 import.
 *
 * Public surface of the MCP module. The CLI `serve` subcommand and the
 * library entry both import from here.
 */

export {
  createServer,
  startStdioServer,
  SERVER_NAME,
  SERVER_VERSION,
} from './server.js';
