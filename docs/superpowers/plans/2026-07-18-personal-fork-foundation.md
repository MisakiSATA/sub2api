# Personal Fork Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish durable personal-fork guardrails and documentation so security and performance work can proceed without pushing to upstream or drifting from the repo's current toolchain.

**Architecture:** Keep the upstream protection in git remote configuration, add a tracked PowerShell verifier under `tools/`, and update `DEV_GUIDE.md` as the operator-facing source of truth. This plan does not change gateway, scheduler, billing, or frontend runtime behavior.

**Tech Stack:** Git, PowerShell 5+, Go 1.26.4, golangci-lint v2.9, Node.js 20, pnpm 9, Vue 3, Gin, Ent.

## Global Constraints

- Personal changes must be saved to `origin` and must not be submitted or pushed to `upstream`.
- `upstream` fetch URL must remain `https://github.com/Wei-Shaw/sub2api.git`.
- `upstream` push URL must remain `DISABLED`.
- Work happens on `personal/*` branches, starting with `personal/optimization`.
- The personal version is primarily for internal use and prioritizes performance and security.
- Do not introduce new services or dependencies.
- Do not mix unrelated performance and security changes in one commit.
- Documentation and workflow changes require git remote and branch verification.

---

## File Structure

- `tools/check-personal-fork.ps1`: new repository-local verifier for remote URLs, branch naming, and upstream push protection. It is intentionally read-only and exits non-zero when the fork guardrails are broken.
- `DEV_GUIDE.md`: update stale repository metadata, Go/golangci-lint versions, and git workflow commands so future work targets `origin` and treats `upstream` as read-only.
- `docs/superpowers/plans/2026-07-18-personal-fork-foundation.md`: this implementation plan. It is committed with `git add -f` because `docs/*` is ignored by this repository.

---

### Task 1: Add Personal Fork Guard Verifier

**Files:**
- Create: `tools/check-personal-fork.ps1`

**Interfaces:**
- Consumes: local git remote configuration and current branch from `git`.
- Produces: a command-line verifier with signature `.\tools\check-personal-fork.ps1 [-Json]`.
- Exit code `0`: guardrails are correct.
- Exit code `1`: one or more guardrails are broken.

- [ ] **Step 1: Run the verifier before it exists**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-personal-fork.ps1 -Json
```

Expected: FAIL with a message containing `The argument 'tools\check-personal-fork.ps1' to the -File parameter does not exist`.

- [ ] **Step 2: Create the verifier**

Create `tools/check-personal-fork.ps1` with this complete content:

```powershell
[CmdletBinding()]
param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Invoke-GitValue {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = & git @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return ""
    }

    return (($output -join "`n").Trim())
}

function Add-Failure {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.Generic.List[string]]$Failures,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    [void]$Failures.Add($Message)
}

$originFetch = Invoke-GitValue @("remote", "get-url", "origin")
$originPush = Invoke-GitValue @("remote", "get-url", "--push", "origin")
$upstreamFetch = Invoke-GitValue @("remote", "get-url", "upstream")
$upstreamPush = Invoke-GitValue @("remote", "get-url", "--push", "upstream")
$branch = Invoke-GitValue @("branch", "--show-current")

$failures = [System.Collections.Generic.List[string]]::new()

if ($originFetch -ne "https://github.com/MisakiSATA/sub2api.git") {
    Add-Failure $failures "origin fetch URL must be https://github.com/MisakiSATA/sub2api.git; got '$originFetch'"
}

if ($originPush -ne "https://github.com/MisakiSATA/sub2api.git") {
    Add-Failure $failures "origin push URL must be https://github.com/MisakiSATA/sub2api.git; got '$originPush'"
}

if ($upstreamFetch -ne "https://github.com/Wei-Shaw/sub2api.git") {
    Add-Failure $failures "upstream fetch URL must be https://github.com/Wei-Shaw/sub2api.git; got '$upstreamFetch'"
}

if ($upstreamPush -ne "DISABLED") {
    Add-Failure $failures "upstream push URL must be DISABLED; got '$upstreamPush'"
}

if ($branch -ne "main" -and $branch -notlike "personal/*") {
    Add-Failure $failures "current branch must be main or personal/*; got '$branch'"
}

$result = [ordered]@{
    ok = ($failures.Count -eq 0)
    branch = $branch
    originFetch = $originFetch
    originPush = $originPush
    upstreamFetch = $upstreamFetch
    upstreamPush = $upstreamPush
    failures = @($failures)
}

if ($Json) {
    $result | ConvertTo-Json -Depth 4
} elseif ($failures.Count -eq 0) {
    Write-Host "Personal fork guardrails OK"
    Write-Host "Branch: $branch"
    Write-Host "origin push: $originPush"
    Write-Host "upstream push: $upstreamPush"
} else {
    Write-Error ("Personal fork guardrails failed:`n- " + (($failures.ToArray()) -join "`n- "))
}

if ($failures.Count -gt 0) {
    exit 1
}
```

- [ ] **Step 3: Run the verifier**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-personal-fork.ps1 -Json
```

Expected: PASS with JSON containing:

```json
"ok": true
```

and:

```json
"upstreamPush": "DISABLED"
```

- [ ] **Step 4: Confirm no runtime files changed**

Run:

```powershell
git diff --name-only
```

Expected: output contains only:

```text
tools/check-personal-fork.ps1
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add tools\check-personal-fork.ps1
git commit -m "chore: add personal fork guard check"
```

Expected: PASS with a commit that creates `tools/check-personal-fork.ps1`.

---

### Task 2: Update Developer Guide for Personal Fork Workflow

**Files:**
- Modify: `DEV_GUIDE.md`

**Interfaces:**
- Consumes: verifier from Task 1, current CI config, and `backend/go.mod`.
- Produces: operator documentation that names the correct fork, tool versions, branch policy, upstream push protection, and explicit `origin` push commands.

- [ ] **Step 1: Verify stale guide values are present**

Run:

```powershell
rg -n "bayma888|1\.25\.7|v2\.7|git push origin main|git rebase upstream/main" DEV_GUIDE.md
```

Expected: PASS with matches for the stale fork name, Go version, golangci-lint version, and old git workflow.

- [ ] **Step 2: Update the project information table**

Modify the first table in `DEV_GUIDE.md` so these rows appear exactly:

```markdown
| **上游仓库** | Wei-Shaw/sub2api（只读参考，不提交 PR，不 push） |
| **个人 Fork 仓库** | MisakiSATA/sub2api |
| **当前个人分支** | personal/optimization |
| **个人优化目标** | 安全 + 性能（对内使用，不追求 UI 美化） |
| **技术栈** | Go 后端 (Ent ORM + Gin) + Vue3 前端 (pnpm) |
| **数据库** | PostgreSQL 16 + Redis |
| **包管理** | 后端: go modules, 前端: **pnpm**（不是 npm） |
```

- [ ] **Step 3: Update development tool versions**

Replace the development tools code block in `DEV_GUIDE.md` with:

````markdown
```bash
# Go 1.26.4（与 backend/go.mod 和 CI 保持一致）
go version

# golangci-lint v2.9（与 .github/workflows/backend-ci.yml 保持一致）
go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.9

# pnpm 9 + Node.js 20（与 CI 保持一致）
node --version
pnpm --version
```
````

- [ ] **Step 4: Update CI version references**

Change the `backend-ci.yml` row in the GitHub Actions table to:

```markdown
| **backend-ci.yml** | push, pull_request | 单元测试 + 集成测试 + golangci-lint v2.9 |
```

Change the CI requirements list to:

```markdown
- Go 版本必须是 **1.26.4**
- golangci-lint 使用 **v2.9**
- 前端使用 `pnpm install --frozen-lockfile`，必须提交 `pnpm-lock.yaml`
```

- [ ] **Step 5: Replace git operations with personal fork workflow**

Replace the entire `### Git 操作` code block with:

````markdown
### Git 操作

```bash
# 查看当前保护状态
git remote -v
powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-personal-fork.ps1

# 确保 upstream 只读
git remote set-url --push upstream DISABLED

# 同步上游到本地 main（不 push upstream）
git fetch upstream
git switch main
git merge upstream/main

# 回到个人优化分支
git switch personal/optimization
git rebase main

# 只推送到自己的 fork
git push origin personal/optimization
```
````

- [ ] **Step 6: Add a fork safety pitfall**

Insert this section before `### 坑 11：PR 提交前检查清单`:

````markdown
### 坑 11：误推到上游仓库

**问题**：本项目只做个人 fork 修改，不希望把个人代码推到 `Wei-Shaw/sub2api`。

**保护**：
```bash
git remote set-url --push upstream DISABLED
powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-personal-fork.ps1
```

**提交原则**：
- `upstream` 只用于 `fetch` 和本地比较；
- 个人代码只推送到 `origin`；
- 推送时显式写出远程名，例如 `git push origin personal/optimization`。
```
````

Then rename the existing heading `### 坑 11：PR 提交前检查清单` to:

```markdown
### 坑 12：提交前检查清单
```

- [ ] **Step 7: Verify stale values are gone**

Run:

```powershell
rg -n "bayma888|1\.25\.7|v2\.7|git push origin main|git rebase upstream/main|UI 美化" DEV_GUIDE.md
```

Expected: FAIL with no output, because none of those stale or out-of-scope phrases should remain.

- [ ] **Step 8: Verify required values are present**

Run:

```powershell
rg -n "MisakiSATA/sub2api|Go 版本必须是 \\*\\*1\\.26\\.4\\*\\*|golangci-lint 使用 \\*\\*v2\\.9\\*\\*|git remote set-url --push upstream DISABLED|git push origin personal/optimization|安全 \\+ 性能" DEV_GUIDE.md
```

Expected: PASS with at least six matches.

- [ ] **Step 9: Verify fork guard still passes**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-personal-fork.ps1
```

Expected: PASS with output containing:

```text
Personal fork guardrails OK
```

- [ ] **Step 10: Commit**

Run:

```powershell
git add DEV_GUIDE.md
git commit -m "docs: document personal fork workflow"
```

Expected: PASS with a commit that modifies only `DEV_GUIDE.md`.

---

### Task 3: Create the First Security and Performance Audit Plan

**Files:**
- Create: `docs/superpowers/plans/2026-07-18-security-performance-audit.md`

**Interfaces:**
- Consumes: fork guard verifier from Task 1 and updated workflow documentation from Task 2.
- Produces: a follow-up implementation plan that audits current security and performance hotspots before changing gateway or scheduler behavior.

- [ ] **Step 1: Verify the audit plan does not exist**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-07-18-security-performance-audit.md
```

Expected: PASS with:

```text
False
```

- [ ] **Step 2: Create the audit plan**

Create `docs/superpowers/plans/2026-07-18-security-performance-audit.md` with this complete content:

```markdown
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
- [ ] Run `rg -n "json\\.Marshal|json\\.Unmarshal|gjson|sjson|decompress|gzip|zstd|scheduler|failover|cache|hotpath|redis|pipeline" backend/internal` and summarize performance-relevant hot path locations.
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
```

- [ ] **Step 3: Verify the audit plan keeps the agreed scope**

Run:

```powershell
rg -n "security|performance|Do not push to upstream|Prioritize security and performance only" docs\superpowers\plans\2026-07-18-security-performance-audit.md
```

Expected: PASS with matches for the audit scope and constraints.

- [ ] **Step 4: Verify the audit plan is present despite docs ignore rules**

Run:

```powershell
git check-ignore -v docs\superpowers\plans\2026-07-18-security-performance-audit.md
```

Expected: PASS with output containing:

```text
docs/*
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add -f docs\superpowers\plans\2026-07-18-security-performance-audit.md
git commit -m "docs: plan security performance audit"
```

Expected: PASS with a commit that creates `docs/superpowers/plans/2026-07-18-security-performance-audit.md`.

---

## Final Verification

- [ ] Run:

```powershell
git status --short --branch
```

Expected: PASS with:

```text
## personal/optimization
```

- [ ] Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-personal-fork.ps1 -Json
```

Expected: PASS with JSON containing `"ok": true`.

- [ ] Run:

```powershell
git remote -v
```

Expected: PASS with:

```text
upstream	DISABLED (push)
```

- [ ] Run:

```powershell
git log --oneline -6 --decorate
```

Expected: PASS with the latest commits for the guard script, developer guide update, and audit plan on `personal/optimization`.
