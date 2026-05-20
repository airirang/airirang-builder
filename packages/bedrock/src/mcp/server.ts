/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * airirang-builder-bedrock MCP server — stdio transport.
 *
 * 2개의 도구(list-presets, quick-build)를 등록한 뒤 Claude / 임의 MCP 클라이언트의
 * stdio JSON-RPC 메시지를 처리합니다. stdout 은 JSON-RPC 채널이라 모든 사용자
 * 노출 로그는 stderr 로 보냅니다 (CLAUDE.md Gotcha #10).
 *
 * v1 인터페이스는 의도적으로 좁게 유지 — Java 패키지의 7개 도구 중 Bedrock
 * 사용자 흐름에 핵심인 quick-build + list-presets 만 노출. 추가 도구는 v2 검토.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { listPresets } from '@airirang/builder-core';

import * as listPresetsTool from './tools/list-presets.js';
import * as quickBuildTool from './tools/quick-build.js';

export const SERVER_VERSION = '0.1.0';
export const SERVER_NAME = 'airirang-builder-bedrock';

const DISCLAIMER =
  'AIrirang Builder (Bedrock) ' +
  SERVER_VERSION +
  ' — NOT AN OFFICIAL MINECRAFT PRODUCT. ' +
  'NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.';

interface RegistrableTool {
  name: string;
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
  quickBuildTool,
] as unknown as RegistrableTool[];

/**
 * 도구가 등록된 {@link McpServer} 인스턴스를 만들어 반환. transport 는 호출자가 연결.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions:
        'AIrirang Builder (Bedrock) turns 3D meshes into Minecraft Bedrock .mcaddon behavior packs ' +
        'via voxelization + greedy meshing. Call `quick-build` for the one-shot path ' +
        '(preset or .obj → .mcaddon). Install: double-click the .mcaddon, activate in world ' +
        'Behavior Packs, then /function <functionId>. NOT AN OFFICIAL MINECRAFT PRODUCT.',
    },
  );

  for (const tool of TOOLS) {
    (server.registerTool as unknown as (
      n: string,
      c: RegistrableTool['config'],
      h: RegistrableTool['handler'],
    ) => unknown)(tool.name, tool.config, tool.handler);
  }

  return server;
}

/**
 * stdio transport 에 서버를 붙이고 부팅. Claude Desktop / 임의 MCP 클라이언트 표준 invocation.
 */
export async function startStdioServer(): Promise<void> {
  process.stderr.write(DISCLAIMER + '\n');
  try {
    const count = listPresets().length;
    process.stderr.write(
      `[airirang-builder-bedrock] ${count} presets loaded; ${TOOLS.length} tools registered.\n`,
    );
  } catch (err) {
    process.stderr.write(
      `[airirang-builder-bedrock] preset load failed: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
