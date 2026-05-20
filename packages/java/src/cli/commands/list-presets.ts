/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * CLI subcommand — `list-presets`.
 * 동봉된 Quaternius CC0 프리셋 5개를 표 형식으로 출력합니다.
 *
 * Prints the 5 bundled Quaternius CC0 presets as a plain-text table.
 * Designed to mirror the {@link list-presets} MCP tool so users can sanity-check
 * the bundle from the shell.
 */

import { listPresets, getPresetDefaultPitch } from '@airirang/builder-core';

/** `airirang-builder list-presets` 핸들러. process.exitCode 만 설정, throw 금지. */
export async function runListPresets(): Promise<void> {
  const presets = listPresets();
  if (presets.length === 0) {
    process.stdout.write('(no presets bundled)\n');
    return;
  }

  const rows = presets.map((p) => ({
    id: p.id,
    name: p.displayName,
    scale: String(p.defaultScale),
    pitch: String(getPresetDefaultPitch(p.id) ?? '-'),
    author: p.author,
    license: p.license,
  }));

  const headers = ['ID', 'NAME', 'SCALE', 'PITCH', 'AUTHOR', 'LICENSE'];
  const widths = headers.map((h, i) => {
    const col = [h, ...rows.map((r) => Object.values(r)[i] ?? '')];
    return Math.max(...col.map((s) => String(s).length));
  });

  const pad = (s: string, w: number): string => s + ' '.repeat(Math.max(0, w - s.length));

  process.stdout.write(headers.map((h, i) => pad(h, widths[i]!)).join('  ') + '\n');
  process.stdout.write(widths.map((w) => '-'.repeat(w)).join('  ') + '\n');
  for (const r of rows) {
    const cells = [r.id, r.name, r.scale, r.pitch, r.author, r.license];
    process.stdout.write(cells.map((c, i) => pad(c, widths[i]!)).join('  ') + '\n');
  }
  process.stdout.write(`\n${presets.length} presets bundled.\n`);
}
