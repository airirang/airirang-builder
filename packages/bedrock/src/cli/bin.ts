#!/usr/bin/env node
/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * airirang-builder-bedrock CLI entry — `airirang-builder-bedrock <command>`.
 *
 * commander 기반. Java 패키지 CLI 와 동일한 서브커맨드 인터페이스를 유지하되
 * 출력은 Bedrock `.mcaddon` 으로 교체:
 *   - `build`         : preset/obj → voxelize+greedy → Bedrock fill → .mcaddon
 *   - `serve`         : MCP stdio 서버 부팅
 *   - `list-presets`  : 동봉된 Quaternius CC0 프리셋 5개 표 출력
 *
 * Commander-based Bedrock CLI mirroring the Java surface (build/serve/list-presets)
 * but emitting `.mcaddon` behavior packs.
 */

import { Command } from 'commander';

import { runBuild } from './commands/build.js';
import type { BuildCommandOptions } from './commands/build.js';
import { runListPresets } from './commands/list-presets.js';
import { runServe } from './commands/serve.js';

const DISCLAIMER =
  'NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.';

/** 본 패키지 버전 — package.json 의 진실의 원천을 import 하지 않고 상수화. */
const VERSION = '0.1.0';

/**
 * commander 프로그램을 구성해 반환. 테스트가 parseAsync(argv) 로 외부에서
 * 호출할 수 있도록 분리.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('airirang-builder-bedrock')
    .description(
      'AI-driven precise Minecraft (Bedrock Edition) building. ' + DISCLAIMER,
    )
    .version(VERSION);

  program
    .command('list-presets')
    .description('동봉된 Quaternius CC0 프리셋 5개 출력 / List bundled CC0 presets')
    .action(async () => {
      await runListPresets();
    });

  program
    .command('build')
    .description(
      'preset 또는 .obj → 완성 .mcaddon 일괄 빌드 / Preset or OBJ → ready-to-install .mcaddon',
    )
    .option('--preset <id>', '프리셋 id (list-presets 참조). --obj 와 둘 중 하나만.')
    .option('--obj <path>', '사용자 .obj 경로. --preset 와 둘 중 하나만.')
    .requiredOption('--name <name>', '패키지 이름 (예: airirang-house3)')
    .option('--namespace <ns>', 'manifest 식별용 namespace', 'airirang')
    .option('--function-id <id>', '함수 id (생략 시 --name 값) — /function <id> 로 호출')
    .option(
      '--min-engine-version <ver>',
      'min_engine_version (예: 1.21.0). 기본 1.21.0.',
      '1.21.0',
    )
    .requiredOption('--out-root <dir>', 'behavior pack 폴더와 .mcaddon 이 생성될 부모 디렉토리')
    .option('--pitch <number>', 'voxel 크기', parseFloat, 0.1)
    .option('--no-fill-interior', '메시 내부 채움 비활성화')
    .option('--block <id>', '모든 머티리얼 강제 단일 Java 블록 id (Bedrock 으로 변환됨)')
    .option(
      '--up <axis>',
      'GLB/glTF up-axis: auto(기본)·+y·-y·+z·-z·+x·-x (OBJ 는 무시)',
      'auto',
    )
    .option(
      '--scale <number>',
      '메시 사이즈 배수 (GLB 가 1/10 등으로 작으면 10). 기본 1.0',
      parseFloat,
      1,
    )
    .action(
      async (opts: {
        preset?: string;
        obj?: string;
        name: string;
        namespace: string;
        functionId?: string;
        minEngineVersion: string;
        outRoot: string;
        pitch: number;
        fillInterior: boolean;
        block?: string;
        up?: string;
        scale?: number;
      }) => {
        await runBuild({
          preset: opts.preset,
          obj: opts.obj,
          name: opts.name,
          namespace: opts.namespace,
          functionId: opts.functionId,
          minEngineVersion: opts.minEngineVersion,
          outRoot: opts.outRoot,
          up: opts.up as BuildCommandOptions['up'],
          scale: opts.scale,
          pitch: opts.pitch,
          fillInterior: opts.fillInterior,
          block: opts.block,
        });
      },
    );

  program
    .command('serve')
    .description('MCP stdio 서버 부팅 / Boot the MCP stdio server (Claude / any MCP client)')
    .action(async () => {
      await runServe();
    });

  return program;
}

/**
 * CLI main — 모든 에러는 stderr 로 출력하고 exit code 1.
 */
async function main(): Promise<void> {
  const program = createProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    process.stderr.write(
      `[airirang-builder-bedrock] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
}

void main();
