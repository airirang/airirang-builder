/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — list-builds.
 * 지정한 디렉토리에서 datapack(pack.mcmeta 보유 폴더) 목록을 반환합니다.
 *
 * Scans a directory for previously emitted datapacks so the model can let the
 * user re-install or inspect past builds without rebuilding.
 */

import { promises as fs, type Dirent } from 'node:fs';
import * as path from 'node:path';

import { z } from 'zod';

import { FUNCTION_FOLDER } from '../../datapack/index.js';
import { safeHandler, toolOk } from './shared.js';

export const name = 'list-builds';

export const config = {
  title: 'List previously built datapacks',
  description:
    '지정한 디렉토리에서 pack.mcmeta 를 가진 datapack 폴더 목록을 반환. ' +
    'Lists datapack folders (containing pack.mcmeta) under the given directory.',
  inputSchema: {
    rootDir: z.string().describe('스캔할 디렉토리 (절대 또는 cwd 상대).'),
  },
  outputSchema: {
    ok: z.boolean(),
    rootDir: z.string(),
    builds: z.array(
      z.object({
        name: z.string(),
        datapackRoot: z.string(),
        packFormat: z.number().optional(),
        description: z.string().optional(),
        functions: z.array(z.string()),
      }),
    ),
  },
} as const;

type Args = { rootDir: string };

interface BuildInfo {
  name: string;
  datapackRoot: string;
  packFormat?: number;
  description?: string;
  functions: string[];
}

export const handler = safeHandler(async (args: Args) => {
  const absRoot = path.resolve(args.rootDir);
  let entries: Dirent[];
  try {
    entries = await fs.readdir(absRoot, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return toolOk(`no such directory: ${absRoot}`, {
        rootDir: absRoot,
        builds: [] as BuildInfo[],
      });
    }
    throw err;
  }

  const builds: BuildInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dpRoot = path.join(absRoot, entry.name);
    const meta = await readPackMeta(dpRoot);
    if (!meta) continue;
    builds.push({
      name: entry.name,
      datapackRoot: dpRoot,
      packFormat: meta.packFormat,
      description: meta.description,
      functions: await listFunctions(dpRoot),
    });
  }

  return toolOk(
    builds.length === 0
      ? `no datapacks found under ${absRoot}.`
      : `${builds.length} datapacks under ${absRoot}: ${builds.map((b) => b.name).join(', ')}`,
    { rootDir: absRoot, builds },
  );
});

async function readPackMeta(
  dpRoot: string,
): Promise<{ packFormat?: number; description?: string } | null> {
  try {
    const txt = await fs.readFile(path.join(dpRoot, 'pack.mcmeta'), 'utf-8');
    const parsed: unknown = JSON.parse(txt);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'pack' in parsed &&
      typeof (parsed as { pack: unknown }).pack === 'object' &&
      (parsed as { pack: unknown }).pack !== null
    ) {
      const pack = (parsed as { pack: Record<string, unknown> }).pack;
      return {
        packFormat: typeof pack.pack_format === 'number' ? pack.pack_format : undefined,
        description: typeof pack.description === 'string' ? pack.description : undefined,
      };
    }
    return {};
  } catch {
    return null;
  }
}

async function listFunctions(dpRoot: string): Promise<string[]> {
  const dataDir = path.join(dpRoot, 'data');
  let namespaces: Dirent[];
  try {
    namespaces = await fs.readdir(dataDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const ns of namespaces) {
    if (!ns.isDirectory()) continue;
    const fnDir = path.join(dataDir, ns.name, FUNCTION_FOLDER);
    let files: string[];
    try {
      files = await fs.readdir(fnDir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (file.endsWith('.mcfunction')) {
        out.push(`${ns.name}:${file.slice(0, -'.mcfunction'.length)}`);
      }
    }
  }
  return out;
}
