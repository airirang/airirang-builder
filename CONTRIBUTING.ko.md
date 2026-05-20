# AIrirang Builder 기여 가이드

[English](CONTRIBUTING.md) | **한국어**

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

기여에 관심 가져 주셔서 감사합니다. 외부 기여자가 빠르게 합류할 수 있도록 한 빠른 시작 가이드입니다.

---

## 라이선스 동의

본 저장소는 **Apache-2.0**로 배포됩니다. 풀 리퀘스트를 보내면 다음에 동의한 것으로 간주합니다.

1. 기여 코드는 본 저장소의 **Apache-2.0** 조건으로 배포됩니다.
2. 본인이 작성했거나 적법한 권리를 보유한 코드만 제출합니다 (DCO 방식 — <https://developercertificate.org/>).

대규모 기능은 GitHub Issue로 먼저 범위를 논의해 주세요.

---

## 개발 환경

요구사항: **Node 20+** (ESM + NodeNext), Git, npm. 선택적으로 수동 end-to-end 검증용 Minecraft Java Edition 1.20.5–1.21.x 또는 Bedrock 1.21+.

```bash
git clone https://github.com/airirang/airirang-builder.git
cd airirang-builder
npm install                 # 전체 workspace 설치

# 빌드 (core 먼저, 그다음 edition)
npm run build --workspace=airirang-builder-core
npm run build --workspace=airirang-builder
npm run build --workspace=airirang-builder-bedrock

# 테스트
npm test --workspace=airirang-builder
npm test --workspace=airirang-builder-bedrock
```

### monorepo 구조

```
packages/
├── core/      # airirang-builder-core — edition 무관 엔진
│   └── src/{voxelizer, greedy-meshing, palette, presets(+data/), types}
├── java/      # airirang-builder — Java Edition (datapack)
│   └── src/{datapack, mcp/tools, cli, index} + tests/
└── bedrock/   # airirang-builder-bedrock — Bedrock Edition (.mcaddon)
    └── src/{packager, palette, fill, mcp, cli} + __tests__/
poc/           # Python POC (참조 / 회귀 기준)
```

프리셋 `.obj`/`.mtl` 에셋은 `core`에 동봉되며 두 에디션이 공유 해석합니다.

---

## 코드 컨벤션

- **TypeScript strict** + ES2022 + NodeNext.
- ESM import는 `.ts` 소스라도 반드시 `.js` 확장자를 명시합니다.
- 가능한 한 **순수 함수**. `voxelizer` / `greedy-meshing` / `palette`는 부수효과 0 유지.
- 명명: `camelCase`(변수·함수), `PascalCase`(interface/type), `kebab-case`(파일·디렉토리).
- JSDoc은 한국어 + 영문 한 줄 병기 가능 (비한국어 사용자도 읽도록).
- 에러는 fail-fast로 명확히 `throw`. MCP 도구는 `safeHandler`로 감쌉니다.
- CLI·로그·에러 메시지에 이모지 금지.
- **라이선스 헤더** — `src/` 파일 최상단 1줄 (타입 전용·re-export 파일은 생략 가능):
  ```ts
  /** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
  ```
- **단위** — 좌표는 정수 voxel index, 거리는 미터. 함수명에 단위 명시 (`scaleMeters`, `pitchMeters`).

---

## 파일 소유권

가능한 한 한 PR은 한 모듈 경계 안에서만 변경합니다. 여러 모듈 변경은 별도 PR로 쪼개세요. `package.json` 메타(`bin` / `exports` / `files`) 변경은 릴리스 파이프라인이 사용하므로 PR 설명에 영향 범위를 명기하세요.

---

## 테스트

- 위치: `tests/{모듈}.test.ts` 또는 `src/{모듈}/__tests__/*.spec.ts` (Vitest가 둘 다 발견).
- Python POC 회귀 케이스(6개 + 합성 벤치마크 2개)를 TS Vitest로 보존. greedy-meshing 압축률은 **메트릭이 아니라 어서션** — 회귀 시 테스트 실패.
- E2E: `House_3.obj` → voxelize(pitch=0.1) → greedy → bbox `[21, 22, 23]`, lineCount ≤ 250.
- 미완성 케이스는 `it.todo`로 보관.

PR 머지 조건:

1. `npm run build` 성공
2. `npm test` 통과 (todo 제외)
3. `npm run lint` 경고 0
4. 변경된 동작은 테스트로 증명 — 기능이면 추가 테스트, 버그면 회귀 테스트.

---

## 커밋 / PR 컨벤션

- 커밋 메시지는 영문 명령형 또는 한국어 모두 좋습니다. **무엇을·왜** 가 첫 줄에 보여야 합니다.
- 권장 prefix: `feat:` `fix:` `docs:` `refactor:` `test:` `chore:` `perf:`.
- PR 본문에 **요약**(1~3줄) + **테스트 계획**을 포함. 마인크래프트 동작이 바뀌면 스크린샷 또는 라인 수 변화 1장.

---

## 마인크래프트 / 라이선스 가드레일

- **Mojang Commercial Usage Guidelines** — 프로젝트 이름에 "Minecraft" 추가 금지, 디스클레이머 변경 금지, Mojang 자산(텍스처·사운드·로고) **0% 포함**.
- **디스클레이머 위치** — README, LICENSE/NOTICE, CLI 첫 출력, MCP 서버 시작 로그에 모두 유지.
- **프리셋 추가 시** — CC0 또는 permissive 호환만. `manifest.json` `author` / `sourceUrl` / `license` 필드를 채우세요.

---

## 보안

보안 취약점은 GitHub Issue로 공개하지 마시고 **<skseo@airirang.co.kr>** 로 비공개 보고해 주세요.

---

## 문의

- 기능·버그: GitHub Issues
- 일반 문의: <skseo@airirang.co.kr>
