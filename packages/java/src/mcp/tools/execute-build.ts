/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — execute-build.
 * 이미 작성된 .mcfunction 파일을 Java Edition datapack 으로 패키징합니다.
 *
 * Wraps a pre-written `.mcfunction` into a `pack.mcmeta`-bearing datapack
 * folder ready to drop into `<world>/datapacks/`.
 *
 * 의존성 / Depends on: {@link buildDatapack}, {@link formatInstallMessage}.
 */

import { z } from 'zod';

import { buildDatapack, formatInstallMessage } from '../../datapack/index.js';
import type { McVersion } from '../../types.js';
import { safeHandler, toolOk } from './shared.js';

export const name = 'execute-build';

const SUPPORTED_VERSIONS = [
  '1.20.5',
  '1.20.6',
  '1.21',
  '1.21.0',
  '1.21.1',
  '1.21.2',
  '1.21.3',
  '1.21.4',
  '1.21.5',
  '1.21.6',
  '1.21.7',
  '1.21.8',
  '1.21.9',
  '1.21.10',
  '1.21.11',
] as const;

export const config = {
  title: 'Wrap a .mcfunction into a datapack folder',
  description:
    'pack.mcmeta + data/<namespace>/function/<id>.mcfunction 구조로 datapack 폴더 생성. ' +
    'Builds a Java Edition datapack folder around a pre-written mcfunction.',
  inputSchema: {
    mcfunctionPath: z.string().describe('생성된 .mcfunction 파일 경로'),
    name: z.string().describe('datapack 폴더명 (예: "airirang-house3")'),
    namespace: z.string().describe('함수 namespace (예: "airirang")'),
    functionId: z.string().describe('함수 id — /function ns:id 로 실행됨'),
    mcVersion: z
      .enum(SUPPORTED_VERSIONS)
      .describe('대상 마인크래프트 버전 (1.20.5+).'),
    outRoot: z.string().describe('datapack 폴더가 만들어질 부모 디렉토리'),
  },
  outputSchema: {
    ok: z.boolean(),
    datapackRoot: z.string(),
    functionPath: z.string(),
    packFormat: z.number(),
    lineCount: z.number(),
    installMessage: z.string(),
  },
} as const;

type Args = {
  mcfunctionPath: string;
  name: string;
  namespace: string;
  functionId: string;
  mcVersion: McVersion;
  outRoot: string;
};

export const handler = safeHandler(async (args: Args) => {
  const result = await buildDatapack(args);
  const installMessage = formatInstallMessage(
    result,
    args.namespace,
    args.functionId,
    args.mcVersion,
  );
  return toolOk(
    `datapack built at ${result.datapackRoot} (${result.lineCount} lines, pack_format=${result.packFormat}).`,
    {
      datapackRoot: result.datapackRoot,
      functionPath: result.functionPath,
      packFormat: result.packFormat,
      lineCount: result.lineCount,
      installMessage,
    },
  );
});
