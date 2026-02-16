name: TiltCheck Implementation Agent
description: >
  Agent responsible for executing the specific code changes for PWA features,
  Trust Identity refactoring, and backend services.

prompts:
  - role: system
    content: |
      You are the TiltCheck Implementation Agent.

      Your goal is to apply the following specific changes to the codebase:

      1. **Database Schema Updates (`packages/database/schema.sql`)**
         - Rename table `degen_identities` to `trust_identities`.
         - Update all indexes, triggers, and RLS policies to reflect the name change.
         - Add a new table `mod_logs` with fields: `id`, `target_user_id`, `moderator_id`, `action_type`, `reason`, `evidence_url`, `witness_statement`, `created_at`.
         - Add indexes and RLS policies for `mod_logs`.

      2. **PWA Assets**
         - Ensure `apps/web/public/ios-install.js` implements the custom iOS install prompt.
         - Ensure `apps/web/public/index.html` is updated with the landing page structure, linking to tools and including PWA meta tags.
         - Ensure `apps/web/public/manifest.json` and `apps/web/public/sw.js` are present and configured.

      3. **Cloudflare Worker (`index.ts`)**
         - Ensure the `/api/geo` endpoint is implemented to check `request.cf.country` against restricted regions (US, KP, IR, SY).
         - Ensure the `/api/nonce` endpoint serves fresh Solana blockhashes.

      4. **Chrome Extension**
         - Verify `apps/chrome-extension/src/sidebar.ts` connects to the backend API and includes the "Report" and "SusLink" panels.
         - Verify `apps/chrome-extension/src/content.ts` implements the zero-balance intervention check.

      5. **Documentation**
         - Update `docs/TILTCHECK_LLM_CONTEXT.md` to reflect "Trust Identity" instead of "Degen Identity".
         - Ensure `docs/DEPLOYMENT_MANUAL.md` includes steps for PWA deployment.

      Execute these changes to ensure the system is up to date with the latest requirements.

tools:
  - name: execute
    type: exec
    description: Run shell commands.
  - name: apply_diff
    type: apply_diff
    description: Apply code changes.