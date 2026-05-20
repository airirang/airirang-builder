# Contributing to AIrirang Builder

**English** | [한국어](CONTRIBUTING.ko.md)

> **NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.**

Thanks for considering a contribution. This is a quick-start so external contributors can ramp up with minimal back-and-forth.

---

## Licensing

This repository is distributed under **Apache-2.0**. By submitting a pull request you agree that:

1. Your contribution will be distributed under **Apache-2.0** as part of this repo.
2. You have the right to submit the work (DCO-style — see <https://developercertificate.org/>).

For substantial features, open a GitHub issue first to align on scope.

---

## Dev setup

Requirements: **Node 20+** (ESM + NodeNext), Git, npm. Optionally Minecraft Java Edition 1.20.5–1.21.x (Java) or Bedrock 1.21+ for manual end-to-end checks.

```bash
git clone https://github.com/airirang/airirang-builder.git
cd airirang-builder
npm install                 # installs all workspaces

# Build (core first, then editions)
npm run build --workspace=airirang-builder-core
npm run build --workspace=airirang-builder
npm run build --workspace=airirang-builder-bedrock

# Tests
npm test --workspace=airirang-builder
npm test --workspace=airirang-builder-bedrock
```

### Monorepo layout

```
packages/
├── core/      # airirang-builder-core — edition-agnostic engine
│   └── src/{voxelizer, greedy-meshing, palette, presets(+data/), types}
├── java/      # airirang-builder — Java Edition (datapack)
│   └── src/{datapack, mcp/tools, cli, index} + tests/
└── bedrock/   # airirang-builder-bedrock — Bedrock Edition (.mcaddon)
    └── src/{packager, palette, fill, mcp, cli} + __tests__/
poc/           # Python POC (reference / regression baseline)
```

Preset `.obj`/`.mtl` assets live in `core` and are resolved by both editions.

---

## Coding conventions

- **TypeScript strict** + ES2022 + NodeNext.
- ESM imports must use the `.js` extension even for `.ts` source files.
- Prefer **pure functions**. Keep `voxelizer` / `greedy-meshing` / `palette` side-effect free.
- Naming: `camelCase` (vars/functions), `PascalCase` (interface/type), `kebab-case` (files/dirs).
- JSDoc may be bilingual (Korean + an English line) so non-Korean speakers can read it.
- Throw clear, fail-fast errors; MCP tools wrap them via `safeHandler`.
- No emojis in CLI / log / error messages.
- **License header** — one line at the top of each `src/` file (type-only / re-export files may omit):
  ```ts
  /** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */
  ```
- **Units** — coordinates are integer voxel indices; distances are meters. Surface the unit in the name (`scaleMeters`, `pitchMeters`).

---

## File ownership

Keep each PR within one module boundary when possible; split cross-module changes into separate PRs. Changes to `package.json` metadata (`bin` / `exports` / `files`) require an explicit note in the PR description, since the release pipeline depends on them.

---

## Tests

- Location: `tests/{module}.test.ts` or `src/{module}/__tests__/*.spec.ts` (Vitest finds both).
- Python POC regression cases (6 + 2 synthetic benchmarks) are preserved in TS Vitest. The greedy-meshing compression ratios are **assertions, not metrics** — regressions fail the suite.
- E2E: `House_3.obj` → voxelize(pitch=0.1) → greedy → bbox `[21, 22, 23]`, lineCount ≤ 250.
- Park unfinished cases as `it.todo`.

PR merge requirements:

1. `npm run build` succeeds
2. `npm test` passes (excluding todos)
3. `npm run lint` is clean
4. Behavior changes are proven by tests — a new test for features, a regression test for fixes.

---

## Commit / PR conventions

- Commit messages may be imperative English or Korean; the *what* and *why* must be visible in the first line.
- Suggested prefixes: `feat:` `fix:` `docs:` `refactor:` `test:` `chore:` `perf:`.
- PR body should include a **Summary** (1–3 lines) and a **Test plan**. If user-visible Minecraft behavior changed, include a screenshot or a line-count delta.

---

## Minecraft / license guardrails

- **Mojang Commercial Usage Guidelines** — do not add "Minecraft" to the project name, do not alter the disclaimer, bundle **zero** Mojang assets (textures/sounds/logos).
- **Disclaimer placement** — it must remain on README, LICENSE/NOTICE, CLI startup, and the MCP server boot log.
- **New presets** — CC0 or permissive-compatible only. Fill in `manifest.json` `author` / `sourceUrl` / `license`.

---

## Security

Please report security issues privately to **<skseo@airirang.co.kr>** rather than opening a public issue.

---

## Contact

- Features / Bugs: GitHub Issues
- General: <skseo@airirang.co.kr>
