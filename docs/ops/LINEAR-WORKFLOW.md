# Linear Workflow (Solo Ops)

This setup gives you one command to keep your migration tasks in Linear without managing tasks manually.

## 1) Set environment variables

Add these to your local `.env` (or your shell profile):

- `LINEAR_API_KEY` - personal API key from Linear settings
- `LINEAR_TEAM_KEY` - short team key (for example `ENG`)
- `LINEAR_PROJECT_ID` (optional) - target project for created issues

Reference template values in `.env.example`.

## 2) Edit your task source

Update:

- `docs/ops/linear-tasks.json`

Each task needs:

- `key` (unique)
- `title`
- `description`
- `priority` (0-4)

## 3) Dry run first

```powershell
node scripts/linear-sync.mjs --dry-run
```

Dry run validates env + task file and shows what would be created.

## 4) Create issues

```powershell
node scripts/linear-sync.mjs
```

Behavior:

- Creates a new issue when no matching marker exists.
- Skips issue creation when it finds an existing issue for that task key/title.
- Adds marker in description: `[tc-task:<key>]` to avoid duplicates.

## 5) Use daily guide command

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/daily-ops.ps1 -SyncLinear
```

Optional flags:

- `-LinearDryRun` (default: on)

To create real Linear issues in the daily script:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/daily-ops.ps1 -SyncLinear -LinearDryRun:$false
```

## Notes

- Keep one active branch and one active milestone slice.
- Update `docs/ops/linear-tasks.json` before session end so tomorrow starts clear.
