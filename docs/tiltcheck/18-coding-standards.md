# TiltCheck Coding Standards & Conventions

## Core Principles
1. **Small Modules** – Each module owns a narrow responsibility and communicates only via Event Router.
2. **Non-Custodial** – Never store private keys or hold user funds.
3. **Deterministic Events** – Events published must be reproducible from inputs; avoid hidden random side-effects.
4. **No Deep Relative Imports** – Use workspace package names, not `../../../` paths.
5. **Fail Soft** – Handler errors are logged; do not crash the bus.

## TypeScript
- Enable `strict` everywhere (already enforced by root `tsconfig.json`).
- Prefer explicit return types on public functions.
- Use `unknown` for untrusted external inputs before narrowing.
- Use discriminated unions for multi-state objects instead of boolean flags.

## Naming
- Files: `kebab-case.ts`.
- Classes: `PascalCase` ending with `Module`, `Service`, or `Client`.
- Event types: `scope.action` (e.g. `tip.completed`, `link.scanned`).
- Package names: `@tiltcheck/<module>`.

## Event Usage
```typescript
// Subscribe
eventRouter.subscribe('link.scanned', handler, 'suslink');

// Publish
await eventRouter.publish('link.scanned', 'suslink', { url, riskLevel }, userId);
```
- Always set `source` correctly to the module id.
- Use concise data payloads; derive heavy analytics outside the event.

## Logging
Prefix all logs with module/service tag:
```typescript
console.log('[SusLink] Scanned', url);
```
Avoid spam: batch repetitive logs or use counts.

## Errors
- Catch and log; include context but never secrets.
- Wrap external calls (HTTP, RPC) with try/catch and fallback.

## Security & Safety
- Strip user-provided markdown before echoing content.
- Never trust URLs; validate with `isValidUrl` before scan/processing.
- Add TODO tags only with actionable next step.

## Testing (Vitest Plan)
- Unit tests live in `module/tests/*.test.ts`.
- Integration tests simulate events via Event Router.
- Avoid real network calls—use test doubles.

## Pull Request Guidelines
- One focused concern per PR.
- Include migration notes if moving code from legacy repo.
- Update `STATUS.md` for new modules or major changes.

## Anti-Patterns (Avoid)
| Pattern | Why Avoid |
|---------|-----------|
| Shared mutable state across modules | Breaks isolation & testability |
| Direct module imports for behavior | Defeats event-driven decoupling |
| Storing secrets in code | Security risk |
| Giant util files | Hard to reason; split by domain |
| Silent catch blocks | Masks failures |

## Example Module Skeleton
```typescript
export class ExampleModule {
  constructor() {
    eventRouter.subscribe('promo.submitted', this.onPromo.bind(this), 'example');
  }
  private async onPromo(event: TiltCheckEvent) {
    // validate
    // publish result
    await eventRouter.publish('promo.approved', 'example', { id: event.id }, event.userId);
  }
}
```

## Performance Notes
- Keep handler logic <10ms where possible.
- Offload heavy tasks to future worker/queue (placeholder).

## Documentation Expectations
Each module requires a README with:
- Purpose summary
- Events consumed
- Events emitted
- Primary data structures

---
**Evolves as platform grows; propose improvements via PR.**
