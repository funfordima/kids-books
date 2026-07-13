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

Verify:

```powershell
& ".\.tools\bin\gh.exe" auth status
& ".\.tools\bin\gh.exe" project list
& ".\.tools\bin\gh.exe" issue list --repo funfordima/kids-books --limit 1
```

## Agent Rules

Agents must not:

- Run `gh auth login` during routine work.
- Run `gh auth logout` unless the user explicitly asks.
- Print `hosts.yml`.
- Print tokens or environment secrets.
- Depend on browser/device OAuth for normal operations.

If auth fails, Orchestrator stops the workflow before assigning implementation.
