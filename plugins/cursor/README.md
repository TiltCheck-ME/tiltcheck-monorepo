<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 -->

# TiltCheck Cursor Plugins

Official Cursor plugin bundles for the TiltCheck monorepo. Packages rules, skills, agents, and commands for local install, team marketplaces, or [Cursor Marketplace](https://cursor.com/marketplace/publish) submission.

## Plugins

| Plugin | Contents |
| :--- | :--- |
| **tiltcheck-degen-laws** | Brand laws, core guardrails, API/auth and frontend/extension safety rules |
| **tiltcheck-monorepo-dev** | Dev skills (remediation, code review, PR hygiene) and service/test commands |
| **tiltcheck-agents** | Brand Law Enforcer, Verifier, Production Standards Auditor |

## Install locally (fast iteration)

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
mkdir -p ~/.cursor/plugins/local
ln -sf "$REPO_ROOT/plugins/cursor/degen-laws" ~/.cursor/plugins/local/tiltcheck-degen-laws
ln -sf "$REPO_ROOT/plugins/cursor/monorepo-dev" ~/.cursor/plugins/local/tiltcheck-monorepo-dev
ln -sf "$REPO_ROOT/plugins/cursor/tiltcheck-agents" ~/.cursor/plugins/local/tiltcheck-agents
```

Reload Cursor (`Developer: Reload Window`) and enable rules/skills in Settings.

## Team marketplace

Import this repository in **Dashboard -> Settings -> Plugins -> Team Marketplaces**. The root manifest is `.cursor-plugin/marketplace.json` with `pluginRoot: plugins/cursor`.

## Single-plugin test

Copy a plugin folder to `~/.cursor/plugins/local/<name>/` so `.cursor-plugin/plugin.json` sits at the plugin root.

## Publish

Submit the public repo at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). Each plugin needs valid manifests and frontmatter on all components (see [Plugins reference](https://cursor.com/docs/reference/plugins)).

Made for Degens. By Degens.
