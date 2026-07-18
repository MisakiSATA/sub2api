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
