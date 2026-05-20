/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * Bedrock behavior pack 패커 — `.mcfunction` 라인 배열을 Bedrock Edition behavior
 * pack 폴더 + `.mcaddon` (zip) 으로 패키징.
 *
 * Bedrock behavior pack builder — packages an in-memory `.mcfunction` line
 * array into a Bedrock Edition behavior pack folder and bundles it as a
 * double-clickable `.mcaddon` zip.
 *
 * 출력 구조 / Output layout:
 *   <outRoot>/<name>/
 *       manifest.json
 *       functions/<functionId>.mcfunction
 *   <outRoot>/<name>.mcaddon          (zip of the folder above)
 *
 * 설치 방법 / Install:
 *   1. `<name>.mcaddon` 더블클릭 — Minecraft (Bedrock) 가 자동으로 임포트
 *   2. 월드 설정 > Behavior Packs 에서 활성화
 *   3. 게임 내: /function <functionId>
 *
 * Java 데이터팩 빌더(`packages/java/src/datapack/builder.ts`)와 개념은 동일
 * (함수 + 메타 + 패키징) — 포맷만 Bedrock 으로 교체.
 *
 * NOT AN OFFICIAL MINECRAFT PRODUCT.
 */

import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';

import JSZip from 'jszip';

// Cuboid / FillCommand 는 core 의 공용 타입. 본 패커는 라인 단위 string 만 받으나
// 시그니처 명확성을 위해 FillCommand 타입을 재노출.
import type { FillCommand } from 'airirang-builder-core';

/**
 * Bedrock semver-like 3-tuple. manifest.json `header.version` 등에서 사용.
 * Three-part version tuple used by Bedrock manifests.
 */
export type BedrockVersion = readonly [number, number, number];

/**
 * `buildBehaviorPack()` 입력 옵션.
 * Input options for {@link buildBehaviorPack}.
 */
export interface BuildBehaviorPackOptions {
  /**
   * 패킹할 `.mcfunction` 라인 배열. 각 원소는 명령 한 줄.
   * Mcfunction line array — one Minecraft command per element.
   * @example ['fill ~0 ~0 ~0 ~5 ~5 ~5 stone', 'fill ~0 ~6 ~0 ~5 ~10 ~5 oak_planks']
   */
  mcfunctionLines: readonly FillCommand[];
  /**
   * 패키지 이름 — 폴더명 + `.mcaddon` 파일명 + manifest header.name 으로 사용.
   * Pack name used for the folder, the `.mcaddon` filename and `header.name`.
   * @example 'house_3'
   */
  name: string;
  /**
   * 네임스페이스 — Bedrock 함수 경로는 namespace 를 강제하지 않지만 manifest
   * description 과 향후 식별자 prefix 에 사용됩니다.
   * Namespace string. Not required by Bedrock function paths but recorded in
   * the manifest description for traceability.
   * @example 'airirang'
   */
  namespace: string;
  /**
   * 함수 식별자 — `functions/<functionId>.mcfunction` 으로 저장되며 게임 내
   * `/function <functionId>` 로 호출됩니다.
   * Function id stored as `functions/<functionId>.mcfunction`, invoked
   * in-game as `/function <functionId>`.
   * @example 'build'
   */
  functionId: string;
  /**
   * `manifest.json` 의 `header.min_engine_version`. Bedrock 클라이언트가 이
   * 버전 미만이면 패키지를 거부합니다. 기본 [1, 21, 0].
   * Minimum Bedrock engine version required by the addon. Defaults to
   * [1, 21, 0].
   */
  minEngineVersion?: BedrockVersion;
  /**
   * 출력 루트 디렉토리 — staging 폴더와 `.mcaddon` 모두 여기에 생성됩니다.
   * Root output directory; both the staged folder and the `.mcaddon` are
   * written under here.
   */
  outRoot: string;
}

/**
 * Behavior pack 빌드 결과 / Result of a behavior pack build.
 */
export interface BuildBehaviorPackResult {
  /** Staging 폴더 절대 경로 (`<outRoot>/<name>/`). */
  packRoot: string;
  /** `.mcaddon` zip 파일 절대 경로 (`<outRoot>/<name>.mcaddon`). */
  mcaddonPath: string;
  /** 작성된 `.mcfunction` 파일 절대 경로. */
  functionPath: string;
  /** 작성된 함수의 라인 수 / Number of mcfunction lines written. */
  lineCount: number;
  /** 생성된 header UUID (랜덤 v4) / Generated header UUID. */
  headerUuid: string;
  /** 생성된 module UUID (랜덤 v4) / Generated module UUID. */
  moduleUuid: string;
}

const DEFAULT_MIN_ENGINE_VERSION: BedrockVersion = [1, 21, 0];

/**
 * In-memory `.mcfunction` 라인을 Bedrock behavior pack 으로 빌드 + zip(`.mcaddon`).
 *
 * Build an in-memory `.mcfunction` line array into a Bedrock behavior pack
 * folder layout and bundle it as a `.mcaddon` zip.
 *
 * @param options See {@link BuildBehaviorPackOptions}.
 * @returns 빌드 결과 메타데이터 / Build metadata.
 * @throws outRoot 를 만들 수 없거나 zip 생성에 실패하면 Error.
 */
export async function buildBehaviorPack(
  options: BuildBehaviorPackOptions,
): Promise<BuildBehaviorPackResult> {
  const {
    mcfunctionLines,
    name,
    namespace,
    functionId,
    minEngineVersion = DEFAULT_MIN_ENGINE_VERSION,
    outRoot,
  } = options;

  const headerUuid = randomUUID();
  const moduleUuid = randomUUID();

  const packRoot = path.resolve(outRoot, name);
  const functionsDir = path.join(packRoot, 'functions');

  await fs.rm(packRoot, { recursive: true, force: true });
  await fs.mkdir(functionsDir, { recursive: true });

  const manifest = {
    format_version: 2,
    header: {
      name,
      description: `AIrirang Builder - ${namespace}:${functionId}`,
      uuid: headerUuid,
      version: [1, 0, 0],
      min_engine_version: [
        minEngineVersion[0],
        minEngineVersion[1],
        minEngineVersion[2],
      ],
    },
    modules: [
      {
        type: 'data',
        uuid: moduleUuid,
        version: [1, 0, 0],
      },
    ],
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  await fs.writeFile(
    path.join(packRoot, 'manifest.json'),
    manifestJson,
    'utf-8',
  );

  // Bedrock `.mcfunction` 도 라인 단위 plain text. trailing newline 1개로 통일.
  const mcfunctionBody =
    mcfunctionLines.length === 0 ? '' : mcfunctionLines.join('\n') + '\n';
  const functionPath = path.join(functionsDir, `${functionId}.mcfunction`);
  await fs.writeFile(functionPath, mcfunctionBody, 'utf-8');

  const mcaddonPath = path.resolve(outRoot, `${name}.mcaddon`);
  await fs.rm(mcaddonPath, { force: true });

  const zip = new JSZip();
  zip.file('manifest.json', manifestJson);
  zip.file(`functions/${functionId}.mcfunction`, mcfunctionBody);
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  await fs.writeFile(mcaddonPath, zipBuffer);

  return {
    packRoot,
    mcaddonPath,
    functionPath,
    lineCount: mcfunctionLines.length,
    headerUuid,
    moduleUuid,
  };
}

/**
 * 사람이 읽기 좋은 설치 안내문을 만들어 반환.
 * Human-readable install instructions for CLI output.
 *
 * MCP 서버는 stdout 으로 JSON-RPC 를 보내므로 호출부에서 `console.log` 대신
 * `console.error` 또는 도구 응답 텍스트로 사용해야 함.
 */
export function formatInstallMessage(
  result: BuildBehaviorPackResult,
  functionId: string,
): string {
  return [
    `[ok] bedrock behavior pack built: ${result.packRoot}`,
    `     .mcaddon: ${result.mcaddonPath} (${result.lineCount} lines)`,
    '',
    'Install:',
    `  1. Double-click ${path.basename(result.mcaddonPath)} — Minecraft (Bedrock) imports it`,
    '  2. World settings > Behavior Packs > activate this pack',
    '  3. Stand where you want the build to appear (commands use ~ relative coords)',
    `  4. In game: /function ${functionId}`,
  ].join('\n');
}
