# Agent GitHub Access

Agents need reliable, non-interactive GitHub access for issues, pull requests, branches, and GitHub Projects.

## Preferred Authentication

Use a dedicated GitHub token for the agent system.

Recommended permissions:

- Repository contents: read/write for `funfordima/kids-books`
- Issues: read/write
- Pull requests: read/write
- Projects: read/write

For a classic personal access token, use scopes:

- `repo`
- `project`
- `read:org`

## Authenticate GitHub CLI With A Token

Run this locally. Do not paste tokens into chat.

```powershell
cd D:\projects\ai\kids-books

$secure = Read-Host "Paste GitHub token" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $token | & ".\.tools\bin\gh.exe" auth login --hostname github.com --with-token
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Variable token -ErrorAction SilentlyContinue
}
```

Verify from the active worktree. If `.tools\bin\gh.exe` is missing because the current checkout is a sibling worktree, use the bundled CLI from the primary worktree, for example `D:\projects\ai\kids-books\.tools\bin\gh.exe`.

Do not fall back to PATH-only `gh` checks until the bundled CLI path has been searched.

Verify:

```powershell
$gh = ".\.tools\bin\gh.exe"
if (-not (Test-Path $gh)) {
  $gh = "D:\projects\ai\kids-books\.tools\bin\gh.exe"
}

& $gh auth status
& $gh project list
& $gh issue list --repo funfordima/kids-books --limit 1
& $gh project field-list 1 --owner funfordima --format json
```

## Agent Rules

Agents must not:

- Run `gh auth login` during routine work.
- Run `gh auth logout` unless the user explicitly asks.
- Print `hosts.yml`.
- Print tokens or environment secrets.
- Depend on browser/device OAuth for normal operations.

If auth fails, Orchestrator stops the workflow before assigning implementation.

## Board / PR Gate

Before code work starts or a PR is reported to the user, agents must verify:

- the parent issue and role subtasks are present on `DarkFactory SDLC`;
- actual Project Status options have been read from the board;
- required status transitions were applied using real board options;
- the PR was added to the board or a permission blocker is recorded;
- the PR body references the parent issue and canonical role subtasks.
