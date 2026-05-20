# Contributing to AIrirang Builder

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

AIrirang Builder에 관심 가져 주셔서 감사합니다. 본 문서는 외부 기여자가 빠르게 합류할 수 있도록 한 한국어 + 영문 병기 가이드입니다.

Thanks for considering a contribution. This document is a bilingual quick-start so external contributors can ramp up with minimal back-and-forth.

---

## 라이선스 동의 / Licensing

본 저장소는 **Apache-2.0**로 배포됩니다. 풀 리퀘스트를 보내면 다음에 동의한 것으로 간주합니다.

By submitting a pull request you agree that:

1. 기여 코드는 본 저장소의 **Apache-2.0** 조건으로 배포됩니다. Your contribution will be distributed under **Apache-2.0** as part of this repo.
2. 본인이 작성했거나 적법한 권리를 보유한 코드만 제출합니다. You certify that you have the right to submit the work (DCO-style — see <https://developercertificate.org/>).

대규모 기능을 제안하기 전에는 GitHub Issue로 먼저 논의해 주세요. For substantial features, open a GitHub issue first to align on scope.

---

## 개발 환경 / Dev setup

요구사항 / Requirements:

- **Node 20+** (ESM + NodeNext 사용)
- Git, npm
- (선택 / optional) Minecraft Java Edition 1.20.5 ~ 1.21.x — 수동 end-to-end 검증용

```bash
git clone https://github.com/airirang/airirang-builder.git
cd airirang-builder
npm install

# 빌드 / Build
npm run build

# 단위 테스트 + 통합 테스트 / Tests
npm test

# Lint / Format
npm run lint
npm run format

# 개발 모드 (tsx 직접 실행) / Dev
npm run dev list-presets
npx tsx src/cli/bin.ts voxelize path/to/mesh.obj --pitch 0.1
npx tsx src/cli/bin.ts serve     # MCP 서버
```

### 디렉토리 구조 / Layout

```
src/
├── voxelizer/         # OBJ + MTL → voxel 그리드
├── greedy-meshing/    # voxel → 직육면체 /fill 압축
├── palette/           # 마크 블록 팔레트 + sRGB→Lab→Delta E76
├── datapack/          # pack.mcmeta + .mcfunction 생성
├── presets/           # 5개 Quaternius CC0 프리셋 + manifest
├── mcp/tools/         # 7개 MCP 도구 (Anthropic SDK)
├── cli/               # commander 기반 CLI
├── types.ts           # 공유 타입
└── index.ts           # 라이브러리 public API
tests/                 # Vitest (단위 + E2E)
poc/                   # Python POC (참조용, 회귀 기준)
doc/                   # 결정사항·계획서·시장조사
```

세부 컨벤션은 아래 "코드 컨벤션 / Coding conventions" 절을 참조하세요. See the conventions section below.

---

## 코드 컨벤션 / Coding conventions

- **TypeScript strict** + ES2022 + NodeNext.
- ESM import는 반드시 `.js` 확장자를 명시합니다 (NodeNext 요구사항). ESM imports must use the `.js` extension even for `.ts` source files.
- 가능한 한 **함수형 + 순수 함수**. voxelizer / greedy-meshing / palette 모듈은 부수효과 0을 유지합니다. Keep voxelizer/greedy-meshing/palette pure.
- 명명 / Naming: `camelCase` (변수·함수), `PascalCase` (interface/type), `kebab-case` (파일·디렉토리).
- JSDoc은 **한국어 + 영문 동시**. 외부 contributor가 읽을 수 있도록 영문이 따라옵니다. JSDoc is written in Korean **with** an English line so non-Korean speakers can read it.
- 에러는 fail-fast로 명확한 메시지와 함께 `throw`. MCP 도구는 `safeHandler` 로 감싸 자동 변환. Throw clear errors; MCP tools wrap them via `safeHandler`.
- UI 텍스트·CLI·로그에 이모지 사용 금지. No emojis in CLI / log / error messages.
- **라이선스 헤더** — `src/` 파일 최상단에 1줄 필수 (타입 전용 파일·인덱스 re-export 파일은 생략 가능):
  ```ts
  /** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
  ```
- **단위(unit)** — 좌표는 voxel index(정수), 거리는 미터(float). 함수명에 단위 명시 권장 (`scaleMeters`, `pitchMeters`). Coordinates are integer voxel indices; distances are meters — surface the unit in the name.

---

## 파일 소유권 / File ownership

본 저장소는 **모듈별 소유 경계**가 명확합니다. 가능한 한 한 PR은 **한 모듈 경계** 안에서만 변경합니다. 여러 모듈에 걸치는 변경은 별도 PR로 쪼개 주세요.

This repo enforces strict per-module ownership boundaries. Keep each PR within one module boundary when possible; split cross-module changes into separate PRs.

`package.json` 의 `bin` / `exports` / `files` / 메타 필드는 릴리스 파이프라인이 사용하므로, 변경 시 반드시 PR 설명에 영향 범위를 적어 주세요. Changes to `package.json` metadata require an explicit note in the PR description.

---

## 테스트 / Tests

- **위치**: `tests/{모듈}.test.ts` 또는 `src/{모듈}/__tests__/*.spec.ts`. Vitest가 둘 다 발견. Either location works.
- Python POC 회귀 케이스(6개 + 합성 벤치마크 2개)를 TS Vitest로 보존했습니다. **압축률은 검증 어서션** — 알고리즘 변경 시 회귀가 즉시 드러납니다. The greedy-meshing compression ratios are assertions, not metrics — regressions fail the suite.
- E2E: `asset/.../House_3.obj` → voxelize(pitch=0.1) → greedy → bbox `[21, 22, 23]`, lineCount ≤ 250.
- 미완성 케이스는 `it.todo('...')` 로 보관합니다. Park unfinished cases as `it.todo`.

PR 머지 조건 / PR merge requirements:

1. `npm run build` 성공
2. `npm test` 전부 통과 (todo 제외)
3. `npm run lint` 경고 0
4. 변경된 동작은 테스트로 증명 — 새 기능이면 추가 테스트, 버그 수정이면 회귀 테스트.

---

## 커밋 / PR 컨벤션

- 커밋 메시지는 짧은 영문 명령형 또는 한국어 어느 쪽이든 좋습니다. 다만 **무엇을 왜 바꿨는지** 가 한 줄에 보여야 합니다. Either Korean or imperative English; the *what* and *why* must be visible in the first line.
- 권장 prefix(가벼운 컨벤션): `feat:` `fix:` `docs:` `refactor:` `test:` `chore:` `perf:`.
- PR 본문에는 다음을 포함해 주세요. Please include:
  - **요약(Summary)** — 변경 동기와 핵심 변화 1~3 줄.
  - **테스트(Test plan)** — 어떻게 검증했는지(자동 + 수동).
  - 마인크래프트 동작이 바뀌었다면 **실측 스크린샷 또는 datapack 산출 라인 수** 1장 / a screenshot or line-count delta if user-visible behavior changed.

---

## 마인크래프트 / 라이선스 가드레일

기여 시 다음을 지켜 주세요. When contributing, please respect:

- **Mojang Commercial Usage Guidelines** — 프로젝트 이름에 "Minecraft" 단어 추가 금지, 디스클레이머 문구 변경 금지, Mojang 자산(텍스처·사운드·로고) **0% 포함**. Do not bundle Mojang assets; do not rename around the disclaimer.
- **디스클레이머 위치** — README, LICENSE, NOTICE, CLI 첫 출력, MCP 서버 시작 로그에 모두 살아있어야 합니다. The disclaimer must remain on README, LICENSE/NOTICE, CLI startup, and MCP server boot log.
- **프리셋 추가 시** — CC0 또는 permissive 호환 라이선스만. `manifest.json` 의 `author` / `sourceUrl` / `license` 필드를 반드시 채우세요. New presets must be CC0 (or permissive-compatible) and ship attribution.

---

## 보안 / Security

보안 취약점은 GitHub Issue로 공개하지 마시고 **<skseo@airirang.co.kr>** 로 비공개 보고해 주세요. Please report security issues privately to that address rather than opening a public issue.

---

## 문의 / Contact

- 기능·버그 / Features·Bugs: GitHub Issues
- 문의 / General: <skseo@airirang.co.kr>
