# Pricing Oracle Service

Simple in-memory USD pricing provider used by modules (e.g. JustTheTip) to avoid hardcoded values.

## Features
- In-memory price map
- Getter/setter for token USD prices
- Bulk updates
- Throws on missing token access (fail-fast)

## Usage
```typescript
import { pricingOracle } from '@tiltcheck/pricing-oracle';

const solPrice = pricingOracle.getUsdPrice('SOL');
pricingOracle.setUsdPrice('SOL', 210);
pricingOracle.bulkSet({ USDC: 1, BONK: 0.0000019 });
```

## Roadmap
- External oracle integration (Pyth / Switchboard)
- Caching layer & TTL
- Historical price snapshots for audit
- Event publication on price changes (`price.updated`)

