<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# RGaaS Sandbox Quickstart

Self-serve sandbox access exists so operators can stop waiting on manual key handouts and start testing the RGaaS surface immediately.

## Flow

1. Open `https://tiltcheck.me/operators`
2. Submit the sandbox signup form
3. Open the verification email link
4. Copy the issued `appId` and `secretKey`
5. Hit the sandbox smoke route
6. Log into `https://tiltcheck.me/operators/keys` to view quota and request production access

## Sandbox rules

- Mode defaults to `sandbox`
- Daily quota defaults to `1000` requests per rolling 24-hour window
- Sandbox responses are mocked
- No real trust-rollup writes happen from the sandbox smoke route
- Email verification is signed, single-use, and expires after 24 hours

## Base URLs

- Web: `https://tiltcheck.me`
- API: `https://api.tiltcheck.me`
- Local API example: `http://localhost:8080`

## 1) Submit sandbox signup

```bash
curl -X POST "http://localhost:8080/partner/register-sandbox" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  --data '{
    "email": "operator@example.com",
    "companyName": "Acme Casino",
    "casinoDomain": "acme.example",
    "intendedUseCase": "We want to test trust scores, breathalyzer interventions, and responsible gaming decisioning in a staging cashier flow.",
    "recaptchaToken": "dev-recaptcha-pass"
  }'
```

Expected response:

```json
{
  "success": true,
  "status": "pending_verification",
  "message": "Verification email sent. Open the link to activate sandbox keys.",
  "portalUrl": "https://tiltcheck.me/operators/keys"
}
```

In dev, if Resend is not configured, the verification link is logged by the API instead of being emailed.

## 2) Verify the email token

The verification page on web calls the API for you. If you need to test directly, use the token from the email link:

```bash
curl -X POST "http://localhost:8080/partner/verify-sandbox" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  --data '{
    "token": "paste-the-email-token-here"
  }'
```

Expected response shape:

```json
{
  "success": true,
  "partner": {
    "id": "partner-id",
    "name": "Acme Casino",
    "appId": "sandbox_acme-casino_deadbeef",
    "mode": "sandbox",
    "dailyQuotaLimit": 1000,
    "dailyQuotaUsed": 0,
    "secretKey": "sk_sandbox_..."
  }
}
```

## 3) Call the sandbox smoke route

```bash
curl "http://localhost:8080/partner/sandbox/mock" \
  -H "X-TiltCheck-App-Id: sandbox_acme-casino_deadbeef" \
  -H "X-TiltCheck-Secret-Key: sk_sandbox_replace_me"
```

Expected response:

```json
{
  "success": true,
  "mode": "sandbox",
  "appId": "sandbox_acme-casino_deadbeef",
  "quota": {
    "used": 1,
    "limit": 1000,
    "remaining": 999
  },
  "mock": {
    "trustScore": 612,
    "riskBand": "moderate",
    "intervention": "cooldown_recommended",
    "note": "Sandbox response only. No trust-rollup writes happened."
  }
}
```

The response also includes `X-Mode: sandbox`.

## 4) View issued keys in the operator portal

The portal is at `/operators/keys` and uses the existing web auth lanes:

- Magic email login for email-bound operators
- Discord login if the operator account is linked there

The authenticated user email must match the verified operator contact email.

## 5) Request production access

Production keys still stay behind manual review. The operator portal exposes a button that records the request and directs the operator to `partners@tiltcheck.me`.

## Three high-signal endpoints

### `POST /partner/register-sandbox`

- Public
- Throttled by IP: `10/hour`
- Throttled by email: `3/day`
- Requires `X-Requested-With`

### `POST /partner/verify-sandbox`

- Public
- Single-use token exchange
- Requires `X-Requested-With`

### `GET /partner/sandbox/mock`

- Partner-authenticated
- Requires `X-TiltCheck-App-Id`
- Requires `X-TiltCheck-Secret-Key`
- Returns sandbox-only mocked data

## Threat / validation notes

- User input is validated server-side with Zod before partner provisioning
- Secret keys are generated server-side and are never logged by the API route
- Verification tokens are signed and single-use via persisted `verification_token_jti` state
- Sandbox access stays isolated from production registration; `POST /partner/register` remains admin-only

## Rollback note

If the new operator flow regresses, disable traffic to the public signup page and keep using the admin-only `POST /partner/register` path for production partner issuance while rolling back the partner table column additions.
