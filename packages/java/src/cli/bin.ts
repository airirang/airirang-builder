#!/usr/bin/env node
/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * AIrirang Builder CLI entry — `airirang-builder <command>`.
 *
 * commander 기반. 4개 서브커맨드:
 *   - `voxelize <obj>` : .obj → .mcfunction (POC 시그니처 유지)
 *   - `build`          : preset/obj → 완성 datapack 일괄 빌드
 *   - `serve`          : MCP stdio 서버 부팅 (Claude Desktop 진입점)
 *   - `list-presets`   : 동봉된 Quaternius CC0 프리셋 5개 표 출력
 *
 * Commander-based CLI exposing voxelize / build / serve / list-presets.
 * `serve` is the Claude Desktop integration entry; the others mirror the
 * Python POC so users can drop python → npx airirang-builder with no flag
 * changes.
 */

import { Command } from 'commander';

import { runBuild } from './commands/build.js';
import type { BuildCommandOptions } from './commands/build.js';
import { runListPresets } from './commands/list-presets.js';
import { runServe } from './commands/serve.js';
import { runVoxelize } from './commands/voxelize.js';
import type { VoxelizeCommandOptions } from './commands/voxelize.js';
import type { McVersion } from '../types.js';

const DISCLAIMER =
  'NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.';

/** 본 패키지 버전 — package.json 의 진실의 원천을 import 하지 않고 상수화. */
const VERSION = '0.1.0';

/**
 * commander 프로그램을 구성해 반환. 테스트가 parseAsync(argv) 로
 * 외부에서 invoke 할 수 있도록 분리.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('airirang-builder')
    .description('AI-driven precise Minecraft building. ' + DISCLAIMER)
    .version(VERSION);

  program
    .command('list-presets')
    .description('동봉된 Quaternius CC0 프리셋 5개 출력 / List bundled CC0 presets')
    .action(async () => {
      await runListPresets();
    });

  program
    .command('voxelize')
    .argument('<obj>', '.obj 파일 경로 (.mtl 동봉 시 멀티-블록 매칭)')
    .description('.obj → .mcfunction (greedy meshed) / Voxelize a single .obj')
    .option('--pitch <number>', '월드 단위당 voxel 크기 / world units per voxel', parseFloat, 0.1)
    .option('--out <path>', '출력 .mcfunction 경로 (생략 시 <obj>.mcfunction)')
    .option(
      '--block <id>',
      '모든 머티리얼을 강제 단일 블록으로 (예: minecraft:stone). 미지정 시 색 매칭.',
    )
    .option('--no-fill-interior', '메시 내부 채움 비활성화 (표면만 voxelize)')
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
      async (
        obj: string,
        opts: {
          pitch: number;
          out?: string;
          block?: string;
          fillInterior: boolean;
          up?: string;
          scale?: number;
        },
      ) => {
        await runVoxelize(obj, {
          ...opts,
          up: opts.up as VoxelizeCommandOptions['up'],
        });
      },
    );

  program
    .command('build')
    .description(
      'preset 또는 .obj → 완성 datapack 일괄 빌드 / Preset or OBJ → ready-to-install datapack',
    )
    .option('--preset <id>', '프리셋 id (list-presets 참조). --obj 와 둘 중 하나만.')
    .option('--obj <path>', '사용자 .obj 경로. --preset 와 둘 중 하나만.')
    .requiredOption('--name <name>', 'datapack 폴더명 (예: airirang-house3)')
    .option('--namespace <ns>', '함수 namespace', 'airirang')
    .option('--function-id <id>', '함수 id (생략 시 --name 값)')
    .option('--mc-version <ver>', '대상 마인크래프트 버전 (1.20.5+)', '1.21')
    .requiredOption('--out-root <dir>', 'datapack 폴더가 생성될 부모 디렉토리')
    .option('--pitch <number>', 'voxel 크기', parseFloat, 0.1)
    .option('--no-fill-interior', '메시 내부 채움 비활성화')
    .option('--block <id>', '모든 머티리얼 강제 단일 블록')
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
        mcVersion: string;
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
          mcVersion: opts.mcVersion as McVersion,
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
    .description('MCP stdio 서버 부팅 / Boot the MCP stdio server (Claude Desktop)')
    .action(async () => {
      await runServe();
    });

  return program;
}

/**
 * CLI main — 모든 에러는 stderr 로 출력하고 exit code 1.
 * 비동기 throw 가 unhandledRejection 으로 새지 않도록 명시적으로 잡습니다.
 */
async function main(): Promise<void> {
  const program = createProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    process.stderr.write(
      `[airirang-builder] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
}

void main();
