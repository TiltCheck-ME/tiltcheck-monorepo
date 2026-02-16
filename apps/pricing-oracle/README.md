# Pricing Oracle Service

Simple in-memory USD pricing provider with Jupiter Price API integration for real-time Solana token prices.

## Features
- In-memory price map with configurable TTL
- Jupiter Price API integration for live token prices
- Getter/setter for token USD prices
- Bulk updates with batch Jupiter API calls
- Event publication on price changes (`price.updated`)
- Throws on missing token access (fail-fast)

## Usage
```typescript
import { pricingOracle, fetchJupiterPrice, fetchJupiterPrices } from '@tiltcheck/pricing-oracle';

// Get cached price
const solPrice = pricingOracle.getUsdPrice('SOL');

// Manually set prices
pricingOracle.setUsdPrice('SOL', 210);
pricingOracle.bulkSet({ USDC: 1, BONK: 0.0000019 });

// Refresh from Jupiter API
await pricingOracle.refreshFromJupiter('SOL');
await pricingOracle.refreshAllFromJupiter(['SOL', 'BONK', 'USDC']);

// Direct Jupiter API calls
const price = await fetchJupiterPrice('SOL');
const prices = await fetchJupiterPrices(['SOL', 'BONK']);
```

## Jupiter Price API

This service uses the [Jupiter Price API](https://price.jup.ag) for real-time Solana token prices.

**Endpoint:** `https://price.jup.ag/v4/price?ids={tokenSymbol}`

**Features:**
- No API key required
- Free to use
- Real-time aggregated prices
- Supports multiple tokens in a single request

## Configuration

No environment variables required. The service uses Jupiter's public API endpoint.

## Roadmap
- [x] Jupiter Price API integration
- [x] TTL-based staleness detection
- [x] Event publication on price changes
- [ ] External oracle integration (Pyth / Switchboard)
- [ ] Historical price snapshots for audit
