/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * MCP tool — list-presets (Bedrock).
 * 동봉된 Quaternius CC0 프리셋 목록 반환. Java 패키지의 동명 도구와 동일 응답.
 */

import { z } from 'zod';

import { listPresets } from '@airirang/builder-core';
import { safeHandler, toolOk } from './shared.js';

export const name = 'list-presets';

export const config = {
  title: 'List bundled Minecraft presets',
  description:
    '동봉된 5개 Quaternius CC0 프리셋(House_1, House_3, Inn, Mill, Sawmill)을 반환. ' +
    'Lists the bundled CC0 presets that quick-build can target.',
  inputSchema: {},
  outputSchema: {
    ok: z.boolean(),
    presets: z.array(
      z.object({
        id: z.string(),
        displayName: z.string(),
        defaultScale: z.number(),
        author: z.string(),
        license: z.literal('CC0'),
        sourceUrl: z.string(),
      }),
    ),
  },
} as const;

export const handler = safeHandler(async () => {
  const presets = listPresets().map((p) => ({
    id: p.id,
    displayName: p.displayName,
    defaultScale: p.defaultScale,
    author: p.author,
    license: p.license,
    sourceUrl: p.sourceUrl,
  }));
  const summary =
    presets.length === 0
      ? 'no presets bundled.'
      : `${presets.length} presets: ${presets.map((p) => p.id).join(', ')}`;
  return toolOk(summary, { presets });
});
