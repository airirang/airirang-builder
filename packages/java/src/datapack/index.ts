/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * src/datapack public surface.
 * MCP 도구·CLI·공유 타입 모듈이 본 모듈에서 import.
 *
 * Public surface of the datapack module.
 */

export { buildDatapack, formatInstallMessage } from './builder.js';
export type { DatapackBuildResult } from './builder.js';
export {
  FUNCTION_FOLDER,
  PACK_FORMATS,
  resolvePackFormat,
} from './pack-formats.js';
