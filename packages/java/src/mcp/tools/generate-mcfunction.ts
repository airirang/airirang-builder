/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — generate-mcfunction.
 * 명령 배열을 .mcfunction 텍스트 파일로 저장합니다.
 *
 * Writes a command-string array (typically from voxelize-preset / voxelize-custom)
 * to a `.mcfunction` file on disk. The file can then be fed into
 * {@link execute-build} to wrap it in a datapack folder.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { z } from 'zod';

import { safeHandler, toolOk } from './shared.js';

export const name = 'generate-mcfunction';

export const config = {
  title: 'Write commands to a .mcfunction file',
  description:
    '명령 문자열 배열을 .mcfunction 파일로 저장. 부모 디렉토리는 자동 생성. ' +
    'Persists a command array to a .mcfunction file (creates parent dirs).',
  inputSchema: {
    commands: z.array(z.string()).describe('각 줄이 하나의 setblock/fill 명령.'),
    outPath: z.string().describe('출력 .mcfunction 파일 경로 (절대 또는 cwd 상대).'),
  },
  outputSchema: {
    ok: z.boolean(),
    path: z.string(),
    lineCount: z.number(),
    bytesWritten: z.number(),
  },
} as const;

type Args = {
  commands: string[];
  outPath: string;
};

export const handler = safeHandler(async (args: Args) => {
  if (args.commands.length === 0) {
    throw new Error('commands array is empty — nothing to write.');
  }
  const abs = path.resolve(args.outPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });

  const body = args.commands.join('\n') + '\n';
  await fs.writeFile(abs, body, 'utf-8');

  return toolOk(`wrote ${args.commands.length} lines → ${abs}`, {
    path: abs,
    lineCount: args.commands.length,
    bytesWritten: Buffer.byteLength(body, 'utf-8'),
  });
});
