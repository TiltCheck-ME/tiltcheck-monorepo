# SusLink - Link Scanner & Risk Detector

**AI-powered link scanning to protect degens from scams, phishing, and fake promos.**

SusLink is TiltCheck's first line of defense against malicious links. It scans URLs for suspicious patterns, domain reputation issues, casino impersonation, and scam keywords.

---

## Features

✅ **TLD Risk Detection** — Flags high-risk free domains (.tk, .ml, .xyz, etc.)  
✅ **Keyword Scanning** — Detects scam keywords (free-money, hack, etc.)  
✅ **Impersonation Detection** — Catches fake casino sites  
✅ **Subdomain Analysis** — Flags suspicious patterns  
✅ **URL Length Check** — Detects abnormally long URLs  
✅ **Event-Based** — Integrates seamlessly with Event Router  

---

## Risk Levels

| Level | Description | Action |
|-------|-------------|--------|
| `safe` | No suspicious patterns | ✅ Allow |
| `suspicious` | Minor red flags | ⚠️ Warn user |
| `high` | Multiple red flags | 🚨 Require mod approval |
| `critical` | Obvious scam/phishing | 🛑 Block or strong warning |

---

## How It Works

### Event-Driven Architecture

SusLink listens for events and publishes results:

```typescript
// Listens to:
- promo.submitted → Scans submitted promo links

// Publishes:
- link.scanned → Scan results for all subscribers
- link.flagged → High-risk links for mods/trust engines
```

### Scanning Checks

1. **TLD Check** — Is the domain using a risky extension?
2. **Keyword Check** — Does the URL contain scam keywords?
3. **Impersonation Check** — Is it mimicking a known casino?
4. **Length Check** — Is the URL suspiciously long?
5. **Subdomain Check** — Are there suspicious subdomains?

---

## Usage

### As Part of Event System

```typescript
import { eventRouter } from '@tiltcheck/event-router';

// SusLink automatically scans when promos are submitted
await eventRouter.publish(
  'promo.submitted',
  'freespinscan',
  {
    url: 'https://example.com/promo',
    userId: 'user123',
    bonusType: 'free_spins'
  },
  'user123'
);

// Subscribe to scan results
eventRouter.subscribe(
  'link.scanned',
  async (event) => {
    const { url, riskLevel, reason } = event.data;
    console.log(`${url} is ${riskLevel}: ${reason}`);
  },
  'my-module'
);
```

### Direct Usage (Testing/Manual)

```typescript
import { suslink } from '@tiltcheck/suslink';

// Full scan
const result = await suslink.scanUrl('https://scam-site.tk/phishing');
console.log(result);
// {
//   url: 'https://scam-site.tk/phishing',
//   riskLevel: 'critical',
//   reason: 'High-risk TLD: .tk; Suspicious keyword: "phishing"',
//   scannedAt: Date
// }

// Quick check (no events)
const quickRisk = suslink.quickCheck('https://stake.com');
console.log(quickRisk); // 'safe'
```

---

## Examples

### Safe Link

```typescript
await suslink.scanUrl('https://stake.com/promotions');
// Result:
// {
//   url: 'https://stake.com/promotions',
//   riskLevel: 'safe',
//   reason: 'No suspicious patterns detected',
//   scannedAt: Date
// }
```

### Suspicious Link

```typescript
await suslink.scanUrl('https://stakee-bonus.xyz/claim-now');
// Result:
// {
//   url: 'https://stakee-bonus.xyz/claim-now',
//   riskLevel: 'high',
//   reason: 'High-risk TLD: .xyz; Possible impersonation of stake.com; Suspicious keyword: "claim-now"',
//   scannedAt: Date
// }
```

### Critical Link

```typescript
await suslink.scanUrl('https://free-money-generator.tk/unlimited');
// Result:
// {
//   url: 'https://free-money-generator.tk/unlimited',
//   riskLevel: 'critical',
//   reason: 'High-risk TLD: .tk; Suspicious keyword: "free-money"; Suspicious keyword: "generator"; Suspicious keyword: "unlimited"',
//   scannedAt: Date
// }
```

---

## Integration with Other Modules

### FreeSpinScan
SusLink automatically scans all submitted promos:

```typescript
// User submits promo
await eventRouter.publish('promo.submitted', 'freespinscan', { url: '...' });

// SusLink scans it
// → Publishes 'link.scanned'
// → If risky, publishes 'link.flagged'

// FreeSpinScan uses result to decide approval
```

### Casino Trust Engine
Flagged links affect casino trust scores:

```typescript
eventRouter.subscribe('link.flagged', async (event) => {
  const { url, riskLevel } = event.data;
  const casino = extractCasino(url);
  
  if (casino) {
    await updateCasinoTrust(casino, -10, 'Flagged risky link');
  }
}, 'trust-engine-casino');
```

---

## Detection Patterns

### High-Risk TLDs
`.tk`, `.ml`, `.ga`, `.cf`, `.gq`, `.xyz`, `.top`, `.win`, `.bid`, `.download`, `.review`, `.science`

### Scam Keywords
`free-money`, `guaranteed-win`, `hack`, `generator`, `unlimited`, `claim-now`, `verify-account`, `update-payment`, `suspended`, `action-required`

### Known Casinos (for impersonation detection)
`stake.com`, `rollbit.com`, `duelbits.com`, `bc.game`, `roobet.com`, `shuffle.com`

### Suspicious Subdomains
`login`, `verify`, `secure`, `account`, `update`

---

## Future Enhancements

- [ ] Fetch-based redirect chain following
- [ ] Domain age checking via WHOIS
- [ ] SSL certificate validation
- [ ] Blacklist integration (PhishTank, Google Safe Browsing)
- [ ] Machine learning pattern detection
- [ ] Screenshot analysis for visual impersonation
- [ ] User-submitted link feedback loop

---

## Testing

```bash
# Run dev mode
npx pnpm --filter @tiltcheck/suslink dev

# Build
npx pnpm --filter @tiltcheck/suslink build

# Test manually
node -e "import('./dist/index.js').then(m => m.suslink.scanUrl('https://example.com'))"
```

---

## Philosophy

**SusLink doesn't block — it informs.**

Users get the information they need to make smart decisions. Mods get clear risk signals. Trust engines get data to score casinos.

No moral judgments. No paternalism. Just facts.

---

**Built by a degen, for degens. Stay safe out there. 🔗**
