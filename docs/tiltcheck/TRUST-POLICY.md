# TiltCheck Trust & Testimonial Policy

TiltCheck does not fabricate social proof, endorsements, or user quotes.

## Principles
- **Authenticity Only:** Testimonials appear only after real users voluntarily submit feedback and explicitly consent to publication.
- **No Incentives:** We do not pay, reward, discount, or otherwise incentivize testimonials.
- **No AI Praise Fabrication:** AI is never used to generate or embellish user quotes.
- **Immediate Opt-Out:** Any published testimonial can be removed within 24h on request (Discord or email).
- **No Placeholder Quotes:** Empty slots on `/testimonials` are intentional; they communicate transparency instead of staged hype.
- **Source Channel:** All testimonial intake will occur in the Discord feedback/support channel (ID: `1441697360785834085`).

## Submission Flow (Planned)
1. User posts feedback in Discord #feedback or triggers `/support` command.
2. Maintainer reviews for authenticity & non-sensitive content.
3. User receives explicit consent prompt (future automation) before publication.
4. Entry stored with hash of Discord user ID + timestamp for audit integrity.
5. Page updated; schema enhancement (e.g., `Review` markup) only after minimum 5 authentic submissions.

## Anti-Abuse Safeguards
- Rate limiting ingestion (per Discord ID) to prevent spam praise flooding.
- Newsletter endpoints protected by Redis-backed rate limiter (5 requests per 10 minutes per IP).
- Automatic fallback to in-memory rate limiting when Redis is unavailable.
- Manual review ensures no doxxing or personal health claims.
- Automated profanity + scam filter prior to publish.

## Test Coverage
- Newsletter API: Subscribe/unsubscribe with honeypot detection, duplicate prevention, SHA-256 email hashing.
- Testimonials form: Disabled state verification, accessibility compliance, channel ID validation.
- Rate limiting: Request throttling, header validation, overflow protection.
- All tests located in `/tests/` directory with vitest framework.

## Removal / Opt-Out
Message in the Discord support channel or email `jmenichole.security@proton.me` with the testimonial reference. Removal is executed and confirmed.

## Alignment With Security Posture
This policy complements `SECURITY.md` by reducing trust attack vectors (fake endorsements, fabricated authority signals).

## JustTheTip Specific Notes
- JustTheTip channel ID: `1437295074856927363` is used only for tipping support and not for testimonial collection.
- No performance, win-rate, or earnings claims will ever be published as testimonials.

TiltCheck Ecosystem © 2024–2025
