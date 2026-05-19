/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * AIrirang Builder MCP server — stdio transport.
 *
 * 7개의 도구를 등록한 뒤 Claude Desktop / VSCode Claude 같은 MCP 클라이언트의
 * stdio JSON-RPC 메시지를 처리합니다. 모든 사용자 노출 로그는 stderr 로 보냅니다 —
 * stdout 은 JSON-RPC 채널이라 console.log 사용 금지 (CLAUDE.md Gotcha #10).
 *
 * Registers 7 tools and serves them over stdio JSON-RPC. All human-readable
 * logs go to stderr; stdout is reserved for protocol traffic.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { listPresets } from '../presets/index.js';

import * as listPresetsTool from './tools/list-presets.js';
import * as voxelizePresetTool from './tools/voxelize-preset.js';
import * as voxelizeCustomTool from './tools/voxelize-custom.js';
import * as generateMcfunctionTool from './tools/generate-mcfunction.js';
import * as executeBuildTool from './tools/execute-build.js';
import * as quickBuildTool from './tools/quick-build.js';
import * as listBuildsTool from './tools/list-builds.js';

/**
 * 본 패키지 버전 — package.json 의 진실의 원천을 import 하지 않고 상수화.
 * 향후 자동화하려면 build 단계에서 주입.
 */
export const SERVER_VERSION = '0.1.0';
export const SERVER_NAME = 'airirang-builder';

const DISCLAIMER =
  'AIrirang Builder ' +
  SERVER_VERSION +
  ' — NOT AN OFFICIAL MINECRAFT PRODUCT. ' +
  'NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.';

interface RegistrableTool {
  name: string;
  // The shape carries Zod schemas; the SDK's registerTool overload accepts the
  // raw shape object directly. We use a permissive type to keep this file
  // decoupled from the SDK's generic plumbing.
  config: {
    title?: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
  };
  handler: (args: never) => unknown;
}

const TOOLS: RegistrableTool[] = [
  listPresetsTool,
  voxelizePresetTool,
  voxelizeCustomTool,
  generateMcfunctionTool,
  executeBuildTool,
  quickBuildTool,
  listBuildsTool,
] as unknown as RegistrableTool[];

/**
 * 도구가 등록된 {@link McpServer} 인스턴스를 만들어 반환. transport 는 별도
 * 호출자가 연결합니다. 테스트가 in-memory transport 로 같은 서버를 띄울 수
 * 있도록 분리되어 있습니다.
 *
 * Build an MCP server with all 7 tools registered. Caller is responsible for
 * wiring up a transport. Decoupling this lets tests reuse the same server
 * with an in-memory transport.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions:
        'AIrirang Builder turns 3D meshes into Minecraft datapacks via voxelization + greedy meshing. ' +
        'Call `quick-build` for the one-shot path (preset or .obj → datapack). ' +
        'NOT AN OFFICIAL MINECRAFT PRODUCT.',
    },
  );

  for (const tool of TOOLS) {
    // registerTool overloads are permissive about shape-vs-schema; cast keeps
    // each tool file authored idiomatically against its own typed handler.
    (server.registerTool as unknown as (
      n: string,
      c: RegistrableTool['config'],
      h: RegistrableTool['handler'],
    ) => unknown)(tool.name, tool.config, tool.handler);
  }

  return server;
}

/**
 * stdio transport 에 서버를 붙이고 부팅. Claude Desktop 의 표준 invocation.
 * Boot the server on stdio — the canonical Claude Desktop invocation.
 */
export async function startStdioServer(): Promise<void> {
  // Disclaimer + preset count to stderr (stdout reserved for JSON-RPC).
  process.stderr.write(DISCLAIMER + '\n');
  try {
    const count = listPresets().length;
    process.stderr.write(
      `[airirang-builder] ${count} presets loaded; ${TOOLS.length} tools registered.\n`,
    );
  } catch (err) {
    process.stderr.write(
      `[airirang-builder] preset load failed: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
