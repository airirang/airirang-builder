/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
/**
 * airirang-builder-bedrock — Public library API.
 *
 * Bedrock Edition (.mcaddon) 출력 어댑터의 공개 진입점. Java 패키지와 같이
 * voxelize+greedy 는 `@airirang/builder-core` 가, 패키징/블록 변환/fill 문법은
 * 본 패키지가 담당.
 */

export {
  buildBehaviorPack,
  formatInstallMessage,
  type BuildBehaviorPackOptions,
  type BuildBehaviorPackResult,
  type BedrockVersion,
} from './packager/index.js';

export {
  emitBedrockFill,
  serializeBedrockStates,
  type BedrockBlockMapper,
} from './fill/index.js';

export {
  BEDROCK_FALLBACK,
  JAVA_TO_BEDROCK,
  toBedrockBlock,
  type BedrockBlock,
  type BedrockMapResult,
  type BedrockStateValue,
} from './palette/index.js';

export {
  createServer,
  startStdioServer,
  SERVER_NAME,
  SERVER_VERSION,
} from './mcp/index.js';
