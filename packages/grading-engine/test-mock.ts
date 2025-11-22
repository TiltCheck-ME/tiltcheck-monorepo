#!/usr/bin/env node
/**
 * Test mock data generator with grading engine
 */

import { generateMockCasinoData } from './dist/utils/mock-data-generator.js';
import { gradeEngine } from './dist/index.js';

console.log('🧪 Testing Mock Data Generator\n');

const scenarios = ['fair', 'rigged', 'shady', 'excellent'] as const;

for (const scenario of scenarios) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scenario: ${scenario.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const data = generateMockCasinoData(scenario);
  console.log(`Generated ${data.spins.length} spins`);
  
  const result = gradeEngine(data);
  
  console.log(`\n📊 Composite Score: ${result.compositeScore}/100`);
  console.log('\n📋 Category Scores:');
  console.log(`  RNG Integrity:          ${result.categories.rngIntegrity.score}/100`);
  console.log(`  RTP Transparency:       ${result.categories.rtpTransparency.score}/100`);
  console.log(`  Volatility Consistency: ${result.categories.volatilityConsistency.score}/100`);
  console.log(`  Session Behavior:       ${result.categories.sessionBehavior.score}/100`);
  console.log(`  Transparency & Ethics:  ${result.categories.transparencyEthics.score}/100`);
  
  console.log(`\n💡 Key Rationale:`);
  for (const [category, data] of Object.entries(result.categories)) {
    if (data.rationale.length > 0) {
      console.log(`  ${category}: ${data.rationale[0]}`);
    }
  }
}

console.log(`\n\n✅ Mock data generator test complete!`);
console.log('This unlocks full grading engine testing without on-chain data.\n');
