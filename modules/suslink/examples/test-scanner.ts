/**
 * SusLink Example: Testing Link Scanner
 * 
 * Run with: npx tsx modules/suslink/examples/test-scanner.ts
 */

import { suslink } from '../src/index.js';

const testUrls = [
  // Safe links
  'https://stake.com/promotions',
  'https://rollbit.com/bonus',
  'https://bc.game/free-spins',

  // Suspicious links
  'https://stake-bonus.xyz/claim',
  'https://rollbit.online/free-money',
  
  // High risk links
  'https://stakee-promo.tk/unlimited-coins',
  'https://verify.stake-account.com/login',
  
  // Critical links
  'https://free-money-hack.ml/generator/download',
  'https://stake.com.phishing.tk/verify-account',
];

async function runTests() {
  console.log('='.repeat(70));
  console.log('SusLink Scanner Tests');
  console.log('='.repeat(70));
  console.log('');

  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    
    const result = await suslink.scanUrl(url);
    
    const emoji = {
      safe: '✅',
      suspicious: '⚠️ ',
      high: '🚨',
      critical: '🛑',
    }[result.riskLevel];

    console.log(`  ${emoji} Risk: ${result.riskLevel.toUpperCase()}`);
    console.log(`  Reason: ${result.reason}`);
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('Tests Complete');
  console.log('='.repeat(70));
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
