# Changelog

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

All notable changes to **AIrirang Builder** are documented in this file.

이 문서는 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 규약을 따르며, 버전은 [Semantic Versioning](https://semver.org/spec/v2.0.0.html) 입니다.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

향후 릴리스에서 다뤄질 후보 항목. Candidate items for upcoming releases.

### Planned

- 한국 랜드마크 프리셋(.obj) 조달 — 경복궁·N서울타워 등 (라이선스 클린 베이스)
- 메시 크기에 따른 `pitch` 자동 추천 (현재는 사용자 지정)
- Bedrock Edition addon 출력 (현재는 Java Edition datapack 전용)
- MCP 도구 streaming 응답 (대형 빌드 진행률 표시)
- 데모 영상 (5분 시나리오 — `examples/demo.md` 참조)

---

## [0.1.0] — 2026-05-19

**MVP 진입 / MVP entry.** Python POC → TypeScript MCP 서버 풀포팅 완료, npm 패키지 초판.

Initial public release: TypeScript MCP server ported from the verified Python POC, packaged for `npx airirang-builder`.

### Added

- **MCP 서버 (stdio)** — `@modelcontextprotocol/sdk` 1.x 기반. Claude Desktop · VSCode Claude 등 표준 MCP 클라이언트에서 자동 노출.
- **MCP 도구 7개 / 7 MCP tools**:
  - `list-presets` — 동봉 5개 Quaternius CC0 프리셋 카탈로그.
  - `voxelize-preset` — 프리셋 voxelize + greedy → /fill 명령 배열 (디스크 미기록).
  - `voxelize-custom` — 사용자 `.obj` 경로 동일 파이프라인.
  - `generate-mcfunction` — 명령 배열 → `.mcfunction` 파일 저장.
  - `execute-build` — 기존 `.mcfunction` → Java Edition datapack 패키징.
  - **`quick-build`** — 1회 호출로 load → voxelize → greedy → mcfunction → datapack 전체 실행 (핵심 차별점).
  - `list-builds` — `outRoot` 아래 빌드된 datapack 목록.
- **voxelizer 모듈** — `obj-file-parser` 기반 OBJ + MTL 로더, 자체 mesh→voxel 그리드, 멀티 머티리얼 voxelize.
- **greedy-meshing 모듈** — voxel → 직육면체 `/fill` 압축 알고리즘 + `/fill` 32,768 블록 상한 자동 분할(`splitForFillLimit`).
- **palette 모듈** — 48개 마인크래프트 블록 팔레트 + sRGB→Lab→Delta E76 매칭. linear RGB → sRGB 변환 가드(`linearToSrgbU8`) 포함 — `.mtl` Kd 가 linear인 함정 대응.
- **datapack 모듈** — Java Edition 1.20.5 ~ 1.21.11 pack_format 매핑, `pack.mcmeta` + `data/<ns>/function/<id>.mcfunction` 생성, 설치 메시지 포맷터.
- **5개 프리셋 (Quaternius CC0)** — `house_1`, `house_3`, `inn`, `mill`, `sawmill`. 자동 매칭 + `blockOverrides` 보정 manifest.
- **CLI** — `commander` 기반 `airirang-builder voxelize|build|serve|list-presets`. POC와 시그니처 1:1 매칭.
- **라이브러리 public API** — `src/index.ts` + `package.json` `exports` 5개 subpath (`./voxelizer`, `./greedy-meshing`, `./palette`, `./datapack`, `./mcp`).
- **테스트 / Tests** — Vitest 단위(greedy-meshing 6 + 합성 벤치마크 2 + color-match + voxelize + datapack) + E2E (`House_3.obj` end-to-end). Python POC 회귀 1:1 보존.
- **GitHub Actions** — release tag 시 `npm publish` 자동화.
- **문서 / Docs** — README (한영 병기) + CONTRIBUTING + CHANGELOG + Claude Desktop 설정 예시.

### Verified

- Quaternius `House_3.obj` (pitch=0.1): voxel ~9.4K → /fill 명령 **≤ 250 라인**, bbox `[21, 22, 23]`.
- greedy 압축률 — `realistic-building` ≥ **95%**, `eiffel-lattice` ≥ **80%** (Vitest 어서션).
- 마크 1.21 실측 — 박공지붕 + 창문까지 솟아오름 (POC 단계 검증, TS 포팅에서 회귀 0).
- POC 멀티 머티리얼 매칭 — 6 머티리얼 → 4 블록 자동 (cobblestone + deepslate + brown_concrete + stone).

### License

- 본 코드: **Apache-2.0** ([LICENSE](LICENSE)).
- 동봉 프리셋: **CC0 1.0 Universal** — Quaternius, <https://quaternius.com>.
- Mojang 자산 0% 포함. 디스클레이머(NOT AN OFFICIAL MINECRAFT PRODUCT) — README, LICENSE, NOTICE, CLI 첫 출력, MCP 서버 시작 로그 전 지점에 명기.

### Known Limitations

- 단일 머티리얼 메시 + `fillInterior=true` 조합에서는 greedy 가 1개 큰 cuboid로 압축됨 — 표면 표현이 필요하면 `fillInterior=false` 권장.
- 메시 extents < 3m 인 경우 `pitch=0.1` 이하 권장 (그 이상에서는 블록 수 부족으로 윤곽 깨짐).
- Minecraft 1.20.4 이하는 `data/<ns>/functions/` 폴더명 차이로 미지원 — MVP 는 1.20.5+ 전용.
- 메시 → voxel 자체 구현은 face 바운딩 박스 기반(POC 정합 우선). 대형 메시는 향후 BVH 기반 가속 검토.

---

[Unreleased]: https://github.com/airirang/airirang-builder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/airirang/airirang-builder/releases/tag/v0.1.0
