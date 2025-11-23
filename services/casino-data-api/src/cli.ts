#!/usr/bin/env node
/**
 * TiltCheck Casino Data Collection CLI
 * 
 * Command-line tool for AI agents to submit casino data to TiltCheck.
 * Usage: npx @tiltcheck/casino-collector --casino-id stakeus --name "Stake US"
 */

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.TILTCHECK_API_URL || 'https://tiltcheck.it.com/casino-api';
const API_KEY = process.env.TILTCHECK_API_KEY || 'tiltcheck-casino-collector-2024';

interface CasinoSubmission {
  id: string;
  name: string;
  baseURL: string;
  basicInfo?: {
    licenseNumber?: string;
    regulator?: string;
    founded?: string;
    headquarters?: string;
    operator?: string;
    status: 'live' | 'suspended' | 'investigating';
  };
  [key: string]: any;
}

interface ApiResponse {
  success?: boolean;
  casinoId?: string;
  timestamp?: string;
  updated?: number;
  errors?: any[];
  count?: number;
  casinos?: any[];
  message?: string;
}

program
  .name('casino-collector')
  .description('TiltCheck Casino Data Collection CLI')
  .version('1.0.0');

program
  .command('submit')
  .description('Submit casino data from JSON file or command line')
  .requiredOption('--casino-id <id>', 'Casino identifier')
  .requiredOption('--name <name>', 'Casino name')
  .requiredOption('--url <url>', 'Casino base URL')
  .option('--file <path>', 'JSON file with casino data')
  .option('--regulator <regulator>', 'Regulatory body (MGA, UKGC, etc.)')
  .option('--license <number>', 'License number')
  .option('--status <status>', 'Casino status (live|suspended|investigating)', 'live')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      let casinoData: CasinoSubmission;
      
      if (options.file) {
        const filePath = path.resolve(options.file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        casinoData = JSON.parse(fileContent);
      } else {
        casinoData = {
          id: options.casinoId,
          name: options.name,
          baseURL: options.url,
          basicInfo: {
            status: options.status,
            regulator: options.regulator,
            licenseNumber: options.license
          }
        };
      }
      
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      console.log(`📤 Submitting casino data for: ${casinoData.name}`);
      console.log(`🎯 API endpoint: ${apiUrl}/api/casinos/${casinoData.id}`);
      
      const response = await fetch(`${apiUrl}/api/casinos/${casinoData.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(casinoData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${error}`);
      }
      
      const result = await response.json() as ApiResponse;
      console.log('✅ Casino data submitted successfully!');
      console.log(`📊 Casino ID: ${result.casinoId || 'N/A'}`);
      console.log(`⏰ Timestamp: ${result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}`);
      
    } catch (error) {
      console.error('❌ Failed to submit casino data:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('bulk')
  .description('Submit multiple casinos from JSON file')
  .requiredOption('--file <path>', 'JSON file with array of casino data')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      const filePath = path.resolve(options.file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const casinos = JSON.parse(fileContent);
      
      if (!Array.isArray(casinos)) {
        throw new Error('File must contain an array of casino objects');
      }
      
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      console.log(`📤 Submitting ${casinos.length} casinos in bulk...`);
      
      const response = await fetch(`${apiUrl}/api/casinos/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ casinos })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${error}`);
      }
      
      const result = await response.json() as ApiResponse;
      console.log('✅ Bulk submission completed!');
      console.log(`📊 Updated: ${result.updated || 0} casinos`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach((error: any) => {
          console.log(`   ${error.casino || 'Unknown'}: ${error.error || 'Unknown error'}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to submit bulk data:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List casinos with optional filtering')
  .option('--status <status>', 'Filter by status')
  .option('--regulator <regulator>', 'Filter by regulator')
  .option('--limit <number>', 'Limit results', '10')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      let query = `limit=${options.limit}`;
      if (options.status) query += `&status=${options.status}`;
      if (options.regulator) query += `&regulator=${options.regulator}`;
      
      console.log(`🔍 Fetching casino list...`);
      
      const response = await fetch(`${apiUrl}/api/casinos?${query}`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${error}`);
      }
      
      const result = await response.json() as ApiResponse;
      console.log(`📋 Found ${result.count || 0} casinos`);
      console.log('');
      
      if (result.casinos && result.casinos.length > 0) {
        result.casinos.forEach((casino: any, index: number) => {
          console.log(`${index + 1}. ${casino.name || 'Unknown'} (${casino.id || 'No ID'})`);
          console.log(`   URL: ${casino.baseURL || 'No URL'}`);
          console.log(`   Status: ${casino.basicInfo?.status || 'Unknown'}`);
          if (casino.basicInfo?.regulator) {
            console.log(`   Regulator: ${casino.basicInfo.regulator}`);
          }
          console.log('');
        });
      } else {
        console.log('No casinos found.');
      }
      
    } catch (error) {
      console.error('❌ Failed to list casinos:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('get')
  .description('Get detailed information for a specific casino')
  .requiredOption('--casino-id <id>', 'Casino identifier')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (options) => {
    try {
      const apiUrl = options.apiUrl || API_BASE;
      const apiKey = options.apiKey || API_KEY;
      
      console.log(`🔍 Fetching data for casino: ${options.casinoId}`);
      
      const response = await fetch(`${apiUrl}/api/casinos/${options.casinoId}`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${error}`);
      }
      
      const casino = await response.json() as any;
      
      console.log('');
      console.log(`🎰 ${casino.name || 'Unknown'} (${casino.id || 'No ID'})`);
      console.log('═'.repeat(50));
      console.log(`URL: ${casino.baseURL || 'No URL'}`);
      console.log(`Status: ${casino.basicInfo?.status || 'Unknown'}`);
      console.log('');
      
      if (casino.basicInfo?.regulator) {
        console.log(`Regulator: ${casino.basicInfo.regulator}`);
      }
      
      if (casino.basicInfo?.founded) {
        console.log(`Founded: ${casino.basicInfo.founded}`);
      }
      
      if (casino.regulatory?.licenses?.length) {
        console.log('Licenses:');
        casino.regulatory.licenses.forEach((license: any) => {
          console.log(`  - ${license.authority || 'Unknown'}: ${license.number || 'N/A'}`);
        });
      }
      
      if (casino.security) {
        console.log('Security:');
        console.log(`  SSL: ${casino.security.ssl ? '✅' : '❌'}`);
        console.log(`  2FA: ${casino.security.twoFactorAuth ? '✅' : '❌'}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to get casino data:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('template')
  .description('Generate a casino data template')
  .option('--casino-id <id>', 'Casino identifier')
  .option('--format <format>', 'Output format (json|yaml)', 'json')
  .option('--output <path>', 'Output file path')
  .action(async (options) => {
    try {
      const template = {
        id: options.casinoId || 'example-casino',
        name: 'Example Casino',
        baseURL: 'https://example-casino.com',
        basicInfo: {
          status: 'live',
          regulator: 'MGA',
          licenseNumber: 'MGA/B2C/123/2023',
          founded: '2023',
          headquarters: 'Malta',
          operator: 'Example Gaming Ltd'
        },
        rtpData: {
          slotsRTP: 96.5,
          tableGamesRTP: 98.2,
          verificationDate: new Date().toISOString().split('T')[0]
        },
        regulatory: {
          licenses: [
            {
              authority: 'Malta Gaming Authority',
              number: 'MGA/B2C/123/2023',
              issued: '2023-01-01',
              expires: '2025-12-31',
              status: 'active'
            }
          ],
          jurisdictions: ['Malta', 'Europe (excluding restricted)']
        },
        security: {
          ssl: true,
          twoFactorAuth: true,
          encryption: 'AES-256',
          certifications: ['eCOGRA', 'ISO 27001']
        },
        financial: {
          currencies: ['USD', 'EUR', 'GBP'],
          paymentMethods: ['Credit Card', 'E-wallets', 'Bank Transfer', 'Cryptocurrency'],
          withdrawalLimits: {
            daily: 5000,
            weekly: 25000,
            monthly: 100000
          }
        },
        reputation: {
          trustpilotRating: 4.2,
          askgamblersRating: 8.5,
          complaints: 'few',
          yearsSinceLastMajorIncident: 2
        },
        operations: {
          customerSupportHours: '24/7',
          languages: ['English', 'Spanish', 'German'],
          restrictedCountries: ['US', 'UK', 'France'],
          mobileApp: true
        },
        gameFairness: {
          rngCertified: true,
          thirdPartyAudited: true,
          auditor: 'eCOGRA',
          lastAuditDate: '2024-01-01'
        },
        social: {
          responsibleGambling: true,
          selfExclusionOptions: true,
          minorProtection: true,
          problemGamblingSupport: 'GamCare, BeGambleAware'
        }
      };
      
      let output = '';
      if (options.format === 'yaml') {
        // Simple YAML-like output
        output = JSON.stringify(template, null, 2)
          .replace(/"/g, '')
          .replace(/,/g, '')
          .replace(/\{/g, '')
          .replace(/\}/g, '')
          .replace(/\[/g, '')
          .replace(/\]/g, '');
      } else {
        output = JSON.stringify(template, null, 2);
      }
      
      if (options.output) {
        await fs.writeFile(options.output, output, 'utf-8');
        console.log(`✅ Template written to: ${options.output}`);
      } else {
        console.log('📋 Casino Data Template:');
        console.log('═'.repeat(50));
        console.log(output);
      }
      
    } catch (error) {
      console.error('❌ Failed to generate template:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check API status')
  .option('--api-url <url>', 'API base URL')
  .action(async (options) => {
    try {
      const apiUrl = options.apiUrl || API_BASE;
      
      console.log(`🔍 Checking API status at: ${apiUrl}`);
      
      const response = await fetch(`${apiUrl}/api/health`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const status = await response.json() as any;
      
      console.log('✅ API Status: Online');
      console.log(`📊 Version: ${status.version || 'Unknown'}`);
      console.log(`⏰ Timestamp: ${new Date().toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ API Status: Offline');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Add help examples
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  # Submit single casino');
  console.log('  $ casino-collector submit --casino-id stakeus --name "Stake US" --url https://stake.us');
  console.log('');
  console.log('  # Submit from file');
  console.log('  $ casino-collector submit --file casino-data.json');
  console.log('');
  console.log('  # List casinos');
  console.log('  $ casino-collector list --status live --limit 5');
  console.log('');
  console.log('  # Generate template');
  console.log('  $ casino-collector template --casino-id mycasino --output template.json');
  console.log('');
});

program.parse();