# Security and Performance Audit

Date: 2026-07-18

## Executive Summary

The personal fork guardrails are active: work is on `personal/optimization`, `origin` points to
`MisakiSATA/sub2api`, and `upstream` push is `DISABLED`.

The strongest first security improvement is to reduce browser persistence of access and refresh tokens.
The current Vue client stores both token types in `localStorage`, which means any XSS path can extract long-lived
authentication material. The project already uses `withCredentials: true`, so a future migration toward backend-managed
HttpOnly refresh cookies is compatible with the existing API client shape.

The strongest first performance improvement candidate is to add micro-benchmarks around request ID sanitization and
request correlation middleware before changing the gateway hot path. This keeps performance changes measured and avoids
mixing them with the token-storage security work.

## Baseline Evidence

- Fork guard: `powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-personal-fork.ps1`
  reported `Personal fork guardrails OK`.
- Branch: `git status --short --branch` reported `## personal/optimization`.
- Go runtime on this machine: `go version go1.26.5 windows/amd64`.
- Repository requirement: `backend/go.mod` and CI require Go `1.26.4`; local Go is newer patch-compatible.
- `upstream` push URL: `DISABLED`.

## Security-Relevant Locations

- HTTP server hardening is centralized in `backend/internal/server/http.go`.
  - Trusted proxy handling: `backend/internal/server/http.go:48`
  - `ReadHeaderTimeout`: `backend/internal/server/http.go:107`
  - `IdleTimeout`: `backend/internal/server/http.go:109`
  - `MaxHeaderBytes`: `backend/internal/server/http.go:111`
  - Global body cap via `http.MaxBytesHandler`: `backend/internal/server/http.go:121`
  - `ReadTimeout` and `WriteTimeout` are intentionally omitted for large request bodies and streaming responses:
    `backend/internal/server/http.go:112`
- Security headers are centralized in `backend/internal/server/middleware/security_headers.go`.
  - CSP nonce generation uses `crypto/rand`: `backend/internal/server/middleware/security_headers.go:54`
  - `X-Frame-Options: DENY`: `backend/internal/server/middleware/security_headers.go:95`
  - CSP fallback can replace nonce with `'unsafe-inline'` if nonce generation fails:
    `backend/internal/server/middleware/security_headers.go:108`
- CORS is centralized in `backend/internal/server/middleware/cors.go`.
  - Wildcard origins are detected and credential mode is disabled when `*` is used:
    `backend/internal/server/middleware/cors.go:38`
  - Allowed origin echo and credential header handling:
    `backend/internal/server/middleware/cors.go:75`
- Admin authorization is centralized in `backend/internal/server/middleware/admin_only.go`.
- Request ID sanitization is centralized in:
  - `backend/internal/server/middleware/client_request_id.go:26`
  - `backend/internal/server/middleware/request_id_sanitize.go:7`
- Frontend token persistence is in:
  - `frontend/src/stores/auth.ts:104`
  - `frontend/src/stores/auth.ts:106`
  - `frontend/src/stores/auth.ts:289`
  - `frontend/src/stores/auth.ts:300`
  - `frontend/src/api/client.ts:59`
  - `frontend/src/api/client.ts:171`
  - `frontend/src/api/client.ts:221`
  - `frontend/src/api/client.ts:222`
- Frontend raw HTML rendering exists but most rich-content paths use DOMPurify:
  - Sanitized Markdown examples: `frontend/src/components/common/AnnouncementPopup.vue:105`,
    `frontend/src/components/common/AnnouncementBell.vue:348`
  - SVG sanitizer helper: `frontend/src/utils/sanitize.ts:3`
  - Admin-controlled custom home content intentionally uses raw HTML: `frontend/src/views/HomeView.vue:12`

## Performance-Relevant Locations

- Request correlation middleware creates request IDs and logger fields on every request:
  - `backend/internal/server/middleware/client_request_id.go:26`
  - `backend/internal/server/middleware/client_request_id.go:39`
  - `backend/internal/server/middleware/request_id_sanitize.go:13`
- Gateway, scheduler, cache, Redis, and failover code has broad existing coverage and should be optimized only after
  targeted evidence. High-signal areas from search include:
  - Scheduler and gateway settings in `backend/internal/config/config.go`
  - Scheduler snapshot service in `backend/internal/service/scheduler_snapshot_service.go`
  - Rate limit service in `backend/internal/service/ratelimit_service.go`
  - Gateway service in `backend/internal/service/gateway_service.go`
  - Web frontend HTML cache in `backend/internal/web/html_cache.go`

## Findings

### F-001: Refresh Tokens Persist in JavaScript-Accessible Storage

- Rule ID: VUE-AUTH-001 / JS-STORAGE-001
- Severity: High for an internal admin-heavy deployment
- Location:
  - `frontend/src/stores/auth.ts:106`
  - `frontend/src/stores/auth.ts:289`
  - `frontend/src/api/client.ts:171`
  - `frontend/src/api/client.ts:222`
- Evidence: the auth store and API client read and write `refresh_token` in `localStorage`.
- Impact: any successful XSS, malicious browser extension, or compromised same-origin script can steal refresh tokens
  and keep a session alive beyond the access-token lifetime.
- Fix: move refresh-token persistence out of `localStorage`. Prefer backend-issued HttpOnly refresh cookies while keeping
  access tokens in memory, or introduce a compatibility setting that disables persistent refresh tokens for internal mode.
- Mitigation: until the migration is complete, keep CSP enabled, avoid adding new `v-html` paths, and keep Markdown/HTML
  rendering behind DOMPurify or admin-only trust boundaries.
- False positive notes: this is a design-level risk rather than proof of an exploitable XSS path. It still raises the
  impact of any future frontend XSS.

### F-002: CSP Fallback Uses `unsafe-inline` When Nonce Generation Fails

- Rule ID: VUE-HEADERS-001 / JS-CSP-002
- Severity: Low
- Location: `backend/internal/server/middleware/security_headers.go:108`
- Evidence: on nonce generation failure, CSP replaces the nonce placeholder with `'unsafe-inline'`.
- Impact: if `crypto/rand` fails, the response receives a weaker CSP. This is unlikely but broadens script execution
  policy during an already unusual failure mode.
- Fix: for a later security hardening pass, consider omitting the nonce-bearing directive value or returning a fail-closed
  response for frontend document requests.
- Mitigation: `crypto/rand` failure is rare on supported platforms; keep this below token-storage work.

### F-003: Request ID Sanitizer Has No Benchmark Guard

- Rule ID: PERF-HOTPATH-001
- Severity: Low
- Location:
  - `backend/internal/server/middleware/client_request_id.go:26`
  - `backend/internal/server/middleware/request_id_sanitize.go:7`
- Evidence: request correlation runs for each request and does string trimming, ASCII filtering, UUID generation, and
  logger context creation. Existing tests cover behavior, but there is no benchmark protecting allocation changes.
- Impact: future hot-path changes can accidentally add allocations or slower string processing.
- Fix: add `BenchmarkSanitizeRequestID` and a middleware benchmark before changing the implementation.
- Mitigation: current code is simple and bounded to 128 bytes, so this should follow higher-value security work.

## Recommended First Change

Start with F-001: reduce refresh-token exposure in browser storage.

Scope the first runtime change to no more than three files:

- `frontend/src/stores/auth.ts`
- `frontend/src/api/client.ts`
- `frontend/src/stores/__tests__/auth.spec.ts` or `frontend/src/api/__tests__/client.spec.ts`

Recommended behavior for the first pass:

1. Add an auth storage helper that can keep `refresh_token` in memory when an internal security flag is enabled.
2. Keep compatibility defaults unchanged until backend HttpOnly refresh-cookie support is confirmed.
3. Add tests proving the secure mode does not write `refresh_token` to `localStorage` and still clears auth state.

Tests that should fail before implementation and pass after implementation:

- `pnpm --dir frontend exec vitest run src/stores/__tests__/auth.spec.ts`
- `pnpm --dir frontend exec vitest run src/api/__tests__/client.spec.ts`

After that, plan the backend cookie migration separately if the API supports setting HttpOnly cookies on login and refresh.

## Deferred Performance Change

After F-001 is complete, add benchmark coverage for request ID sanitization:

- Add benchmark file near `backend/internal/server/middleware/request_id_sanitize.go`.
- Run `go test -tags=unit ./internal/server/middleware -bench 'BenchmarkSanitizeRequestID|BenchmarkClientRequestID' -benchmem`.
- Only then consider replacing the sanitizer implementation or reducing logger field work.
