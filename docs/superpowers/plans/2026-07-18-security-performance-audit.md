# Security and Performance Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify the first low-risk security and performance changes for the internal Sub2API fork using repository evidence before modifying runtime behavior.

**Architecture:** Run read-only inspections against middleware, gateway, scheduler, dependency, and frontend entry points. Save findings as a short tracked report with recommended next commits.

**Tech Stack:** Git, PowerShell, Go 1.26.4, golangci-lint v2.9, pnpm 9, Vue 3, Gin, Ent.

## Global Constraints

- Do not push to upstream.
- Do not change runtime behavior during the audit.
- Prioritize security and performance only.
- Prefer measured or testable changes over broad rewrites.

---

### Task 1: Collect Baseline Evidence

**Files:**
- Create: `docs/superpowers/reports/2026-07-18-security-performance-audit.md`

**Steps:**
- [ ] Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-personal-fork.ps1` and record whether the guard passes.
- [ ] Run `go version` and record the exact version.
- [ ] Run `git status --short --branch` and record the branch.
- [ ] Run `rg -n "SetTrustedProxies|TrustedProxies|CORS|AllowOrigins|request_id|X-Request|sanitize|AdminOnly|RequireAdmin|rate limit|RateLimit" backend/internal` and summarize security-relevant middleware and handler locations.
- [ ] Run `rg -n "json\.Marshal|json\.Unmarshal|gjson|sjson|decompress|gzip|zstd|scheduler|failover|cache|hotpath|redis|pipeline" backend/internal` and summarize performance-relevant hot path locations.
- [ ] Run `rg -n "axios|interceptor|localStorage|sessionStorage|innerHTML|v-html|DOMPurify|marked" frontend/src` and summarize frontend security/performance locations.
- [ ] Commit the report with `git add -f docs/superpowers/reports/2026-07-18-security-performance-audit.md && git commit -m "docs: audit security and performance baseline"`.

### Task 2: Pick the First Runtime Change

**Files:**
- Modify: `docs/superpowers/reports/2026-07-18-security-performance-audit.md`

**Steps:**
- [ ] Add a `Recommended First Change` section to the report.
- [ ] Choose one security or performance change that touches no more than three runtime files.
- [ ] Name the exact tests or benchmarks that should fail before implementation and pass after implementation.
- [ ] Commit the recommendation with `git add -f docs/superpowers/reports/2026-07-18-security-performance-audit.md && git commit -m "docs: recommend first security performance change"`.
