/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * Datapack 빌더 — .mcfunction 파일을 Java Edition 1.20.5+ datapack 폴더 구조로 패키징.
 * Datapack builder — packages a .mcfunction file into a Java Edition 1.20.5+
 * datapack folder layout.
 *
 * 출력 구조 / Output layout:
 *   <outRoot>/<name>/
 *       pack.mcmeta
 *       data/<namespace>/function/<functionId>.mcfunction
 *
 * 설치 방법 / Install:
 *   1. <name>/ 폴더를 <world>/datapacks/ 로 복사
 *   2. 게임 내 /reload
 *   3. /function <namespace>:<functionId>
 *
 * Python POC reference: poc/make_datapack.py
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import type { DatapackOptions } from '../types.js';
import { FUNCTION_FOLDER, resolvePackFormat } from './pack-formats.js';

/**
 * Datapack 빌드 결과 / Result of a datapack build.
 */
export interface DatapackBuildResult {
  /** Absolute path to the generated datapack root (`<outRoot>/<name>/`). */
  datapackRoot: string;
  /** Absolute path to the written .mcfunction file. */
  functionPath: string;
  /** Resolved pack_format integer. */
  packFormat: number;
  /** Line count of the copied .mcfunction. */
  lineCount: number;
}

/**
 * .mcfunction 파일을 datapack으로 빌드.
 * Build a datapack around a pre-generated .mcfunction file.
 *
 * @param options Datapack build options. See {@link DatapackOptions}.
 * @returns 빌드 결과 메타데이터 / Build metadata.
 * @throws 알 수 없는 mcVersion / source 파일이 없으면 Error.
 */
export async function buildDatapack(
  options: DatapackOptions,
): Promise<DatapackBuildResult> {
  const { mcfunctionPath, name, namespace, functionId, mcVersion, outRoot } =
    options;

  const packFormat = resolvePackFormat(mcVersion);

  const sourceContent = await fs.readFile(mcfunctionPath, 'utf-8');

  const datapackRoot = path.resolve(outRoot, name);
  const funcDir = path.join(datapackRoot, 'data', namespace, FUNCTION_FOLDER);

  await fs.rm(datapackRoot, { recursive: true, force: true });
  await fs.mkdir(funcDir, { recursive: true });

  const packMcmeta = {
    pack: {
      pack_format: packFormat,
      description: `AIrirang Builder - ${name} (mc ${mcVersion})`,
    },
  };
  await fs.writeFile(
    path.join(datapackRoot, 'pack.mcmeta'),
    JSON.stringify(packMcmeta, null, 2),
    'utf-8',
  );

  const functionPath = path.join(funcDir, `${functionId}.mcfunction`);
  await fs.writeFile(functionPath, sourceContent, 'utf-8');

  const lineCount = sourceContent.split('\n').filter((l, i, arr) => {
    return i < arr.length - 1 || l.length > 0;
  }).length;

  return {
    datapackRoot,
    functionPath,
    packFormat,
    lineCount,
  };
}

/**
 * 사람이 읽기 좋은 설치 안내문을 만들어 반환.
 * Build a human-readable install message for CLI output.
 *
 * MCP 서버는 stdout으로 JSON-RPC를 보내므로 호출부에서 console.log 대신
 * console.error 또는 도구 응답 텍스트로 사용해야 함.
 */
export function formatInstallMessage(
  result: DatapackBuildResult,
  namespace: string,
  functionId: string,
  mcVersion: string,
): string {
  const folder = path.basename(result.datapackRoot);
  return [
    `[ok] datapack built: ${result.datapackRoot}`,
    `     pack_format=${result.packFormat} (mc ${mcVersion})`,
    `     function: ${namespace}:${functionId} (${result.lineCount} lines)`,
    '',
    'Install:',
    `  1. Copy folder ${folder}/ to <your_world>/datapacks/`,
    '  2. In game: /reload',
    '  3. Stand where you want the build to appear (commands use ~ relative coords)',
    `  4. /function ${namespace}:${functionId}`,
  ].join('\n');
}
