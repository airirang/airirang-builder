/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * CLI subcommand — `list-presets` (Bedrock).
 *
 * Java 패키지의 동명 커맨드와 동일한 출력 — 프리셋 자산은 core 에 있으므로
 * 본 패키지는 표시 로직만 담당.
 */

import { listPresets, getPresetDefaultPitch } from '@airirang/builder-core';

/** `airirang-builder-bedrock list-presets` 핸들러. */
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
