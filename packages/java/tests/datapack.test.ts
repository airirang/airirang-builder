/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Datapack 빌더 단위 테스트 — pack_format 매핑, Java 1.20.5+ 폴더 구조,
 * pack.mcmeta JSON 무결성, 알 수 없는 버전 거부, 임시 디렉토리 출력 검증.
 *
 * Unit tests for the datapack builder: pack_format lookup, the Java 1.20.5+
 * `function/` (singular) folder layout, pack.mcmeta JSON shape, rejection of
 * unknown Minecraft versions, and side-effect verification against a tmp dir.
 */

import { promises as fs } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { McVersion } from '../src/types.js';
import {
  FUNCTION_FOLDER,
  PACK_FORMATS,
  buildDatapack,
  resolvePackFormat,
} from '../src/datapack/index.js';

describe('resolvePackFormat — version → pack_format', () => {
  it('1.20.5 → 41 (post-`function/` singular folder cutoff)', () => {
    expect(resolvePackFormat('1.20.5')).toBe(41);
    expect(FUNCTION_FOLDER).toBe('function');
  });

  it('1.21.4 → 61, 1.21.11 → 81 (latest supported)', () => {
    expect(resolvePackFormat('1.21.4')).toBe(61);
    expect(resolvePackFormat('1.21.11')).toBe(81);
  });

  it('all PACK_FORMATS entries are resolvable', () => {
    for (const v of Object.keys(PACK_FORMATS) as McVersion[]) {
      expect(resolvePackFormat(v)).toBe(PACK_FORMATS[v]);
    }
  });

  it('unknown version throws with a useful message', () => {
    expect(() => resolvePackFormat('1.19.4' as McVersion)).toThrow(/unknown/);
  });
});

describe('buildDatapack — Java Edition 1.20.5+ layout', () => {
  let workDir: string;
  let sourceMcfunction: string;

  beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'airirang-dp-'));
    sourceMcfunction = path.join(workDir, 'src.mcfunction');
    await fs.writeFile(
      sourceMcfunction,
      [
        'fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:stone',
        'setblock ~0 ~6 ~0 minecraft:gold_block',
      ].join('\n'),
      'utf-8',
    );
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('emits pack.mcmeta + data/<ns>/function/<id>.mcfunction with correct pack_format', async () => {
    const result = await buildDatapack({
      mcfunctionPath: sourceMcfunction,
      name: 'airirang_test',
      namespace: 'airirang',
      functionId: 'demo',
      mcVersion: '1.21.4',
      outRoot: workDir,
    });

    expect(result.packFormat).toBe(61);
    expect(result.lineCount).toBe(2);

    const packMcmetaPath = path.join(result.datapackRoot, 'pack.mcmeta');
    const meta = JSON.parse(await readFile(packMcmetaPath, 'utf-8')) as {
      pack: { pack_format: number; description: string };
    };
    expect(meta.pack.pack_format).toBe(61);
    expect(meta.pack.description).toContain('AIrirang Builder');
    expect(meta.pack.description).toContain('1.21.4');

    const funcPath = path.join(
      result.datapackRoot,
      'data',
      'airirang',
      FUNCTION_FOLDER,
      'demo.mcfunction',
    );
    expect(result.functionPath).toBe(funcPath);
    const written = await readFile(funcPath, 'utf-8');
    expect(written).toContain('fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:stone');
    expect(written).toContain('setblock ~0 ~6 ~0 minecraft:gold_block');
  });

  it('overwrites a previous build at the same outRoot/name', async () => {
    await buildDatapack({
      mcfunctionPath: sourceMcfunction,
      name: 'overwrite_me',
      namespace: 'airirang',
      functionId: 'demo',
      mcVersion: '1.20.5',
      outRoot: workDir,
    });
    // Mutate source so we know the rebuild took effect.
    await fs.writeFile(
      sourceMcfunction,
      'setblock ~0 ~0 ~0 minecraft:diamond_block',
      'utf-8',
    );
    const result = await buildDatapack({
      mcfunctionPath: sourceMcfunction,
      name: 'overwrite_me',
      namespace: 'airirang',
      functionId: 'demo',
      mcVersion: '1.20.5',
      outRoot: workDir,
    });
    const written = await readFile(result.functionPath, 'utf-8');
    expect(written).toContain('minecraft:diamond_block');
    expect(written).not.toContain('minecraft:stone');
  });

  it('unknown mcVersion → throws before touching the filesystem', async () => {
    await expect(
      buildDatapack({
        mcfunctionPath: sourceMcfunction,
        name: 'should_not_exist',
        namespace: 'airirang',
        functionId: 'demo',
        mcVersion: '1.19.4' as McVersion,
        outRoot: workDir,
      }),
    ).rejects.toThrow(/unknown/);
  });
});
