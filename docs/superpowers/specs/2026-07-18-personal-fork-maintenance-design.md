# Personal Fork Maintenance Design

Date: 2026-07-18

## Context

This repository is a personal fork of `Wei-Shaw/sub2api`, cloned locally from `MisakiSATA/sub2api`.
The fork should use upstream as a reference source only. Personal changes must be saved to the user's
own repository and must not be submitted or pushed to upstream.

Current remotes:

- `origin`: `https://github.com/MisakiSATA/sub2api.git`
- `upstream`: `https://github.com/Wei-Shaw/sub2api.git`
- `upstream` push URL: `DISABLED`

The personal version prioritizes performance, security, and visual polish.

## Goals

1. Keep upstream available for comparison and periodic sync.
2. Prevent accidental pushes to upstream.
3. Maintain personal improvements in isolated branches and focused commits.
4. Improve the fork along three product axes:
   - Performance: gateway hot paths, scheduling, caching, request logging overhead, frontend bundle cost.
   - Security: safer defaults, request/header sanitization, admin boundary hardening, dependency hygiene.
   - Visual polish: clearer admin/user workflows, consistent UI states, responsive layout quality.
5. Preserve compatibility with upstream enough that future merges remain manageable.

## Non-Goals

1. Do not open pull requests to upstream.
2. Do not rewrite broad architecture without a concrete need.
3. Do not mix unrelated performance, security, and UI changes in one commit.
4. Do not introduce new services or dependencies unless they solve a specific measured problem.

## Repository Strategy

Work happens on `personal/*` branches, starting with `personal/optimization`.

`main` should remain close to the fork's integration branch. Upstream updates are fetched from
`upstream/main`, reviewed locally, and merged or cherry-picked only after checking conflicts and tests.

`upstream` is configured as a read-only reference by setting its push URL to `DISABLED`. Before any push,
commands should target `origin` explicitly.

Recommended push form:

```bash
git push origin personal/optimization
```

Avoid:

```bash
git push upstream ...
```

## Improvement Tracks

### Performance

Start with low-risk, measurable areas:

- Review request-id and access logging middleware for allocation and string processing overhead.
- Audit gateway failover and scheduler hot paths for repeated JSON parsing, decompression, and database calls.
- Prefer focused cache or batching improvements where tests can capture behavior.
- Add benchmarks only where a change claims latency, allocation, or throughput improvement.

### Security

Harden boundaries without changing expected product behavior:

- Keep upstream request IDs and custom headers sanitized.
- Review admin-only routes and compliance gates for consistent middleware coverage.
- Keep dependency updates aligned with existing CI and `pnpm-lock.yaml`.
- Make local/deploy examples avoid unsafe defaults when possible.

### Visual Polish

Improve workflow clarity in existing Vue components rather than redesigning the whole app:

- Keep admin pages dense, predictable, and operational.
- Improve empty, loading, error, and disabled states where current views feel brittle.
- Reuse existing common components before adding new design primitives.
- Verify important UI changes with tests and browser screenshots.

## Sync Workflow

1. Check clean worktree:

```bash
git status --short --branch
```

2. Fetch references:

```bash
git fetch origin
git fetch upstream
```

3. Compare:

```bash
git log --oneline --left-right --cherry-pick origin/main...upstream/main
git diff --stat origin/main..upstream/main
```

4. Update the fork intentionally:

```bash
git switch main
git merge upstream/main
```

5. Rebase or merge personal branches after reviewing conflicts:

```bash
git switch personal/optimization
git rebase main
```

6. Run verification appropriate to changed areas.

## Testing Strategy

Backend changes:

- Unit tests: `go test -tags=unit ./...`
- Integration tests when repository, migrations, database, Redis, or gateway behavior changes:
  `go test -tags=integration ./...`
- Lint before finalizing backend-heavy work: `golangci-lint run ./...`

Frontend changes:

- Typecheck: `pnpm --dir frontend run typecheck`
- Critical tests: use the root Makefile's `test-frontend-critical` target when available.
- Full build for production-impacting UI changes: `pnpm --dir frontend run build`

Documentation and workflow changes:

- Verify git remotes and branch state.
- No runtime test is required unless commands or scripts changed.

## First Implementation Plan

The first implementation should stay small and foundational:

1. Keep `upstream` push disabled.
2. Add this design document.
3. Update developer documentation so the local fork policy, current Go version, current golangci-lint
   version, pnpm usage, and no-upstream-push rule are explicit.
4. Create a follow-up implementation plan for the first concrete optimization track.

## Risks

- Upstream may move quickly, so personal changes should remain focused and well documented.
- Deep gateway or scheduler optimization can create subtle billing, failover, or account-selection regressions.
- Visual changes can accidentally reduce admin density or make repeated operational workflows slower.

Mitigation: keep changes small, verify with targeted tests, and make each commit explain which track it belongs to.
