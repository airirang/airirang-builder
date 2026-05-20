/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Bedrock behavior pack packager 테스트 — manifest.json 스키마
 * (format_version=2, header.uuid v4, modules[].uuid v4, min_engine_version 3-tuple)
 * 와 산출된 `.mcaddon` zip 내부에 manifest + functions/<id>.mcfunction 이
 * 들어 있는지 검증.
 */

import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildBehaviorPack } from '../src/packager/index.js';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('buildBehaviorPack — manifest schema + .mcaddon contents', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'airirang-bedrock-pkg-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('manifest.json — format_version=2 + header/module uuid v4 + min_engine_version', async () => {
    const result = await buildBehaviorPack({
      mcfunctionLines: [
        'fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:stone',
        'setblock ~0 ~6 ~0 minecraft:spruce_planks',
      ],
      name: 'airirang_pkg_test',
      namespace: 'airirang',
      functionId: 'demo',
      outRoot: workDir,
    });

    await expect(stat(result.packRoot)).resolves.toBeTruthy();
    await expect(stat(result.mcaddonPath)).resolves.toBeTruthy();
    await expect(stat(result.functionPath)).resolves.toBeTruthy();

    expect(result.headerUuid).toMatch(UUID_V4_RE);
    expect(result.moduleUuid).toMatch(UUID_V4_RE);
    expect(result.headerUuid).not.toBe(result.moduleUuid);
    expect(result.lineCount).toBe(2);

    const manifestPath = path.join(result.packRoot, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
      format_version: number;
      header: {
        name: string;
        description: string;
        uuid: string;
        version: number[];
        min_engine_version: number[];
      };
      modules: { type: string; uuid: string; version: number[] }[];
    };

    expect(manifest.format_version).toBe(2);
    expect(manifest.header.name).toBe('airirang_pkg_test');
    expect(manifest.header.uuid).toMatch(UUID_V4_RE);
    expect(manifest.header.uuid).toBe(result.headerUuid);
    expect(manifest.header.version).toEqual([1, 0, 0]);
    expect(manifest.header.min_engine_version).toEqual([1, 21, 0]);

    expect(Array.isArray(manifest.modules)).toBe(true);
    expect(manifest.modules.length).toBe(1);
    expect(manifest.modules[0]!.type).toBe('data');
    expect(manifest.modules[0]!.uuid).toMatch(UUID_V4_RE);
    expect(manifest.modules[0]!.uuid).toBe(result.moduleUuid);
    expect(manifest.modules[0]!.version).toEqual([1, 0, 0]);
  });

  it('minEngineVersion override 가 manifest 에 정확히 반영된다', async () => {
    const result = await buildBehaviorPack({
      mcfunctionLines: ['fill ~0 ~0 ~0 ~1 ~1 ~1 minecraft:stone'],
      name: 'airirang_engine_ver',
      namespace: 'airirang',
      functionId: 'demo',
      minEngineVersion: [1, 21, 50],
      outRoot: workDir,
    });

    const manifest = JSON.parse(
      await readFile(path.join(result.packRoot, 'manifest.json'), 'utf-8'),
    ) as { header: { min_engine_version: number[] } };
    expect(manifest.header.min_engine_version).toEqual([1, 21, 50]);
  });

  it('.mcaddon zip 안에 manifest.json 과 functions/<id>.mcfunction 이 들어있다', async () => {
    const lines = [
      'fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:stone',
      'fill ~0 ~6 ~0 ~5 ~10 ~5 minecraft:spruce_planks',
      'setblock ~3 ~11 ~3 minecraft:oak_planks',
    ];
    const result = await buildBehaviorPack({
      mcfunctionLines: lines,
      name: 'airirang_zip_test',
      namespace: 'airirang',
      functionId: 'build',
      outRoot: workDir,
    });

    const zipBuf = await readFile(result.mcaddonPath);
    const zip = await JSZip.loadAsync(zipBuf);

    expect(zip.file('manifest.json')).not.toBeNull();
    expect(zip.file('functions/build.mcfunction')).not.toBeNull();

    const manifestText = await zip.file('manifest.json')!.async('string');
    const manifest = JSON.parse(manifestText) as { format_version: number };
    expect(manifest.format_version).toBe(2);

    const mcfText = await zip
      .file('functions/build.mcfunction')!
      .async('string');
    const written = mcfText.split('\n').filter((l) => l.length > 0);
    expect(written).toEqual(lines);
  });

  it('빈 mcfunctionLines 도 manifest 와 .mcaddon 을 산출한다', async () => {
    const result = await buildBehaviorPack({
      mcfunctionLines: [],
      name: 'airirang_empty',
      namespace: 'airirang',
      functionId: 'noop',
      outRoot: workDir,
    });

    expect(result.lineCount).toBe(0);
    const zip = await JSZip.loadAsync(await readFile(result.mcaddonPath));
    expect(zip.file('manifest.json')).not.toBeNull();
    expect(zip.file('functions/noop.mcfunction')).not.toBeNull();
    const body = await zip.file('functions/noop.mcfunction')!.async('string');
    expect(body).toBe('');
  });
});
