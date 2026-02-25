/**
 * Environment Variable Validator
 * Checks if all required environment variables are set in .env
 * 
 * Usage: npx tsx scripts/validate-env.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from root
const rootDir = process.cwd();
const envPath = path.resolve(rootDir, '.env');

console.log(`🔍 Validating environment variables from: ${envPath}`);

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found! Please copy .env.template to .env and configure it.');
  process.exit(1);
}

// Load .env file
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
}

// Define required variables by category
const requiredVars = {
  'Core Configuration': [
    'NODE_ENV',
    'PORT'
  ],
  'Database (Supabase)': [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ],
  'Security': [
    'JWT_SECRET',
    'SESSION_SECRET'
  ]
};

// Optional/Conditional variables
const conditionalVars = [
  {
    name: 'Discord Bot Token',
    check: () => !!(process.env.TILT_DISCORD_TOKEN || process.env.TIP_DISCORD_TOKEN || process.env.DISCORD_TOKEN),
    message: 'At least one of TILT_DISCORD_TOKEN, TIP_DISCORD_TOKEN, or DISCORD_TOKEN must be set.'
  },
  {
    name: 'Discord Client ID',
    check: () => !!(process.env.TILT_DISCORD_CLIENT_ID || process.env.TIP_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID),
    message: 'At least one of TILT_DISCORD_CLIENT_ID, TIP_DISCORD_CLIENT_ID, or DISCORD_CLIENT_ID must be set.'
  }
];

let hasError = false;

// Check required variables
for (const [category, vars] of Object.entries(requiredVars)) {
  console.log(`\nChecking ${category}...`);
  for (const v of vars) {
    if (!process.env[v]) {
      console.error(`  ❌ Missing: ${v}`);
      hasError = true;
    } else {
      console.log(`  ✅ ${v}`);
    }
  }
}

// Check conditional variables
console.log('\nChecking Conditional Variables...');
for (const cond of conditionalVars) {
  if (!cond.check()) {
    console.error(`  ❌ Missing: ${cond.name} - ${cond.message}`);
    hasError = true;
  } else {
    console.log(`  ✅ ${cond.name}`);
  }
}

console.log('\n-----------------------------------');

if (hasError) {
  console.log('\n🔍 Debug: Found these related variables in .env:');
  const relatedKeys = Object.keys(process.env).filter(k => 
    k.includes('DISCORD') || k.includes('TOKEN') || k.includes('TILT') || k.includes('TIP')
  );
  if (relatedKeys.length > 0) {
    relatedKeys.forEach(k => {
      const val = process.env[k];
      // Check if value exists and is not just whitespace
      const status = val && val.trim().length > 0 ? `✅ Set (Length: ${val.length})` : '❌ Empty';
      console.log(`   - ${k}: ${status}`);
    });
  } else {
    console.log('   (No related variables found)');
  }
  console.error('❌ Validation failed. Please update your .env file with the missing variables.');
  process.exit(1);
} else {
  console.log('✅ Environment validation passed!');
  process.exit(0);
}