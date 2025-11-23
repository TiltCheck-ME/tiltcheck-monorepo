# Upstream Vulnerability Tracking: bigint-buffer via @solana/spl-token

**Advisory:** GHSA-3gc7-fjrx-p6mg
**Transitive Path:** @solana/spl-token@0.4.14 → @solana/buffer-layout-utils@0.2.0 → bigint-buffer@1.1.5

## Summary
`bigint-buffer@1.1.5` contains a potential buffer overflow in `toBigIntLE()` allowing malformed input buffers to be converted without bounds checks. While TiltCheck does not directly call `bigint-buffer`, the Solana SPL Token library depends on it for internal layout conversions.

## Current TiltCheck Usage
- Indirect usage only through high-level SPL Token calls (no direct buffer mutation present in repository).
- External user input limited to Base58 Solana addresses; no raw arbitrary buffers passed into token layout APIs.

## Mitigations Implemented
1. Added strict Base58 + length validation for Solana addresses prior to constructing `PublicKey` objects.
2. Ensured no direct BigInt conversions on user-controlled buffers.
3. Monitoring upstream releases for patched dependency chain.

## Desired Upstream Action
- Release a patched version of `@solana/buffer-layout-utils` (or remove dependency) after updating `bigint-buffer` with length checks.
- Propagate patch through new `@solana/spl-token` release.

## Reproduction (Conceptual)
```js
// Illustrative only – not executed in TiltCheck code
import { toBigIntLE } from 'bigint-buffer';
const unsafe = Buffer.alloc(4); // smaller than expected
unsafe.writeUInt32LE(0xFFFFFFFF,0);
const val = toBigIntLE(unsafe); // Should enforce size constraints
```

## References
- Advisory: https://github.com/advisories/GHSA-3gc7-fjrx-p6mg

## Tracking
- Added to SECURITY.md vulnerability table.
- CI audit confirms presence until upstream fix.

Please advise on planned remediation timeline or interim guidance.
