/** AIrirang Builder — AGPL-3.0-or-later. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * src/presets public surface — MCP 도구와 CLI 는 모두 이 모듈을 import 합니다.
 *
 * Public surface of the presets module. Bundles 5 Quaternius CC0 buildings
 * (House_1, House_3, Inn, Mill, Sawmill) with `manifest.json` metadata.
 */

export {
  listPresets,
  getPreset,
  resolvePresetObjPath,
  getPresetDefaultPitch,
  getPresetDataDir,
  setPresetDataDir,
} from './load.js';
